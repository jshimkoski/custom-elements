import type {
  ComponentConfig,
  ComponentContext,
  Refs,
  WatcherState,
  VNode,
} from "./types";
import { reactiveSystem } from "./reactive";
import { toKebab } from "./helpers";
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

      // Inject refs into context (non-enumerable to avoid proxy traps)
      Object.defineProperty(reactiveContext, "refs", {
        value: this._refs,
        writable: false,
        enumerable: false,
        configurable: false,
      });

      // Inject requestRender into context (non-enumerable to avoid proxy traps)
      Object.defineProperty(reactiveContext, "requestRender", {
        value: () => this.requestRender(),
        writable: false,
        enumerable: false,
        configurable: false,
      });

      // Inject _requestRender for backward compatibility (used by model directive)
      Object.defineProperty(reactiveContext, "_requestRender", {
        value: () => this._requestRender(),
        writable: false,
        enumerable: false,
        configurable: false,
      });

      // Inject component ID for functional component state persistence
      Object.defineProperty(reactiveContext, "_componentId", {
        value: this._componentId,
        writable: false,
        enumerable: false,
        configurable: false,
      });

      // Inject _triggerWatchers for model directive to trigger watchers
      Object.defineProperty(reactiveContext, "_triggerWatchers", {
        value: (path: string, newValue: any) =>
          this._triggerWatchers(path, newValue),
        writable: false,
        enumerable: false,
        configurable: false,
      });

      // --- Apply props BEFORE wiring listeners and emit ---
      this.context = reactiveContext;
      // Defer applying props until connectedCallback so attributes that are
      // set by the parent renderer (after element construction) are available.
      // applyProps will still be invoked from attributeChangedCallback when
      // attributes are set; connectedCallback will call it as a final step to
      // ensure defaults are applied when no attributes are present.

      // Inject emit helper for custom events (single canonical event API).
      // Emits a DOM CustomEvent and returns whether it was not defaultPrevented.
      Object.defineProperty(this.context, "emit", {
        value: (eventName: string, detail?: any, options?: CustomEventInit) => {
          const ev = new CustomEvent(eventName, {
            detail,
            bubbles: true,
            composed: true,
            ...(options || {}),
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
      const cfgToUse =
        (registry.get(tag) as ComponentConfig<S, C, P, T>) || config;
      Object.keys(cfgToUse).forEach((key) => {
        const fn = (cfgToUse as any)[key];
        if (typeof fn === "function") {
          // Expose as context method: context.fn(...args) => fn(...args, context)
          (this.context as any)[key] = (...args: any[]) =>
            fn(...args, this.context);
        }
      });

      this._applyComputed(cfgToUse);

      // Set up reactive property setters for all props to detect external changes
      if (cfgToUse.props) {
        Object.keys(cfgToUse.props).forEach((propName) => {
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
        });
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

    private _applyComputed(_cfg: ComponentConfig<S, C, P, T>) {
      // Computed properties are now handled by the computed() function and reactive system
      // This method is kept for compatibility but does nothing in the functional API
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
        if (cfg.onError) {
          cfg.onError(error as Error | null, this.context);
        }
        // Note: errorFallback was removed as it's handled by the functional API directly
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
            if (obj.constructor && obj.constructor.name === "ReactiveState") {
              return obj;
            }

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
 * // With props only
 * component('with-props', ({ message = 'Hello' }) => {
 *   return html`<div>${message}</div>`;
 * });
 *
 * // With props and hooks
 * component('my-switch', ({
 *   modelValue = false,
 *   label = ''
 * }, { emit, onConnected, onDisconnected }) => {
 *   onConnected(() => console.log('Switch connected!'));
 *   onDisconnected(() => console.log('Switch disconnected!'));
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

// Overload 1: No parameters - simple components
export function component(
  tag: string,
  renderFn: () => VNode | VNode[] | Promise<VNode | VNode[]>,
): void;

// Overload 2: Props only - modern recommended approach with context-based hooks
export function component<TProps extends Record<string, any> = {}>(
  tag: string,
  renderFn: (props: TProps) => VNode | VNode[] | Promise<VNode | VNode[]>,
): void;

// Implementation
export function component(
  tag: string,
  renderFn: (...args: any[]) => VNode | VNode[] | Promise<VNode | VNode[]>,
): void {
  let normalizedTag = toKebab(tag);
  if (!normalizedTag.includes("-")) {
    normalizedTag = `cer-${normalizedTag}`;
  }

  // We'll parse the function string to extract defaults (dev time only)
  let propDefaults: Record<string, any> = {};

  if (typeof window !== "undefined") {
    try {
      const fnString = renderFn.toString();
      // More robust parsing for destructured parameters with defaults
      // Use a more sophisticated approach to handle nested braces
      let paramsMatch = null;
      const openBraceIndex = fnString.indexOf("({");

      if (openBraceIndex !== -1) {
        let depth = 0;
        let inString = false;
        let stringChar = null;
        let escaped = false;
        let endIndex = -1;

        for (let i = openBraceIndex + 2; i < fnString.length; i++) {
          const char = fnString[i];

          if (escaped) {
            escaped = false;
            continue;
          }

          if (char === "\\") {
            escaped = true;
            continue;
          }

          if (!inString && (char === '"' || char === "'" || char === "`")) {
            inString = true;
            stringChar = char;
            continue;
          }

          if (inString && char === stringChar) {
            inString = false;
            stringChar = null;
            continue;
          }

          if (!inString) {
            if (char === "{") {
              depth++;
            } else if (char === "}") {
              if (depth === 0) {
                endIndex = i;
                break;
              }
              depth--;
            }
          }
        }

        if (endIndex !== -1) {
          const fullMatch = fnString.substring(openBraceIndex, endIndex + 2); // Include })
          const innerContent = fnString
            .substring(openBraceIndex + 2, endIndex)
            .trim();
          paramsMatch = [fullMatch, innerContent];
        }
      }

      if (paramsMatch) {
        const propsString = paramsMatch[1];

        // More robust parsing for destructured parameters with defaults
        // Parse character by character to handle nested quotes and complex strings
        let currentKey = "";
        let currentValue = "";
        let inKey = true;
        let depth = 0;
        let quoteChar = null;
        let escaped = false;
        let i = 0;

        while (i < propsString.length) {
          const char = propsString[i];

          if (escaped) {
            if (inKey) {
              currentKey += char;
            } else {
              currentValue += char;
            }
            escaped = false;
            i++;
            continue;
          }

          if (char === "\\") {
            escaped = true;
            if (inKey) {
              currentKey += char;
            } else {
              currentValue += char;
            }
            i++;
            continue;
          }

          // Handle quotes
          if ((char === '"' || char === "'" || char === "`") && !quoteChar) {
            quoteChar = char;
            if (inKey) {
              currentKey += char;
            } else {
              currentValue += char;
            }
            i++;
            continue;
          }

          if (char === quoteChar) {
            quoteChar = null;
            if (inKey) {
              currentKey += char;
            } else {
              currentValue += char;
            }
            i++;
            continue;
          }

          // If we're inside quotes, add everything
          if (quoteChar) {
            if (inKey) {
              currentKey += char;
            } else {
              currentValue += char;
            }
            i++;
            continue;
          }

          // Handle brackets for nested objects/arrays
          if (char === "{" || char === "[") {
            depth++;
            if (inKey) {
              currentKey += char;
            } else {
              currentValue += char;
            }
            i++;
            continue;
          }

          if (char === "}" || char === "]") {
            depth--;
            if (inKey) {
              currentKey += char;
            } else {
              currentValue += char;
            }
            i++;
            continue;
          }

          // Handle assignment operator
          if (char === "=" && depth === 0 && inKey) {
            inKey = false;
            i++;
            continue;
          }

          // Handle comma separator
          if (char === "," && depth === 0) {
            // Process the current key-value pair
            if (currentKey.trim() && currentValue.trim()) {
              const key = currentKey.trim();
              const value = currentValue.trim();

              try {
                // Parse the default value
                if (value === "true") propDefaults[key] = true;
                else if (value === "false") propDefaults[key] = false;
                else if (value === "[]") propDefaults[key] = [];
                else if (value === "{}") propDefaults[key] = {};
                else if (/^\d+$/.test(value))
                  propDefaults[key] = parseInt(value);
                else if (/^'.*'$/s.test(value)) {
                  // Single quoted string
                  propDefaults[key] = value
                    .slice(1, -1)
                    .replace(/\\'/g, "'")
                    .replace(/\\"/g, '"')
                    .replace(/\\\//g, "/");
                } else if (/^".*"$/s.test(value)) {
                  // Double quoted string
                  propDefaults[key] = value
                    .slice(1, -1)
                    .replace(/\\"/g, '"')
                    .replace(/\\'/g, "'")
                    .replace(/\\\//g, "/");
                } else if (/^`.*`$/s.test(value)) {
                  // Template literal - evaluate simple cases
                  const templateContent = value.slice(1, -1);
                  // Handle basic template literal evaluation
                  if (templateContent.includes("${")) {
                    // For expressions like ${Date.now()}, evaluate them
                    try {
                      propDefaults[key] = new Function(
                        `return \`${templateContent}\`;`,
                      )();
                    } catch {
                      // If evaluation fails, keep the literal content
                      propDefaults[key] = templateContent;
                    }
                  } else {
                    propDefaults[key] = templateContent;
                  }
                } else {
                  propDefaults[key] = value;
                }
              } catch (e) {
                propDefaults[key] = "";
              }
            } else if (currentKey.trim()) {
              // Key without value
              const key = currentKey.split(":")[0].trim();
              if (key && !key.includes("}")) {
                propDefaults[key] = "";
              }
            }

            // Reset for next pair
            currentKey = "";
            currentValue = "";
            inKey = true;
            i++;
            continue;
          }

          // Add regular characters
          if (inKey) {
            currentKey += char;
          } else {
            currentValue += char;
          }
          i++;
        }

        // Process the last key-value pair
        if (currentKey.trim() && currentValue.trim()) {
          const key = currentKey.trim();
          const value = currentValue.trim();

          try {
            // Parse the default value
            if (value === "true") propDefaults[key] = true;
            else if (value === "false") propDefaults[key] = false;
            else if (value === "[]") propDefaults[key] = [];
            else if (value === "{}") propDefaults[key] = {};
            else if (/^\d+$/.test(value)) propDefaults[key] = parseInt(value);
            else if (/^'.*'$/s.test(value)) {
              // Single quoted string
              propDefaults[key] = value
                .slice(1, -1)
                .replace(/\\'/g, "'")
                .replace(/\\"/g, '"')
                .replace(/\\\//g, "/");
            } else if (/^".*"$/s.test(value)) {
              // Double quoted string
              propDefaults[key] = value
                .slice(1, -1)
                .replace(/\\"/g, '"')
                .replace(/\\'/g, "'")
                .replace(/\\\//g, "/");
            } else if (/^`.*`$/s.test(value)) {
              // Template literal - evaluate simple cases
              const templateContent = value.slice(1, -1);
              // Handle basic template literal evaluation
              if (templateContent.includes("${")) {
                // For expressions like ${Date.now()}, evaluate them
                try {
                  propDefaults[key] = new Function(
                    `return \`${templateContent}\`;`,
                  )();
                } catch {
                  // If evaluation fails, keep the literal content
                  propDefaults[key] = templateContent;
                }
              } else {
                propDefaults[key] = templateContent;
              }
            } else {
              propDefaults[key] = value;
            }
          } catch (e) {
            propDefaults[key] = "";
          }
        } else if (currentKey.trim()) {
          // Key without value
          const key = currentKey.split(":")[0].trim();
          if (key && !key.includes("}")) {
            propDefaults[key] = "";
          }
        }
      }
    } catch (e) {
      // Fallback: no props parsing
    }
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
    // Generate props config from defaults
    props: Object.fromEntries(
      Object.entries(propDefaults).map(([key, defaultValue]) => {
        const type =
          typeof defaultValue === "boolean"
            ? Boolean
            : typeof defaultValue === "number"
              ? Number
              : typeof defaultValue === "string"
                ? String
                : Function; // Use Function for complex types
        return [key, { type, default: defaultValue }];
      }),
    ),

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

        // Check if we have prop defaults (indicates destructured parameters)
        const hasProps = Object.keys(propDefaults).length > 0;

        let result;
        if (hasProps) {
          // Destructured parameters detected - create fresh props object with current context values
          const freshProps: any = {};

          Object.keys(propDefaults).forEach((key) => {
            const contextValue = (context as any)[key];
            const defaultValue = propDefaults[key];

            // Use default value if context value is nullish or empty string
            freshProps[key] =
              contextValue != null && contextValue !== ""
                ? contextValue
                : defaultValue;
          });
          result = renderFn(freshProps);
        } else {
          // No parameters expected - call with no arguments
          result = renderFn();
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

  if (typeof window !== "undefined") {
    if (!customElements.get(normalizedTag)) {
      customElements.define(
        normalizedTag,
        createElementClass(normalizedTag, config) as CustomElementConstructor,
      );
    }
  }
}
