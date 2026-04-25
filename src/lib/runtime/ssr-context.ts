/**
 * SSR execution context for running component render functions server-side.
 *
 * When generating Declarative Shadow DOM (DSD) output, the SSR renderer must
 * call each custom element's render function to obtain its shadow DOM VNode
 * tree and capture any useStyle() / useGlobalStyle() output. This module
 * provides the minimal execution environment that makes that safe.
 *
 * Guarantees:
 *  - useStyle() callbacks are executed and their output is captured.
 *  - useGlobalStyle() callbacks are captured (not injected into document).
 *  - Lifecycle hooks (useOnConnected, watch, …) register harmlessly to arrays
 *    that are never invoked.
 *  - The reactive system is never permanently mutated — component registration
 *    is cleaned up by the render wrapper in factory.ts after each call.
 */

import type { ComponentConfig, ComponentContext, VNode } from './types';
import { toCamel } from './helpers';
import {
  setCurrentComponentContext,
  clearCurrentComponentContext,
} from './hooks';
import {
  beginRenderWarningScope,
  devWarn,
  endRenderWarningScope,
} from './logger';

// ---------------------------------------------------------------------------
// Global-style SSR collector
// ---------------------------------------------------------------------------

/**
 * When set, useGlobalStyle() factories write here instead of touching
 * document.adoptedStyleSheets (which doesn't exist in SSR environments).
 */
let _ssrGlobalStyleCollector: string[] | null = null;

/** Start collecting useGlobalStyle() output from the current render pass. */
export function beginSSRGlobalStyleCollection(): void {
  if (_ssrGlobalStyleCollector !== null) {
    throw new Error(
      '[CER] Concurrent SSR render detected: beginSSRGlobalStyleCollection() called ' +
      'while a collection is already active. For concurrent request handling, use ' +
      'worker threads or multiple Node.js processes.',
    );
  }
  _ssrGlobalStyleCollector = [];
}

/** Stop collecting and return everything gathered so far. */
export function endSSRGlobalStyleCollection(): string[] {
  const collected = _ssrGlobalStyleCollector ?? [];
  _ssrGlobalStyleCollector = null;
  return collected;
}

/**
 * Called by useGlobalStyle() when an SSR collection pass is active.
 * Returns true if the CSS was captured (caller should skip DOM injection).
 */
export function captureGlobalStyleForSSR(css: string): boolean {
  if (_ssrGlobalStyleCollector !== null) {
    if (css && !_ssrGlobalStyleCollector.includes(css)) {
      _ssrGlobalStyleCollector.push(css);
    }
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// SSR render pass
// ---------------------------------------------------------------------------

export interface SSRRenderResult {
  /** VNode tree from the component's render function (shadow DOM content). */
  shadowVNode: VNode | VNode[] | null;
  /** CSS string captured from useStyle() calls during this render. */
  useStyleCSS: string;
  /** Present when the component's render function returned a Promise. */
  asyncPromise?: Promise<VNode | VNode[]>;
}

/**
 * Run a component's render function in a minimal SSR context to capture its
 * shadow DOM VNode tree and any useStyle() output.
 *
 * The component's render wrapper in factory.ts handles:
 *   - setCurrentComponentContext / clearCurrentComponentContext
 *   - _hookCallbacks reset
 *   - _computedStyle reset
 *   - reactiveSystem registration / cleanup
 *
 * We only need to build a context object that satisfies the hooks' expectations.
 */
// Monotonic counter ensures each SSR render context gets a unique component ID,
// preventing the reactive system's stateStorage from returning stale cached
// ref/computed values from a previous request.
let _ssrRenderCounter = 0;

export function runComponentSSRRender(
  config: ComponentConfig<object, object, object, object>,
  attrs: Record<string, unknown>,
  tag = 'unknown',
  ssrRouter?: unknown,
): SSRRenderResult {
  // Build camelCase prop map from serialised attribute names.
  const propsFromAttrs: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(attrs ?? {})) {
    propsFromAttrs[toCamel(k)] = v;
  }

  // Fake host element: satisfies useProps()'s attribute reads without a real DOM node.
  const fakeHost = {
    getAttribute(name: string): string | null {
      const camel = toCamel(name);
      const v = propsFromAttrs[camel];
      if (v !== undefined && v !== null) {
        // Complex objects (arrays, elements) cannot be represented as HTML attribute
        // strings. Returning null here lets useProps() fall through to ctx[prop],
        // which holds the actual value spread from propsFromAttrs. Without this
        // guard, String([{...}]) returns "[object Object]" and useProps() returns
        // that junk string instead of the real prop — causing empty SSR output and
        // a visible flash when the client re-renders with the correct data.
        if (typeof v === 'object' || typeof v === 'function') return null;
        return String(v);
      }
      const raw = (attrs ?? {})[name];
      if (raw !== undefined && raw !== null) {
        if (typeof raw === 'object' || typeof raw === 'function') return null;
        return String(raw);
      }
      return null;
    },
    hasAttribute(name: string): boolean {
      return this.getAttribute(name) !== null;
    },
    // shadowRoot must be null so useJITCSS() doesn't try to registerJITCSSComponent
    shadowRoot: null as null,
    tagName: '',
    parentElement: null as null,
  };

  // Minimal context object — the factory render wrapper will add _hookCallbacks
  // and _computedStyle via Object.defineProperty before calling renderFn().
  const ssrContext: Record<string, unknown> = {
    ...propsFromAttrs,
    // Unique ID per SSR render prevents the reactive system's stateStorage from
    // returning cached ref/computed values from a previous request. Using a
    // monotonic counter is cheaper than crypto.randomUUID() and avoids the
    // Node.js version compatibility concern noted in the original comment.
    _componentId: `cer-ssr-${Object.keys(propsFromAttrs).join('-') || 'root'}-${++_ssrRenderCounter}`,
    requestRender: () => undefined,
    _requestRender: () => undefined,
    emit: () => true,
    refs: {},
  };

  // Set _host as non-enumerable to avoid triggering the reactive proxy trap.
  Object.defineProperty(ssrContext, '_host', {
    value: fakeHost,
    writable: true,
    enumerable: false,
    configurable: true,
  });

  // Thread the per-request router instance so router-view (and any component
  // that calls getCurrentComponentContext()._router) reads from the correct
  // router rather than the module-level activeRouterProxy singleton.
  // Non-enumerable keeps it out of prop serialisation / Object.keys iteration.
  if (ssrRouter !== undefined) {
    Object.defineProperty(ssrContext, '_router', {
      value: ssrRouter,
      writable: false,
      enumerable: false,
      configurable: true,
    });
  }

  // Pre-set the component context so hooks (useStyle, useProps, etc.) work even
  // when config.render is a raw function rather than the factory.ts wrapper.
  // If config.render IS the factory wrapper, it will call setCurrentComponentContext
  // again with the same object — that is harmless.
  setCurrentComponentContext(ssrContext);

  let shadowVNode: VNode | VNode[] | null = null;
  let asyncPromise: Promise<VNode | VNode[]> | undefined;
  try {
    beginRenderWarningScope();
    const result = config.render(
      ssrContext as ComponentContext<object, object, object, object>,
    );
    // Async render functions cannot be awaited in the synchronous SSR pass.
    // The DSD renderer will emit a streaming placeholder if active; otherwise
    // the shadow DOM will be empty. The caller emits the appropriate warning.
    if (result instanceof Promise) {
      asyncPromise = result;
    } else {
      shadowVNode = result as VNode | VNode[];
    }
  } catch (err) {
    // Best-effort — a render error during SSR should not crash the server.
    // The component will still get a DSD wrapper, just without shadow content.
    devWarn(
      `[SSR] Component "${tag}" threw during SSR render. ` +
        `The shadow DOM will be empty. Error:`,
      err,
    );
  } finally {
    endRenderWarningScope();
    // Clear context. The factory wrapper clears it too, but calling clearCurrentComponentContext()
    // twice (null → null) is harmless and ensures clean state if config.render was a raw function.
    clearCurrentComponentContext();
  }

  const useStyleCSS = String(
    (ssrContext as { _computedStyle?: string })._computedStyle ?? '',
  );

  return { shadowVNode, useStyleCSS, asyncPromise };
}
