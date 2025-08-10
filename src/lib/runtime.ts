export { Store } from './store';
export { eventBus } from './event-bus';
export { renderToString, renderComponentsToString, generateHydrationScript } from './ssr';
export type { SSRComponentConfig, SSRRenderOptions, SSRContext } from './ssr';
export { TemplateParser, DOMDiffer } from './dom-diff';
export { html, compile, css, classes, styles, ref, on } from './template-helpers';
export { compileTemplate, renderCompiledTemplate, updateCompiledTemplate } from './template-compiler';
export type { CompiledTemplate, UpdateFunction, UpdateType } from './template-compiler';

/**
 * Modern Web Component Runtime - v2.0
 * 
 * - Strict TypeScript
 * - Memory efficiency
 * - Developer experience
 * - Performance
 * - Server-Side Rendering (SSR) support
 * - Template Compilation support
 */

import { reactive } from './computed-state';
import { eventBus } from './event-bus';
import { TemplateParser, DOMDiffer } from './dom-diff';

// =============================
// PLUGIN SYSTEM (Experimental)
// =============================

type RuntimePlugin<S extends ComponentState, C extends Record<string, any>> = {
  onInit?: (config: ComponentConfig<S, C>) => void;
  onRender?: (state: S & C, api: ComponentAPI<S & C>) => void;
  onError?: (error: Error, state: S & C, api: ComponentAPI<S & C>) => void;
};

const runtimePlugins: RuntimePlugin<any, any>[] = [];
export function useRuntimePlugin<S extends ComponentState, C extends Record<string, any>>(plugin: RuntimePlugin<S, C>) {
  runtimePlugins.push(plugin);
}

// ============================================================================
// CORE TYPES
// ============================================================================

import type { CompiledTemplate } from './template-compiler.js';
import { renderCompiledTemplate, updateCompiledTemplate } from './template-compiler.js';

export interface ComponentState extends Record<string, unknown> {}

/**
 * API exposed to component logic for state, events, and updates.
 * @template T - Component state type
 */
export interface ComponentAPI<T extends ComponentState = ComponentState> {
  /** Reactive state proxy */
  readonly state: T;
  /** Emit a custom event from the component */
  emit(eventName: string, detail?: unknown): void;
  /** Listen for a global event (event bus) */
  onGlobal<U = any>(eventName: string, handler: (data: U) => void): () => void;
  /** Remove a global event listener */
  offGlobal<U = any>(eventName: string, handler: (data: U) => void): void;
  /** Emit a global event (event bus) */
  emitGlobal<U = any>(eventName: string, data?: U): void;
}

/**
 * Component configuration object for defining custom elements.
 * @template S - State type
 * @template C - Computed type
 */
export interface ComponentConfig<S extends ComponentState, C extends Record<string, any> = {}> {
  /** Template function returning HTML, compiled template, or Promise<string> */
  readonly template: (state: S & C, api: ComponentAPI<S & C>) => string | Promise<string> | CompiledTemplate<S & C>;
  /** Initial state object (reactivity handled automatically) */
  readonly state: S;
  /** Computed values as a map of functions (optional) */
  readonly computed?: { [K in keyof C]: (state: S) => C[K] };
  /** CSS styles as string or function (optional) */
  readonly style?: string | ((state: S & C) => string);
  /** DOM element refs for direct access (optional) */
  readonly refs?: Record<string, RefHandler<S & C>>;
  /** Called when component is mounted (optional) */
  readonly onMounted?: LifecycleHandler<S & C>;
  /** Called when component is unmounted (optional) */
  readonly onUnmounted?: LifecycleHandler<S & C>;
  /** Arbitrary event handler methods for automatic event binding */
  [handler: string]: any;
}

/**
 * Ref handler for direct DOM access.
 * @template T - State type
 */
export type RefHandler<T extends ComponentState> = (
  element: Element,
  state: T,
  api: ComponentAPI<T>
) => void;

/**
 * Computed property handler.
 * @template T - State type
 */
export type ComputedHandler<T extends ComponentState> = (state: T) => unknown;

/**
 * Lifecycle handler for mount/unmount.
 * @template T - State type
 */
export type LifecycleHandler<T extends ComponentState> = (
  state: T,
  api: ComponentAPI<T>
) => void;

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Safe deep clone that handles functions and circular references
 * For performance comparison, we'll use a JSON-safe approach
 */
function safeClone<T>(obj: T): T {
  try {
    // First try the native structuredClone if it's available and works
    return structuredClone(obj);
  } catch (error) {
    // Fallback: Create a clean object with only serializable properties
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    try {
      // Use JSON round-trip for simple cloning (loses functions but preserves data)
      return JSON.parse(JSON.stringify(obj));
    } catch (jsonError) {
      // Final fallback: shallow copy of enumerable properties
      if (obj instanceof Array) {
        return [...obj] as T;
      }
      
      const cloned = {} as T;
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];
          if (typeof value !== 'function' && typeof value !== 'symbol') {
            cloned[key] = value;
          }
        }
      }
      return cloned;
    }
  }
}

// ============================================================================
// COMPONENT IMPLEMENTATION
// ============================================================================

/**
 * Internal custom element implementation for runtime components.
 * Handles state, rendering, refs, and lifecycle hooks.
 */
class ComponentElement<S extends ComponentState, C extends Record<string, any> = {}> extends HTMLElement {
  /**
   * Attach controlled input listeners to sync DOM value to state
   */
  private attachControlledInputListeners(): void {
    const shadow = this.shadowRoot;
    if (!shadow) return;
    shadow.querySelectorAll('input, textarea').forEach((el) => {
      // Only attach listener once
      if ((el as any)._listenerAttached) return;
      el.addEventListener('input', (e: Event) => {
        const target = e.target as HTMLInputElement | HTMLTextAreaElement;
        if (target && target.value !== undefined) {
          const key = target.getAttribute('name');
          if (key && key in this.stateObj) {
            // Direct assignment for developer ease of use
            (this.stateObj as any)[key] = target.value;
          }
        }
      });
      (el as any)._listenerAttached = true;
    });
  }
  private readonly config: ComponentConfig<S, C>;
  private readonly stateObj!: S & C;
  private readonly api: ComponentAPI<S & C>;
  private _globalUnsubscribes: Array<() => void> = [];
  private unsubscribes: Array<() => void> = [];
  private refsAttached = false;
  private lastHTML = '';
  private lastCompiledTemplate: CompiledTemplate<S & C> | null = null;
  private lastState: (S & C) | null = null;
  private rafId: number | null = null;

  /**
   * Construct a new runtime component element.
   * @param config - Component configuration
   */
  constructor(config: ComponentConfig<S, C>) {
    super();
    // Runtime guard: ensure config is valid
    if (!config || typeof config !== 'object') {
      throw new Error('Invalid component config: must be an object');
    }
    if (!config.state || typeof config.state !== 'object') {
      throw new Error('Invalid component config: state must be an object');
    }
    this.config = config;
    this.stateObj = config.state as S & C;
    // Subscribe to state changes and batch re-render
    if (typeof (this.stateObj as any).subscribe === 'function') {
      this.unsubscribes.push((this.stateObj as any).subscribe(() => this.scheduleRender()));
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
    // Attach shadow DOM
    this.attachShadow({ mode: 'open' });
    // Setup style
    if (config.style) {
      const styleEl = document.createElement('style');
      styleEl.textContent = typeof config.style === 'function' ? config.style(this.stateObj) : config.style;
      this.shadowRoot!.appendChild(styleEl);
    }
    // SSR hydration support (selective)
    if (this.config.hydrate) {
      const hydrateEls = this.shadowRoot?.querySelectorAll('[data-hydrate]');
      if (hydrateEls && hydrateEls.length > 0) {
        hydrateEls.forEach(el => {
          this.config.hydrate(el, this.stateObj, this.api);
        });
      } else {
        // Fallback: hydrate entire shadow root
        this.config.hydrate(this.shadowRoot!, this.stateObj, this.api);
      }
    }
    const isSSRHydration = this.hasAttribute('data-hydrated');
    if (!isSSRHydration) {
      this.render();
    } else {
      this.lastHTML = this.shadowRoot!.innerHTML;
      this.processRefs();
    }
    this.config.onMounted?.(this.api.state, this.api);
  }

  /**
   * Lifecycle: called when element is removed from DOM.
   */
  disconnectedCallback(): void {
    this.unsubscribes.forEach(fn => fn());
    this.unsubscribes = [];
    this._globalUnsubscribes.forEach(fn => fn());
    this._globalUnsubscribes = [];
    this.config.onUnmounted?.(this.api.state, this.api);
  }

  /**
   * Render the component. Handles both string and compiled templates, refs, and error boundaries.
   */
  private render(): void {
  // Attach controlled input listeners after each render
  setTimeout(() => this.attachControlledInputListeners(), 0);
    try {
      // Plugin hook: onRender
      runtimePlugins.forEach(p => p.onRender?.(this.stateObj, this.api));
      const templateResultOrPromise = this.config.template(this.stateObj, this.api);
      if (templateResultOrPromise instanceof Promise) {
        templateResultOrPromise.then(templateResult => {
          this._renderTemplateResult(templateResult);
        }).catch(error => {
          this._handleRenderError(error);
        });
      } else {
        this._renderTemplateResult(templateResultOrPromise);
      }
    } catch (error) {
      this._handleRenderError(error);
    }
  }

  /**
   * Internal: render a template result (string or compiled template)
   */
  private _renderTemplateResult(templateResult: any): void {
    try {
      if (typeof templateResult === 'string') {
        if (templateResult === this.lastHTML) return;
        const fragment = TemplateParser.parseTemplate(templateResult);
        let appContainer: Element | null = Array.from(fragment.childNodes).find(n => n.nodeType === 1 && (n as Element).tagName !== 'STYLE') as Element | null;
        let styleNode: Element | null = Array.from(fragment.childNodes).find(n => n.nodeType === 1 && (n as Element).tagName === 'STYLE') as Element | null;
        // Automatically add data-root to the main app container
        if (appContainer) appContainer.setAttribute('data-root', '');
        const shadowAppContainer = this.shadowRoot!.querySelector('[data-root]') as Element | undefined;
        const isInitialRender = !shadowAppContainer;
        if (isInitialRender) {
          if (styleNode) this.shadowRoot!.appendChild(styleNode.cloneNode(true));
          if (appContainer) this.shadowRoot!.appendChild(appContainer.cloneNode(true));
          else {
            const firstEl = Array.from(fragment.childNodes).find(n => n.nodeType === 1) as Element | undefined;
            if (firstEl) {
              firstEl.setAttribute('data-root', '');
              this.shadowRoot!.appendChild(firstEl.cloneNode(true));
            }
          }
          this.refsAttached = false;
        } else {
          let shadowStyle = this.shadowRoot!.querySelector('style');
          if (!shadowStyle && styleNode) this.shadowRoot!.insertBefore(styleNode.cloneNode(true), this.shadowRoot!.firstChild);
          else if (shadowStyle && styleNode) shadowStyle.textContent = styleNode.textContent;
          let shadowApp = this.shadowRoot!.querySelector('[data-root]');
          if (shadowApp && appContainer) {
            DOMDiffer.morph(shadowApp, appContainer.outerHTML);
            shadowApp = this.shadowRoot!.querySelector('[data-root]');
            // Clean up refs after morph
            function cleanupRefs(node: Element) {
              if (node.hasAttribute && node.hasAttribute('data-refs-processed')) node.removeAttribute('data-refs-processed');
              Array.from(node.children).forEach(child => cleanupRefs(child as Element));
            }
            if (shadowApp) cleanupRefs(shadowApp);
            if (shadowApp) this.processRefs();
            this.refsAttached = true;
          }
        }
        this.lastHTML = templateResult;
        this.lastCompiledTemplate = null;
      } else {
        const isInitialRender = !this.shadowRoot!.firstElementChild;
        const isSameTemplate = this.lastCompiledTemplate?.id === templateResult.id;
        if (isInitialRender) {
          const fragment = renderCompiledTemplate(templateResult, this.stateObj, this.api);
          this.shadowRoot!.appendChild(fragment);
          this.refsAttached = false;
        } else if (isSameTemplate && this.shadowRoot!.firstElementChild) {
          const oldState = this.lastState;
          updateCompiledTemplate(templateResult, this.shadowRoot!.firstElementChild, this.stateObj, this.api, oldState || undefined);
        } else {
          const fragment = renderCompiledTemplate(templateResult, this.stateObj, this.api);
          this.shadowRoot!.innerHTML = '';
          this.shadowRoot!.appendChild(fragment);
          this.refsAttached = false;
        }
        this.lastCompiledTemplate = templateResult;
        this.lastHTML = '';
      }
      this.lastState = safeClone(this.stateObj);
      this.updateStyle();
      if (!this.refsAttached) {
        this.processRefs();
        this.refsAttached = true;
      }
      // Automatic event binding after refs and DOM update
      this.bindEvents();
    } catch (error) {
      this._handleRenderError(error);
    }
  }

  /**
   * Internal: handle render errors and error boundaries
   */
  private _handleRenderError(error: any): void {
    // Improved error boundary: log details and allow fallback UI
    console.error(`[runtime] Render error in <${this.tagName.toLowerCase()}>:`, error);
    runtimePlugins.forEach(p => p.onError?.(error, this.stateObj, this.api));
    if ('onError' in this.config && typeof (this.config as any).onError === 'function') {
      try {
        (this.config as any).onError(error as Error, this.api.state, this.api);
      } catch (fallbackError) {
        console.error(`[runtime] Error in onError handler:`, fallbackError);
        this.renderError(error as Error);
      }
    } else {
      this.renderError(error as Error);
    }
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

  private updateStyle(): void {
    const styleEl = this.shadowRoot!.querySelector('style');
    if (!styleEl || !this.config.style) return;

    const css = typeof this.config.style === 'function'
      ? this.config.style(this.api.state)
      : this.config.style;
    
    styleEl.textContent = css;
  }

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
        handler(element, this.api.state, this.api);
      }
      // Silently skip missing refs as they may be conditionally rendered
    });
  }

  /**
   * Automatically bind events for elements with data-on-* attributes.
   * Ensures events are not attached multiple times after rerender.
   */
  private _eventListenerMap: WeakMap<Element, Set<string>> = new WeakMap();
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
            let attached = this._eventListenerMap.get(el);
            if (!attached) {
              attached = new Set();
              this._eventListenerMap.set(el, attached);
            }
            if (!attached.has(eventType)) {
              el.addEventListener(eventType, (e: Event) => handler.call(this.config, e, this.api.state, this.api));
              attached.add(eventType);
            }
          } else {
            console.warn(`[bindEvents] Handler '${handlerName}' not found on config for event '${eventType}'`, el);
          }
        }
      });
      node = walker.nextNode();
    }
  }

  private renderError(error: Error): void {
    this.shadowRoot!.innerHTML = `
      <div style="color: red; border: 1px solid red; padding: 1rem; border-radius: 4px;">
        <h3>Component Error</h3>
        <p><strong>Component:</strong> ${error.message}</p>
      </div>
    `;
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Register a new custom element component.
 * @template S - State type
 * @template C - Computed type
 * @param tag - Custom element tag name
 * @param config - Component configuration
 */
export function component<S extends ComponentState, C extends Record<string, any> = {}>(tag: string, config: ComponentConfig<S, C>): void {
  // Validate config
  if (!tag || !config.template || !config.state) {
    throw new Error('Component requires tag, template, and state');
  }

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
    console.warn(`Component "${tag}" already registered`);
    return;
  }

  // Create reactive state with computed properties
  const state = reactive(config.state, config.computed as Record<string, (state: S) => any>);
  (config as any).state = state;
  (config as any)._subscribe = state.subscribe;

  const ComponentClass = class extends ComponentElement<S, C> {
    constructor() {
      super(config);
    }
  };
  if (!customElements.get(tag)) {
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
