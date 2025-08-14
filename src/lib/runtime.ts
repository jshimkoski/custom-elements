// ============================================================================
// Exports
// ============================================================================

/**
 * Represents the state object for a component.
 * Extend this interface for custom state typing.
 */
export interface ComponentState extends Record<string, unknown> {}
/**
 * API exposed to component templates and lifecycle handlers.
 * Includes state, event emitters, and global event bus methods.
 */
export interface ComponentAPI<T extends ComponentState = ComponentState> {
  /**
   * Reactive state object. Mutate directly for reactivity.
   */
  readonly state: T;
  emit(eventName: string, detail?: unknown): void;
  onGlobal<U = any>(eventName: string, handler: (data: U) => void): () => void;
  offGlobal<U = any>(eventName: string, handler: (data: U) => void): void;
  emitGlobal<U = any>(eventName: string, data?: U): void;
}
/**
 * Configuration object for a custom element component.
 * Defines template, state, computed properties, styles, refs, and lifecycle hooks.
 * @template S - State type
 * @template C - Computed type
 */
export interface ComponentConfig<S extends ComponentState, C extends Record<string, any> = {}> {
  readonly template: (state: S & C, api: ComponentAPI<S & C>) => string | Promise<string> | CompiledTemplate<S & C>;
  readonly state: S;
  readonly computed?: { [K in keyof C]: (state: S) => C[K] };
  readonly style?: string | ((state: S & C) => string);
  readonly refs?: Record<string, RefHandler<S & C>>;
  readonly onMounted?: LifecycleHandler<S & C>;
  readonly onUnmounted?: LifecycleHandler<S & C>;
  readonly debug?: boolean;
  /**
   * Whitelist of state keys to reflect as attributes. If omitted, no keys are reflected.
   */
  readonly reflect?: string[];
  hydrate?: (el: Element | ShadowRoot, state: S & C, api: ComponentAPI<S & C>) => void;
  [handler: string]: ((...args: unknown[]) => unknown) | unknown;
}
/**
 * Handler for a ref element in the template.
 * @param element - The DOM element with data-ref
 * @param state - Current component state
 * @param api - Component API
 */
export type RefHandler<T extends ComponentState> = (
  element: Element,
  state: T,
  api: ComponentAPI<T>
) => void;
export type ComputedHandler<T extends ComponentState> = (state: T) => unknown;
/**
 * Lifecycle handler for mounted/unmounted events.
 * @param state - Current component state
 * @param api - Component API
 */
export type LifecycleHandler<T extends ComponentState> = (
  state: T,
  api: ComponentAPI<T>
) => void;
/**
 * Represents a compiled template for fast rendering and hydration.
 */
export type CompiledTemplate<S extends ComponentState = ComponentState> = {
  id: string;
  render: (state: S, api: ComponentAPI<S>) => DocumentFragment;
};
/**
 * Plugin interface for runtime hooks (init, render, error).
 */
export type RuntimePlugin<S extends ComponentState, C extends Record<string, any>> = {
  onInit?: (config: ComponentConfig<S, C>) => void;
  onRender?: (state: S & C, api: ComponentAPI<S & C>) => void;
  onError?: (error: Error, state: S & C, api: ComponentAPI<S & C>) => void;
};
export const runtimePlugins: RuntimePlugin<ComponentState, Record<string, unknown>>[] = [];
/**
 * Registers a runtime plugin for hooks (init, render, error).
 * @param plugin - RuntimePlugin instance
 */
export function useRuntimePlugin<S extends ComponentState, C extends Record<string, any>>(plugin: RuntimePlugin<S, C>) {
  runtimePlugins.push(plugin as RuntimePlugin<ComponentState, Record<string, unknown>>);
}

export { Store } from './store';
export { eventBus } from './event-bus';
export { renderToString, renderComponentsToString, generateHydrationScript } from './ssr';
export type { SSRComponentConfig, SSRRenderOptions, SSRContext } from './ssr';
export { html, compile, css, classes, styles, ref, on } from './template-helpers';
export { useDataModel } from './data-binding';
export { compileTemplate, renderCompiledTemplate, updateCompiledTemplate } from './template-compiler';
export { mountVNode, patchVNode, createVNodeFromElement, parseVNodeFromHTML, safeReplaceChild, getVNodeKey } from './v-dom';
export type { VNode } from './v-dom';


// ============================================================================
// Imports
// ============================================================================

import { reactive } from './computed-state';
import { eventBus } from './event-bus';
import { renderCompiledTemplate, updateCompiledTemplate } from './template-compiler';
import { useDataModel } from './data-binding';
import { mountVNode, patchVNode, parseVNodeFromHTML } from './v-dom';
import type { VNode } from './v-dom';


// ============================================================================
// Utilities
// ============================================================================

/**
 * Recursively sanitizes an object, removing dangerous keys and prototype pollution.
 * Handles circular references using a WeakSet.
 * @param obj - Object to sanitize
 * @param seen - WeakSet to track visited objects
 */
function deepSanitizeObject<T>(obj: T, seen = new WeakSet()): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (seen.has(obj as object)) return obj;
  seen.add(obj as object);
  if (Array.isArray(obj)) return obj.map(item => deepSanitizeObject(item, seen)) as any;
  // Prevent prototype pollution
  if (Object.getPrototypeOf(obj) !== Object.prototype && Object.getPrototypeOf(obj) !== null) {
    Object.setPrototypeOf(obj, null);
  }
  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
  const sanitized: any = Object.create(null);
  for (const key of Object.keys(obj)) {
    if (dangerousKeys.includes(key)) continue;
    sanitized[key] = deepSanitizeObject((obj as any)[key], seen);
  }
  return sanitized;
}

/**
 * Type guard to check if a value is Promise-like.
 */
function isPromise(val: unknown): val is Promise<unknown> {
  return !!val && typeof (val as any).then === 'function';
}


// ============================================================================
// Component Lifecycle
// ============================================================================

/**
 * Base class for runtime custom elements.
 * Handles lifecycle, rendering, controlled input sync, refs, and event binding.
 * @template S - State type
 * @template C - Computed type
 */
class ComponentElement<S extends ComponentState, C extends Record<string, any> = {}> extends HTMLElement {
  /**
   * Allows updating the state object and triggers a re-render.
   * @param newState - Partial state to merge
   */

  /**
   * Syncs whitelisted state properties to attributes after render.
   * Only keys listed in config.reflect are reflected.
   */
  private syncStateToAttributes(): void {
    if (!this.stateObj || !this.config?.reflect || !Array.isArray(this.config.reflect)) return;
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    this.config.reflect.forEach(key => {
      if (dangerousKeys.includes(key)) {
        this.removeAttribute(key);
        return;
      }
      const value = this.stateObj[key];
      if (["string", "number", "boolean"].includes(typeof value)) {
        if (value === undefined || value === null) {
          this.removeAttribute(key);
        } else {
          this.setAttribute(key, String(value));
        }
      } else {
        this.removeAttribute(key);
      }
    });
  }

  /**
   * Allows updating the template function at runtime and triggers a re-render.
   * @param newTemplate - New template function or string
   */
  public setTemplate(newTemplate: ((state: S & C, api: ComponentAPI<S & C>) => string | Promise<string> | CompiledTemplate<S & C>) | string): void {
    // Override readonly via type assertion for runtime mutability
    const config = this.config as any;
    if (typeof newTemplate === 'function') {
      config.template = newTemplate;
    } else {
      config.template = () => newTemplate;
    }
    if ((window as any).DEBUG_PATCH_VNODE) {
      console.log('[ComponentElement.setTemplate] Triggering render with newTemplate:', newTemplate);
    }
    this.render();
  }

  private _hasError = false;
  private _mountedCalled = false;
  private _unmountedCalled = false;
  /**
   * Tracks auto-wired config event handlers for removal
   */
  private _autoWiredHandlers: Record<string, EventListenerOrEventListenerObject[]> = {};

  /**
   * Override removeEventListener to support auto-wired config handler removal
   */
  override removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void {
    super.removeEventListener(type, listener, options);
    // Also remove auto-wired config handlers if present
    if (this._autoWiredHandlers[type]) {
      this._autoWiredHandlers[type] = this._autoWiredHandlers[type].filter(fn => {
        if (fn === listener) {
          super.removeEventListener(type, fn, options);
          return false;
        }
        return true;
      });
      if (this._autoWiredHandlers[type].length === 0) delete this._autoWiredHandlers[type];
    }
  }

  /**
   * observedAttributes automatically returns all primitive keys from static state.
   * This enables automatic attribute observation for all primitive state properties.
   */
  static get observedAttributes() {
    // @ts-ignore: allow dynamic static property access
    const state = this.stateObj || {};
    return Object.keys(state).filter(
      key => ['string', 'number', 'boolean'].includes(typeof state[key])
    );
  }

  /**
   * Called when an observed attribute changes. Syncs attribute to state and triggers render.
   */
  attributeChangedCallback(name: string, _oldValue: string, newValue: string) {
    if (name === '__proto__' || name === 'constructor' || name === 'prototype') return;
    if (this.config?.debug) {
      console.debug(`[CustomElement] attributeChangedCallback: '${name}' changed to '${newValue}' on`, this);
    }
    // Guard against stateObj being undefined
    if (!this.stateObj) return;
    // Only update state and trigger render if value differs
    if (name in this.stateObj) {
      const initialType = typeof (this.config?.state?.[name]);
      let value: any = newValue;
      if (newValue === null) {
        value = undefined;
      } else if (initialType === 'number') {
        if (value === undefined || value === '') {
          value = this.config?.state?.[name];
        } else {
          const num = Number(value);
          value = isNaN(num) ? this.config?.state?.[name] : num;
        }
      } else if (initialType === 'boolean') {
        value = value === 'true';
      }
      value = deepSanitizeObject(value);
      if ((this.stateObj as any)[name] !== value) {
        if (this.config?.debug) {
          console.log('[runtime] state update:', { name, value });
        }
        (this.stateObj as any)[name] = value;
        this.render();
      }
    }
  }

  /**
   * Force sync all controlled input values and event listeners after VDOM patching.
   */
  private forceSyncControlledInputs(): void {
    if (!this.shadowRoot) return;
    this.shadowRoot.querySelectorAll('input[data-model]').forEach(input => {
      const modelAttr = input.getAttribute('data-model');
      if (!modelAttr || !this.stateObj || typeof this.stateObj[modelAttr] === 'undefined') return;
      const inputEl = input as HTMLInputElement;
      const stateValue = String(this.stateObj[modelAttr]);
      const isFocused = document.activeElement === inputEl;
      // Ensure dirty flag is set on input event
      if (!(inputEl as any)._hasDirtyListener) {
        inputEl.addEventListener('input', () => {
          (inputEl as any)._isDirty = true;
        });
        inputEl.addEventListener('blur', () => {
          (inputEl as any)._isDirty = false;
        });
        (inputEl as any)._hasDirtyListener = true;
      }
      const isDirty = Boolean((inputEl as any)._isDirty);
      // Never set value for focused or dirty inputs—let user typing win
      if (isFocused || isDirty) {
        return;
      }
      // Only set value for unfocused and clean inputs if it differs and is not a radio or checkbox
      if (inputEl.type !== 'radio' && inputEl.type !== 'checkbox' && inputEl.value !== stateValue) {
        inputEl.value = stateValue;
      }
    });
    // Rebind other events (e.g., data-on-click)
    this.rebindEventListeners();
  }

  /**
   * Sync all controlled inputs and event listeners after render
   */
  private syncControlledInputsAndEvents(): void {
    if (!this.shadowRoot) return;
    // --- Radio Groups ---
    this.shadowRoot.querySelectorAll('input[type="radio"][data-model]').forEach((input) => {
      const modelAttr = input.getAttribute('data-model');
      if (!modelAttr || !this.stateObj || typeof this.stateObj[modelAttr] === 'undefined') {
        return;
      }
      const inputEl = input as HTMLInputElement;
      const stateValue = String(this.stateObj[modelAttr]);
      inputEl.checked = inputEl.value === stateValue;
    });
    // --- Checkbox, Text, Number ---
    this.shadowRoot.querySelectorAll('input[data-model]').forEach(input => {
      const modelAttr = input.getAttribute('data-model');
      if (!modelAttr || !this.stateObj || typeof this.stateObj[modelAttr] === 'undefined') return;
      const inputEl = input as HTMLInputElement;
      const stateValue = String(this.stateObj[modelAttr]);
      if (inputEl.type === 'checkbox') {
        const stateVal = this.stateObj[modelAttr];
        if (Array.isArray(stateVal)) {
          inputEl.checked = stateVal.includes(inputEl.value);
        } else {
          const trueValue = inputEl.getAttribute('data-true-value');
          const falseValue = inputEl.getAttribute('data-false-value');
          if (trueValue !== null || falseValue !== null) {
            if (String(stateVal) === trueValue) {
              inputEl.checked = true;
            } else if (String(stateVal) === falseValue) {
              inputEl.checked = false;
            } else if (stateVal === true) {
              inputEl.checked = true;
            } else {
              inputEl.checked = false;
            }
          } else {
            inputEl.checked = stateVal === true || stateVal === 'true' || stateVal === 1;
          }
        }
      } else if (inputEl.type === 'radio') {
        // Do not set value for radios
      } else {
        inputEl.value = stateValue;
      }
    });
    // --- Textarea ---
    this.shadowRoot.querySelectorAll('textarea[data-model]').forEach(textarea => {
      const modelAttr = textarea.getAttribute('data-model');
      if (!modelAttr || !this.stateObj || typeof this.stateObj[modelAttr] === 'undefined') return;
      (textarea as HTMLTextAreaElement).value = String(this.stateObj[modelAttr]);
    });
    // --- Select ---
    this.shadowRoot.querySelectorAll('select[data-model]').forEach(select => {
      const modelAttr = select.getAttribute('data-model');
      if (!modelAttr || !this.stateObj || typeof this.stateObj[modelAttr] === 'undefined') return;
      (select as HTMLSelectElement).value = String(this.stateObj[modelAttr]);
    });
  }

  /**
   * Attach event listeners for input[data-bind] after VDOM patching
   */
  private attachListItemModelListeners(): void {
    if (!this.shadowRoot) return;
    this.shadowRoot.querySelectorAll('input[data-bind]').forEach(input => {
      const bindExpr = input.getAttribute('data-bind');
      if (!bindExpr) return;
      // Remove previous listener if present
      if ((input as any)._listItemModelListener) {
        input.removeEventListener('input', (input as any)._listItemModelListener);
        input.removeEventListener('change', (input as any)._listItemModelListener);
        delete (input as any)._listItemModelListener;
      }
      // Array item binding: arrKey[idx].propKey
      const arrMatch = bindExpr.match(/^([a-zA-Z0-9_]+)\[(\d+)\]\.([a-zA-Z0-9_]+)$/);
      if (arrMatch) {
        const [, arrKey, idxStr, propKey] = arrMatch;
        const idx = parseInt(idxStr, 10);
        const arr = this.stateObj[arrKey];
        if (input instanceof HTMLInputElement && input.type === 'checkbox') {
          input.checked = !!(Array.isArray(arr) && arr[idx] && arr[idx][propKey]);
        }
        const handler = (_e: Event) => {
          if (!Array.isArray(arr) || !arr[idx]) return;
          if (input instanceof HTMLInputElement && input.type === 'checkbox') {
            arr[idx][propKey] = input.checked;
          } else {
            arr[idx][propKey] = (input as any).value;
          }
        };
        input.addEventListener('input', handler);
        input.addEventListener('change', handler);
        (input as any)._listItemModelListener = handler;
        return;
      }
      // Dot notation binding: user.name or user.amount|number|trim
      const dotMatch = bindExpr.match(/^([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)((?:\|[a-zA-Z0-9_]+)*)$/);
      if (dotMatch) {
        const [, objKey, propKey, modifierStr] = dotMatch;
        const obj = this.stateObj[objKey];
        const modifiers = modifierStr ? modifierStr.split('|').map(s => s.trim()).filter(Boolean) : [];
        if (input instanceof HTMLInputElement && input.type === 'checkbox') {
          input.checked = !!(obj && obj[propKey]);
        } else if (input instanceof HTMLInputElement) {
          input.value = obj ? String(obj[propKey] ?? '') : '';
        }
        const handler = (_e: Event) => {
          if (!obj) return;
          let value: unknown;
          if (input instanceof HTMLInputElement && input.type === 'checkbox') {
            value = input.checked;
          } else {
            value = (input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
            if (modifiers.includes('number')) value = Number(value);
            if (modifiers.includes('trim') && typeof value === 'string') value = value.trim();
          }
          obj[propKey] = value;
        };
        input.addEventListener('input', handler);
        input.addEventListener('change', handler);
        (input as any)._listItemModelListener = handler;
      }
    });
  }

  /**
   * Attach controlled input listeners to sync DOM value to state
   */
  private attachControlledInputListeners(): void {
    const shadow = this.shadowRoot;
    if (!shadow) return;
    // --- Auto data-model binding ---
    shadow.querySelectorAll('[data-model]').forEach((el) => {
      const keyWithModifiers = el.getAttribute('data-model');
      if (!keyWithModifiers) return;
      // Only bind once per element
      if ((el as any)._dataModelBound) return;
      useDataModel(el, this.stateObj, keyWithModifiers);
      (el as any)._dataModelBound = true;
    });
    // --- Post-render sync for all data-model inputs ---
    shadow.querySelectorAll('[data-model]').forEach((el) => {
      const [key] = el.getAttribute('data-model')?.split('|').map(s => s.trim()) ?? [];
      if (!key || !(key in this.stateObj)) return;
      if (el instanceof HTMLInputElement) {
        if (el.type === 'checkbox') {
          const stateVal = this.stateObj[key];
          const trueValue = el.getAttribute('data-true-value');
          const falseValue = el.getAttribute('data-false-value');
          if (Array.isArray(stateVal)) {
            el.checked = stateVal.includes(el.value);
          } else if (trueValue !== null || falseValue !== null) {
            if (String(stateVal) === trueValue) {
              el.checked = true;
            } else if (String(stateVal) === falseValue) {
              el.checked = false;
            } else if (stateVal === true) {
              el.checked = true;
            } else {
              el.checked = false;
            }
          } else {
            el.checked = stateVal === true || stateVal === 'true' || stateVal === 1;
          }
        } else if (el.type === 'radio') {
          el.checked = el.value === String(this.stateObj[key]);
        } else {
          el.value = String(this.stateObj[key] ?? '');
        }
      } else if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
        el.value = String(this.stateObj[key] ?? '');
      }
    });
  }
  private config!: ComponentConfig<S, C>;
  private stateObj!: S & C;
  private api!: ComponentAPI<S & C>;
  private _globalUnsubscribes: Array<() => void> = [];
  private unsubscribes: Array<() => void> = [];
  private lastCompiledTemplate: CompiledTemplate<S & C> | null = null;
  private lastState: (S & C) | null = null;
  private rafId: number | null = null;

  /**
   * Construct a new runtime component element.
   * @param config - Component configuration
   */
  constructor() {
    super();
    // Config/state setup will be done in connectedCallback
  }

  private initializeConfig() {
    if (this.config) return;
    const tag = this.tagName.toLowerCase();
    const registry = (window as any).__componentRegistry || {};
    const config = registry[tag];
    if (!config || typeof config !== 'object') {
      throw new Error('Invalid component config: must be an object');
    }
    if (!config.state || typeof config.state !== 'object') {
      throw new Error('Invalid component config: state must be an object');
    }
    this.config = config;
    // Always use the reactive proxy for state
    const computedState = config.computed
      ? reactive(config.state, config.computed)
      : reactive(config.state);
    this.stateObj = computedState as S & C;
    // Subscribe to state changes and batch re-render
    if (typeof (this.stateObj as any).subscribe === 'function') {
      this.unsubscribes.push((this.stateObj as any).subscribe(() => {
        if ((window as any).DEBUG_PATCH_VNODE) {
          console.log('[ComponentElement] Reactive state mutation detected, scheduling render.');
        }
        this.scheduleRender();
      }));
    }
    // Create API
    this.api = {
      state: this.stateObj,
      emit: (eventName: string, detail?: unknown) => this.dispatchEvent(new CustomEvent(eventName, { detail, bubbles: true })),
      onGlobal: <U = any>(eventName: string, handler: (data: U) => void) => {
        const unsub = eventBus.on(eventName, handler);
        this._globalUnsubscribes.push(unsub);
        return unsub;
      },
      offGlobal: <U = any>(eventName: string, handler: (data: U) => void) => eventBus.off(eventName, handler),
      emitGlobal: <U = any>(eventName: string, data?: U) => eventBus.emit(eventName, data)
    };
    Object.keys(this.config).forEach(key => {
      if (key.startsWith('on') && key.length > 2 && typeof this.config[key] === 'function') {
        const eventName = key.charAt(2).toLowerCase() + key.slice(3);
        const handler: EventListener = (e: Event) => {
          const detail = (e as CustomEvent).detail ?? e;
          (this.config[key] as Function)(detail, this.api.state, this.api);
        };
        this.addEventListener(eventName, handler);
        // Store for later removal
        if (!this._autoWiredHandlers[eventName]) this._autoWiredHandlers[eventName] = [];
        this._autoWiredHandlers[eventName].push(handler);
      }
    });
    // Attach shadow DOM
    this.attachShadow({ mode: 'open' });
    // Setup style
    if (config.style) {
      const styleEl = document.createElement('style');
      styleEl.textContent = typeof config.style === 'function' ? config.style(this.stateObj) : config.style;
      this.shadowRoot!.appendChild(styleEl);
    }
    // SSR hydration support (selective)
    if (typeof this.config.hydrate === 'function') {
      const hydrateEls = this.shadowRoot?.querySelectorAll('[data-hydrate]');
      try {
        if (hydrateEls && hydrateEls.length > 0) {
          hydrateEls.forEach(el => {
            try {
              this.config.hydrate!(el, this.stateObj, this.api);
            } catch (err) {
              if (typeof this.config.onError === 'function') {
                this.config.onError(err instanceof Error ? err : new Error(String(err)), this.api.state, this.api);
              }
              this._handleRenderError(err);
            }
          });
        } else {
          this.config.hydrate!(this.shadowRoot!, this.stateObj, this.api);
        }
      } catch (err) {
        if (typeof this.config.onError === 'function') {
          this.config.onError(err instanceof Error ? err : new Error(String(err)), this.api.state, this.api);
        }
        this._handleRenderError(err);
      }
    }
    const isSSRHydration = this.hasAttribute('data-hydrated');
    if (!isSSRHydration) {
      this.render();
    } else {
      this.processRefs();
    }
    // Only call onMounted here if not already called
    if (!this._mountedCalled && typeof this.config.onMounted === 'function') {
      try {
        const result: unknown = this.config.onMounted(this.api.state, this.api);
        if (isPromise(result)) {
          result.catch((err: any) => {
            if (typeof this.config.onError === 'function') {
              this.config.onError(err, this.api.state, this.api);
            }
            this._handleRenderError(err);
          }).finally(() => {
            this._mountedCalled = true;
          });
        } else {
          this._mountedCalled = true;
        }
      } catch (err) {
        if (typeof this.config.onError === 'function') {
          this.config.onError(err, this.api.state, this.api);
        }
        this._handleRenderError(err);
        this._mountedCalled = true;
      }
    }
  }

  connectedCallback(): void {
    this.initializeConfig();
    // Merge all attributes into state for initial sync
    if (this.stateObj) {
      for (const attr of this.getAttributeNames()) {
        if (attr in this.stateObj) {
          const initialType = typeof (this.config?.state?.[attr]);
          let value: any = this.getAttribute(attr);
          if (initialType === 'number') value = Number(value);
          else if (initialType === 'boolean') value = value === 'true';
          (this.stateObj as any)[attr] = value === null ? undefined : value;
        }
      }
    }
    // Only call onMounted if not already called
    if (!this._mountedCalled && typeof this.config.onMounted === 'function') {
      try {
        const result: unknown = this.config.onMounted(this.api.state, this.api);
        if (isPromise(result)) {
          result.catch((err: any) => {
            if (typeof this.config.onError === 'function') {
              this.config.onError(err, this.api.state, this.api);
            }
            this._handleRenderError(err);
          }).finally(() => {
            this._mountedCalled = true;
          });
        } else {
          this._mountedCalled = true;
        }
      } catch (err) {
        if (typeof this.config.onError === 'function') {
          this.config.onError(err, this.api.state, this.api);
        }
        this._handleRenderError(err);
        this._mountedCalled = true;
      }
    }
    if (typeof this.render === 'function') this.render();
  }

  /**
   * Lifecycle: called when element is removed from DOM.
   */
  disconnectedCallback(): void {
    // Remove all auto-wired config event handlers
    Object.entries(this._autoWiredHandlers).forEach(([eventName, handlers]) => {
      handlers.forEach(handler => {
        super.removeEventListener(eventName, handler);
      });
    });
    this._autoWiredHandlers = {};
    this.unsubscribes.forEach(fn => fn());
    this.unsubscribes = [];
    this._globalUnsubscribes.forEach(fn => fn());
    this._globalUnsubscribes = [];
    if (!this._unmountedCalled && typeof this.config.onUnmounted === 'function') {
      try {
        const result: unknown = this.config.onUnmounted(this.api.state, this.api);
        if (isPromise(result)) {
          result.catch((err: any) => {
            if (typeof this.config.onError === 'function') {
              this.config.onError(err, this.api.state, this.api);
            }
            this._handleRenderError(err);
          }).finally(() => {
            this._unmountedCalled = true;
          });
        } else {
          this._unmountedCalled = true;
        }
      } catch (err) {
        if (typeof this.config.onError === 'function') {
          this.config.onError(err, this.api.state, this.api);
        }
        this._handleRenderError(err);
        this._unmountedCalled = true;
      }
    }
    // Reset flags for future re-mounts
    this._mountedCalled = false;
    this._unmountedCalled = false;
  }

  /**
   * Render the component. Handles both string and compiled templates, refs, and error boundaries.
   */
  private render(): void {
    if ((window as any).DEBUG_PATCH_VNODE) {
      console.log('[ComponentElement.render] Called for', this);
    }
    // Always reset error state before each render for predictable boundaries
    this._hasError = false;
    // Robust controlled input sync after every render
    this.syncControlledInputsAndEvents();
    setTimeout(() => this.attachControlledInputListeners(), 0);
    try {
      // Plugin hook: onRender
      runtimePlugins.forEach(p => {
        try {
          p.onRender?.(this.stateObj, this.api);
        } catch (err) {
          this._handleRenderError(err);
          // Do NOT re-throw, just handle and continue
        }
      });
      // Error boundary for computed properties
      if (this.config.computed) {
        Object.values(this.config.computed).forEach(fn => {
          try {
            fn(this.stateObj);
          } catch (err) {
            this._handleRenderError(err);
            // Do NOT re-throw, just handle and continue
          }
        });
      }
      // Do not call lifecycle hooks here; only call in connected/disconnectedCallback
      if ((window as any).DEBUG_PATCH_VNODE) {
        console.log('[ComponentElement.render] Evaluating template with state:', this.stateObj);
      }
      const templateResultOrPromise = this.config.template(this.stateObj as S & C, this.api);
      if (templateResultOrPromise instanceof Promise) {
        templateResultOrPromise.then(templateResult => {
          if (!this._hasError) {
            this._renderTemplateResult(templateResult);
            // Sync state to attributes after render
            this.syncStateToAttributes();
            // Attach list item listeners after VDOM patching
            setTimeout(() => this.attachListItemModelListeners(), 0);
          }
        }).catch(error => {
          this._handleRenderError(error);
        });
      } else {
        if (!this._hasError) {
          this._renderTemplateResult(templateResultOrPromise);
          // Sync state to attributes after render
          this.syncStateToAttributes();
          // Attach list item listeners after VDOM patching
          setTimeout(() => this.attachListItemModelListeners(), 0);
        }
      }
    } catch (error) {
      this._handleRenderError(error);
      // Always render fallback UI on error, do NOT re-throw
      this.renderError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Internal: render a template result (string or compiled template)
   */
  private _prevVNode: VNode | null = null;

  /**
   * Rebind event listeners for elements with data-on-* attributes in the shadow DOM
   */
  private rebindEventListeners(): void {
    if (!this.shadowRoot) return;
    const eventAttrs = ['data-on-input', 'data-on-change', 'data-on-blur', 'data-on-click'];
    eventAttrs.forEach(attr => {
      this.shadowRoot!.querySelectorAll(`[${attr}]`).forEach(el => {
        const eventType = attr.replace('data-on-', '');
        const handlerName = el.getAttribute(attr);
        if (!handlerName || typeof this.config[handlerName] !== 'function') return;
        // Remove previous listener if any
        if ((el as any)._boundHandlers && (el as any)._boundHandlers[eventType]) {
          el.removeEventListener(eventType, (el as any)._boundHandlers[eventType]);
        }
        // Bind new handler
        const handler = this.config[handlerName];
        const boundHandler = (e: Event) => handler.call(this, e);
        el.addEventListener(eventType, boundHandler);
        if (!(el as any)._boundHandlers) (el as any)._boundHandlers = {};
        (el as any)._boundHandlers[eventType] = boundHandler;
      });
    });
    // Recurse into children for rebinding
    Array.from(this.shadowRoot.children).forEach(child => {
      if (child instanceof HTMLElement && typeof (child as any).rebindEventListeners === 'function') {
        (child as any).rebindEventListeners();
      }
    });
  }
  /**
   * Internal: render a template result (string or compiled template).
   * Handles VDOM patching, style updates, refs, and event binding.
   * @param templateResult - HTML string or compiled template
   */
  private _renderTemplateResult(templateResult: any): void {
    if (this._hasError) return;
    try {
      if (typeof templateResult === 'string') {
        // --- Sanitize HTML for XSS ---
        function sanitizeHTML(html: string): string {
          // Remove all on* attributes (e.g., onclick, onerror)
          return html.replace(/<([a-zA-Z0-9]+)([^>]*)>/g, (_match, tag, attrs) => {
            // Remove dangerous attributes
            const safeAttrs = attrs.replace(/\s+on[a-zA-Z]+\s*=\s*(['"][^'"]*['"]|[^\s>]*)/gi, '');
            return `<${tag}${safeAttrs}>`;
          });
        }
        const sanitizedHTML = sanitizeHTML(templateResult);
        const newVNode = parseVNodeFromHTML(sanitizedHTML);
        function logCheckboxVNodes(vnode: VNode) {
          vnode.children.forEach(logCheckboxVNodes);
        }
        logCheckboxVNodes(newVNode);
        const shadowRoot = this.shadowRoot;
        if (!shadowRoot) {
          return;
        }
        let styleEl = shadowRoot.querySelector('style');
        if (!styleEl) {
          styleEl = document.createElement('style');
          shadowRoot.appendChild(styleEl);
        }
        if (this.config.style) {
          styleEl.textContent = typeof this.config.style === 'function' ? this.config.style(this.stateObj) : this.config.style;
        } else {
          styleEl.textContent = '';
        }
        // If fragment, reconcile all children
        if (newVNode.type === '#fragment') {
          // Use patchVNode for full parent/children reconciliation
          const containerEl = Array.from(shadowRoot.childNodes).find(
            node => node.nodeType === 1 && node !== styleEl
          ) as Element | undefined;
          if (containerEl) {
            // Remove all non-style children from container
            Array.from(containerEl.childNodes).forEach(node => {
              // Keep only the <style> node, remove everything else (including text and comment nodes)
              if (!(node.nodeType === 1 && node.nodeName === 'STYLE')) {
                containerEl.removeChild(node);
              }
            });
            const fragmentVNode = {
              type: '#fragment',
              dom: containerEl,
              children: newVNode.children,
              props: {},
              key: undefined
            };
            const prevFragmentVNode = this._prevVNode && this._prevVNode.type === '#fragment'
              ? { ...this._prevVNode, dom: containerEl }
              : fragmentVNode;
            patchVNode(containerEl, prevFragmentVNode, fragmentVNode);
          } else {
            // If no container, mount all children
            newVNode.children.forEach(childVNode => {
              const dom = mountVNode(childVNode);
              if (dom) shadowRoot.appendChild(dom);
              childVNode.dom = dom ?? undefined;
            });
          }
          // Do not assign shadowRoot to VNode.dom; fragment VNode's dom remains undefined
        } else {
          // Find or create persistent root node
          let rootEl = Array.from(this.shadowRoot!.childNodes).find(
            node => node !== styleEl && node.nodeType === 1
          ) as Element | undefined;
          if (rootEl) {
            // If type or key differ, replace root node
            if (this._prevVNode && (this._prevVNode.type !== newVNode.type || this._prevVNode.key !== newVNode.key)) {
              const actualRootNode = mountVNode(newVNode);
              if (actualRootNode) {
                if (this.shadowRoot!.contains(rootEl)) {
                  this.shadowRoot!.replaceChild(actualRootNode, rootEl);
                }
                rootEl = actualRootNode as Element;
              }
            } else {
              // Patch root node in place
              patchVNode(rootEl, this._prevVNode!, newVNode);
            }
          } else {
            // No root node, append new
            const actualRootNode = mountVNode(newVNode);
            rootEl = actualRootNode as Element;
            if (rootEl) {
              this.shadowRoot!.appendChild(rootEl);
            }
          }
          newVNode.dom = rootEl;
        }
        this._prevVNode = newVNode;
        this.forceSyncControlledInputs();
        this.lastCompiledTemplate = null;
      } else {
        const isInitialRender = !this.shadowRoot!.firstElementChild;
        const isSameTemplate = this.lastCompiledTemplate?.id === templateResult.id;
        if (isInitialRender) {
          const fragment = renderCompiledTemplate(templateResult, this.stateObj, this.api);
          this.shadowRoot!.appendChild(fragment);
        } else if (isSameTemplate && this.shadowRoot!.firstElementChild) {
          const oldState = this.lastState;
          updateCompiledTemplate(templateResult, this.shadowRoot!.firstElementChild, this.stateObj, this.api, oldState || undefined);
        } else {
          const fragment = renderCompiledTemplate(templateResult, this.stateObj, this.api);
          // Always ensure <style> element is present and up-to-date
          let styleEl = this.shadowRoot!.querySelector('style');
          if (!styleEl) {
            styleEl = document.createElement('style');
            this.shadowRoot!.insertBefore(styleEl, this.shadowRoot!.firstChild);
          }
          if (this.config.style) {
            styleEl.textContent = typeof this.config.style === 'function' ? this.config.style(this.stateObj) : this.config.style;
          } else {
            styleEl.textContent = '';
          }

          // Ensure <div data-root> is second child of shadow root
          let rootEl = this.shadowRoot!.querySelector('[data-root]');
          if (!rootEl) {
            rootEl = document.createElement('div');
            rootEl.setAttribute('data-root', '');
            this.shadowRoot!.appendChild(rootEl);
          }
          // Remove all children from rootEl before patching
          while (rootEl.firstChild) {
            rootEl.removeChild(rootEl.firstChild);
          }
          // Append VDOM fragment to rootEl
          rootEl.appendChild(fragment);
        }
        this.lastCompiledTemplate = templateResult;
      }
      // Safe deep clone for lastState, ignoring circular references
      this.lastState = safeClone(this.stateObj);
      /**
       * Safely deep clones an object, ignoring circular references.
       * @param obj - Object to clone
       */
      function safeClone<T>(obj: T): T {
        const seen = new WeakSet();
        function clone(val: any): any {
          if (val === null || typeof val !== 'object') return val;
          if (seen.has(val)) return undefined;
          seen.add(val);
          if (Array.isArray(val)) return val.map(clone);
          const out: any = {};
          for (const key in val) {
            if (Object.prototype.hasOwnProperty.call(val, key)) {
              out[key] = clone(val[key]);
            }
          }
          return out;
        }
        return clone(obj);
      }
      this.updateStyle();
      this.processRefs();
      // Automatic event binding after refs and DOM update
      this.bindEvents();
      // Robust controlled input sync after every render
      this.syncControlledInputsAndEvents();
    } catch (error) {
      this._handleRenderError(error);
    }
  }

  /**
   * Internal: handle render errors and error boundaries.
   * Logs details and allows fallback UI.
   * @param error - Error object
   */
  private _handleRenderError(error: any): void {
    this._hasError = true;
    // Improved error boundary: log details and always render fallback UI
    if (this.config.debug) {
      console.error(`[runtime] Render error in <${this.tagName.toLowerCase()}>:`, error);
    }
    runtimePlugins.forEach(p => p.onError?.(error instanceof Error ? error : new Error(String(error)), this.stateObj, this.api));
    if ('onError' in this.config && typeof (this.config.onError) === 'function') {
      try {
        this.config.onError(error instanceof Error ? error : new Error(String(error)), this.api.state, this.api);
      } catch (fallbackError) {
        if (this.config.debug) {
          console.error(`[runtime] Error in onError handler:`, fallbackError);
        }
      }
    }
    this.renderError(error instanceof Error ? error : new Error(String(error)));
  }

  /**
   * Schedule a render using requestAnimationFrame, batching multiple state changes.
   */
  private scheduleRender(): void {
    if (this.rafId !== undefined && this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
    this.rafId = requestAnimationFrame(() => {
      this.render();
      this.rafId = null;
    });
  }

  /**
   * Updates the style element in the shadow root based on the current state.
   */
  private updateStyle(): void {
    const styleEl = this.shadowRoot!.querySelector('style');
    if (!styleEl || !this.config.style) return;

    const css = typeof this.config.style === 'function'
      ? this.config.style(this.api.state)
      : this.config.style;
    
    styleEl.textContent = css;
  }

  /**
   * Processes and attaches ref handlers for elements with data-ref attributes.
   */
  private processRefs(): void {
    if (!this.config.refs) return;
    // Track attached listeners per element/type
    const listenerMap: WeakMap<Element, Set<string>> = new WeakMap();

    Object.entries(this.config.refs).forEach(([refName, handler]) => {
      const element = this.shadowRoot!.querySelector(`[data-ref="${refName}"]`);
      if (element) {
        // Only attach listeners once per element/type
        if (!listenerMap.has(element)) {
          listenerMap.set(element, new Set());
        }
        const attachedTypes = listenerMap.get(element)!;

        // Wrap addEventListener to prevent duplicates
        const originalAddEventListener = element.addEventListener;
        element.addEventListener = function(
          type: string,
          listener: EventListenerOrEventListenerObject,
          options?: boolean | AddEventListenerOptions
        ) {
          const key = `${type}`;
          if (attachedTypes.has(key)) return;
          attachedTypes.add(key);
          originalAddEventListener.call(element, type, listener, options);
        };

        // Mark as processed and call handler
        element.setAttribute('data-refs-processed', 'true');
        try {
          handler(element, this.api.state, this.api);
        } catch (err) {
          this._handleRenderError(err);
          // Do NOT re-throw, just handle and continue
        }
      }
      // Silently skip missing refs as they may be conditionally rendered
    });
  }

  /**
   * Automatically bind events for elements with data-on-* attributes.
   * Ensures events are not attached multiple times after rerender.
   */
  private bindEvents(): void {
    if (!this.shadowRoot) return;
    const walker = document.createTreeWalker(this.shadowRoot, NodeFilter.SHOW_ELEMENT);
    let node = walker.nextNode();
    while (node) {
      const el = node as Element;
      Array.from(el.attributes).forEach(attr => {
        if (attr.name.startsWith('data-on-')) {
          const eventType = attr.name.slice('data-on-'.length);
          const handlerName = attr.value;
          // Look for handler on config, not api
          const handler = (this.config as any)[handlerName];
          if (typeof handler === 'function') {
            // Remove previous handler if present
            if ((el as any)._boundHandlers && (el as any)._boundHandlers[eventType]) {
              el.removeEventListener(eventType, (el as any)._boundHandlers[eventType]);
            }
            // Bind new handler
            const boundHandler = (e: Event) => {
              handler.call(this.config, e, this.api.state, this.api);
              // Immediately sync controlled inputs after handler runs
              this.syncControlledInputsAndEvents();
            };
            el.addEventListener(eventType, boundHandler);
            if (!(el as any)._boundHandlers) (el as any)._boundHandlers = {};
            (el as any)._boundHandlers[eventType] = boundHandler;
          } else {
            if (this.config.debug) console.warn(`[bindEvents] Handler '${handlerName}' not found on config for event '${eventType}'`, el);
          }
        }
      });
      node = walker.nextNode();
    }
  }

  /**
   * Renders a fallback error UI in the shadow root.
   * @param error - Error object
   */
  private renderError(error: Error): void {
    const styleContent = this.config.style
      ? (typeof this.config.style === 'function' ? this.config.style(this.api.state) : this.config.style)
      : '';
    this.shadowRoot!.innerHTML = `
      <style>${styleContent}</style>
      <div style="color: red; border: 1px solid red; padding: 1rem; border-radius: 4px;">
        <h3>Error Boundary</h3>
        <div>Error: ${error.message}</div>
      </div>
    `;
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Registers a new custom element component.
 * Validates config, sets up reactive state, and defines the custom element.
 * Supports HMR and SSR hydration.
 * @template S - State type
 * @template C - Computed type
 * @param tag - Custom element tag name
 * @param config - Component configuration
 */
export function component<S extends ComponentState, C extends Record<string, any> = {}>(tag: string, config: ComponentConfig<S, C>): void {
  // Prevent deep object injection in config and state
  const sanitizedConfig = deepSanitizeObject(config);
  const sanitizedState = deepSanitizeObject(config.state);
  config = sanitizedConfig as ComponentConfig<S, C>;
  (config as any).state = sanitizedState as S;
  if (config.debug) {
    console.log(`[runtime] Debugging component: ${tag}`, config);
  }

  // Validate config
  if (!tag || !config.template || !config.state) {
    if (config && typeof config.onError === 'function') {
      config.onError(new Error('Component requires tag, template, and state'), config.state, {
        state: config.state,
        emit: () => {},
        onGlobal: () => () => {},
        offGlobal: () => {},
        emitGlobal: () => {}
      });
    }
    if (config && config.debug) {
      console.error('[runtime] Malformed config:', { tag, config });
    }
    return;
  }

  // Plugin System: Call all plugins' onInit in registration order
  runtimePlugins.forEach(p => {
    try {
      p.onInit?.(config as any);
    } catch (err) {
      if (config && typeof config.onError === 'function') {
        config.onError(err instanceof Error ? err : new Error(String(err)), config.state, {
          state: config.state,
          emit: () => {},
          onGlobal: () => () => {},
          offGlobal: () => {},
          emitGlobal: () => {}
        });
      }
      if (config && config.debug) console.error('[runtime] Plugin onInit error:', err);
    }
  });

  // HMR support: unregister previous definition if in dev and module.hot is available
  const isDev = typeof window !== 'undefined' && (window as any).VITE_DEV_HMR;
  const hasHMR = typeof import.meta !== 'undefined' && (import.meta as any).hot;

  if ((isDev || hasHMR) && customElements.get(tag)) {
    try {
      document.querySelectorAll(tag).forEach(el => el.remove());
      // @ts-ignore
      if ((window as any).customElements._definitions) {
        delete (window as any).customElements._definitions[tag];
      }
    } catch (e) {}
  }

  if (customElements.get(tag)) {
    if (config.debug) console.warn(`Component "${tag}" already registered`);
    return;
  }

  // Create reactive state with computed properties
  const state = reactive(config.state, config.computed as Record<string, (state: S) => unknown>);
  // @ts-expect-error: Overriding readonly property for runtime assignment
  (config as { state: S & C }).state = state;
  (config as { _subscribe?: unknown })._subscribe = state.subscribe;

  const primitiveKeys = Object.keys(config.state).filter(
    key => ['string', 'number', 'boolean'].includes(typeof config.state[key])
  );

  const ComponentClass = class extends ComponentElement<S, C> {
    static get observedAttributes() {
      return primitiveKeys;
    }
    constructor() {
      super();
    }
  };

  if (!customElements.get(tag)) {
    // Store config in a global registry for lookup in connectedCallback
    (window as any).__componentRegistry = (window as any).__componentRegistry || {};
    (window as any).__componentRegistry[tag] = config;
    customElements.define(tag, ComponentClass);
  }

  // Accept HMR updates if available
  if (hasHMR && typeof (import.meta as any).hot.accept === 'function') {
    (import.meta as any).hot.accept(() => {
      if (!customElements.get(tag)) {
        customElements.define(tag, ComponentClass);
      }
    });
  }
}
