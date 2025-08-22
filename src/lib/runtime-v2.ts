/**
 * runtime-v2.ts
 * Lightweight, strongly typed, functional custom element runtime for two-way binding, event, and prop support.
 * Supports: state, computed, props, style, render, lifecycle hooks, data-bind-* and data-on-* attributes.
 * No external dependencies. Mobile-first, secure, and developer friendly.
 */

export { Store } from "./store";
export { eventBus } from "./event-bus";
export { html } from "./template-compiler-v2";
export * from "./directives-v2";

import { vdomRenderer, type VNode } from "./vdom-v2";
import { html } from "./template-compiler-v2";
import {
  vIf,
  vBind,
  vClass,
  vFor,
  vIfBuilder,
  vIfChain,
  vModel,
  vShow,
  vSwitch,
  vSwitchBuilder,
} from "./directives-v2";

// --- Types ---
type LifecycleKeys =
  | "render"
  | "onConnected"
  | "onDisconnected"
  | "onAttributeChanged"
  | "onError"
  | "errorFallback";

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
  style?: string | ((state: S & C) => string);
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
>(tag: string, config: ComponentConfig<S, C, P>): void {
  registry.set(tag, config);
  if (typeof customElements !== "undefined" && !customElements.get(tag)) {
    customElements.define(tag, createElementClass(config) as CustomElementConstructor);
  }
}

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

// --- Element class factory ---
export function createElementClass<
  S extends object,
  C extends object,
  P extends object,
>(config: ComponentConfig<S, C, P>): CustomElementConstructor | { new (): object } {
  if (typeof customElements === "undefined") {
    return class {
      // No-op for SSR, just a stub
      constructor() {}
    };
  }
  return class extends HTMLElement {
    private _cfg: ComponentConfig<S, C, P>;
    private _state: S & C & P & { [key: string]: any };
    private _refs: Record<string, HTMLElement> = {};
    private _api: ComponentAPI<S & C & P> & {
      refs: Record<string, HTMLElement>;
    };
    private _listeners: Array<() => void> = [];
    private _inputListeners: (() => void)[] = [];
    private _renderTimeoutId: number | null = null;
    private _mounted = false;
    private _hasError = false;
    private _initializing = true;

    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._cfg = config;
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
      this._render(config);
      if (config.style) this._applyStyle(config);
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
        this._inputListeners.forEach((unsub) => unsub());
        this._inputListeners = [];
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

        // --- Render VDOM ---
        const output = cfg.render(this._state);
        vdomRenderer(this.shadowRoot, output);
        this._applyStyle(cfg);
        this._collectRefs();
        this._bindInputsToState(this.shadowRoot, this._state);
      });
    }

    private _bindInputsToState(root: ShadowRoot, state: S & C & P) {
      // Clean up existing input listeners
      this._inputListeners.forEach((unsub) => unsub());
      this._inputListeners = [];

      const bindEls = Array.from(
        root.querySelectorAll("input,textarea,select"),
      );

      bindEls.forEach((el) => {
        if (
          el instanceof HTMLInputElement ||
          el instanceof HTMLTextAreaElement ||
          el instanceof HTMLSelectElement
        ) {
          // Check for data-bind, v-model, or data-model attributes
          const bindAttr =
            el.getAttribute("v-model") ||
            el.getAttribute("data-bind") ||
            el.getAttribute("data-model");
          const nameAttr = el.getAttribute("name");

          // Determine which state property to bind to
          const rawStateProp = bindAttr || nameAttr;
          if (!rawStateProp) return;

          // Parse modifiers from v-model (e.g., v-model.trim.number)
          const [stateProp, ...modifiers] = rawStateProp.includes("|")
            ? rawStateProp.split("|").map((s) => s.trim())
            : rawStateProp.includes(".") &&
                bindAttr === el.getAttribute("v-model")
              ? rawStateProp.split(".")
              : [rawStateProp];

          if (stateProp && this._hasNestedProperty(state, stateProp)) {
            // Helper function to get nested property value
            const getNestedValue = (obj: any, path: string): any => {
              return path.split(".").reduce((o, key) => o?.[key], obj);
            };

            // Helper function to set nested property value
            const setNestedValue = (
              obj: any,
              path: string,
              value: any,
            ): void => {
              const keys = path.split(".");
              let target = obj;
              for (let i = 0; i < keys.length - 1; i++) {
                if (!(keys[i] in target)) target[keys[i]] = {};
                target = target[keys[i]];
              }
              target[keys[keys.length - 1]] = value;
            };

            // Set initial value from state
            const initialValue = getNestedValue(state, stateProp);
            this._setInitialInputValue(el, initialValue);

            // Create update handler with Vue.js-like behavior
            const updateState = (e: Event) => {
              // Skip update if element is composing (IME input)
              if (el instanceof HTMLInputElement && (el as any).isComposing) {
                return;
              }

              let value: any;

              if (el instanceof HTMLInputElement && el.type === "checkbox") {
                const trueValue =
                  el.getAttribute("true-value") ||
                  el.getAttribute("data-true-value");
                const falseValue =
                  el.getAttribute("false-value") ||
                  el.getAttribute("data-false-value");
                const currentStateValue = getNestedValue(state, stateProp);

                // Handle multiple checkboxes bound to same v-model (array binding)
                if (Array.isArray(currentStateValue)) {
                  const arr = [...currentStateValue];
                  const checkboxValue = trueValue || el.value;

                  if (el.checked) {
                    if (!arr.includes(checkboxValue)) {
                      arr.push(checkboxValue);
                    }
                  } else {
                    const index = arr.indexOf(checkboxValue);
                    if (index > -1) {
                      arr.splice(index, 1);
                    }
                  }
                  value = arr;
                } else {
                  // Single checkbox with custom true/false values
                  if (trueValue !== null || falseValue !== null) {
                    value = el.checked
                      ? trueValue || true
                      : falseValue || false;
                  } else {
                    value = el.checked;
                  }
                }
              } else if (
                el instanceof HTMLInputElement &&
                el.type === "radio"
              ) {
                if (el.checked) {
                  value = el.value;
                  // Update other radio buttons in the same group
                  const radioGroup = root.querySelectorAll(
                    `input[type="radio"][name="${el.name}"]`,
                  );
                  radioGroup.forEach((radio) => {
                    if (radio !== el) {
                      (radio as HTMLInputElement).checked = false;
                    }
                  });
                } else {
                  return; // Don't update state for unchecked radio
                }
              } else {
                // Text inputs, textarea, select, etc.
                value = (
                  el as
                    | HTMLInputElement
                    | HTMLTextAreaElement
                    | HTMLSelectElement
                ).value;

                // Apply modifiers in Vue.js order
                if (modifiers.includes("trim") && typeof value === "string") {
                  value = value.trim();
                }

                if (
                  modifiers.includes("number") ||
                  (el instanceof HTMLInputElement && el.type === "number")
                ) {
                  const numValue = Number(value);
                  value = isNaN(numValue) ? value : numValue;
                }
              }

              // Update state
              setNestedValue(state, stateProp, value);

              // Trigger re-render if needed
              this._requestRender();
            };

            // Handle IME composition events
            if (el instanceof HTMLInputElement && el.type === "text") {
              const handleCompositionStart = () => {
                (el as any).isComposing = true;
              };

              const handleCompositionEnd = (e: Event) => {
                (el as any).isComposing = false;
                updateState(e);
              };

              el.addEventListener("compositionstart", handleCompositionStart);
              el.addEventListener("compositionend", handleCompositionEnd);

              this._inputListeners.push(() => {
                el.removeEventListener(
                  "compositionstart",
                  handleCompositionStart,
                );
                el.removeEventListener("compositionend", handleCompositionEnd);
              });
            }

            // Determine which events to listen to based on modifiers and input type
            const isLazy = modifiers.includes("lazy");
            const events: string[] = [];

            if (
              el instanceof HTMLSelectElement ||
              (el instanceof HTMLInputElement &&
                (el.type === "checkbox" || el.type === "radio"))
            ) {
              events.push("change");
            } else if (isLazy) {
              events.push("change", "blur");
            } else {
              events.push("input");
              // Also listen to change for additional robustness
              events.push("change");
            }

            // Add event listeners
            events.forEach((eventType) => {
              el.addEventListener(eventType, updateState);
              this._inputListeners.push(() =>
                el.removeEventListener(eventType, updateState),
              );
            });
          }
        }
      });
    }

    private _hasNestedProperty(obj: any, path: string): boolean {
      try {
        return path.split(".").reduce((o, key) => o?.[key], obj) !== undefined;
      } catch {
        return false;
      }
    }

    private _setInitialInputValue(
      el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
      stateValue: any,
    ): void {
      if (el instanceof HTMLInputElement && el.type === "checkbox") {
        const trueValue =
          el.getAttribute("true-value") || el.getAttribute("data-true-value");

        if (Array.isArray(stateValue)) {
          // Multiple checkbox binding - check if this checkbox's value is in the array
          const checkboxValue = trueValue || el.value;
          el.checked = stateValue.includes(checkboxValue);
        } else {
          // Single checkbox
          if (trueValue !== null) {
            el.checked = stateValue === trueValue;
          } else {
            el.checked = Boolean(stateValue);
          }
        }
      } else if (el instanceof HTMLInputElement && el.type === "radio") {
        el.checked = el.value === String(stateValue);
      } else {
        // Text inputs, textarea, select, etc.
        const stringValue = stateValue == null ? "" : String(stateValue);
        if (el instanceof HTMLSelectElement) {
          // For select elements, make sure the option exists
          const option = el.querySelector(`option[value="${stringValue}"]`);
          el.value = option ? stringValue : "";
        } else {
          el.value = stringValue;
        }
      }
    }

    private _requestRender(): void {
      // Debounced render request to avoid excessive re-renders
      if (this._renderTimeoutId !== null) {
        clearTimeout(this._renderTimeoutId);
      }
      this._renderTimeoutId = setTimeout(() => {
        this._render(this._cfg);
        this._renderTimeoutId = null;
      }, 0);
    }

    // --- Style ---
    private _applyStyle(cfg: ComponentConfig<S, C, P>) {
      this._runLogicWithinErrorBoundary(cfg, () => {
        if (typeof document === "undefined") return;
        if (!this.shadowRoot) return;
        let style = this.shadowRoot.querySelector("style");
        if (!style) {
          style = document.createElement("style");
          this.shadowRoot.prepend(style);
        }
        const rawStyle =
          typeof cfg.style === "function"
            ? cfg.style(this._state)
            : cfg.style || "";
        const safeStyle = sanitizeCSS(rawStyle);
        style.textContent = safeStyle;
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
        function createReactive(obj: any): any {
          if (Array.isArray(obj)) {
            return new Proxy(obj, {
              set(target, prop, value) {
                target[prop as any] = value;
                if (!self._initializing) self._render(cfg);
                return true;
              },
              deleteProperty(target, prop) {
                delete target[prop as any];
                if (!self._initializing) self._render(cfg);
                return true;
              },
            });
          }
          if (obj && typeof obj === "object") {
            Object.keys(obj).forEach((key) => {
              obj[key] = createReactive(obj[key]);
            });
            return new Proxy(obj, {
              set(target, prop, value) {
                target[prop as any] = createReactive(value);
                if (!self._initializing) self._render(cfg);
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

    private _applyProps(cfg: ComponentConfig<S, C, P>) {
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
          <input type="text" data-bind="name" />
        </div>

        <div class="form-group">
          <label>Name (vModel):</label>
          <p>None of these work at the moment:</p>
          <input type="text" ${vModel(state.name, val => state.name = val)} ${vClass("form-control", "cool")} ${vShow(false)} />
          <button ${vBind({ disabled: state.isActive })}>Submit</button>
        </div>

        <div class="form-group">
          <label>Email:</label>
          <input type="email" name="email" />
        </div>

        <div class="form-group">
          <label>Age:</label>
          <input type="number" data-bind="age" />
        </div>

        <div class="form-group">
          <label>Active group:</label>
          ${vFor(state.array, (item) => html`
            ${item}: <input type="checkbox" value="${item}" data-bind="array" />
          `)}
        </div>

        <div class="form-group">
          <label>Active:</label>
          <input type="checkbox" data-bind="isActive" />
        </div>

        <div class="form-group">
          <label>Color:</label>
          <select name="color">
            <option value="red">Red</option>
            <option value="green">Green</option>
            <option value="blue">Blue</option>
          </select>
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
