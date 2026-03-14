import type {
  ComponentConfig,
  ComponentContext,
  Refs,
  WatcherState,
} from '../types';
import { isReactiveState, reactiveSystem } from '../reactive';
import { toKebab, safe } from '../helpers';
import { initWatchers, triggerWatchers } from '../watchers';
import { applyProps } from '../props';
import {
  handleConnected,
  handleDisconnected,
  handleAttributeChanged,
} from '../lifecycle';
import {
  renderComponent,
  requestRender,
  applyStyle,
  registerChildComponent,
  unregisterChildComponent,
} from '../render';
import { scheduleDOMUpdate } from '../scheduler';
import { devError, devWarn } from '../logger';
import { registry } from './registry';

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
     * Returns true if the most recent render or lifecycle call threw an error.
     */
    public get hasError(): boolean {
      return this._hasError;
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
        // Clean up reactive system entries (componentData + stateStorage) so
        // disconnected components do not accumulate in the global Maps forever.
        reactiveSystem.cleanup(this._componentId);
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
      try {
        fn();
        // Clear error state only after a successful execution so that
        // getLastError() remains valid between a failed and a subsequent
        // successful render, rather than being wiped at the start of every call.
        this._hasError = false;
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

        // Propagate to the nearest ancestor <cer-error-boundary> so that
        // slotted child components' errors are surfaced to the boundary even
        // when the child has no useOnError handler of its own.
        // Skip when this element IS the error boundary to avoid double-handling.
        if (this.tagName.toLowerCase() !== 'cer-error-boundary') {
          let node: Element | null = this.parentElement;
          if (!node) {
            const root = this.getRootNode();
            if (root instanceof ShadowRoot) node = root.host.parentElement;
          }
          while (node) {
            if (node.tagName.toLowerCase() === 'cer-error-boundary') {
              type ErrorBoundaryElement = {
                _cerHandleChildError?: (err: unknown) => void;
              };
              (node as unknown as ErrorBoundaryElement)._cerHandleChildError?.(
                error,
              );
              break;
            }
            let next: Element | null = node.parentElement;
            if (!next) {
              const root = node.getRootNode();
              if (root instanceof ShadowRoot) next = root.host.parentElement;
            }
            node = next;
          }
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
        applyProps(this, cfg, this.context);
      });
    }
  };
}
