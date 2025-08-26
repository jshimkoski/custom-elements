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
  minifyCSS,
  baseReset,
  jitCSS
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
  context?: S,
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

export type ComponentContext<
  S extends object,
  C extends object,
  P extends object,
  T extends object = any
> = S & C & P & InferMethods<T>;

export interface ComponentConfig<
  S extends object,
  C extends object = {},
  P extends object = {},
  T extends object = any,
> {
  state?: S;
  computed?: { [K in keyof C]: (context: ComponentContext<S, C, P, T>) => C[K] };
  props?: Record<
    string,
    {
      type: StringConstructor | NumberConstructor | BooleanConstructor;
      default?: string | number | boolean;
    }
  >;
  watch?: WatchConfig<ComponentContext<S, C, P, T>>;
  style?: string | ((context: ComponentContext<S, C, P, T>) => string);
  render: (context: ComponentContext<S, C, P, T>) => VNode | VNode[] | Promise<VNode | VNode[]>;
  loadingTemplate?: (context: ComponentContext<S, C, P, T>) => VNode | VNode[];
  errorTemplate?: (
    error: Error,
    context: ComponentContext<S, C, P, T>,
  ) => VNode | VNode[];
  onConnected?: (
    context: ComponentContext<S, C, P, T>,
  ) => void;
  onDisconnected?: (
    context: ComponentContext<S, C, P, T>,
  ) => void;
  onAttributeChanged?: (
    name: string,
    oldValue: string | null,
    newValue: string | null,
    context: ComponentContext<S, C, P, T>,
  ) => void;
  onError?: (
    error: Error | null,
    context: ComponentContext<S, C, P, T>,
  ) => void;
  errorFallback?: (
    error: Error | null,
    context: ComponentContext<S, C, P, T>,
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
    public context: ComponentContext<S, C, P, T>;

    private _listeners: Array<() => void> = [];
    private _watchers: Map<string, WatcherState> = new Map();
    /** @internal */
    private _renderTimeoutId: number | null = null;
    private _mounted = false;
    private _hasError = false;
    private _initializing = true;

    private _styleSheet: CSSStyleSheet | null = null;

    private _lastHtmlStringForJitCSS = "";

    private _cfg: ComponentConfig<S, C, P, T>;
    private _lastRenderTime = 0;
    private _renderCount = 0;
    private _templateLoading = false;
    private _templateError: Error | null = null;

    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._cfg = config;

      this.context = this._initContext(config);

      // --- Inject config methods into state ---
      Object.keys(config).forEach((key) => {
        const fn = (config as any)[key];
        if (typeof fn === "function" && !key.startsWith("on")) {
          // Wrap the function so it receives state as the first argument
          (this.context as any)[key] = (...args: any[]) =>
            fn(...args, this.context);
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
          config.onConnected(this.context);
          this._mounted = true;
        }
      });
    }

    disconnectedCallback() {
      this._runLogicWithinErrorBoundary(config, () => {
        if (config.onDisconnected)
          config.onDisconnected(this.context);
        this._listeners.forEach((unsub) => unsub());
        this._listeners = [];
        this._watchers.clear();

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
            name,
            oldValue,
            newValue,
            this.context,
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
        if (!this.shadowRoot) return;

        // If loading, show loading template
        if (this._templateLoading && cfg.loadingTemplate) {
          this._renderOutput(cfg.loadingTemplate(this.context));
          return;
        }

        // If error, show error template
        if (this._templateError && cfg.errorTemplate) {
          this._renderOutput(cfg.errorTemplate(this._templateError, this.context));
          return;
        }

        // Call render function
        const outputOrPromise = cfg.render(this.context);

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
                const fallback = cfg.errorTemplate(error, this.context);
                this._renderOutput(fallback);
                return fallback;
              }
              throw error;
            });

          if (cfg.loadingTemplate)
            this._renderOutput(cfg.loadingTemplate(this.context));
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
      const context = new Proxy(this.context, {
        get: (target, prop) => {
          if (prop === "_requestRender") {
            return () => this._requestRender();
          }
          if (prop === "context") {
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

      // Extract rendered HTML for JIT CSS
      this._lastHtmlStringForJitCSS = this.shadowRoot.innerHTML;
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

    // --- Style ---
    private _applyStyle(cfg: ComponentConfig<S, C, P, T>) {
      this._runLogicWithinErrorBoundary(cfg, () => {
        if (!this.shadowRoot) return;

        // Generate JIT CSS from latest HTML
        const jitCss = jitCSS(this._lastHtmlStringForJitCSS);

        if (!cfg.style && (!jitCss || jitCss.trim() === "")) {
          this._styleSheet = null;
          return;
        }

        // Compose final style: baseReset + jitCss + user style
        let userStyle = "";
        if (cfg.style) {
          if (typeof cfg.style === "string") userStyle = cfg.style;
          else if (typeof cfg.style === "function") userStyle = cfg.style(this.context);
        }

        let finalStyle = sanitizeCSS(`${baseReset}\n${userStyle}\n${jitCss}\n`);
        finalStyle = minifyCSS(finalStyle);

        // Use adoptedStyleSheets
        if (!this._styleSheet) {
          this._styleSheet = new CSSStyleSheet();
        }
        this._styleSheet.replaceSync(finalStyle);
        this.shadowRoot.adoptedStyleSheets = [this._styleSheet];
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
            callback(currentValue, undefined, this.context);
          } catch (error) {
            console.error(`Error in immediate watcher for "${key}":`, error);
          }
        }
      }
    }

    private _getNestedValue(path: string): any {
      return path.split(".").reduce(
        (obj: any, key: string) => obj?.[key],
        this.context as any,
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
          watcher.callback(newValue, watcher.oldValue, this.context);
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
              watcherConfig.callback(currentValue, watcherConfig.oldValue, this.context);
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
            (this.context as any)[key] = escapeHTML(
              parseProp(attr, def.type),
            );
          } else if ('default' in def && def.default !== undefined) {
            (this.context as any)[key] = escapeHTML(def.default);
          }
          // else: leave undefined if no default
        });
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
  };
}
