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
import { devWarn } from './logger';

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
export function runComponentSSRRender(
  config: ComponentConfig<object, object, object>,
  attrs: Record<string, string | number | boolean | null | undefined>,
  tag = 'unknown',
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
      if (
        propsFromAttrs[camel] !== undefined &&
        propsFromAttrs[camel] !== null
      ) {
        return String(propsFromAttrs[camel]);
      }
      const raw = (attrs ?? {})[name];
      return raw !== undefined && raw !== null ? String(raw) : null;
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
    // Stable component ID avoids crypto.randomUUID() in older Node versions.
    _componentId: `cer-ssr-${Object.keys(propsFromAttrs).join('-') || 'root'}`,
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

  // Pre-set the component context so hooks (useStyle, useProps, etc.) work even
  // when config.render is a raw function rather than the factory.ts wrapper.
  // If config.render IS the factory wrapper, it will call setCurrentComponentContext
  // again with the same object — that is harmless.
  setCurrentComponentContext(ssrContext);

  let shadowVNode: VNode | VNode[] | null = null;
  try {
    const result = config.render(
      ssrContext as ComponentContext<object, object, object>,
    );
    // Async render functions cannot be awaited in the synchronous SSR pass.
    // The shell will be rendered without shadow content; the client hydrates it.
    if (result instanceof Promise) {
      devWarn(
        `[SSR] Component "${tag}" has an async render function. ` +
          `Async renders are not supported in the synchronous SSR pass — ` +
          `the shadow DOM will be empty and hydrated on the client instead.`,
      );
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
    // Clear context. The factory wrapper clears it too, but calling clearCurrentComponentContext()
    // twice (null → null) is harmless and ensures clean state if config.render was a raw function.
    clearCurrentComponentContext();
  }

  const useStyleCSS = String(
    (ssrContext as { _computedStyle?: string })._computedStyle ?? '',
  );

  return { shadowVNode, useStyleCSS };
}
