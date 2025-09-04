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

  // Developer-time warning: detect when component authors use keys that
  // collide with runtime-injected context helpers (refs, error, etc.).
  // This is a non-fatal console warning to help avoid confusing TS errors
  // and runtime shadowing.
  try {
    const RESERVED_KEYS = new Set([
      "refs",
      "requestRender",
      "error",
      "hasError",
      "isLoading",
      "emit",
    ]);

    const collisions: string[] = [];
    if (finalConfig.state && typeof finalConfig.state === "object") {
      Object.keys(finalConfig.state).forEach((k) => {
        if (RESERVED_KEYS.has(k)) collisions.push(k);
      });
    }
    if (finalConfig.props && typeof finalConfig.props === "object") {
      Object.keys(finalConfig.props).forEach((k) => {
        if (RESERVED_KEYS.has(k)) collisions.push(k);
      });
    }
    if (finalConfig.computed && typeof finalConfig.computed === "object") {
      Object.keys(finalConfig.computed).forEach((k) => {
        if (RESERVED_KEYS.has(k)) collisions.push(k);
      });
    }
    if (collisions.length > 0) {
      const unique = Array.from(new Set(collisions));
      console.warn(
        `[${normalizedTag}] Reserved runtime context keys used in component config: ${unique.join(", ")}. ` +
          `These names are provided by the runtime (for example: refs, error, emit). ` +
          `Rename your state/prop/computed keys (e.g. 'error' -> 'errorMessage') to avoid collisions and TypeScript type conflicts.`
      );
    }
  } catch (e) {
    // swallow any check-time errors; this is purely a dev convenience
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

      // Inject emit helper for custom events (single canonical event API).
      // Emits a DOM CustomEvent and returns whether it was not defaultPrevented.
      Object.defineProperty(this.context, "emit", {
        value: (eventName: string, detail?: any, options?: CustomEventInit) => {
          const ev = new CustomEvent(eventName, {
            detail,
            bubbles: true,
            composed: true,
            ...(options || {})
          });
          // DOM-first: dispatch the event and return whether it was prevented
          this.dispatchEvent(ev);
          return !ev.defaultPrevented;
        },
        writable: false,
        enumerable: false,
        configurable: false,
      });

      // --- Inject config methods into context ---
      // Expose config functions on the context as callable helpers. Event
      // handling is DOM-first: use standard DOM event listeners or
      // `context.emit` (which dispatches a DOM CustomEvent) to communicate
      // with the host. There is no property-based host-callback dispatch.
      const cfgToUse = (registry.get(tag) as ComponentConfig<S, C, P, T>) || config;
      Object.keys(cfgToUse).forEach((key) => {
        const fn = (cfgToUse as any)[key];
        if (typeof fn === "function") {
          // Expose as context method: context.fn(...args) => fn(...args, context)
          (this.context as any)[key] = (...args: any[]) => fn(...args, this.context);
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

    private _applyComputed(cfg: ComponentConfig<S, C, P, T>) {
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
    private _render(cfg: ComponentConfig<S, C, P, T>) {
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
      cfg: ComponentConfig<S, C, P, T>,
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
    private _initContext(cfg: ComponentConfig<S, C, P, T>): ComponentContext<S, C, P, T> {
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

    private _initWatchers(cfg: ComponentConfig<S, C, P, T>): void {
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

    private _applyProps(cfg: ComponentConfig<S, C, P, T>): void {
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
