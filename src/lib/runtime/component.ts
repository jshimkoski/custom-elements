import type {
  ComponentConfig,
  ComponentContext,
  Refs,
  WatchCallback,
  WatchOptions,
  WatcherState,
} from "./types";
import { toKebab, escapeHTML } from "./helpers";
import { initWatchers, triggerWatchers } from "./watchers";
import { applyProps } from "./props";
import {
  handleConnected,
  handleDisconnected,
  handleAttributeChanged
} from "./lifecycle";
import { renderComponent, requestRender, applyStyle } from "./render";

// --- Internal registry ---
const registry = new Map<string, ComponentConfig<any, any, any>>();

// --- Hot Module Replacement (HMR) ---
if (
  typeof import.meta !== 'undefined' &&
  (import.meta as any).hot &&
  import.meta && import.meta.hot
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
            if (typeof (el as any)._render === "function") {
              (el as any)._render(newConfig);
            }
          });
        }
      }
    }
  });
}

export function component<
  S extends object = {},
  C extends object = {},
  P extends object = {},
  T extends object = any,
>(
  tag: string,
  renderOrConfig: ((context: ComponentContext<S, C, P, T>) => any) | ComponentConfig<S, C, P, T>,
  config?: Partial<ComponentConfig<S, C, P, T>>
): void {
  let normalizedTag = toKebab(tag);
  if (!normalizedTag.includes("-")) {
    normalizedTag = `cer-${normalizedTag}`;
  }

  let finalConfig: ComponentConfig<S, C, P, T>;
  if (typeof renderOrConfig === "function") {
    finalConfig = { ...config, render: renderOrConfig } as ComponentConfig<S, C, P, T>;
  } else {
    finalConfig = renderOrConfig;
  }

  // Provide a default onError handler if not defined
  if (typeof finalConfig.onError !== "function") {
    finalConfig.onError = (error, state) => {
      // Lightweight, developer-friendly default
      console.error(`[${normalizedTag}] Error:`, error, state);
    };
  }

  registry.set(normalizedTag, finalConfig);
  if (typeof window !== "undefined") {
    // If the custom element is not defined yet, define it.
    if (!customElements.get(normalizedTag)) {
    customElements.define(normalizedTag, createElementClass<S, C, P, T>(normalizedTag, finalConfig) as CustomElementConstructor);
    } else {
      // If it is already defined (e.g., re-registration during tests or HMR),
      // update existing instances to use the new config and request a render.
      try {
        document.querySelectorAll(normalizedTag).forEach((el) => {
          try {
            // @ts-ignore - internal API used for hot-swap/update
            if (typeof (el as any)._cfg !== 'undefined') (el as any)._cfg = finalConfig;
            if (typeof (el as any)._render === 'function') (el as any)._render(finalConfig);
          } catch (e) {
            // ignore per-instance errors
          }
        });
      } catch (e) {
        // document may be unavailable in some environments, ignore
      }
    }
  }
}

export function createElementClass<
  S extends object,
  C extends object,
  P extends object,
  T extends object = any,
>(tag: string, config: ComponentConfig<S, C, P, T>): CustomElementConstructor | { new (): object } {
  // Validate that render is provided
  if (!config.render) {
    throw new Error(
      "Component must have a render function",
    );
  }
  if (typeof window === "undefined") {
    // SSR fallback: minimal class, no DOM, no lifecycle, no "this"
    return class { constructor() {} };
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

      const reactiveContext = this._initContext(config);

      // Inject refs into context (non-enumerable to avoid proxy traps)
      Object.defineProperty(reactiveContext, "refs", {
        value: this._refs,
        writable: false,
        enumerable: false,
        configurable: false,
      });

      // Inject requestRender into context (non-enumerable to avoid proxy traps)
      Object.defineProperty(reactiveContext, 'requestRender', {
        value: () => this.requestRender(),
        writable: false,
        enumerable: false,
        configurable: false,
      });

      // --- Apply props BEFORE wiring listeners and emit ---
      this.context = reactiveContext;
      this._applyProps(config);

      // Inject emit helper for custom events
      Object.defineProperty(this.context, "emit", {
        value: (eventName: string, detail?: any, options?: CustomEventInit) => {
          this.dispatchEvent(
            new CustomEvent(eventName, {
              detail,
              bubbles: true,
              composed: true,
              ...(options || {})
            })
          );
          // Always check for handler on element property, context, and config
          const handlerName = `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`;
          // 1. Handler set as property on the element
          const propHandler = typeof (this as any)[handlerName] === "function"
            ? (this as any)[handlerName]
            : undefined;
          // 2. Handler set in context (from props)
          const contextHandler = typeof (this.context as any)[handlerName] === "function"
            ? (this.context as any)[handlerName]
            : undefined;
          // 3. Handler set in config
          const configHandler = typeof (config as any)[handlerName] === "function"
            ? (config as any)[handlerName]
            : undefined;
          if (propHandler) propHandler(detail, this.context);
          if (contextHandler && contextHandler !== propHandler) contextHandler(detail, this.context);
          if (configHandler && configHandler !== propHandler && configHandler !== contextHandler)
            configHandler(detail, this.context);
        },
        writable: false,
        enumerable: false,
        configurable: false,
      });

      // --- Inject config methods into state ---
      const cfgToUse = (registry.get(tag) as ComponentConfig<S, C, P, T>) || config;
      Object.keys(cfgToUse).forEach((key) => {
        const fn = (cfgToUse as any)[key];
        if (typeof fn === "function" && !key.startsWith("on")) {
          (this.context as any)[key] = (...args: any[]) =>
            fn(...args, this.context);
        }
        // Listen for custom events
        else if (key.startsWith("on") && key.length > 2 && key[2] === key[2].toUpperCase()) {
          const eventName = key.slice(2, 3).toLowerCase() + key.slice(3);
          this.addEventListener(eventName, (e: Event) => {
            // Always check for handler on element property first
            const fn =
              typeof (this as any)[key] === "function"
                ? (this as any)[key]
                : (this.context as any)[key];
            if (typeof fn === "function") {
              fn((e as CustomEvent).detail, this.context);
            }
          });
        }
      });

      this._applyComputed(cfgToUse);

      this._initializing = false;

      // Initialize watchers after initialization phase is complete
      this._initWatchers(cfgToUse);

      // Initial render (styles are applied within render)
      this._render(cfgToUse);
    }

    connectedCallback() {
      this._runLogicWithinErrorBoundary(config, () => {
        handleConnected(
          config,
          this.context,
          this._mounted,
          (val) => { this._mounted = val; }
        );
      });
    }

    disconnectedCallback() {
      this._runLogicWithinErrorBoundary(config, () => {
        handleDisconnected(
          config,
          this.context,
          this._listeners,
          () => { this._listeners = []; },
          () => { this._watchers.clear(); },
          (val) => { this._templateLoading = val; },
          (err) => { this._templateError = err; },
          (val) => { this._mounted = val; }
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
        handleAttributeChanged(
          config,
          name,
          oldValue,
          newValue,
          this.context
        );
      });
    }

    static get observedAttributes() {
      return config.props ? Object.keys(config.props).map(toKebab) : [];
    }

    private _applyComputed(cfg: ComponentConfig<S, C, P>) {
      this._runLogicWithinErrorBoundary(config, () => {
        if (!cfg.computed) return;
        Object.entries(cfg.computed).forEach(([key, fn]) => {
          Object.defineProperty(this.context, key, {
            get: () => {
              const val = (fn as (context: ComponentContext<S, C, P, T>) => any)(this.context);
              return escapeHTML(val);
            },
            enumerable: true,
          });
        });
      });
    }

    // --- Render ---
    private _render(cfg: ComponentConfig<S, C, P>) {
      this._runLogicWithinErrorBoundary(cfg, () => {
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
          (html) => this._applyStyle(cfg, html)
        );
      });
    }

    public requestRender() {
      this._requestRender();
    }

    _requestRender() {
      this._runLogicWithinErrorBoundary(this._cfg, () => {
        requestRender(
          () => this._render(this._cfg),
          this._lastRenderTime,
          this._renderCount,
          (t) => { this._lastRenderTime = t; },
          (c) => { this._renderCount = c; },
          this._renderTimeoutId,
          (id) => { this._renderTimeoutId = id; }
        );
      })
    }

    // --- Style ---
    private _applyStyle(cfg: ComponentConfig<S, C, P, T>, html: string) {
      this._runLogicWithinErrorBoundary(cfg, () => {
        applyStyle(
          this.shadowRoot,
          cfg,
          this.context,
          html,
          this._styleSheet,
          (sheet) => { this._styleSheet = sheet; }
        );
      })
    }

    // --- Error Boundary function ---
    private _runLogicWithinErrorBoundary(
      cfg: ComponentConfig<S, C, P>,
      fn: () => void,
    ) {
      if (this._hasError) this._hasError = false;
      try {
        fn();
      } catch (error) {
        this._hasError = true;
        if (cfg.onError) {
          cfg.onError(error as Error | null, this.context);
        }
        if (cfg.errorFallback) {
          if (this.shadowRoot) {
            this.shadowRoot.innerHTML = cfg.errorFallback(
              error as Error | null,
              this.context,
            );
          }
        }
      }
    }

    // --- State, props, computed ---
    private _initContext(cfg: ComponentConfig<S, C, P>): ComponentContext<S, C, P, T> {
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
                        self._render(cfg);
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
                  self._render(cfg);
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
                  self._render(cfg);
                }
                return true;
              },
            });
          }
          if (obj && typeof obj === "object") {
            Object.keys(obj).forEach((key) => {
              const newPath = path ? `${path}.${key}` : key;
              obj[key] = createReactive(obj[key], newPath);
            });
            return new Proxy(obj, {
              set(target, prop, value) {
                const fullPath = path
                  ? `${path}.${String(prop)}`
                  : String(prop);
                target[prop as any] = createReactive(value, fullPath);
                if (!self._initializing) {
                  self._triggerWatchers(
                    fullPath,
                    target[prop as any]
                  );
                  self._render(cfg);
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
        return createReactive({ ...cfg.state }) as ComponentContext<S, C, P, T>;
      } catch (error) {
        return {} as ComponentContext<S, C, P, T>;
      }
    }

    private _initWatchers(cfg: ComponentConfig<S, C, P>): void {
      this._runLogicWithinErrorBoundary(cfg, () => {
        initWatchers(
          this.context,
          this._watchers,
          (cfg.watch || {}) as Record<string, WatchCallback | [WatchCallback, WatchOptions]>
        );
      })
    }

    private _triggerWatchers(path: string, newValue: any): void {
      triggerWatchers(this.context, this._watchers, path, newValue);
    }

    private _applyProps(cfg: ComponentConfig<S, C, P>): void {
      this._runLogicWithinErrorBoundary(cfg, () => {
        try {
          applyProps(this, cfg, this.context);
        } catch (error) {
          this._hasError = true;
          if (cfg.onError) cfg.onError(error as Error | null, this.context);
          if (cfg.errorFallback && this.shadowRoot) {
            this.shadowRoot.innerHTML = cfg.errorFallback(error as Error | null, this.context);
          }
        }
      })
    }
  }
}
