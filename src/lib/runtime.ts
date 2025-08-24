/**
 * runtime.ts
 * Lightweight, strongly typed, functional custom element runtime for two-way binding, event, and prop support.
 * Supports: state, computed, props, style, render, lifecycle hooks, #model-* and data-on-* attributes.
 * No external dependencies. Mobile-first, secure, and developer friendly.
 */

export { createStore } from "./store";
export { eventBus } from "./event-bus";
export { html } from "./template-compiler";
export { when, each, match } from "./directives";

import { vdomRenderer, type VNode } from "./vdom";
import {
  StyleCache,
  createStateHash,
  minifyCSS,
  deduplicateCSS,
  createDebouncer,
  stylePerformanceMonitor,
  type DynamicStyleConfig,
  type StyleOptimizations,
} from "./style-utils";

// --- Types ---
type LifecycleKeys =
  | "onConnected"
  | "onDisconnected"
  | "onAttributeChanged"
  | "onError"
  | "errorFallback";

// Watch types
interface WatchOptions {
  immediate?: boolean;
  deep?: boolean;
}

type WatchCallback<T = any, S = any> = (
  newValue: T,
  oldValue: T,
  state?: S,
) => void;

interface WatcherState {
  callback: WatchCallback;
  options: WatchOptions;
  oldValue: any;
}

type WatchConfig<S> =
  | {
      [K in keyof S]?:
        | WatchCallback<S[K]>
        | [WatchCallback<S[K]>, WatchOptions?];
    }
  | Record<string, WatchCallback | [WatchCallback, WatchOptions?]>;

type InferMethods<T> = {
  [K in keyof T as K extends LifecycleKeys ? never : K]: T[K] extends Function
    ? T[K]
    : never;
};

export interface ComponentConfig<
  S extends object,
  C extends object = {},
  P extends object = {},
  T extends object = any,
> {
  state?: S;
  computed?: { [K in keyof C]: (state: S & C) => C[K] };
  props?: Record<
    string,
    {
      type: StringConstructor | NumberConstructor | BooleanConstructor;
      default?: string | number | boolean;
    }
  >;
  watch?: WatchConfig<S & C & P>;
  style?: string | ((state: S & C) => string) | DynamicStyleConfig;
  styleOptimizations?: Partial<StyleOptimizations>;
  render: (
    state: S & C & P & InferMethods<T>
  ) => VNode | VNode[] | Promise<VNode | VNode[]>
  loadingTemplate?: (state: S & C & P & InferMethods<T>) => VNode | VNode[];
  errorTemplate?: (
    error: Error,
    state: S & C & P & InferMethods<T>,
  ) => VNode | VNode[];
  onConnected?: (
    state: S & C & P & InferMethods<T>,
  ) => void;
  onDisconnected?: (
    state: S & C & P & InferMethods<T>,
  ) => void;
  onAttributeChanged?: (
    state: S & C & P & InferMethods<T>,
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ) => void;
  onError?: (
    error: Error | null,
    state: S & C & P & InferMethods<T>,
  ) => void;
  errorFallback?: (
    error: Error | null,
    state: S & C & P & InferMethods<T>,
  ) => string;
  [key: string]: any;
}

// --- Internal registry ---
const registry = new Map<string, ComponentConfig<any, any, any>>();

// --- Utility functions ---
function toKebab(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

function escapeHTML(str: string | number | boolean): string | number | boolean {
  if (typeof str === "string") {
    return str.replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c]!,
    );
  }
  return str;
}

function sanitizeCSS(css: string): string {
  // Remove any url(javascript:...) and <script> tags
  return css
    .replace(/url\s*\(\s*['"]?javascript:[^)]*\)/gi, "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/expression\s*\([^)]*\)/gi, "");
}

/**
 * CSS template literal
 *
 * This doesn't sanitize CSS values.
 * Runtime does that for us.
 * 
 * @param strings
 * @param values
 * @returns
 */
export function css(strings: TemplateStringsArray, ...values: unknown[]): string {
  let result = '';
  for (let i = 0; i < strings.length; i++) {
    result += strings[i];
    if (i < values.length) result += values[i];
  }
  return result;
}

// ######################################
// ######################################
// ######################################

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

// --- Main component registration ---
export function component<
  S extends object = {},
  C extends object = {},
  P extends object = {},
  T extends object = any,
>(
  tag: string,
  renderOrConfig: ((state: S & C & P & InferMethods<T>) => any) | ComponentConfig<S, C, P, T>,
  config?: Partial<ComponentConfig<S, C, P, T>
>): void {
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
  if (typeof window !== "undefined" && !customElements.get(normalizedTag)) {
    customElements.define(normalizedTag, createElementClass<S, C, P, T>(finalConfig) as CustomElementConstructor);
  }
}

// --- Element class factory ---
export function createElementClass<
  S extends object,
  C extends object,
  P extends object,
  T extends object = any,
>(config: ComponentConfig<S, C, P, T>): CustomElementConstructor | { new (): object } {
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
    private _state: S & C & P & InferMethods<T>;
    private _listeners: Array<() => void> = [];
    private _watchers: Map<string, WatcherState> = new Map();
    /** @internal */
    private _renderTimeoutId: number | null = null;
    private _mounted = false;
    private _hasError = false;
    private _initializing = true;
    private _styleElement: HTMLStyleElement | null = null;
    private _styleCache = new StyleCache(100);
    private _lastStyleHash = "";
    private _styleDependencies: Set<string> = new Set();
    private _styleUpdateDebounced: ((
      cfg: ComponentConfig<S, C, P, T>,
    ) => void) & {
      cancel: () => void;
    };
    private _cfg: ComponentConfig<S, C, P, T>;
    private _lastRenderTime = 0;
    private _renderCount = 0;
    private _templateLoading = false;
    private _templateError: Error | null = null;

    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._cfg = config;

      // Initialize debounced style update function
      const optimizations = {
        debounceMs: 16,
        ...config.styleOptimizations,
      };
      this._styleUpdateDebounced = createDebouncer(
        (cfg: ComponentConfig<S, C, P, T>) => this._applyStyle(cfg),
        optimizations.debounceMs,
      );
      this._state = this._initState(config);

      // --- Inject config methods into state ---
      Object.keys(config).forEach((key) => {
        const fn = (config as any)[key];
        if (typeof fn === "function" && !key.startsWith("on")) {
          // Wrap the function so it receives state as the first argument
          (this._state as any)[key] = (...args: any[]) =>
            fn(...args, this._state);
        }
      });

      this._applyProps(config);
      this._applyComputed(config);
      this._initializing = false;

      // Initialize watchers after initialization phase is complete
      this._initWatchers(config);

      // Initial render (styles are applied within render)
      this._render(config);
    }

    connectedCallback() {
      this._runLogicWithinErrorBoundary(config, () => {
        if (config.onConnected && !this._mounted) {
          config.onConnected(this._state);
          this._mounted = true;
        }
      });
    }

    disconnectedCallback() {
      this._runLogicWithinErrorBoundary(config, () => {
        if (config.onDisconnected)
          config.onDisconnected(this._state);
        this._listeners.forEach((unsub) => unsub());
        this._listeners = [];
        this._watchers.clear();

        // Clean up style caching
        this._styleCache.clear();
        this._styleDependencies.clear();
        this._styleElement = null;
        this._lastStyleHash = "";
        this._styleUpdateDebounced.cancel();

        // Clean up async template state
        this._templateLoading = false;
        this._templateError = null;

        this._mounted = false;
      });
    }

    attributeChangedCallback(
      name: string,
      oldValue: string | null,
      newValue: string | null,
    ) {
      this._runLogicWithinErrorBoundary(config, () => {
        this._applyProps(config);
        if (config.onAttributeChanged) {
          config.onAttributeChanged(
            this._state,
            name,
            oldValue,
            newValue,
          );
        }
      });
    }

    static get observedAttributes() {
      return config.props ? Object.keys(config.props).map(toKebab) : [];
    }

    private _applyComputed(cfg: ComponentConfig<S, C, P>) {
      this._runLogicWithinErrorBoundary(config, () => {
        if (!cfg.computed) return;
        Object.entries(cfg.computed).forEach(([key, fn]) => {
          Object.defineProperty(this._state, key, {
            get: () => {
              const val = (fn as (state: S & C & P) => any)(this._state);
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
        if (!this.shadowRoot) return;

        this._styleDependencies.clear();

        // If loading, show loading template
        if (this._templateLoading && cfg.loadingTemplate) {
          this._renderOutput(cfg.loadingTemplate(this._state));
          return;
        }

        // If error, show error template
        if (this._templateError && cfg.errorTemplate) {
          this._renderOutput(cfg.errorTemplate(this._templateError, this._state));
          return;
        }

        // Call render function
        const outputOrPromise = cfg.render(this._state);

        if (outputOrPromise instanceof Promise) {
          this._templateLoading = true;
          outputOrPromise
            .then((output) => {
              this._templateLoading = false;
              this._templateError = null;
              this._renderOutput(output);
              return output;
            })
            .catch((error) => {
              this._templateLoading = false;
              this._templateError = error;
              if (cfg.errorTemplate) {
                const fallback = cfg.errorTemplate(error, this._state);
                this._renderOutput(fallback);
                return fallback;
              }
              throw error;
            });

          if (cfg.loadingTemplate)
            this._renderOutput(cfg.loadingTemplate(this._state));
          return;
        }

        // this._templateCache = outputOrPromise;
        this._renderOutput(outputOrPromise);
        this._applyStyle(cfg);
      });
    }

    // --- Helper to render output ---
    private _renderOutput(output: VNode | VNode[]) {
      if (!this.shadowRoot) return;

      // Create context with state and render method for directive processing
      const context = new Proxy(this._state, {
        get: (target, prop) => {
          if (prop === "_requestRender") {
            return () => this._requestRender();
          }
          if (prop === "_state") {
            return target;
          }
          // Handle nested property access for #model directives
          if (typeof prop === "string" && prop.includes(".")) {
            return prop.split(".").reduce((obj: any, key) => obj?.[key], target as any);
          }
          return target[prop as keyof typeof target];
        },
        set: (target, prop, value) => {
          // Handle nested property assignment for #model directives
          if (typeof prop === "string" && prop.includes(".")) {
            const keys = prop.split(".");
            const lastKey = keys.pop();
            if (!lastKey) return false;

            const nestedTarget = keys.reduce((obj, key) => {
              if (!(key in obj)) {
                (obj as any)[key] = {};
              }
              return (obj as any)[key];
            }, target as any);

            (nestedTarget as any)[lastKey] = value;
            return true;
          }
          (target as any)[prop] = value;
          return true;
        },
      });

      vdomRenderer(
        this.shadowRoot,
        Array.isArray(output) ? output : [output],
        context,
      );

      this._requestStyleUpdate();
    }

    _requestRender() {
      // Debounced render request to avoid excessive re-renders
      if (this._renderTimeoutId !== null) {
        clearTimeout(this._renderTimeoutId);
      }

      // Prevent infinite render loops
      const now = Date.now();
      if (now - this._lastRenderTime < 16) {
        // Less than 16ms since last render
        this._renderCount++;
        if (this._renderCount > 10) {
          console.warn(
            `[${this.tagName}] Potential infinite render loop detected. Skipping render.`,
          );
          this._renderTimeoutId = null;
          return;
        }
      } else {
        this._renderCount = 0;
      }

      this._renderTimeoutId = setTimeout(() => {
        this._lastRenderTime = Date.now();
        this._render(this._cfg);
        this._renderTimeoutId = null;
      }, 0);
    }

    // Request style-only update (more efficient than full render)
    private _requestStyleUpdate() {
      this._styleUpdateDebounced(this._cfg);
    }

    // --- Style ---
    private _applyStyle(cfg: ComponentConfig<S, C, P, T>) {
      this._runLogicWithinErrorBoundary(cfg, () => {
        if (!this.shadowRoot) {
          return;
        }

        const timer = stylePerformanceMonitor.startTimer("applyStyle");

        try {
          // Get or create style element
          if (!this._styleElement) {
            this._styleElement = this.shadowRoot.querySelector(
              "style",
            ) as HTMLStyleElement;
            if (!this._styleElement) {
              if (typeof document !== "undefined") {
                this._styleElement = document.createElement("style");
                this.shadowRoot.prepend(this._styleElement);
              }
            }
          }

          if (!cfg.style) {
            this._styleElement.textContent = "";
            return;
          }

          // Get style optimizations config
          const optimizations = {
            enableCaching: true,
            enableMinification: false,
            enableDeduplication: true,
            cacheSize: 100,
            debounceMs: 16,
            ...cfg.styleOptimizations,
          };

          // Handle different style configurations
          let styleConfig: DynamicStyleConfig;

          if (typeof cfg.style === "string") {
            styleConfig = {
              css: cfg.style,
              cache: optimizations.enableCaching,
            };
          } else if (typeof cfg.style === "function") {
            styleConfig = {
              css: cfg.style,
              cache: optimizations.enableCaching,
            };
          } else {
            styleConfig = {
              cache: optimizations.enableCaching,
              ...cfg.style,
            };
          }

          // Extract dependencies and check if style needs updating
          const dependencies = styleConfig.dependencies || [];
          const shouldCache =
            styleConfig.cache !== false && optimizations.enableCaching;

          // Create a hash of dependent state values for caching
          let stateHash = "";
          if (shouldCache && dependencies.length > 0) {
            const dependentValues = dependencies.map((dep) => (this._state as Record<string, unknown>)[dep]);
            stateHash = createStateHash(dependentValues);

            // Check cache first
            if (
              this._lastStyleHash === stateHash &&
              this._styleCache.has(stateHash)
            ) {
              const cachedStyle = this._styleCache.get(stateHash)!;
              if (this._styleElement.textContent !== cachedStyle) {
                this._styleElement.textContent = cachedStyle;
              }
              return;
            }
          }

          // For styles without dependencies, always generate
          if (!shouldCache || dependencies.length === 0) {
            stateHash = "no-deps-" + Date.now();
          }

          // Generate style
          const rawStyle =
            typeof styleConfig.css === "function"
              ? styleConfig.css(this._state)
              : styleConfig.css;

          let processedStyle = sanitizeCSS(rawStyle);

          // Apply optimizations
          if (optimizations.enableMinification) {
            processedStyle = minifyCSS(processedStyle);
          }

          if (optimizations.enableDeduplication) {
            processedStyle = deduplicateCSS(processedStyle);
          }

          // Cache the style if enabled and has dependencies
          if (shouldCache && dependencies.length > 0) {
            this._styleCache.set(
              stateHash,
              processedStyle,
              dependencies.map(String),
            );
            this._lastStyleHash = stateHash;
          }

          // Only update DOM if style actually changed
          if (this._styleElement.textContent !== processedStyle) {
            this._styleElement.textContent = processedStyle;
          }
        } finally {
          timer();
        }
      });
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
          cfg.onError(error as Error | null, this._state);
        }
        if (cfg.errorFallback) {
          if (this.shadowRoot) {
            this.shadowRoot.innerHTML = cfg.errorFallback(
              error as Error | null,
              this._state,
            );
          }
        }
      }
    }

    // --- State, props, computed ---
    private _initState(cfg: ComponentConfig<S, C, P>): S & C & P & InferMethods<T> {
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

                  // Track style dependencies and invalidate cache
                  self._styleDependencies.add(String(prop));
                  self._styleCache.invalidate(String(prop));

                  self._triggerWatchers(fullPath, value);

                  // Check if only style dependencies changed for optimization
                  const styleConfig = cfg.style;
                  let onlyStyleChanged = false;

                  if (
                    styleConfig &&
                    typeof styleConfig === "object" &&
                    "dependencies" in styleConfig
                  ) {
                    const styleDeps = styleConfig.dependencies || [];
                    onlyStyleChanged =
                      styleDeps.includes(String(prop)) &&
                      styleDeps.every(
                        (dep) =>
                          !self._styleDependencies.has(String(dep)) ||
                          dep === prop,
                      );
                  }

                  if (onlyStyleChanged) {
                    self._requestStyleUpdate();
                  } else {
                    self._render(cfg);
                  }
                }
                return true;
              },
              deleteProperty(target, prop) {
                delete target[prop as any];
                if (!self._initializing) {
                  const fullPath = path
                    ? `${path}.${String(prop)}`
                    : String(prop);

                  // Track style dependencies
                  self._styleDependencies.add(String(prop));

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
        return createReactive({ ...cfg.state }) as S & C & P & InferMethods<T>;
      } catch (error) {
        return {} as S & C & P & InferMethods<T>;
      }
    }

    private _initWatchers(cfg: ComponentConfig<S, C, P>): void {
      if (!cfg.watch) return;

      for (const [key, watchConfig] of Object.entries(cfg.watch)) {
        let callback: WatchCallback;
        let options: WatchOptions = {};

        if (Array.isArray(watchConfig)) {
          callback = watchConfig[0];
          options = watchConfig[1] || {};
        } else {
          callback = watchConfig;
        }

        this._watchers.set(key, {
          callback,
          options,
          oldValue: this._getNestedValue(key),
        });

        // Execute immediately if requested
        if (options.immediate) {
          try {
            const currentValue = this._getNestedValue(key);
            callback(currentValue, undefined, this._state);
          } catch (error) {
            console.error(`Error in immediate watcher for "${key}":`, error);
          }
        }
      }
    }

    private _getNestedValue(path: string): any {
      return path.split(".").reduce(
        (obj: any, key: string) => obj?.[key],
        this._state as any,
      );
    }

    private _triggerWatchers(path: string, newValue: any): void {
      const isEqual = (a: any, b: any): boolean => {
        // Simple deep equality check
        if (a === b) return true;
        if (typeof a !== typeof b) return false;
        if (typeof a !== "object" || a === null || b === null) return false;

        if (Array.isArray(a) && Array.isArray(b)) {
          if (a.length !== b.length) return false;
          return a.every((val, i) => isEqual(val, b[i]));
        }

        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;

        return keysA.every(key => isEqual(a[key], b[key]));
      };

      // Exact path watcher
      const watcher = this._watchers.get(path);
      if (watcher && !isEqual(newValue, watcher.oldValue)) {
        try {
          watcher.callback(newValue, watcher.oldValue, this._state);
          watcher.oldValue = newValue;
        } catch (error) {
          console.error(`Error in watcher for "${path}":`, error);
        }
      }

      // Deep watchers for parent paths
      for (const [watchPath, watcherConfig] of this._watchers.entries()) {
        if (watcherConfig.options.deep && path.startsWith(watchPath + ".")) {
          try {
            const currentValue = this._getNestedValue(watchPath);
            if (!isEqual(currentValue, watcherConfig.oldValue)) {
              watcherConfig.callback(currentValue, watcherConfig.oldValue, this._state);
              watcherConfig.oldValue = currentValue;
            }
          } catch (error) {
            console.error(`Error in deep watcher for "${watchPath}":`, error);
          }
        }
      }
    }

    private _applyProps(cfg: ComponentConfig<S, C, P>): void {
      try {
        if (!cfg.props) return;
        function parseProp(val: string, type: any) {
          if (type === Boolean) return val === "true";
          if (type === Number) return Number(val);
          return val;
        }
        Object.entries(cfg.props).forEach(([key, def]) => {
          const attr = this.getAttribute(toKebab(key));
          if (attr !== null) {
            (this._state as any)[key] = escapeHTML(
              parseProp(attr, def.type),
            );
          } else if ('default' in def && def.default !== undefined) {
            (this._state as any)[key] = escapeHTML(def.default);
          }
          // else: leave undefined if no default
        });
      } catch (error) {
        this._hasError = true;
        if (cfg.onError) {
          cfg.onError(error as Error | null, this._state);
        }
        if (cfg.errorFallback) {
          if (this.shadowRoot) {
            this.shadowRoot.innerHTML = cfg.errorFallback(
              error as Error | null,
              this._state,
            );
          }
        }
      }
    }
  };
}
