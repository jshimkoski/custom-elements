/**
 * runtime.ts
 * Lightweight, strongly typed, functional custom element runtime for two-way binding, event, and prop support.
 * Supports: state, computed, props, style, render, lifecycle hooks, v-model-* and data-on-* attributes.
 * No external dependencies. Mobile-first, secure, and developer friendly.
 */

export { createStore } from "./store";
export { eventBus } from "./event-bus";
export { html } from "./template-compiler";
export {
  vIf,
  vBind,
  vClass,
  vFor,
  vModel,
  vShow,
  vSwitch,
  vStyle,
  anchorBlock,
  vIfChain,
  vIfBuilder,
  vSwitchBuilder,
} from "./directives";

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
import { html } from "./template-compiler";
import { vIf, vBind, vClass, vFor, vModel, vShow, vSwitch } from "./directives";

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

type WatchCallback<T = any> = (newValue: T, oldValue: T) => void;

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
  state: S;
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
  render: (state: S & C & P & InferMethods<T>) => VNode | VNode[];
  onConnected?: (
    state: S & C & P & InferMethods<T>,
    api: ComponentAPI<S & C & P & InferMethods<T>>,
  ) => void;
  onDisconnected?: (
    state: S & C & P & InferMethods<T>,
    api: ComponentAPI<S & C & P & InferMethods<T>>,
  ) => void;
  onAttributeChanged?: (
    state: S & C & P & InferMethods<T>,
    api: ComponentAPI<S & C & P & InferMethods<T>>,
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ) => void;
  onError?: (
    error: Error | null,
    state: S & C & P & InferMethods<T>,
    api: ComponentAPI<S & C & P & InferMethods<T>>,
  ) => void;
  errorFallback?: (
    error: Error | null,
    state: S & C & P & InferMethods<T>,
  ) => string;
  [key: string]: any;
}

export interface ComponentAPI<S> {
  state: S & { [key: string]: any };
  emit: (event: string, detail?: any) => void;
  on: (event: string, handler: (detail: any) => void) => void;
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

// ######################################
// ######################################
// ######################################

// --- Main component registration ---
export function component<
  S extends object,
  C extends object = {},
  P extends object = {},
  T extends object = any,
>(tag: string, config: ComponentConfig<S, C, P, T>): void {
  registry.set(tag, config);
  if (!customElements.get(tag)) {
    customElements.define(tag, createElementClass<S, C, P, T>(config));
  }
}

// --- Element class factory ---
export function createElementClass<
  S extends object,
  C extends object,
  P extends object,
  T extends object = any,
>(config: ComponentConfig<S, C, P, T>): CustomElementConstructor {
  return class extends HTMLElement {
    private _state: S & C & P & { [key: string]: any };
    private _refs: Record<string, HTMLElement> = {};
    private _api: ComponentAPI<S & C & P> & {
      refs: Record<string, HTMLElement>;
    };
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
            fn(this._state, ...args);
        }
      });

      this._api = {
        state: this._state,
        emit: (event, detail) =>
          this.dispatchEvent(new CustomEvent(event, { detail, bubbles: true })),
        on: (event, handler) =>
          this.addEventListener(event, (e) =>
            handler((e as CustomEvent).detail),
          ),
        refs: this._refs,
      };
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
          config.onConnected(this._state, this._api);
          this._mounted = true;
        }
      });
    }

    disconnectedCallback() {
      this._runLogicWithinErrorBoundary(config, () => {
        if (config.onDisconnected)
          config.onDisconnected(this._state, this._api);
        this._listeners.forEach((unsub) => unsub());
        this._listeners = [];
        this._watchers.clear();

        // Clean up style caching
        this._styleCache.clear();
        this._styleDependencies.clear();
        this._styleElement = null;
        this._lastStyleHash = "";
        this._styleUpdateDebounced.cancel();

        this._mounted = false;
      });
    }

    attributeChangedCallback(
      name: string,
      oldValue: string | null,
      newValue: string | null,
    ) {
      this._runLogicWithinErrorBoundary(config, () => {
        if (config.onAttributeChanged) {
          config.onAttributeChanged(
            this._state,
            this._api,
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

    // --- Reference collection ---
    private _collectRefs() {
      this._runLogicWithinErrorBoundary(config, () => {
        if (!this.shadowRoot) return;
        this._refs = {};
        this.shadowRoot.querySelectorAll("[ref]").forEach((el) => {
          const refName = el.getAttribute("ref");
          if (refName) this._refs[refName] = el as HTMLElement;
        });
      });
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

        // Clear style dependencies tracking for this render cycle
        this._styleDependencies.clear();

        // --- Render VDOM ---
        const output = cfg.render(this._state);
        // Create context with state and render method for directive processing
        // Use a proxy to avoid modifying the actual state object
        const context = new Proxy(this._state, {
          get: (target, prop) => {
            if (prop === "_requestRender") {
              return () => this._requestRender();
            }
            if (prop === "_state") {
              return target;
            }
            // Handle nested property access for v-model directives
            if (typeof prop === "string" && prop.includes(".")) {
              return prop.split(".").reduce((obj, key) => obj?.[key], target);
            }
            return target[prop as keyof typeof target];
          },
          set: (target, prop, value) => {
            // Handle nested property assignment for v-model directives
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
            target[prop as keyof typeof target] = value;
            return true;
          },
        });
        vdomRenderer(this.shadowRoot, output, context);

        // Apply styles after VDOM rendering
        this._applyStyle(cfg);
        this._collectRefs();
      });
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
              this._styleElement = document.createElement("style");
              this.shadowRoot.prepend(this._styleElement);
            }
          }

          if (!cfg.style) {
            // console.log("[Style Debug] No style config provided");
            this._styleElement.textContent = "";
            return;
          }

          // console.log("[Style Debug] Style config type:", typeof cfg.style);

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
            const dependentValues = dependencies.map((dep) => this._state[dep]);
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
          cfg.onError(error as Error | null, this._state, this._api);
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
    private _initState(cfg: ComponentConfig<S, C, P>): S & C & P {
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
                      const oldArray = [...target]; // Create snapshot before mutation
                      const result = value.apply(target, args);

                      if (!self._initializing) {
                        const fullPath = path || "root";
                        self._triggerWatchers(fullPath, target, oldArray);
                        self._render(cfg);
                      }

                      return result;
                    };
                  }
                }

                return value;
              },
              set(target, prop, value) {
                const oldValue = target[prop as any];
                target[prop as any] = value;
                if (!self._initializing) {
                  const fullPath = path
                    ? `${path}.${String(prop)}`
                    : String(prop);

                  // Track style dependencies and invalidate cache
                  self._styleDependencies.add(String(prop));
                  self._styleCache.invalidate(String(prop));

                  self._triggerWatchers(fullPath, value, oldValue);

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
                      styleDeps.includes(prop as keyof (S & C)) &&
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
                const oldValue = target[prop as any];
                delete target[prop as any];
                if (!self._initializing) {
                  const fullPath = path
                    ? `${path}.${String(prop)}`
                    : String(prop);

                  // Track style dependencies
                  self._styleDependencies.add(String(prop));

                  self._triggerWatchers(fullPath, undefined, oldValue);
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
                const oldValue = target[prop as any];
                const fullPath = path
                  ? `${path}.${String(prop)}`
                  : String(prop);
                target[prop as any] = createReactive(value, fullPath);
                if (!self._initializing) {
                  self._triggerWatchers(
                    fullPath,
                    target[prop as any],
                    oldValue,
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
        return createReactive({ ...cfg.state }) as S & C & P;
      } catch (error) {
        return {} as S & C & P;
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
            callback(currentValue, undefined);
          } catch (error) {
            console.error(`Error in immediate watcher for "${key}":`, error);
          }
        }
      }
    }

    private _getNestedValue(path: string): any {
      return path.split(".").reduce((obj, key) => obj?.[key], this._state);
    }

    private _triggerWatchers(path: string, newValue: any, oldValue: any): void {
      // Check for exact path matches
      const watcher = this._watchers.get(path);
      if (watcher) {
        try {
          watcher.callback(newValue, oldValue);
          watcher.oldValue = newValue;
        } catch (error) {
          console.error(`Error in watcher for "${path}":`, error);
        }
      }

      // Check for parent path matches (for deep watching)
      for (const [watchPath, watcherConfig] of this._watchers.entries()) {
        if (watcherConfig.options.deep && path.startsWith(watchPath + ".")) {
          try {
            const currentValue = this._getNestedValue(watchPath);
            watcherConfig.callback(currentValue, watcherConfig.oldValue);
            watcherConfig.oldValue = currentValue;
          } catch (error) {
            console.error(`Error in deep watcher for "${watchPath}":`, error);
          }
        }
      }
    }

    private _applyProps(cfg: ComponentConfig<S, C, P>): void {
      try {
        if (!cfg.props) return;
        Object.entries(cfg.props).forEach(([key, def]) => {
          const attr = this.getAttribute(toKebab(key));
          if (attr !== null) {
            (this._state as any)[key] = escapeHTML(
              this._parseProp(attr, def.type),
            );
          } else {
            throw new Error(
              `[runtime] _applyProps - Missing required prop: ${key}`,
            );
          }
        });
      } catch (error) {
        this._hasError = true;
        if (cfg.onError) {
          cfg.onError(error as Error | null, this._state, this._api);
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

    private _parseProp(val: string, type: any) {
      if (type === Boolean) return val === "true";
      if (type === Number) return Number(val);
      return val;
    }
  };
}

component("child-component", {
  state: { message: "Hello from Child Component" },
  render(state) {
    return html`
      <div>
        <p>${state.message}</p>
        <button @click="${state.handleSomething}">Click Me</button>
        <button @click="${() => (state.message = "cool")}">
          Another button
        </button>
      </div>
    `;
  },
  handleSomething() {
    console.log("component did something");
  },
});

component("my-greeting", {
  state: {
    name: "World",
    array: ["A", "B", "C"],
    email: "test@me.com",
    age: 25,
    isActive: true,
    color: "red",
  },
  computed: {
    funnyName(state) {
      return `Funny ${state.name}`;
    },
  },
  watch: {
    name(newValue, oldValue) {
      console.log(
        `Watcher called: Name changed from ${oldValue} to ${newValue}`,
      );
    },
    email(newValue, oldValue) {
      console.log(
        `Watcher called: Email changed from ${oldValue} to ${newValue}`,
      );
    },
  },
  style: `
    div {
      color: blue;
      padding: 20px;
    }
    .form-group {
      margin: 10px 0;
    }
    label {
      display: inline-block;
      width: 100px;
    }
  `,
  render(state) {
    return html`
      <div>
        <h2>Hello, <span>${state.name}</span></h2>
        <h3>You have a funny name: ${state.funnyName}</h3>
        ${vIf(state.name === "World", html`<span>Welcome to the world!</span>`)}

        <div class="form-group">
          <label>Name:</label>
          <input type="text" v-model="name" />

          <div class="form-group">
            <label>Name (vModel):</label>
            <p>None of these work at the moment:</p>
            <input
              type="text"
              ${vModel(state.name, (val) => (state.name = val))}
              ${vClass(["form-control", "cool"])}
              ${vShow(false)}
            />
            <button ${vBind({ disabled: state.isActive })}>Submit</button>
          </div>
        </div>

        <div class="form-group">
          <label>Email:</label>
          <input type="email" v-model="email" />
        </div>

        <div class="form-group">
          <label>Age:</label>
          <input type="number" v-model="age" />
        </div>

        <div class="form-group">
          <label>Active:</label>
          <input type="checkbox" v-model="isActive" />
        </div>

        <div class="form-group">
          <label>Color:</label>
          <select v-model="color">
            <option value="red">Red</option>
            <option value="green">Green</option>
            <option value="blue">Blue</option>
          </select>
        </div>

        <div class="form-group">
          <label>Active group:</label>
          ${vFor(
            state.array,
            (item) => html`
              ${item}:
              <input
                type="checkbox"
                key="checkbox-${item}"
                value="${item}"
                v-model="array"
              />
            `,
          )}
        </div>

        <div class="form-group">
          <p>State: ${JSON.stringify(state, null, 2)}</p>
        </div>

        <button
          @click="${() => {
            state.name = "Custom Element";
            state.array = ["D", "E", "F"];
          }}"
        >
          Change Name
        </button>
        <button @click="${state.handleSomething}">Click Me</button>
        ${vFor(state.array, (item) => html`<span>${item}</span>`)}
        ${vSwitch(state.name, [
          ["World", html`<span>Welcome to the world!</span>`],
          ["Custom Element", html`<span>Welcome to the custom element!</span>`],
        ])}
      </div>
    `;
  },
  onConnected(state, api) {
    console.log("Component connected:", state, api);
  },
  onError(error, state, api) {
    console.error("Component error:", error, state, api);
  },
  handleSomething(state: any, e: Event) {
    state.name = "Updated Name";
    state.array.push("New Item");
    console.log("component did something", state, e);
  },
});
