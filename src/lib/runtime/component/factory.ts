import type { ComponentConfig, HydrateStrategy, VNode } from '../types';
import { reactiveSystem } from '../reactive';
import { toKebab } from '../helpers';
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
  _hookCallbacks?: Record<string, unknown> & {
    onConnected?: Array<() => void>;
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
   * - `'none'`    — never hydrate (purely static, no JS runtime for this element)
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
  let normalizedTag = toKebab(tag);
  if (!normalizedTag.includes('-')) {
    normalizedTag = `cer-${normalizedTag}`;
  }

  // Store lifecycle hooks from the render function
  const lifecycleHooks: {
    // Forward context to hooks so user-provided lifecycle callbacks
    // (registered via useOnConnected/useOnDisconnected) can access the
    // component context and its internal _host reference when invoked.
    onConnected?: (context?: unknown) => void;
    onDisconnected?: (context?: unknown) => void;
    onAttributeChanged?: (
      name: string,
      oldValue: string | null,
      newValue: string | null,
      context?: unknown,
    ) => void;
    onError?: (error: Error, context?: unknown) => void;
  } = {};

  // Create component config
  const config: ComponentConfig<object, object, object, object> = {
    // Props are accessed via useProps() hook
    props: {},
    hydrate: options?.hydrate,

    // Add lifecycle hooks from the stored functions
    onConnected: (context) => {
      if (lifecycleHooks.onConnected) {
        try {
          lifecycleHooks.onConnected(context);
        } catch (err) {
          devError(`[${normalizedTag}] Error in onConnected lifecycle hook:`, err);
        }
      }
    },

    onDisconnected: (context) => {
      if (lifecycleHooks.onDisconnected) {
        try {
          lifecycleHooks.onDisconnected(context);
        } catch (err) {
          devError(`[${normalizedTag}] Error in onDisconnected lifecycle hook:`, err);
        }
      }
    },

    onAttributeChanged: (name, oldValue, newValue, context) => {
      if (lifecycleHooks.onAttributeChanged) {
        try {
          lifecycleHooks.onAttributeChanged(name, oldValue, newValue, context);
        } catch (err) {
          devError(`[${normalizedTag}] Error in onAttributeChanged lifecycle hook:`, err);
        }
      }
    },

    onError: (error, context) => {
      if (lifecycleHooks.onError && error) {
        try {
          lifecycleHooks.onError(error, context);
        } catch (err) {
          devError(`[${normalizedTag}] Error in onError handler (the error handler itself threw):`, err);
        }
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
                  if (root instanceof ShadowRoot)
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

        // Process hook callbacks that were set during render.
        // Callbacks are stored as arrays to allow multiple registrations (composable pattern).
        if (ictx._hookCallbacks) {
          const hookCallbacks = ictx._hookCallbacks;
          if (hookCallbacks.onConnected) {
            const cbs = hookCallbacks.onConnected as Array<
              (context?: unknown) => void
            >;
            lifecycleHooks.onConnected = (context?: unknown) => {
              invokeCallbacks(normalizedTag, 'useOnConnected', cbs as Array<(...args: unknown[]) => void>, [context]);
            };
          }
          if (hookCallbacks.onDisconnected) {
            const cbs = hookCallbacks.onDisconnected as Array<
              (context?: unknown) => void
            >;
            lifecycleHooks.onDisconnected = (context?: unknown) => {
              invokeCallbacks(normalizedTag, 'useOnDisconnected', cbs as Array<(...args: unknown[]) => void>, [context]);
            };
          }
          if (hookCallbacks.onAttributeChanged) {
            const cbs = hookCallbacks.onAttributeChanged as Array<
              (
                name: string,
                oldValue: string | null,
                newValue: string | null,
                context?: unknown,
              ) => void
            >;
            lifecycleHooks.onAttributeChanged = (
              name: string,
              oldValue: string | null,
              newValue: string | null,
              context?: unknown,
            ) => {
              invokeCallbacks(normalizedTag, 'useOnAttributeChanged', cbs as Array<(...args: unknown[]) => void>, [name, oldValue, newValue, context]);
            };
          }
          if (hookCallbacks.onError) {
            const cbs = hookCallbacks.onError as Array<(err: Error) => void>;
            lifecycleHooks.onError = (err: Error) => {
              invokeCallbacks(normalizedTag, 'useOnError', cbs as Array<(...args: unknown[]) => void>, [err]);
            };
          }
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
    } catch {
      // Discovery render failed - props will be discovered on first real render
    }

    if (!customElements.get(normalizedTag)) {
      customElements.define(
        normalizedTag,
        createElementClass(normalizedTag, config) as CustomElementConstructor,
      );
    }
  }
}
