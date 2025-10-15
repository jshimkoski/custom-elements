import type {
  ComponentConfig,
  ComponentContext,
  Refs,
  WatcherState,
  VNode,
} from "./types";
import { reactiveSystem, isReactiveState } from "./reactive";
import { toKebab, safe } from "./helpers";
import { initWatchers, triggerWatchers } from "./watchers";
import { applyProps } from "./props";
import {
  handleConnected,
  handleDisconnected,
  handleAttributeChanged,
} from "./lifecycle";
import { renderComponent, requestRender, applyStyle } from "./render";
import { scheduleDOMUpdate } from "./scheduler";
import {
  setCurrentComponentContext,
  clearCurrentComponentContext,
} from "./hooks";
import { devError, devWarn } from './logger';

/**
 * @internal
 * Runtime registry of component configs.
 * NOTE: This is an internal implementation detail. Do not import from the
 * published package in consumer code — it is intended for runtime/HMR and
 * internal tests only. Consumers should use the public `component` API.
 */
export const registry = new Map<string, ComponentConfig<any, any, any>>();

// Expose the registry for browser/HMR use without overwriting existing globals
// (avoid cross-request mutation in SSR and preserve HMR behavior).
const GLOBAL_REG_KEY = Symbol.for("cer.registry");
if (typeof window !== "undefined") {
  const g = globalThis as any;
  // Authoritative, collision-safe slot for programmatic access
  if (!g[GLOBAL_REG_KEY]) g[GLOBAL_REG_KEY] = registry;
}

// --- Hot Module Replacement (HMR) ---
if (
  typeof import.meta !== "undefined" &&
  (import.meta as any).hot &&
  import.meta &&
  import.meta.hot
) {
  import.meta.hot.accept((newModule) => {
    // Update registry with new configs from the hot module
    if (newModule && newModule.registry) {
      for (const [tag, newConfig] of newModule.registry.entries()) {
        registry.set(tag, newConfig);
        // Update all instances to use new config
        if (typeof document !== "undefined") {
          document.querySelectorAll(tag).forEach((el) => {
            if (typeof (el as any)._cfg !== "undefined") {
              (el as any)._cfg = newConfig;
            }
            // HMR: Preserve existing state by keeping the context object intact.
            // Instead of re-executing the component function (which would create new refs),
            // we just update the config and re-render with the existing context.
            // This ensures refs and other reactive state are preserved across HMR updates.
            if (typeof (el as any)._render === "function") {
              (el as any)._render(newConfig);
            }
          });
        }
      }
    }
  });
}

export function createElementClass<
  S extends object,
  C extends object,
  P extends object,
  T extends object = any,
>(
  tag: string,
  config: ComponentConfig<S, C, P, T>,
): CustomElementConstructor | { new (): object } {
  // Validate that render is provided
  if (!config.render) {
    throw new Error("Component must have a render function");
  }
  if (typeof window === "undefined") {
    // SSR fallback: minimal class, no DOM, no lifecycle, no "this"
    return class {
      constructor() {}
    };
  }
  return class extends HTMLElement {
    public context: ComponentContext<S, C, P, T>;
    private _refs: Refs["refs"] = {};
    private _listeners: Array<() => void> = [];
    private _watchers: Map<string, WatcherState> = new Map();
    /** @internal */
    private _renderTimeoutId: ReturnType<typeof setTimeout> | null = null;
    private _mounted = false;
    private _hasError = false;
    private _initializing = true;

    private _componentId: string;

    private _styleSheet: CSSStyleSheet | null = null;

    private _lastHtmlStringForJitCSS = "";

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
      this.attachShadow({ mode: "open" });
      // Always read the latest config from the registry so re-registration
      // (HMR / tests) updates future instances.
      this._cfg = (registry.get(tag) as ComponentConfig<S, C, P, T>) || config;

      // Generate unique component ID for render deduplication
      this._componentId = `${tag}-${Math.random().toString(36).substr(2, 9)}`;

      const reactiveContext = this._initContext(config);

      // Helper to define non-enumerable properties
      const defineNonEnum = (obj: any, key: string, value: any) => {
        Object.defineProperty(obj, key, { value, writable: false, enumerable: false, configurable: false });
      };

      // Inject refs into context (non-enumerable to avoid proxy traps)
      defineNonEnum(reactiveContext, "refs", this._refs);
      defineNonEnum(reactiveContext, "requestRender", () => this.requestRender());
      defineNonEnum(reactiveContext, "_requestRender", () => this._requestRender());
      defineNonEnum(reactiveContext, "_componentId", this._componentId);
      defineNonEnum(reactiveContext, "_triggerWatchers", (path: string, newValue: any) => this._triggerWatchers(path, newValue));

      // --- Apply props BEFORE wiring listeners and emit ---
      this.context = reactiveContext;
      // Expose host element on the reactive context so hooks like useProps
      // can fallback to reading element properties when attributes were
      // serialized (e.g., objects became "[object Object]"). This is added
      // as a non-enumerable field to avoid interfering with reactive proxy.
      safe(() => { defineNonEnum(reactiveContext, '_host', this); });
      // Defer applying props until connectedCallback so attributes that are
      // set by the parent renderer (after element construction) are available.
      // applyProps will still be invoked from attributeChangedCallback when
      // attributes are set; connectedCallback will call it as a final step to
      // ensure defaults are applied when no attributes are present.

      // Inject emit helper for custom events (single canonical event API).
      // Emits a DOM CustomEvent and returns whether it was not defaultPrevented.
      defineNonEnum(this.context, "emit", (eventName: string, detail?: any, options?: CustomEventInit) => {
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
            const colonIndex = eventName.indexOf(":");
            if (colonIndex > 0) {
              const prefix = eventName.substring(0, colonIndex);
              const prop = eventName.substring(colonIndex + 1);
              const altName = prop.includes("-")
                ? `${prefix}:${prop.split("-").map((p, i) => i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)).join("")}`
                : `${prefix}:${prop.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`;
              if (altName !== eventName) {
                safe(() => { this.dispatchEvent(new CustomEvent(altName, eventOptions)); });
              }
            }
            
            return !ev.defaultPrevented;
      });

      // --- Inject config methods into context ---
      // Expose config functions on the context as callable helpers. Event
      // handling is DOM-first: use standard DOM event listeners or
      // `context.emit` (which dispatches a DOM CustomEvent) to communicate
      // with the host. There is no property-based host-callback dispatch.
      const cfgToUse =
        (registry.get(tag) as ComponentConfig<S, C, P, T>) || config;
      for (const key in cfgToUse) {
        const fn = (cfgToUse as any)[key];
        if (typeof fn === "function") {
          // Expose as context method: context.fn(...args) => fn(...args, context)
          (this.context as any)[key] = (...args: any[]) =>
            fn(...args, this.context);
        }
      }

      // Set up reactive property setters for all props to detect external changes
      if (cfgToUse.props) {
        for (const propName in cfgToUse.props) {
          let internalValue = (this as any)[propName];

          Object.defineProperty(this, propName, {
            get() {
              return internalValue;
            },
            set(newValue) {
              const oldValue = internalValue;
              internalValue = newValue;

              // Update the context to trigger watchers
              (this.context as any)[propName] = newValue;

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
            if (typeof (this as any).onHtmlStringUpdate === "function") {
              (this as any).onHtmlStringUpdate(html);
            }
          },
          (val) => {
            this._templateLoading = val;
            // Optionally, use loading state for external logic
            if (typeof (this as any).onLoadingStateChange === "function") {
              (this as any).onLoadingStateChange(val);
            }
          },
          (err) => {
            this._templateError = err;
            // Optionally, use error state for external logic
            if (typeof (this as any).onErrorStateChange === "function") {
              (this as any).onErrorStateChange(err);
            }
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
          const tag = (cfg && (cfg as any).tag) || this.tagName?.toLowerCase?.() || '<unknown>';
          const compId = this._componentId || '<unknown-id>';
          const safeProps: Record<string, any> = {};
          if (cfg && (cfg as any).props) {
            for (const k of Object.keys((cfg as any).props)) {
              try {
                const v = (this.context as any)[k];
                if (v instanceof Node) {
                  safeProps[k] = `[DOM Node: ${v.nodeName}]`;
                } else if (typeof v === 'object' && v !== null) {
                  safeProps[k] = Object.keys(v).length > 5 ? `[object(${Object.keys(v).length} keys)]` : v;
                } else {
                  safeProps[k] = v;
                }
              } catch (e) {
                safeProps[k] = '[unreadable]';
              }
            }
          }

          devError(`Error rendering component <${tag}> (id=${compId}):`, error);
          devError('Component props snapshot:', safeProps);
          devWarn('Common causes: accessing properties of null/undefined inside template interpolations; expensive or throwing expressions inside templates that evaluate eagerly. Fixes: use optional chaining (obj?.prop), guard with ternary, or use the runtime lazy overload: when(cond, () => html`...`).');
        } catch (e) {
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
        const self = this;
        function createReactive(obj: any, path = ""): any {
          if (Array.isArray(obj)) {
            // Create a proxy that intercepts array mutations
            return new Proxy(obj, {
              get(target, prop, receiver) {
                const value = Reflect.get(target, prop, receiver);

                // Intercept array mutating methods
                if (typeof value === "function" && typeof prop === "string") {
                  const mutatingMethods = [
                    "push",
                    "pop",
                    "shift",
                    "unshift",
                    "splice",
                    "sort",
                    "reverse",
                  ];
                  if (mutatingMethods.includes(prop)) {
                    return function (...args: any[]) {
                      const result = value.apply(target, args);

                      if (!self._initializing) {
                        const fullPath = path || "root";
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
                target[prop as any] = value;
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
                delete target[prop as any];
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
          if (obj && typeof obj === "object") {
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
                target[prop as any] = createReactive(value, fullPath);
                if (!self._initializing) {
                  self._triggerWatchers(fullPath, target[prop as any]);
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
      } catch (error) {
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

    private _triggerWatchers(path: string, newValue: any): void {
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
  let normalizedTag = toKebab(tag);
  if (!normalizedTag.includes("-")) {
    normalizedTag = `cer-${normalizedTag}`;
  }

  // Store lifecycle hooks from the render function
  let lifecycleHooks: {
    onConnected?: () => void;
    onDisconnected?: () => void;
    onAttributeChanged?: (
      name: string,
      oldValue: string | null,
      newValue: string | null,
    ) => void;
    onError?: (error: Error) => void;
  } = {};

  // Create component config
  const config: ComponentConfig<{}, {}, {}, {}> = {
    // Props are accessed via useProps() hook
    props: {},

    // Add lifecycle hooks from the stored functions
    onConnected: (_context) => {
      if (lifecycleHooks.onConnected) {
        lifecycleHooks.onConnected();
      }
    },

    onDisconnected: (_context) => {
      if (lifecycleHooks.onDisconnected) {
        lifecycleHooks.onDisconnected();
      }
    },

    onAttributeChanged: (name, oldValue, newValue, _context) => {
      if (lifecycleHooks.onAttributeChanged) {
        lifecycleHooks.onAttributeChanged(name, oldValue, newValue);
      }
    },

    onError: (error, _context) => {
      if (lifecycleHooks.onError && error) {
        lifecycleHooks.onError(error);
      }
    },

    render: (context) => {
      // Track dependencies for rendering
      // Use stable component ID from context if available, otherwise generate new one
      const componentId =
        (context as any)._componentId ||
        `${normalizedTag}-${Math.random().toString(36).substr(2, 9)}`;

      reactiveSystem.setCurrentComponent(componentId, () => {
        if (context.requestRender) {
          context.requestRender();
        }
      });

      try {
        // Set current component context for hooks
        setCurrentComponentContext(context);

        // Call render function with no arguments - use useProps() hook for props access
        // If renderFn throws synchronously (for example due to eager interpolation
        // inside templates), invoke any useOnError hook that the component may
        // have already registered during the render execution before rethrowing.
        let result: any;
        try {
          result = renderFn();
        } catch (err) {
          try {
            const hookCallbacks = (context as any)?._hookCallbacks;
            if (hookCallbacks && typeof hookCallbacks.onError === 'function') {
              try { hookCallbacks.onError(err); } catch (e) { /* swallow */ }
            }
          } catch (e) {
            /* best-effort */
          }
          throw err;
        }

        // Process hook callbacks that were set during render
        if ((context as any)._hookCallbacks) {
          const hookCallbacks = (context as any)._hookCallbacks;
          if (hookCallbacks.onConnected) {
            lifecycleHooks.onConnected = hookCallbacks.onConnected;
          }
          if (hookCallbacks.onDisconnected) {
            lifecycleHooks.onDisconnected = hookCallbacks.onDisconnected;
          }
          if (hookCallbacks.onAttributeChanged) {
            lifecycleHooks.onAttributeChanged =
              hookCallbacks.onAttributeChanged;
          }
          if (hookCallbacks.onError) {
            lifecycleHooks.onError = hookCallbacks.onError;
          }
          if (hookCallbacks.style) {
            // Store the style callback in the context for applyStyle to use
            (context as any)._styleCallback = hookCallbacks.style;
          }
          // If useProps() was called, update config.props with the defaults
          if (hookCallbacks.props) {
            const propsDefaults = hookCallbacks.props;
            config.props = Object.fromEntries(
              Object.entries(propsDefaults).map(([key, defaultValue]) => {
                const type =
                  typeof defaultValue === "boolean"
                    ? Boolean
                    : typeof defaultValue === "number"
                      ? Number
                      : typeof defaultValue === "string"
                        ? String
                        : Function; // Use Function for complex types
                return [key, { type, default: defaultValue as string | number | boolean }];
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

  // CRITICAL: Perform a "discovery render" to detect props from useProps()
  // This must happen BEFORE defining the custom element, so observedAttributes
  // includes all props declared via useProps()
  if (typeof window !== "undefined") {
    try {
      // Create a minimal mock context for discovery
      const discoveryContext: any = {
        _hookCallbacks: {},
        requestRender: () => {},
      };
      setCurrentComponentContext(discoveryContext);
      try {
        // Execute once to trigger useProps() calls. If this throws we want to
        // surface the error to any useOnError hook that the component may have
        // registered during discovery and emit DEV diagnostics so authors see
        // what's going wrong (best-effort).
        renderFn();
      } catch (err) {
        try {
          const hookCallbacks = (discoveryContext as any)?._hookCallbacks;
          if (hookCallbacks && typeof hookCallbacks.onError === 'function') {
            try { hookCallbacks.onError(err); } catch (e) { /* swallow */ }
          }
          // DEV diagnostics for discovery-time failures
          devError(`Error during component discovery render <${normalizedTag}>:`, err);
          devWarn('Error occurred during initial component discovery render. Consider guarding expensive expressions or using lazy factories for directives like when().');
        } catch (e) {
          /* best-effort */
        }
        clearCurrentComponentContext();
        throw err;
      }
      clearCurrentComponentContext();
      
      // If useProps() was called during discovery, update config.props
      if (discoveryContext._hookCallbacks?.props) {
        const propsDefaults = discoveryContext._hookCallbacks.props;
        config.props = Object.fromEntries(
          Object.entries(propsDefaults).map(([key, defaultValue]) => {
            const type =
              typeof defaultValue === "boolean"
                ? Boolean
                : typeof defaultValue === "number"
                  ? Number
                  : typeof defaultValue === "string"
                    ? String
                    : Function;
            return [key, { type, default: defaultValue as string | number | boolean }];
          }),
        );
        // Update registry with discovered props
        registry.set(normalizedTag, config);
      }
    } catch (e) {
      // Discovery render failed - this is OK, props will be discovered on first real render
    }

    if (!customElements.get(normalizedTag)) {
      customElements.define(
        normalizedTag,
        createElementClass(normalizedTag, config) as CustomElementConstructor,
      );
    }
  }
}
