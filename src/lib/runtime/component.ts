import type {
  ComponentConfig,
  ComponentContext,
  Refs,
  WatcherState,
  VNode,
} from './types';
import { reactiveSystem, isReactiveState } from './reactive';
import { toKebab, safe } from './helpers';
import { initWatchers, triggerWatchers } from './watchers';
import { applyProps } from './props';
import {
  handleConnected,
  handleDisconnected,
  handleAttributeChanged,
} from './lifecycle';
import {
  renderComponent,
  requestRender,
  applyStyle,
  registerChildComponent,
  unregisterChildComponent,
} from './render';
import { scheduleDOMUpdate } from './scheduler';
import {
  setCurrentComponentContext,
  clearCurrentComponentContext,
  beginDiscoveryRender,
  endDiscoveryRender,
} from './hooks';
import { devError, devWarn } from './logger';

// Interface for custom element with framework-specific properties
interface CustomElement extends HTMLElement {
  _cfg?: ComponentConfig<object, object, object>;
  _render?: (config: ComponentConfig<object, object, object>) => void;
  onLoadingStateChange?: (loading: boolean) => void;
  onErrorStateChange?: (error: Error | null) => void;
}

/**
 * @internal
 * Runtime registry of component configs.
 * NOTE: This is an internal implementation detail. Do not import from the
 * published package in consumer code — it is intended for runtime/HMR and
 * internal tests only. Consumers should use the public `component` API.
 */
export const registry = new Map<
  string,
  ComponentConfig<object, object, object>
>();

// Expose the registry for browser/HMR use without overwriting existing globals
// (avoid cross-request mutation in SSR and preserve HMR behavior).
const GLOBAL_REG_KEY = Symbol.for('cer.registry');

/**
 * Lazily initialize the global registry slot with SSR safety.
 * This avoids performing a write to globalThis at module-import time
 * (which is a side-effect that prevents bundlers from tree-shaking).
 * Enhanced with SSR detection and multi-tenant safety.
 */
function initGlobalRegistryIfNeeded(): void {
  // Enhanced SSR detection
  const isSSR =
    typeof window === 'undefined' &&
    typeof document === 'undefined' &&
    typeof navigator === 'undefined';

  if (!isSSR) {
    try {
      const g = globalThis as Record<string | symbol, unknown>;
      if (!g[GLOBAL_REG_KEY]) {
        // Use a unique registry per realm to avoid cross-contamination
        const realmId = crypto.randomUUID();
        g[GLOBAL_REG_KEY] = new Map([...registry.entries()]);
        // Store realm identifier for debugging
        (
          g[GLOBAL_REG_KEY] as Record<string, unknown> & { __realmId?: string }
        ).__realmId = realmId;
      }
    } catch (error) {
      // Gracefully handle cases where globalThis access is restricted
      devWarn('Could not initialize global registry:', error);
    }
  }
}

// --- Hot Module Replacement (HMR) ---
{
  type HMRImportMeta = {
    hot?: { accept: (fn: (newModule?: unknown) => void) => void };
  };
  const hmrHot = (import.meta as HMRImportMeta).hot;
  if (hmrHot) {
    hmrHot.accept((newModule: unknown) => {
      // Update registry with new configs from the hot module (SSR-safe)
      const mod = newModule as
        | { registry?: Map<string, ComponentConfig<object, object, object>> }
        | undefined;
      if (mod && mod.registry) {
        for (const [tag, newConfig] of mod.registry.entries()) {
          registry.set(tag, newConfig);
          // Update all instances to use new config (browser only)
          if (typeof document !== 'undefined' && document.querySelectorAll) {
            try {
              document.querySelectorAll(tag).forEach((el) => {
                const customEl = el as CustomElement;
                if (typeof customEl._cfg !== 'undefined') {
                  customEl._cfg = newConfig;
                }
                // HMR: Preserve existing state by keeping the context object intact.
                // Instead of re-executing the component function (which would create new refs),
                // we just update the config and re-render with the existing context.
                // This ensures refs and other reactive state are preserved across HMR updates.
                if (typeof customEl._render === 'function') {
                  customEl._render(newConfig);
                }
              });
            } catch (error) {
              devWarn('HMR update failed:', error);
            }
          }
        }
      }
    });
  }
}

export function createElementClass<
  S extends object,
  C extends object,
  P extends object,
  T extends object = object,
>(
  tag: string,
  config: ComponentConfig<S, C, P, T>,
): CustomElementConstructor | { new (): object } {
  // Validate that render is provided
  if (!config.render) {
    throw new Error('Component must have a render function');
  }
  if (typeof window === 'undefined') {
    // SSR fallback: minimal class, no DOM, no lifecycle, no "this"
    return class {
      constructor() {}
    };
  }
  return class extends HTMLElement {
    public context: ComponentContext<S, C, P, T>;
    private _refs: Refs['refs'] = {};
    private _listeners: Array<() => void> = [];
    private _watchers: Map<string, WatcherState> = new Map();
    /** @internal */
    private _renderTimeoutId: ReturnType<typeof setTimeout> | null = null;
    private _mounted = false;
    private _hasError = false;
    private _initializing = true;

    private _componentId: string;

    private _styleSheet: CSSStyleSheet | null = null;

    private _lastHtmlStringForJitCSS = '';

    /**
     * Returns the last rendered HTML string for JIT CSS.
     */
    public get lastHtmlStringForJitCSS(): string {
      return this._lastHtmlStringForJitCSS;
    }

    /**
     * Returns true if the component is currently loading.
     */
    public get isLoading(): boolean {
      return this._templateLoading;
    }

    /**
     * Returns the last error thrown during rendering, or null if none.
     */
    public get lastError(): Error | null {
      return this._templateError;
    }

    private _cfg: ComponentConfig<S, C, P, T>;
    private _lastRenderTime = 0;
    private _renderCount = 0;
    private _templateLoading = false;
    private _templateError: Error | null = null;

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      // Always read the latest config from the registry so re-registration
      // (HMR / tests) updates future instances.
      this._cfg = (registry.get(tag) as ComponentConfig<S, C, P, T>) || config;

      // Generate unique component ID for render deduplication
      this._componentId = `${tag}-${crypto.randomUUID()}`;

      const reactiveContext = this._initContext(config);

      // Helper to define non-enumerable properties
      const defineNonEnum = (
        obj: Record<string, unknown>,
        key: string,
        value: unknown,
      ) => {
        Object.defineProperty(obj, key, {
          value,
          writable: false,
          enumerable: false,
          configurable: false,
        });
      };

      // Inject refs into context (non-enumerable to avoid proxy traps)
      defineNonEnum(reactiveContext, 'refs', this._refs);
      defineNonEnum(reactiveContext, 'requestRender', () =>
        this.requestRender(),
      );
      defineNonEnum(reactiveContext, '_requestRender', () =>
        this._requestRender(),
      );
      defineNonEnum(reactiveContext, '_componentId', this._componentId);
      defineNonEnum(
        reactiveContext,
        '_triggerWatchers',
        (path: string, newValue: unknown) =>
          this._triggerWatchers(path, newValue),
      );

      // --- Apply props BEFORE wiring listeners and emit ---
      this.context = reactiveContext;
      // Expose host element on the reactive context so hooks like useProps
      // can fallback to reading element properties when attributes were
      // serialized (e.g., objects became "[object Object]"). This is added
      // as a non-enumerable field to avoid interfering with reactive proxy.
      safe(() => {
        defineNonEnum(reactiveContext, '_host', this);
      });
      // Defer applying props until connectedCallback so attributes that are
      // set by the parent renderer (after element construction) are available.
      // applyProps will still be invoked from attributeChangedCallback when
      // attributes are set; connectedCallback will call it as a final step to
      // ensure defaults are applied when no attributes are present.

      // Inject emit helper for custom events (single canonical event API).
      // Emits a DOM CustomEvent and returns whether it was not defaultPrevented.
      defineNonEnum(
        this.context,
        'emit',
        (eventName: string, detail?: unknown, options?: CustomEventInit) => {
          const eventOptions = {
            detail,
            bubbles: true,
            composed: true,
            ...(options || {}),
          };
          const ev = new CustomEvent(eventName, eventOptions);

          // Primary event dispatch
          this.dispatchEvent(ev);

          // Dispatch alternate camel/kebab variation for compatibility
          const colonIndex = eventName.indexOf(':');
          if (colonIndex > 0) {
            const prefix = eventName.substring(0, colonIndex);
            const prop = eventName.substring(colonIndex + 1);
            const altName = prop.includes('-')
              ? `${prefix}:${prop
                  .split('-')
                  .map((p, i) =>
                    i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1),
                  )
                  .join('')}`
              : `${prefix}:${prop.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`;
            if (altName !== eventName) {
              safe(() => {
                this.dispatchEvent(new CustomEvent(altName, eventOptions));
              });
            }
          }

          return !ev.defaultPrevented;
        },
      );

      // --- Inject config methods into context ---
      // Expose config functions on the context as callable helpers. Event
      // handling is DOM-first: use standard DOM event listeners or
      // `context.emit` (which dispatches a DOM CustomEvent) to communicate
      // with the host. There is no property-based host-callback dispatch.
      const cfgToUse =
        (registry.get(tag) as ComponentConfig<S, C, P, T>) || config;
      for (const key in cfgToUse) {
        const fn = (cfgToUse as Record<string, unknown>)[key];
        if (typeof fn === 'function') {
          // Expose as context method: context.fn(...args) => fn(...args, context)
          (this.context as Record<string, unknown>)[key] = (
            ...args: unknown[]
          ) => fn(...args, this.context);
        }
      }

      // Set up reactive property setters for all props to detect external changes
      if (cfgToUse.props) {
        for (const propName in cfgToUse.props) {
          let internalValue = (this as Record<string, unknown>)[propName];

          Object.defineProperty(this, propName, {
            get() {
              return internalValue;
            },
            set(newValue) {
              const oldValue = internalValue;
              internalValue = newValue;

              // Update the context to trigger watchers
              (this.context as Record<string, unknown>)[propName] = newValue;

              // Apply props to sync with context
              if (!this._initializing) {
                this._applyProps(cfgToUse);
                // Trigger re-render if the value actually changed
                if (oldValue !== newValue) {
                  this._requestRender();
                }
              }
            },
            enumerable: true,
            configurable: true,
          });
        }
      }

      this._initializing = false;

      // Initialize watchers after initialization phase is complete
      this._initWatchers(cfgToUse);

      // Apply props before initial render so they're available immediately
      // Note: Attributes set by parent renderers may not be available yet,
      // but connectedCallback will re-apply props and re-render
      this._applyProps(cfgToUse);

      // Initial render (styles are applied within render)
      this._render(cfgToUse);
    }

    connectedCallback() {
      this._runLogicWithinErrorBoundary(config, () => {
        // Register this component with parent's shadowRoot for optimized child HTML aggregation
        const parentHost = this.getRootNode() as ShadowRoot | Document;
        if (parentHost && parentHost !== document && 'host' in parentHost) {
          registerChildComponent(parentHost as ShadowRoot, this);
        }

        // Ensure props reflect attributes set by the parent renderer before
        // invoking lifecycle hooks.
        this._applyProps(config);
        // Re-render after applying props to ensure component shows updated values
        this._requestRender();
        handleConnected(config, this.context, this._mounted, (val) => {
          this._mounted = val;
        });
      });
    }

    disconnectedCallback() {
      this._runLogicWithinErrorBoundary(config, () => {
        // Unregister this component from parent's shadowRoot cache
        const parentHost = this.getRootNode() as ShadowRoot | Document;
        if (parentHost && parentHost !== document && 'host' in parentHost) {
          unregisterChildComponent(parentHost as ShadowRoot, this);
        }

        handleDisconnected(
          config,
          this.context,
          this._listeners,
          () => {
            this._listeners = [];
          },
          () => {
            this._watchers.clear();
          },
          (val) => {
            this._templateLoading = val;
          },
          (err) => {
            this._templateError = err;
          },
          (val) => {
            this._mounted = val;
          },
        );
      });
    }

    attributeChangedCallback(
      name: string,
      oldValue: string | null,
      newValue: string | null,
    ) {
      this._runLogicWithinErrorBoundary(config, () => {
        this._applyProps(config);
        // Re-render after applying props to ensure component shows updated values
        if (oldValue !== newValue) {
          this._requestRender();
        }
        handleAttributeChanged(config, name, oldValue, newValue, this.context);
      });
    }

    static get observedAttributes() {
      return config.props ? Object.keys(config.props).map(toKebab) : [];
    }

    // --- Render ---
    private _render(cfg: ComponentConfig<S, C, P, T>) {
      this._runLogicWithinErrorBoundary(cfg, () => {
        // _render invoked; proceed to render via renderComponent
        renderComponent(
          this.shadowRoot,
          cfg,
          this.context,
          this._refs,
          (html) => {
            this._lastHtmlStringForJitCSS = html;
            // Optionally, use the latest HTML string for debugging or external logic
            if (
              typeof (this as { onHtmlStringUpdate?: (html: string) => void })
                .onHtmlStringUpdate === 'function'
            ) {
              const htmlUpdater = this as unknown as
                | { onHtmlStringUpdate?: (html: string) => void }
                | undefined;
              htmlUpdater?.onHtmlStringUpdate?.(html as string);
            }
          },
          (val) => {
            this._templateLoading = val;
            // Optionally, use loading state for external logic
            const selfAsAny = this as unknown as
              | { onLoadingStateChange?: (val: boolean) => void }
              | undefined;
            selfAsAny?.onLoadingStateChange?.(val);
          },
          (err) => {
            this._templateError = err;
            // Optionally, use error state for external logic
            const selfAsAny2 = this as unknown as
              | { onErrorStateChange?: (err: Error) => void }
              | undefined;
            selfAsAny2?.onErrorStateChange?.(err as Error);
          },
          (html) => this._applyStyle(cfg, html),
        );
      });
    }

    public requestRender() {
      this._requestRender();
    }

    _requestRender() {
      this._runLogicWithinErrorBoundary(this._cfg, () => {
        // Use scheduler to batch render requests
        scheduleDOMUpdate(() => {
          requestRender(
            () => this._render(this._cfg),
            this._lastRenderTime,
            this._renderCount,
            (t) => {
              this._lastRenderTime = t;
            },
            (c) => {
              this._renderCount = c;
            },
            this._renderTimeoutId,
            (id) => {
              this._renderTimeoutId = id;
            },
          );
        }, this._componentId);
      });
    }

    // --- Style ---
    private _applyStyle(cfg: ComponentConfig<S, C, P, T>, html: string) {
      this._runLogicWithinErrorBoundary(cfg, () => {
        applyStyle(
          this.shadowRoot,
          this.context,
          html,
          this._styleSheet,
          (sheet) => {
            this._styleSheet = sheet;
          },
        );
      });
    }

    // --- Error Boundary function ---
    private _runLogicWithinErrorBoundary(
      cfg: ComponentConfig<S, C, P, T>,
      fn: () => void,
    ) {
      if (this._hasError) this._hasError = false;
      try {
        fn();
      } catch (error) {
        this._hasError = true;

        // DEV-only diagnostic: provide actionable context to help debugging
        try {
          const tag = this.tagName?.toLowerCase?.() || '<unknown>';
          const compId = this._componentId || '<unknown-id>';
          const safeProps: Record<string, unknown> = {};
          if (cfg && cfg.props) {
            for (const k of Object.keys(cfg.props)) {
              try {
                const v = (this.context as Record<string, unknown>)[k];
                if (v instanceof Node) {
                  safeProps[k] = `[DOM Node: ${v.nodeName}]`;
                } else if (typeof v === 'object' && v !== null) {
                  safeProps[k] =
                    Object.keys(v).length > 5
                      ? `[object(${Object.keys(v).length} keys)]`
                      : v;
                } else {
                  safeProps[k] = v;
                }
              } catch {
                safeProps[k] = '[unreadable]';
              }
            }
          }

          devError(`Error rendering component <${tag}> (id=${compId}):`, error);
          devError('Component props snapshot:', safeProps);
          devWarn(
            'Common causes: accessing properties of null/undefined inside template interpolations; expensive or throwing expressions inside templates that evaluate eagerly. Fixes: use optional chaining (obj?.prop), guard with ternary, or use the runtime lazy overload: when(cond, () => html`...`).',
          );
        } catch {
          // best-effort diagnostics - swallow failures here to preserve original behavior
        }

        if (cfg.onError) {
          cfg.onError(error as Error | null, this.context);
        }
      }
    }

    // --- State, props, computed ---
    private _initContext(
      cfg: ComponentConfig<S, C, P, T>,
    ): ComponentContext<S, C, P, T> {
      try {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        function createReactive<T>(obj: T, path = ''): T {
          if (Array.isArray(obj)) {
            // Create a proxy that intercepts array mutations
            return new Proxy(obj, {
              get(target, prop, receiver) {
                const value = Reflect.get(target, prop, receiver);

                // Intercept array mutating methods
                if (typeof value === 'function' && typeof prop === 'string') {
                  const mutatingMethods = [
                    'push',
                    'pop',
                    'shift',
                    'unshift',
                    'splice',
                    'sort',
                    'reverse',
                  ];
                  if (mutatingMethods.includes(prop)) {
                    return function (...args: unknown[]) {
                      const result = value.apply(target, args);

                      if (!self._initializing) {
                        const fullPath = path || 'root';
                        self._triggerWatchers(fullPath, target);
                        scheduleDOMUpdate(
                          () => self._render(cfg),
                          self._componentId,
                        );
                      }

                      return result;
                    };
                  }
                }

                return value;
              },
              set(target, prop, value) {
                (target as Record<string, unknown>)[String(prop)] = value;
                if (!self._initializing) {
                  const fullPath = path
                    ? `${path}.${String(prop)}`
                    : String(prop);
                  self._triggerWatchers(fullPath, value);
                  scheduleDOMUpdate(() => self._render(cfg), self._componentId);
                }
                return true;
              },
              deleteProperty(target, prop) {
                delete (target as Record<string, unknown>)[String(prop)];
                if (!self._initializing) {
                  const fullPath = path
                    ? `${path}.${String(prop)}`
                    : String(prop);
                  self._triggerWatchers(fullPath, undefined);
                  scheduleDOMUpdate(() => self._render(cfg), self._componentId);
                }
                return true;
              },
            });
          }
          if (obj && typeof obj === 'object') {
            // Skip ReactiveState objects to avoid corrupting their internal structure
            if (isReactiveState(obj)) {
              return obj;
            }

            for (const key in obj) {
              const newPath = path ? `${path}.${key}` : key;
              obj[key] = createReactive(obj[key], newPath);
            }
            return new Proxy(obj, {
              set(target, prop, value) {
                const fullPath = path
                  ? `${path}.${String(prop)}`
                  : String(prop);
                (target as Record<string, unknown>)[String(prop)] =
                  createReactive(value, fullPath);
                if (!self._initializing) {
                  self._triggerWatchers(
                    fullPath,
                    (target as Record<string, unknown>)[String(prop)],
                  );
                  scheduleDOMUpdate(() => self._render(cfg), self._componentId);
                }
                return true;
              },
              get(target, prop, receiver) {
                return Reflect.get(target, prop, receiver);
              },
            });
          }
          return obj;
        }
        return createReactive({
          // For functional components, state is managed by state() function calls
          // Include prop defaults in initial reactive context so prop updates trigger reactivity
          ...(cfg.props
            ? Object.fromEntries(
                Object.entries(cfg.props).map(([key, def]) => [
                  key,
                  def.default,
                ]),
              )
            : {}),
        }) as ComponentContext<S, C, P, T>;
      } catch {
        return {} as ComponentContext<S, C, P, T>;
      }
    }

    private _initWatchers(cfg: ComponentConfig<S, C, P, T>): void {
      this._runLogicWithinErrorBoundary(cfg, () => {
        initWatchers(
          this.context,
          this._watchers,
          {}, // Watchers are now handled by the watch() function in functional API
        );
      });
    }

    private _triggerWatchers(path: string, newValue: unknown): void {
      triggerWatchers(this.context, this._watchers, path, newValue);
    }

    private _applyProps(cfg: ComponentConfig<S, C, P, T>): void {
      this._runLogicWithinErrorBoundary(cfg, () => {
        try {
          applyProps(this, cfg, this.context);
        } catch (error) {
          this._hasError = true;
          if (cfg.onError) cfg.onError(error as Error | null, this.context);
          // Note: errorFallback was removed as it's handled by the functional API directly
        }
      });
    }
  };
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

// Overload: No parameters - use useProps() hook for props access
export function component(
  tag: string,
  renderFn: () => VNode | VNode[] | Promise<VNode | VNode[]>,
): void;

// Implementation
export function component(
  tag: string,
  renderFn: () => VNode | VNode[] | Promise<VNode | VNode[]>,
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

    // Add lifecycle hooks from the stored functions
    onConnected: (context) => {
      if (lifecycleHooks.onConnected) {
        try {
          lifecycleHooks.onConnected(context);
        } catch {
          // swallow user errors in lifecycle hooks
        }
      }
    },

    onDisconnected: (context) => {
      if (lifecycleHooks.onDisconnected) {
        try {
          lifecycleHooks.onDisconnected(context);
        } catch {
          /* swallow */
        }
      }
    },

    onAttributeChanged: (name, oldValue, newValue, context) => {
      if (lifecycleHooks.onAttributeChanged) {
        try {
          lifecycleHooks.onAttributeChanged(name, oldValue, newValue, context);
        } catch {
          /* swallow */
        }
      }
    },

    onError: (error, context) => {
      if (lifecycleHooks.onError && error) {
        try {
          lifecycleHooks.onError(error, context);
        } catch {
          /* swallow */
        }
      }
    },

    render: (context) => {
      // Track dependencies for rendering
      // Use stable component ID from context if available, otherwise generate new one
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
        // Set current component context for hooks
        setCurrentComponentContext(context);

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
              for (const cb of cbs) {
                try {
                  cb(context);
                } catch {
                  /* swallow */
                }
              }
            };
          }
          if (hookCallbacks.onDisconnected) {
            const cbs = hookCallbacks.onDisconnected as Array<
              (context?: unknown) => void
            >;
            lifecycleHooks.onDisconnected = (context?: unknown) => {
              for (const cb of cbs) {
                try {
                  cb(context);
                } catch {
                  /* swallow */
                }
              }
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
              for (const cb of cbs) {
                try {
                  cb(name, oldValue, newValue, context);
                } catch {
                  /* swallow */
                }
              }
            };
          }
          if (hookCallbacks.onError) {
            const cbs = hookCallbacks.onError as Array<(err: Error) => void>;
            lifecycleHooks.onError = (err: Error) => {
              for (const cb of cbs) {
                try {
                  cb(err);
                } catch {
                  /* swallow */
                }
              }
            };
          }
          // Note: `useStyle()` stores a computed style string directly on
          // the current context as `_computedStyle`. The runtime reads
          // `_computedStyle` in `applyStyle`. Historically the code also
          // supported a style callback taking an HTMLElement; that path is
          // deprecated and not used by `useStyle`. We intentionally avoid
          // storing a `_styleCallback` here to keep the contract simple and
          // consistent (string-returning `useStyle`).
          // If useProps() was called, update config.props with the defaults
          if (hookCallbacks.props) {
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
        endDiscoveryRender();
        clearCurrentComponentContext();
        throw err;
      }
      endDiscoveryRender();
      clearCurrentComponentContext();

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
