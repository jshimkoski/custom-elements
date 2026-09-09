import type { ComponentConfig, HydrateStrategy, VNode } from '../types';
import { reactiveSystem } from '../reactive';
import { resolveTagName } from '../tag-utils';
import {
  setCurrentComponentContext,
  clearCurrentComponentContext,
  beginDiscoveryRender,
  endDiscoveryRender,
} from '../hooks';
import { resetWhenCounter } from '../../directives';
import { devError, devWarn } from '../logger';
import { registry, initGlobalRegistryIfNeeded } from './registry';
import { createElementClass } from './element-class';

/** Shape of the internal component context object used during rendering. */
type InternalContext = Record<string, unknown> & {
  _componentId?: string;
  _connectionCleanups?: Array<() => void>;
  _connectionGeneration?: number;
  _mountedDisconnectCallbacks?: Array<(context?: unknown) => void>;
  _hookCallbacks?: Record<string, unknown> & {
    onConnected?: Array<
      (context?: unknown) => void | (() => void) | Promise<void | (() => void)>
    >;
    onDisconnected?: Array<() => void>;
    onAttributeChanged?: Array<
      (
        name: string,
        oldValue: string | null,
        newValue: string | null,
      ) => void
    >;
    onError?: Array<(err: unknown) => void>;
    style?: (el: HTMLElement) => void;
    props?: Record<string, unknown>;
  };
};

const deferredVisibleDefinitionCleanups = new Map<string, () => void>();

type DeferredRegistration = { tag: string; register: () => void };
const deferredDsdRegistrations = new Map<string, DeferredRegistration>();
const deferredDsdRegistrationQueue: string[] = [];
let deferredDsdRegistrationTimer: ReturnType<typeof setTimeout> | null = null;
let deferredDsdInteractionListenersInstalled = false;

function removeDeferredDsdInteractionListeners(): void {
  if (!deferredDsdInteractionListenersInstalled || typeof window === 'undefined') return;
  deferredDsdInteractionListenersInstalled = false;
  window.removeEventListener('pointerdown', flushDeferredDsdRegistrations, true);
  window.removeEventListener('keydown', flushDeferredDsdRegistrations, true);
}

function flushDeferredDsdRegistrations(): void {
  if (deferredDsdRegistrationTimer !== null) {
    clearTimeout(deferredDsdRegistrationTimer);
    deferredDsdRegistrationTimer = null;
  }
  removeDeferredDsdInteractionListeners();

  while (deferredDsdRegistrationQueue.length) {
    const tag = deferredDsdRegistrationQueue.shift()!;
    const pending = deferredDsdRegistrations.get(tag);
    deferredDsdRegistrations.delete(tag);
    pending?.register();
  }
}

function installDeferredDsdInteractionListeners(): void {
  if (deferredDsdInteractionListenersInstalled || typeof window === 'undefined') return;
  deferredDsdInteractionListenersInstalled = true;
  // Finish registration in capture before application handlers see the first
  // interaction. This prevents an immediately pressed shortcut or clicked SSR
  // control from racing the post-paint registration queue.
  window.addEventListener('pointerdown', flushDeferredDsdRegistrations, true);
  window.addEventListener('keydown', flushDeferredDsdRegistrations, true);
}

function scheduleNextDsdRegistration(): void {
  if (deferredDsdRegistrationTimer !== null) return;
  deferredDsdRegistrationTimer = setTimeout(() => {
    deferredDsdRegistrationTimer = null;

    let pending: DeferredRegistration | undefined;
    while (!pending && deferredDsdRegistrationQueue.length) {
      const tag = deferredDsdRegistrationQueue.shift()!;
      pending = deferredDsdRegistrations.get(tag);
      deferredDsdRegistrations.delete(tag);
    }

    pending?.register();
    if (deferredDsdRegistrationQueue.length) {
      // One definition pass per task prevents a complete SSR component tree
      // from upgrading in one long post-paint task. Metadata discovery remains
      // synchronous so an already-painted control is interaction-ready.
      scheduleNextDsdRegistration();
    } else {
      removeDeferredDsdInteractionListeners();
    }
  }, 0);
}

/**
 * The app framework opts into definition batching while it activates a static
 * SSR entry. Client-only components and normal runtime consumers retain the
 * synchronous customElements.define() contract.
 */
function deferDsdComponentRegistration(
  tag: string,
  register: () => void,
): boolean {
  const runtimeState = globalThis as {
    __CER_STATIC_ENTRY__?: boolean;
    __CER_DSD_TAGS__?: Set<string>;
  };
  if (
    typeof document === 'undefined' ||
    runtimeState.__CER_STATIC_ENTRY__ !== true ||
    !(runtimeState.__CER_DSD_TAGS__ instanceof Set) ||
    !runtimeState.__CER_DSD_TAGS__.has(tag) ||
    customElements.get(tag)
  ) {
    return false;
  }

  if (!deferredDsdRegistrations.has(tag)) {
    deferredDsdRegistrationQueue.push(tag);
  }
  deferredDsdRegistrations.set(tag, { tag, register });
  installDeferredDsdInteractionListeners();
  scheduleNextDsdRegistration();
  return true;
}

function scanOpenTree(
  start: Document | ShadowRoot | Element,
  tag: string,
): { elements: Element[]; roots: Array<Document | ShadowRoot> } {
  const elements = new Set<Element>();
  const roots = new Set<Document | ShadowRoot>();
  const queue: Array<Document | ShadowRoot | Element> = [start];
  const visited = new Set<Document | ShadowRoot | Element>();

  while (queue.length) {
    const root = queue.pop()!;
    if (visited.has(root)) continue;
    visited.add(root);

    if (root instanceof Element) {
      if (root.matches(tag)) elements.add(root);
      if (root.shadowRoot) queue.push(root.shadowRoot);
    } else {
      roots.add(root);
    }

    for (const element of root.querySelectorAll('*')) {
      if (element.matches(tag)) elements.add(element);
      if (element.shadowRoot) queue.push(element.shadowRoot);
    }
  }

  return { elements: [...elements], roots: [...roots] };
}

/**
 * Leave visibility-gated declarative-shadow elements undefined until one can
 * actually be seen. Their complete DSD remains usable and accessible without
 * paying constructor/context costs for closed drawers, sheets, and responsive
 * desktop/mobile duplicates. Newly inserted client-only instances still force
 * an immediate definition through the mutation observer.
 */
function deferVisibleCustomElementDefinition(
  tag: string,
  define: () => void,
): boolean {
  if (
    typeof document === 'undefined' ||
    typeof IntersectionObserver === 'undefined' ||
    customElements.get(tag)
  ) {
    return false;
  }

  const initial = scanOpenTree(document, tag);
  if (
    initial.elements.length === 0 ||
    initial.elements.some(
      (element) =>
        !element.shadowRoot ||
        element.getAttribute('data-cer-hydrate') !== 'visible',
    )
  ) {
    return false;
  }

  deferredVisibleDefinitionCleanups.get(tag)?.();

  let finished = false;
  const observedElements = new WeakSet<Element>();
  const observedRoots = new WeakSet<Document | ShadowRoot>();
  let mutationObserver: MutationObserver | null = null;

  const restoreHydrationMarker = (
    element: Element,
    previous: string | null,
  ) => {
    if (previous === null) element.removeAttribute('data-cer-hydrate');
    else element.setAttribute('data-cer-hydrate', previous);
  };

  const cleanup = () => {
    intersectionObserver.disconnect();
    mutationObserver?.disconnect();
    document.removeEventListener('pointerdown', defineForInteraction, true);
    document.removeEventListener('keydown', defineForInteraction, true);
    if (deferredVisibleDefinitionCleanups.get(tag) === cleanup) {
      deferredVisibleDefinitionCleanups.delete(tag);
    }
  };

  const defineNow = (visibleElement?: Element) => {
    if (finished || customElements.get(tag)) return;
    finished = true;
    cleanup();

    // The observer already established visibility. Let this triggering host
    // take the normal eager DSD path during synchronous custom-element upgrade;
    // restore the public SSR hint immediately afterwards.
    const previous = visibleElement?.getAttribute('data-cer-hydrate') ?? null;
    if (visibleElement) visibleElement.setAttribute('data-cer-hydrate', 'load');
    try {
      define();
    } finally {
      if (visibleElement) restoreHydrationMarker(visibleElement, previous);
    }
  };

  const defineForInteraction = (event: Event) => {
    const host = event.composedPath().find(
      (target): target is Element =>
        target instanceof Element && target.matches(tag),
    );
    if (host) defineNow(host);
  };
  const intersectionObserver = new IntersectionObserver((entries) => {
    const visible = entries.find((entry) => entry.isIntersecting);
    if (visible) defineNow(visible.target);
  });

  const observeElement = (element: Element) => {
    if (observedElements.has(element)) return;
    observedElements.add(element);
    intersectionObserver.observe(element);
  };
  const observeRoot = (root: Document | ShadowRoot) => {
    if (!mutationObserver || observedRoots.has(root)) return;
    observedRoots.add(root);
    mutationObserver.observe(root, { childList: true, subtree: true });
  };

  if (typeof MutationObserver !== 'undefined') {
    mutationObserver = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          const added = scanOpenTree(node, tag);
          added.roots.forEach(observeRoot);
          for (const element of added.elements) {
            if (
              !element.shadowRoot ||
              element.getAttribute('data-cer-hydrate') !== 'visible'
            ) {
              defineNow();
              return;
            }
            observeElement(element);
          }
        }
      }
    });
  }

  initial.elements.forEach(observeElement);
  initial.roots.forEach(observeRoot);
  document.addEventListener('pointerdown', defineForInteraction, true);
  document.addEventListener('keydown', defineForInteraction, true);
  deferredVisibleDefinitionCleanups.set(tag, cleanup);
  return true;
}

/**
 * Invoke a lifecycle callback array, logging any errors in dev mode.
 * Errors are caught so one failing callback does not block the others.
 */
function invokeCallbacks(
  tag: string,
  hookName: string,
  cbs: Array<(...args: unknown[]) => void>,
  args: unknown[],
): void {
  for (const cb of cbs) {
    try {
      cb(...args);
    } catch (err) {
      devError(
        `[${tag}] Error in ${hookName} lifecycle hook:`,
        err,
      );
    }
  }
}

/** Invoke connected hooks and retain any cleanup functions they return. */
function invokeConnectedCallbacks(
  tag: string,
  cbs: Array<
    (context?: unknown) => void | (() => void) | Promise<void | (() => void)>
  >,
  context?: unknown,
): void {
  const cleanups: Array<() => void> = [];
  const internal = context && typeof context === 'object'
    ? context as InternalContext
    : undefined;
  const generation = (internal?._connectionGeneration ?? 0) + 1;

  if (internal) {
    // Publish bookkeeping before invoking user callbacks. A connected hook can
    // synchronously trigger a render, disconnect the host, or return a promise.
    // The generation lets delayed results distinguish the current connection
    // from an already-disconnected/reconnected instance.
    Object.defineProperty(internal, '_connectionGeneration', {
      value: generation,
      writable: true,
      enumerable: false,
      configurable: true,
    });
    Object.defineProperty(internal, '_connectionCleanups', {
      value: cleanups,
      writable: true,
      enumerable: false,
      configurable: true,
    });
  }

  const retainCleanup = (cleanup: void | (() => void)) => {
    if (typeof cleanup !== 'function') return;
    if (!internal || internal._connectionGeneration === generation) {
      cleanups.push(cleanup);
      return;
    }
    // The component disconnected before the async hook settled. Running the
    // cleanup immediately prevents leaked observers/listeners without reviving
    // bookkeeping for a stale connection.
    invokeCallbacks(tag, 'useOnConnected cleanup', [cleanup], []);
  };

  for (const cb of cbs) {
    try {
      const result = cb(context);
      if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
        void Promise.resolve(result).then(retainCleanup).catch((err) => {
          devError(`[${tag}] Error in useOnConnected lifecycle hook:`, err);
        });
      } else {
        retainCleanup(result as void | (() => void));
      }
    } catch (err) {
      devError(`[${tag}] Error in useOnConnected lifecycle hook:`, err);
    }
  }
}

/** Run and clear the cleanup functions captured from connected hooks. */
function invokeConnectionCleanups(tag: string, context?: unknown): void {
  if (!context || typeof context !== 'object') return;
  const internal = context as InternalContext;
  const cleanups = internal._connectionCleanups ?? [];
  // Context objects are reactive proxies. Internal lifecycle bookkeeping must
  // bypass their set trap or disconnect itself schedules a detached rerender.
  Object.defineProperty(internal, '_connectionCleanups', {
    value: [],
    writable: true,
    enumerable: false,
    configurable: true,
  });
  Object.defineProperty(internal, '_connectionGeneration', {
    value: (internal._connectionGeneration ?? 0) + 1,
    writable: true,
    enumerable: false,
    configurable: true,
  });
  invokeCallbacks(tag, 'useOnConnected cleanup', cleanups, []);
}

/**
 * Streamlined functional component API with automatic reactive props and lifecycle hooks.
 *
 * @example
 * ```ts
 * // Simple component with no parameters
 * component('simple-header', () => {
 *   return html`<h1>Hello World</h1>`;
 * });
 *
 * // With props using useProps() hook
 * component('with-props', () => {
 *   const { message } = useProps({ message: 'Hello' });
 *   return html`<div>${message}</div>`;
 * });
 *
 * // With props and lifecycle hooks
 * component('my-switch', () => {
 *   const { modelValue, label } = useProps({ modelValue: false, label: '' });
 *   const emit = useEmit();
 *
 *   useOnConnected(() => console.log('Switch connected!'));
 *   useOnDisconnected(() => console.log('Switch disconnected!'));
 *
 *   return html`
 *     <label>
 *       ${label}
 *       <input
 *         type="checkbox"
 *         :checked="${modelValue}"
 *         @change="${(e) => emit('update:modelValue', e.target.checked)}"
 *       />
 *     </label>
 *   `;
 * });
 * ```
 */

/** Options for `component()`. */
export interface ComponentOptions {
  /**
   * Partial-hydration strategy when this component is server-rendered with
   * Declarative Shadow DOM (`dsd: true`). Emitted as `data-cer-hydrate` on the
   * host element so the client runtime can schedule hydration appropriately.
   *
   * - `'load'`    — hydrate immediately on connection (default)
   * - `'idle'`    — defer to `requestIdleCallback`
   * - `'visible'` — defer until the element enters the viewport
   * - `'none'`    — keep this element and unmarked descendants static. A nested
   *                 component may explicitly opt back in with its own strategy.
   */
  hydrate?: HydrateStrategy;
}

// Overload: No parameters - use useProps() hook for props access
export function component(
  tag: string,
  renderFn: () => VNode | VNode[] | Promise<VNode | VNode[]>,
  options?: ComponentOptions,
): void;

// Implementation
export function component(
  tag: string,
  renderFn: () => VNode | VNode[] | Promise<VNode | VNode[]>,
  options?: ComponentOptions,
): void {
  // Ensure the global registry is exposed when running in a browser. This is
  // performed lazily to avoid module-load side-effects that prevent
  // tree-shaking by bundlers.
  initGlobalRegistryIfNeeded();
  const normalizedTag = resolveTagName(tag);

  // Create component config
  const config: ComponentConfig<object, object, object, object> = {
    // Props are accessed via useProps() hook
    props: {},
    hydrate: options?.hydrate,

    // Add lifecycle hooks from the stored functions
    onConnected: (context) => {
      const internal = context as InternalContext;
      const connected = internal?._hookCallbacks?.onConnected;
      // Pair disconnect hooks with the exact render whose connected hooks ran.
      // Component config is shared by every instance and later renders replace
      // their local closures; retaining these callbacks on the instance context
      // prevents one instance (or rerender) from cleaning up another's effects.
      const disconnected = internal?._hookCallbacks?.onDisconnected;
      Object.defineProperty(internal, '_mountedDisconnectCallbacks', {
        value: Array.isArray(disconnected) ? [...disconnected] : [],
        writable: true,
        enumerable: false,
        configurable: true,
      });
      // Connected callbacks may synchronously request and flush a rerender.
      // Capture the paired disconnect callbacks before invoking them so that
      // such a render cannot replace the closure set we need at unmount.
      if (Array.isArray(connected)) {
        invokeConnectedCallbacks(normalizedTag, connected, context);
      }
    },

    onDisconnected: (context) => {
      invokeConnectionCleanups(normalizedTag, context);
      const internal = context as InternalContext;
      const disconnected = internal?._mountedDisconnectCallbacks ?? [];
      invokeCallbacks(
        normalizedTag,
        'useOnDisconnected',
        disconnected as Array<(...args: unknown[]) => void>,
        [context],
      );
      if (internal) {
        Object.defineProperty(internal, '_mountedDisconnectCallbacks', {
          value: [],
          writable: true,
          enumerable: false,
          configurable: true,
        });
      }
    },

    onAttributeChanged: (name, oldValue, newValue, context) => {
      const callbacks = (context as InternalContext)?._hookCallbacks
        ?.onAttributeChanged;
      if (Array.isArray(callbacks)) {
        invokeCallbacks(
          normalizedTag,
          'useOnAttributeChanged',
          callbacks as Array<(...args: unknown[]) => void>,
          [name, oldValue, newValue, context],
        );
      }
    },

    onError: (error, context) => {
      const callbacks = (context as InternalContext)?._hookCallbacks?.onError;
      if (error && Array.isArray(callbacks)) {
        invokeCallbacks(
          normalizedTag,
          'useOnError',
          callbacks as Array<(...args: unknown[]) => void>,
          [error],
        );
      }
    },

    render: (context) => {
      // Track dependencies for rendering
      // Use stable component ID from context if available, otherwise generate new one

      const ictx = context as InternalContext;
      const componentId =
        ictx._componentId || `${normalizedTag}-${crypto.randomUUID()}`;

      reactiveSystem.setCurrentComponent(componentId, () => {
        if (context.requestRender) {
          context.requestRender();
        }
      });

      try {
        // Reset hook callbacks before each render so registrations from a previous
        // render don't accumulate. The context is re-used across re-renders so
        // any callbacks pushed in the last render must be cleared before the next
        // renderFn() call to keep the "call useOnConnected once per render" contract.
        //
        // IMPORTANT: Use Object.defineProperty (not a direct assignment) so that
        // this write bypasses the reactive Proxy set-trap that wraps `context`.
        // A plain `context._hookCallbacks = {}` assignment would travel through the
        // proxy, call scheduleDOMUpdate, and trigger an infinite re-render loop.
        Object.defineProperty(context, '_hookCallbacks', {
          value: {},
          writable: true,
          enumerable: false,
          configurable: true,
        });
        // Reset computed style so useDesignTokens doesn't accumulate duplicate
        // :host blocks across re-renders. Uses defineProperty for the same reason
        // as _hookCallbacks: bypass the reactive proxy set-trap.
        Object.defineProperty(context, '_computedStyle', {
          value: undefined,
          writable: true,
          enumerable: false,
          configurable: true,
        });
        // Set current component context for hooks
        setCurrentComponentContext(context);

        // Reset the when() call counter so sibling when() calls in the render
        // function automatically receive unique, stable positional keys.
        resetWhenCounter();

        // Call render function with no arguments - use useProps() hook for props access
        // If renderFn throws synchronously (for example due to eager interpolation
        // inside templates), invoke any useOnError hook that the component may
        // have already registered during the render execution before rethrowing.
        let result: VNode | VNode[] | Promise<VNode | VNode[]>;
        try {
          result = renderFn();
        } catch (err) {
          try {
            const hookCallbacks = ictx._hookCallbacks;
            const errorCbs = hookCallbacks?.onError;
            if (Array.isArray(errorCbs)) {
              for (const cb of errorCbs) {
                try {
                  (cb as (e: unknown) => void)(err);
                } catch {
                  /* swallow */
                }
              }
            } else if (typeof errorCbs === 'function') {
              try {
                (errorCbs as (e: unknown) => void)(err);
              } catch {
                /* swallow */
              }
            }
          } catch {
            /* best-effort */
          }

          // Propagate to the nearest ancestor <cer-error-boundary> when the
          // host element is already connected to the DOM (parentElement set).
          // This enables the error boundary to catch child component errors.
          try {
            const host = (ictx as { _host?: Element })._host;
            if (host?.parentElement) {
              let node: Element | null = host.parentElement;
              while (node) {
                if (node.tagName.toLowerCase() === 'cer-error-boundary') {
                  type ErrorBoundaryEl = {
                    _cerHandleChildError?: (err: unknown) => void;
                  };
                  (node as unknown as ErrorBoundaryEl)._cerHandleChildError?.(
                    err,
                  );
                  break;
                }
                let next: Element | null = node.parentElement;
                if (!next) {
                  const root = node.getRootNode();
                  if (typeof ShadowRoot !== 'undefined' && root instanceof ShadowRoot)
                    next = root.host.parentElement;
                }
                node = next;
              }
            }
          } catch {
            /* best-effort */
          }

          throw err;
        }

        // Validate that the render function returned a value.
        // A missing `return` is a common mistake that produces a cryptic error
        // deep in the VDOM renderer; surface it early with a clear message.
        if (result === undefined || result === null) {
          throw new Error(
            `[${normalizedTag}] Component render function did not return a value. ` +
            `Make sure your component returns an html\`...\` template.`,
          );
        }

        // Process hook callbacks that were set during render.
        // Callbacks are stored as arrays to allow multiple registrations (composable pattern).
        if (ictx._hookCallbacks) {
          const hookCallbacks = ictx._hookCallbacks;
          // `useStyle()` stores a computed style string directly on the
          // current context as `_computedStyle`. The runtime reads
          // `_computedStyle` in `applyStyle`.
          // If useProps() was called, update config.props with the defaults.
          // Only update props if not already set (idempotent after discovery render)
          // so that subsequent re-renders don't overwrite with a fresh object,
          // avoiding ordering-sensitive behaviour across multiple instances.
          if (hookCallbacks.props && !Object.keys(config.props ?? {}).length) {
            const propsDefaults = hookCallbacks.props as Record<
              string,
              unknown
            >;
            config.props = Object.fromEntries(
              Object.entries(propsDefaults).map(([key, defaultValue]) => {
                const type =
                  typeof defaultValue === 'boolean'
                    ? Boolean
                    : typeof defaultValue === 'number'
                      ? Number
                      : typeof defaultValue === 'string'
                        ? String
                        : Function; // Use Function for complex types
                return [
                  key,
                  { type, default: defaultValue as string | number | boolean },
                ];
              }),
            );
            // Update the registry so future instances and observedAttributes use the updated config
            registry.set(normalizedTag, config);
          }
        }

        return result;
      } finally {
        clearCurrentComponentContext();
        reactiveSystem.clearCurrentComponent();
      }
    },
  };

  // Store in registry
  registry.set(normalizedTag, config);

  // CRITICAL: Perform a "discovery render" to detect props from useProps().
  // This must happen BEFORE defining the custom element so observedAttributes
  // includes all props declared via useProps().
  //
  // The discovery render uses a lightweight probe context combined with the
  // beginDiscoveryRender() flag. When that flag is set, the html tagged
  // template and other side-effectful primitives (reactive subscriptions,
  // template parsing, etc.) short-circuit immediately. Only useProps() and
  // other metadata-registration hooks actually execute. This eliminates the
  // double-execution of side effects (API calls, console.logs, watchers)
  // that occurred in the previous implementation which ran the full render.
  if (typeof window !== 'undefined') {
    try {
      const discoveryContext: {
        _hookCallbacks: Record<string, unknown>;
        requestRender: () => void;
        emit?: (eventName: string, detail?: unknown) => boolean;
      } = {
        _hookCallbacks: {},
        requestRender: () => {},
        emit: () => true,
      };
      setCurrentComponentContext(discoveryContext);
      beginDiscoveryRender();
      resetWhenCounter();
      try {
        // Run with discovery flag active. The html`` tag and side-effectful
        // primitives will no-op; only useProps() actually registers metadata.
        renderFn();
      } catch (err) {
        try {
          const hookCallbacks = (
            discoveryContext as {
              _hookCallbacks?: {
                onError?:
                  | Array<(err: unknown) => void>
                  | ((err: unknown) => void);
              };
            }
          )?._hookCallbacks;
          const errorCbs = hookCallbacks?.onError;
          if (Array.isArray(errorCbs)) {
            for (const cb of errorCbs) {
              try {
                cb(err);
              } catch {
                /* swallow */
              }
            }
          } else if (typeof errorCbs === 'function') {
            try {
              (errorCbs as (e: unknown) => void)(err);
            } catch {
              /* swallow */
            }
          }
          devError(
            `Error during component discovery render <${normalizedTag}>:`,
            err,
          );
          devWarn(
            'Error occurred during initial component discovery render. Consider guarding expensive expressions or using lazy factories for directives like when().',
          );
        } catch {
          /* best-effort */
        }
        throw err;
      } finally {
        // Always restore state regardless of success or failure so that
        // isDiscoveryRender() never stays permanently true after an error.
        endDiscoveryRender();
        clearCurrentComponentContext();
      }

      if (discoveryContext._hookCallbacks?.props) {
        const propsDefaults = discoveryContext._hookCallbacks.props;
        config.props = Object.fromEntries(
          Object.entries(propsDefaults).map(([key, defaultValue]) => {
            const type =
              typeof defaultValue === 'boolean'
                ? Boolean
                : typeof defaultValue === 'number'
                  ? Number
                  : typeof defaultValue === 'string'
                    ? String
                    : Function;
            return [
              key,
              { type, default: defaultValue as string | number | boolean },
            ];
          }),
        );
        registry.set(normalizedTag, config);
      }
    } catch (err) {
      // Discovery render failed - props will be discovered on first real render.
      // Log in dev so the developer sees the error rather than just getting
      // a blank/broken component with no console output.
      devWarn(`[${normalizedTag}] Failed to register component. Check your component definition for errors.`, err);
    }

    if (typeof customElements !== 'undefined' && !customElements.get(normalizedTag)) {
      const define = () => {
        if (customElements.get(normalizedTag)) return;
        customElements.define(
          normalizedTag,
          createElementClass(normalizedTag, config) as CustomElementConstructor,
        );
      };
      const defineWhenReady = () => {
        const deferredUntilVisible =
          options?.hydrate === 'visible' &&
          deferVisibleCustomElementDefinition(normalizedTag, define);
        if (!deferredUntilVisible) define();
      };
      if (!deferDsdComponentRegistration(normalizedTag, defineWhenReady)) {
        defineWhenReady();
      }
    }
  }
}
