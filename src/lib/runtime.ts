import { eventBus } from './event-bus.js';

const StylesheetCache = new WeakMap<object, CSSStyleSheet>();

type Disposable = { dispose(): void };
type AttributeType = 'string' | 'number' | 'boolean' | 'json';

type AttributeSchema = {
  [key: string]: {
    type?: AttributeType;
    reflect?: boolean;
    serialize?: (val: any) => string;
    deserialize?: (val: string) => any;
    transform?: (val: string) => any;
  };
};

type Template<TState> = string | ((state: TState) => string);
type StyleDefinition<TState> = string | ((state: TState) => string) | {
  static?: string;
  dynamic?: (state: TState) => string | Record<string, string>;
};

type ComponentAPI = {
  emit: (eventName: string, detail?: unknown) => void;
  emitGlobal: <T = any>(eventName: string, data?: T) => void;
  onGlobal: <T = any>(eventName: string, handler: (data: T) => void) => () => void;
  onceGlobal: <T = any>(eventName: string, handler: (data: T) => void) => Promise<T>;
  listenGlobal: <T = any>(eventName: string, handler: (event: CustomEvent<T>) => void, options?: AddEventListenerOptions) => () => void;
  offGlobal: <T = any>(eventName: string, handler: (data: T) => void) => void;
};

// Helper to convert camelCase to kebab-case for auto tag generation
function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
}

// Auto-generate tag name from variable name or function name
function autoGenerateTag(name?: string): string {
  if (name) {
    return camelToKebab(name);
  }
  // Fallback to a unique identifier
  return `auto-component-${Math.random().toString(36).substr(2, 9)}`;
}

// Process state to extract getter-based computed properties
function processStateForGetters<T extends object>(state: T): {
  processedState: T;
  extractedComputed: { [key: string]: () => any };
} {
  const processedState = { ...state };
  const extractedComputed: { [key: string]: () => any } = {};

  // Extract getters from state object
  Object.getOwnPropertyNames(state).forEach(key => {
    const descriptor = Object.getOwnPropertyDescriptor(state, key);
    if (descriptor && descriptor.get) {
      // Move getter to computed properties
      extractedComputed[key] = descriptor.get;
      // Remove the getter from state (it will be handled as computed)
      delete (processedState as any)[key];
    }
  });

  return { processedState, extractedComputed };
}

// Process attributes to support both array and object syntax
function processAttributes<T extends object>(
  attrs: AttributeSchema | Array<keyof T> | undefined,
  state: T
): AttributeSchema {
  if (!attrs) return {};
  
  if (Array.isArray(attrs)) {
    // Auto-infer attribute types from state
    const inferredAttrs: AttributeSchema = {};
    attrs.forEach(key => {
      const value = state[key];
      const type = typeof value === 'string' ? 'string' :
                  typeof value === 'number' ? 'number' :
                  typeof value === 'boolean' ? 'boolean' : 'string';
      
      inferredAttrs[key as string] = {
        type: type as AttributeType,
        reflect: true
      };
    });
    return inferredAttrs;
  }
  
  return attrs;
}

export type ReactiveComponentOptions<TState extends object> = {
  // Tag can now be optional for auto-generation
  tag?: string;
  template: Template<TState>;
  style?: StyleDefinition<TState>;
  state: TState;
  
  // Simplified attribute schema - can be array of strings for auto-inference
  attrs?: AttributeSchema | Array<keyof TState>;
  
  events?: {
    [selector: string]: {
      [eventType: string]: (e: Event, state: TState, api: ComponentAPI) => void;
    };
  };
  refs?: {
    [refKey: string]: (el: Element, state: TState, api: ComponentAPI) => void;
  };
  
  // Lifecycle hook shortcuts - can be defined directly on options
  onMounted?: (state: TState, api: ComponentAPI) => void;
  onUnmounted?: (state: TState, api: ComponentAPI) => void;
  beforeRender?: (state: TState, api: ComponentAPI) => boolean | void;
  renderShadow?: (root: ShadowRoot, state: TState, api: ComponentAPI) => void;
  onAccessibleRender?: (root: ShadowRoot, state: TState, api: ComponentAPI) => void;
  setupGlobalEvents?: (state: TState, api: ComponentAPI) => void;
  onStateChange?: (changes: Partial<TState>, state: TState, api: ComponentAPI) => void;
  onError?: (error: Error, state: TState, api: ComponentAPI) => void;
  
  // Legacy hooks object for backward compatibility
  hooks?: {
    onMounted?: (state: TState, api: ComponentAPI) => void;
    onUnmounted?: (state: TState, api: ComponentAPI) => void;
    beforeRender?: (state: TState, api: ComponentAPI) => boolean | void;
    renderShadow?: (root: ShadowRoot, state: TState, api: ComponentAPI) => void;
    onAccessibleRender?: (root: ShadowRoot, state: TState, api: ComponentAPI) => void;
    setupGlobalEvents?: (state: TState, api: ComponentAPI) => void;
    onStateChange?: (changes: Partial<TState>, state: TState, api: ComponentAPI) => void;
    onError?: (error: Error, state: TState, api: ComponentAPI) => void;
  };
  
  disposables?: Array<(state: TState, api: ComponentAPI) => Disposable>;
  watch?: Partial<{
    [K in keyof TState]: (value: TState[K], oldValue: TState[K], state: TState, api: ComponentAPI) => void;
  }>;
  computed?: {
    [key: string]: (state: TState, api: ComponentAPI) => any;
  };
  reflectAttributes?: boolean;
  debug?: boolean;
  // Enhanced DX options
  devtools?: boolean;
  hotReload?: boolean;
  strictMode?: boolean;
  errorBoundary?: boolean;
};

export function createReactiveComponent<TState extends object>(options: ReactiveComponentOptions<TState>) {
  // Auto-generate tag if not provided
  const tag = options.tag || autoGenerateTag();
  
  // Extract computed properties from state getters
  const { processedState, extractedComputed } = processStateForGetters(options.state);
  
  // Merge extracted computed with explicitly defined computed
  const mergedComputed = { ...extractedComputed, ...(options.computed || {}) };
  
  // Process attributes - support both array syntax and object syntax
  const processedAttrs = processAttributes(options.attrs, processedState);
  
  // Merge lifecycle hooks from both direct properties and hooks object
  const mergedHooks = {
    onMounted: options.onMounted || options.hooks?.onMounted,
    onUnmounted: options.onUnmounted || options.hooks?.onUnmounted,
    beforeRender: options.beforeRender || options.hooks?.beforeRender,
    renderShadow: options.renderShadow || options.hooks?.renderShadow,
    onAccessibleRender: options.onAccessibleRender || options.hooks?.onAccessibleRender,
    setupGlobalEvents: options.setupGlobalEvents || options.hooks?.setupGlobalEvents,
    onStateChange: options.onStateChange || options.hooks?.onStateChange,
    onError: options.onError || options.hooks?.onError,
  };

  const {
    template,
    style = '',
    events = {},
    refs = {},
    disposables = [],
    debug = false,
  } = options;

  // Parse style definition
  const styleConfig = typeof style === 'string' 
    ? { static: style, dynamic: undefined }
    : typeof style === 'function'
    ? { static: '', dynamic: style }
    : typeof style === 'object' && style !== null
    ? { static: style.static || '', dynamic: style.dynamic }
    : { static: '', dynamic: undefined };

  const getStylesheet = (currentState?: TState) => {
    if (!StylesheetCache.has(options)) {
      const sheet = new CSSStyleSheet();
      StylesheetCache.set(options, sheet);
    }
    
    const sheet = StylesheetCache.get(options)!;
    let finalCSS = styleConfig.static;
    
    if (styleConfig.dynamic && currentState) {
      const dynamicResult = styleConfig.dynamic(currentState);
      
      if (typeof dynamicResult === 'string') {
        finalCSS += '\n' + dynamicResult;
      } else if (typeof dynamicResult === 'object') {
        // Convert CSS custom properties object to CSS
        const customProps = Object.entries(dynamicResult)
          .map(([key, value]) => `${key.startsWith('--') ? key : '--' + key}: ${value};`)
          .join(' ');
        finalCSS += `\n:host { ${customProps} }`;
      }
    }
    
    sheet.replaceSync(finalCSS);
    return sheet;
  };

  class ReactiveElement extends HTMLElement {
    private state: TState;
    private disposables: Disposable[] = [];
    private listeners: Array<{ type: string; handler: EventListener }> = [];
    private lastHTML = '';
    private computedCache = new Map<string, any>();
    private computedDependencies = new Map<string, Set<string>>();
    private globalEventUnsubscribers: Array<() => void> = [];
    private renderFrame: number | null = null;
    private componentConnected = false;
    private batchedUpdates = new Set<string>();
    private api: ComponentAPI;

    static get observedAttributes(): string[] {
      return Object.keys(processedAttrs);
    }

    constructor() {
      super();
      this.state = this.makeReactive(processedState);
      this.attachShadow({ mode: 'open' });
      
      // Create the component API
      this.api = {
        emit: (eventName: string, detail: unknown = {}) => {
          this.dispatchEvent(new CustomEvent(eventName, {
            detail,
            bubbles: true,
            composed: true,
          }));
        },
        emitGlobal: <T = any>(eventName: string, data?: T) => {
          eventBus.emit(eventName, data);
        },
        onGlobal: <T = any>(eventName: string, handler: (data: T) => void) => {
          const unsubscribe = eventBus.on(eventName, handler);
          this.globalEventUnsubscribers.push(unsubscribe);
          return unsubscribe;
        },
        onceGlobal: <T = any>(eventName: string, handler: (data: T) => void) => {
          const promise = eventBus.once(eventName, handler);
          return promise;
        },
        listenGlobal: <T = any>(eventName: string, handler: (event: CustomEvent<T>) => void, options?: AddEventListenerOptions) => {
          const unsubscribe = eventBus.listen(eventName, handler, options);
          this.globalEventUnsubscribers.push(unsubscribe);
          return unsubscribe;
        },
        offGlobal: <T = any>(eventName: string, handler: (data: T) => void) => {
          eventBus.off(eventName, handler);
        }
      };
    }

    connectedCallback() {
      this.componentConnected = true;
      this.render();
      this.addDelegatedListeners();
      this.disposables = disposables.map(fn => fn(this.state, this.api));
      mergedHooks.setupGlobalEvents?.(this.state, this.api);
      mergedHooks.onMounted?.(this.state, this.api);
    }

    disconnectedCallback() {
      this.componentConnected = false;
      this.removeDelegatedListeners();
      this.disposables.forEach(d => d.dispose());
      this.disposables = [];
      
      // Cancel pending render
      if (this.renderFrame !== null) {
        cancelAnimationFrame(this.renderFrame);
        this.renderFrame = null;
      }
      
      // Clean up global event listeners
      this.globalEventUnsubscribers.forEach(unsubscribe => unsubscribe());
      this.globalEventUnsubscribers = [];
      
      mergedHooks.onUnmounted?.(this.state, this.api);
    }

    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
      if (oldValue === newValue || !(name in processedAttrs)) return;
      const schema = processedAttrs[name];
      const transform =
        schema?.deserialize ??
        schema?.transform ??
        this.defaultTransform(schema?.type);

      try {
        (this.state as any)[name] = transform(newValue!);
      } catch (e) {
        debug && console.warn(`Attribute transform failed for "${name}":`, e);
      }
    }

    private defaultTransform(type?: AttributeType) {
      return (val: string) => {
        switch (type) {
          case 'boolean': return val === 'true';
          case 'number': return Number(val);
          case 'json': return JSON.parse(val);
          default: return val;
        }
      };
    }

    private makeReactive(obj: TState): TState {
      const handler = {
        get: (t: any, prop: string) => {
          // Check if this is a computed property
          if (mergedComputed[prop]) {
            return this.getComputedValue(prop);
          }
          
          const val = t[prop];
          return typeof val === 'object' && val !== null ? new Proxy(val, handler) : val;
        },
        set: (t: any, prop: string, value: any) => {
          // Don't allow setting computed properties
          if (mergedComputed[prop]) {
            debug && console.warn(`Cannot set computed property "${prop}"`);
            return false;
          }

          const oldVal = t[prop];
          
          // Skip update if value hasn't changed (shallow comparison)
          if (oldVal === value) return true;
          
          t[prop] = value;
          this.batchedUpdates.add(prop);

          const schema = processedAttrs[prop];
          const shouldReflect = schema?.reflect ?? options.reflectAttributes === true;

          if (shouldReflect) {
            const serializer =
              typeof schema?.serialize === 'function'
                ? schema.serialize
                : (val: any) => {
                    switch (schema?.type) {
                      case 'boolean': return val ? 'true' : 'false';
                      case 'number': return String(val);
                      case 'json': return JSON.stringify(val);
                      default: return String(val);
                    }
                  };

            try {
              queueMicrotask(() =>
                this.setAttribute(String(prop), serializer(value))
              );
            } catch (err) {
              debug && console.warn(`Failed to serialize "${prop}":`, err);
            }
          }

          // Invalidate computed properties that depend on this property
          this.invalidateComputedDependents(prop);

          options.watch?.[prop as keyof TState]?.(value, oldVal, this.state, this.api);
          this.scheduleRender();
          return true;
        }
      };
      return new Proxy(obj, handler);
    }

    private getComputedValue(prop: string): any {
      // Return cached value if available
      if (this.computedCache.has(prop)) {
        return this.computedCache.get(prop);
      }

      // Track dependencies during computation
      const dependencies = new Set<string>();
      
      // Create a tracking proxy to capture dependencies
      const trackingProxy = new Proxy(this.state, {
        get: (target: any, key: string) => {
          dependencies.add(key);
          return target[key];
        }
      });

      // Compute the value with dependency tracking
      const computeFunc = mergedComputed[prop];
      const computedValue = computeFunc(trackingProxy, this.api);

      // Cache the result and dependencies
      this.computedCache.set(prop, computedValue);
      this.computedDependencies.set(prop, dependencies);

      return computedValue;
    }

    private invalidateComputedDependents(changedProp: string): void {
      // Find all computed properties that depend on the changed property
      for (const [computedProp, deps] of this.computedDependencies.entries()) {
        if (deps.has(changedProp)) {
          // Remove from cache to force recomputation
          this.computedCache.delete(computedProp);
          // Clear dependencies as they might change on recomputation
          this.computedDependencies.delete(computedProp);
        }
      }
    }

    private scheduleRender() {
      // Don't render if component is not connected
      if (!this.componentConnected) return;
      
      if (this.renderFrame === null) {
        this.renderFrame = requestAnimationFrame(() => {
          if (mergedHooks.beforeRender?.(this.state, this.api) === false) {
            this.renderFrame = null;
            return;
          }
          this.render();
          this.renderFrame = null;
          this.batchedUpdates.clear();
        });
      }
    }

    private render() {
      const root = this.shadowRoot!;
      const html = typeof template === 'function' ? template(this.state) : template;

      if (html === this.lastHTML && !mergedHooks.renderShadow && !styleConfig.dynamic) return;
      this.lastHTML = html;

      root.innerHTML = '';
      (root as any).adoptedStyleSheets = [getStylesheet(this.state)];

      if (mergedHooks.renderShadow) {
        mergedHooks.renderShadow(root, this.state, this.api);
      } else {
        root.innerHTML = html;
      }

      [...this.children].forEach(child => {
        root.appendChild(child.cloneNode(true));
      });

      Object.entries(refs).forEach(([refKey, callback]) => {
        const el = root.querySelector(`[data-ref="${refKey}"]`);
        if (!el && debug) console.warn(`Missing ref: "${refKey}"`);
        if (el) callback(el, this.state, this.api);
      });

      mergedHooks.onAccessibleRender?.(root, this.state, this.api);
    }

    private addDelegatedListeners() {
      if (!events || !this.shadowRoot) return;

      Object.entries(events).forEach(([selector, handlers]) => {
        Object.entries(handlers).forEach(([type, fn]) => {
          const listener = (e: Event) => {
            const target = e.target as Element;
            if (target?.matches(selector)) {
              fn(e, this.state, this.api);
            }
          };
          this.shadowRoot!.addEventListener(type, listener);
          this.listeners.push({ type, handler: listener });
        });
      });
    }

    private removeDelegatedListeners() {
      this.listeners.forEach(({ type, handler }) => {
        this.shadowRoot?.removeEventListener(type, handler);
      });
      this.listeners = [];
    }
  }

  if (!customElements.get(tag)) {
    customElements.define(tag, ReactiveElement);
  }

  return ReactiveElement;
}

// Convenience function with even better defaults and automatic features
export function component<TState extends object>(
  tagOrOptions: string | ReactiveComponentOptions<TState>,
  optionsIfString?: Omit<ReactiveComponentOptions<TState>, 'tag'>
): typeof HTMLElement {
  if (typeof tagOrOptions === 'string') {
    // Called as component('my-tag', { ... })
    return createReactiveComponent({
      tag: tagOrOptions,
      ...optionsIfString!,
    });
  } else {
    // Called as component({ ... }) - auto-generate tag
    return createReactiveComponent(tagOrOptions);
  }
}

// Super simplified component creation for common cases
export function simpleComponent<TState extends object>(
  state: TState,
  template: Template<TState>,
  options?: Partial<ReactiveComponentOptions<TState>>
): typeof HTMLElement {
  return createReactiveComponent({
    state,
    template,
    attrs: Object.keys(state) as Array<keyof TState>, // Auto-infer all state props as attributes
    ...options,
  });
}
