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
type StyleDefinition<TState> = 
  | string 
  | ((state: TState) => string) 
  | Record<string, Record<string, any>> // CSS object syntax
  | {
      static?: string | Record<string, Record<string, any>>;
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

// Template string interpolation helper with full expression support
function parseTemplateString(template: string, state: any): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_match, expression) => {
    try {
      const trimmedExpr = expression.trim();
      
      // Handle simple property access (existing functionality)
      if (/^[a-zA-Z_$][a-zA-Z0-9_$.]*$/.test(trimmedExpr)) {
        const keys = trimmedExpr.split('.');
        let value = state;
        for (const key of keys) {
          value = value?.[key];
        }
        return value ?? '';
      }
      
      // Handle more complex expressions safely
      return evaluateExpression(trimmedExpr, state);
    } catch {
      return ''; // Return empty string if evaluation fails
    }
  });
}

// Safe expression evaluator for template interpolation
function evaluateExpression(expression: string, state: any): string {
  try {
    // Create a safe context with only the state properties
    const context = { ...state };
    
    // Add common utility functions
    const utils = {
      classes: (obj: Record<string, boolean>) => 
        Object.entries(obj).filter(([, condition]) => condition).map(([className]) => className).join(' '),
      styles: (obj: Record<string, string | number>) => 
        Object.entries(obj).map(([prop, value]) => `${prop}: ${value}`).join('; '),
      format: (value: any, type: string) => {
        if (type === 'currency') return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
        if (type === 'date') return new Date(value).toLocaleDateString();
        return String(value);
      }
    };
    
    // Create function that evaluates in controlled scope
    const func = new Function(...Object.keys(context), ...Object.keys(utils), `"use strict"; return (${expression});`);
    const result = func(...Object.values(context), ...Object.values(utils));
    
    return result != null ? String(result) : '';
  } catch (error) {
    console.warn(`Template expression evaluation failed: ${expression}`, error);
    return '';
  }
}

// CSS object to string converter
function cssObjectToString(cssObj: Record<string, Record<string, any>>): string {
  return Object.entries(cssObj)
    .map(([selector, rules]) => {
      const ruleString = Object.entries(rules)
        .map(([prop, value]) => `  ${prop.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value};`)
        .join('\n');
      return `${selector} {\n${ruleString}\n}`;
    })
    .join('\n\n');
}

// Parse inline event handlers from template with enhanced support
function parseInlineEvents(template: string): { 
  cleanTemplate: string; 
  events: { [selector: string]: { [event: string]: string } } 
} {
  const events: { [selector: string]: { [event: string]: string } } = {};
  let eventCounter = 0;
  
  // Enhanced regex to support various event binding syntaxes
  const cleanTemplate = template.replace(/@(\w+)(?:\.(\w+))*="([^"]+)"/g, (_match, eventType, modifier, handler) => {
    const eventId = `inline-event-${eventCounter++}`;
    const selector = `[data-event-id="${eventId}"]`;
    
    if (!events[selector]) {
      events[selector] = {};
    }
    
    // Handle event modifiers (e.g., @click.prevent, @keydown.enter)
    let eventKey = eventType;
    if (modifier) {
      eventKey = `${eventType}.${modifier}`;
    }
    
    events[selector][eventKey] = handler;
    
    return `data-event-id="${eventId}"`;
  });
  
  return { cleanTemplate, events };
}

// Process inline events and convert them to proper event handlers
function processInlineEvents<TState extends object>(
  inlineEvents: { [selector: string]: { [event: string]: string } },
  actions?: { [actionName: string]: (state: TState, api?: any, ...args: any[]) => void }
): { [selector: string]: { [eventType: string]: (e: Event, state: TState, api: ComponentAPI) => void } } {
  const processedEvents: { [selector: string]: { [eventType: string]: (e: Event, state: TState, api: ComponentAPI) => void } } = {};
  
  Object.entries(inlineEvents).forEach(([selector, eventMap]) => {
    processedEvents[selector] = {};
    
    Object.entries(eventMap).forEach(([eventKey, handler]) => {
      const [eventType, modifier] = eventKey.split('.');
      
      processedEvents[selector]![eventType] = (event: Event, state: TState, api: ComponentAPI) => {
        // Handle event modifiers
        if (modifier) {
          switch (modifier) {
            case 'prevent':
              event.preventDefault();
              break;
            case 'stop':
              event.stopPropagation();
              break;
            case 'self':
              if (event.target !== event.currentTarget) return;
              break;
            case 'enter':
              if ((event as KeyboardEvent).key !== 'Enter') return;
              break;
            case 'escape':
              if ((event as KeyboardEvent).key !== 'Escape') return;
              break;
          }
        }
        
        // Check if handler references an action
        if (actions && handler in actions) {
          // Extract arguments from event if needed (e.g., input value)
          let args: any[] = [];
          if (event.target && 'value' in event.target) {
            args = [(event.target as any).value];
          }
          actions[handler](state, api, ...args);
        } else {
          // Evaluate as expression
          try {
            evaluateEventExpression(handler, { event, state, api });
          } catch (error) {
            console.warn(`Inline event handler failed: ${handler}`, error);
          }
        }
      };
    });
  });
  
  return processedEvents;
}

// Safe expression evaluator for event handlers
function evaluateEventExpression(expression: string, context: { event: Event; state: any; api: any }): void {
  try {
    const { event, state, api } = context;
    
    // Create a safe execution context with state properties available directly
    const stateKeys = Object.keys(state);
    
    // Create parameter names and values, including state properties as direct parameters
    const paramNames = ['event', 'state', 'api', '$event', '$state', '$api', ...stateKeys];
    const paramValues = [event, state, api, event, state, api, ...stateKeys.map(key => state[key])];
    
    // Create a function where state properties are available as mutable parameters
    const functionBody = `
      try {
        const result = ${expression.endsWith(';') ? expression.slice(0, -1) : expression};
        
        // Update the state object with any changed values
        ${stateKeys.map(key => `
          if (${key} !== state.${key}) {
            state.${key} = ${key};
          }
        `).join('')}
        
        return result;
      } catch (e) {
        console.error('❌ Expression execution error:', e);
        throw e;
      }
    `;
    
    const func = new Function(...paramNames, functionBody);
    func(...paramValues);
  } catch (error) {
    console.warn(`Event expression evaluation failed: ${expression}`, error);
  }
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
  
  // Action shortcuts for common state mutations
  actions?: {
    [actionName: string]: (state: TState, api: ComponentAPI, ...args: any[]) => void;
  };
  
  events?: {
    [selector: string]: {
      [eventType: string]: (e: Event, state: TState, api: ComponentAPI) => void;
    };
  } | {
    [selector: string]: {
      [eventType: string]: string; // Action name reference
    };
  };
  
  refs?: {
    [refKey: string]: (el: Element, state: TState, api: ComponentAPI) => void;
  };
  
  // Auto-forward all primitive props as attributes
  forwardProps?: boolean;
  
  // Declarative watchers
  when?: {
    [condition: string]: (state: TState, api: ComponentAPI) => void;
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
  let processedAttrs = processAttributes(options.attrs, processedState);
  
  // Auto-forward props if enabled
  if (options.forwardProps) {
    const autoAttrs = Object.keys(processedState)
      .filter(key => {
        const value = processedState[key as keyof TState];
        return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
      });
    const autoProcessed = processAttributes(autoAttrs as Array<keyof TState>, processedState);
    processedAttrs = { ...processedAttrs, ...autoProcessed };
  }
  
  // Process actions for event handling
  const actions = options.actions || {};
  
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
    : typeof style === 'object' && style !== null && !Array.isArray(style)
    ? (() => {
        // Handle CSS object syntax
        if ('static' in style || 'dynamic' in style) {
          // Hybrid style object
          const staticStyle = typeof style.static === 'string' 
            ? style.static 
            : typeof style.static === 'object' 
            ? cssObjectToString(style.static) 
            : '';
          return { static: staticStyle, dynamic: style.dynamic };
        } else {
          // Pure CSS object
          return { static: cssObjectToString(style as Record<string, Record<string, any>>), dynamic: undefined };
        }
      })()
    : { static: '', dynamic: undefined };

  const getStylesheet = (currentState?: TState) => {
    if (!StylesheetCache.has(options)) {
      const sheet = new CSSStyleSheet();
      StylesheetCache.set(options, sheet);
    }
    
    const sheet = StylesheetCache.get(options)!;
    let finalCSS = styleConfig.static;
    
    if (styleConfig.dynamic && currentState && typeof styleConfig.dynamic === 'function') {
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

      // Store currently focused element info before re-rendering
      const activeElement = root.activeElement as HTMLElement;
      const focusedInputInfo = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'SELECT' || activeElement.tagName === 'TEXTAREA') ? {
        element: activeElement,
        value: (activeElement as HTMLInputElement).value,
        selectionStart: (activeElement as HTMLInputElement).selectionStart,
        selectionEnd: (activeElement as HTMLInputElement).selectionEnd,
        dataRef: activeElement.getAttribute('data-ref'),
        tagName: activeElement.tagName
      } : null;

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

      // Restore focus and input state after re-rendering
      if (focusedInputInfo && focusedInputInfo.dataRef) {
        const newInput = root.querySelector(`[data-ref="${focusedInputInfo.dataRef}"]`) as HTMLInputElement;
        if (newInput && newInput.tagName === focusedInputInfo.tagName) {
          newInput.value = focusedInputInfo.value;
          newInput.focus();
          if (focusedInputInfo.selectionStart !== null && focusedInputInfo.selectionEnd !== null && focusedInputInfo.tagName === 'INPUT') {
            newInput.setSelectionRange(focusedInputInfo.selectionStart, focusedInputInfo.selectionEnd);
          }
        }
      }

      Object.entries(refs).forEach(([refKey, callback]) => {
        const el = root.querySelector(`[data-ref="${refKey}"]`);
        if (!el && debug) console.warn(`Missing ref: "${refKey}"`);
        if (el) callback(el, this.state, this.api);
      });

      mergedHooks.onAccessibleRender?.(root, this.state, this.api);
    }

    private addDelegatedListeners() {
      if (!events || !this.shadowRoot) {
        console.log('❌ No events or shadowRoot available');
        return;
      }

      Object.entries(events).forEach(([selector, handlers]) => {
        Object.entries(handlers).forEach(([type, fn]) => {
          const listener = (e: Event) => {
            const target = e.target as Element;
            
            if (target?.matches(selector)) {
              if (typeof fn === 'string') {
                // Action reference
                const action = actions[fn];
                if (action) {
                  action(this.state, this.api, e);
                } else {
                  debug && console.warn(`Action "${fn}" not found`);
                }
              } else if (typeof fn === 'function') {
                // Direct function
                fn(e, this.state, this.api);
              }
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

// Ultra-concise component creation with automatic features
export function quickComponent<TState extends object>(
  state: TState,
  template: string | ((state: TState) => string),
  actions?: { [actionName: string]: (state: TState) => void }
): typeof HTMLElement {
  // Process template for inline events
  let processedTemplate: Template<TState>;
  let processedEvents: any = {};
  
  if (typeof template === 'string') {
    const { cleanTemplate, events } = parseInlineEvents(template);
    processedTemplate = (state: TState) => parseTemplateString(cleanTemplate, state);
    processedEvents = processInlineEvents(events, actions);
  } else {
    processedTemplate = template;
  }

  return createReactiveComponent({
    state,
    template: processedTemplate,
    actions,
    events: processedEvents,
    forwardProps: true, // Auto-forward all props
  });
}

// Function component style (React-like)
export function functionComponent<TProps extends object = {}>(
  fn: (props: TProps) => string,
  defaultProps?: Partial<TProps>
): (props?: Partial<TProps>) => typeof HTMLElement {
  return (props = {} as Partial<TProps>) => {
    const finalProps = { ...defaultProps, ...props } as TProps;
    
    return createReactiveComponent({
      state: finalProps,
      template: () => fn(finalProps),
      forwardProps: true,
    });
  };
}

// Template helpers for better DX
export const html = (strings: TemplateStringsArray, ...values: any[]) => {
  return strings.reduce((result, string, i) => {
    return result + string + (values[i] || '');
  }, '');
};

export const css = (strings: TemplateStringsArray, ...values: any[]) => {
  return strings.reduce((result, string, i) => {
    return result + string + (values[i] || '');
  }, '');
};

export const classes = (classObj: Record<string, boolean>) => {
  return Object.entries(classObj)
    .filter(([_, condition]) => condition)
    .map(([className]) => className)
    .join(' ');
};
