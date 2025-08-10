  // Helper to update controlled input values recursively
  function updateControlledInputs(el: Element | null, host: any) {
    if (!el) return;
    el.querySelectorAll('[data-model]').forEach((input: Element) => {
      const modelProp = input.getAttribute('data-model');
      if (!modelProp || !host || !host.stateObj) return;
      const stateValue = host.stateObj[modelProp];
      // Debug: log input, state, and value before sync
      console.debug('[sync] Controlled input:', { input, modelProp, stateValue, currentValue: (input as any).value });
      if ('value' in input && typeof stateValue === 'string') {
        const inputEl = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        requestAnimationFrame(() => {
          if (inputEl.value !== stateValue) {
            // Save selection if focused
            const isFocused = document.activeElement === inputEl;
            let selectionStart = null, selectionEnd = null;
            if (isFocused && 'selectionStart' in inputEl && 'selectionEnd' in inputEl) {
              selectionStart = (inputEl as any).selectionStart;
              selectionEnd = (inputEl as any).selectionEnd;
            }
            console.debug('[sync] Forcing value update:', { inputEl, oldValue: inputEl.value, newValue: stateValue, isFocused });
            inputEl.value = stateValue;
            // Restore focus and selection
            if (isFocused) {
              inputEl.focus();
              if (selectionStart !== null && selectionEnd !== null) {
                (inputEl as any).setSelectionRange(selectionStart, selectionEnd);
              }
            }
          } else {
            console.debug('[sync] Value already matches state:', { inputEl, value: inputEl.value });
          }
        });
      }
      if (input instanceof HTMLInputElement && input.type === 'checkbox' && typeof stateValue === 'boolean') input.checked = stateValue;
      if (input instanceof HTMLInputElement && input.type === 'radio' && typeof stateValue === 'boolean') input.checked = stateValue;
    });
  }
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

// Minimal VNode structure for incremental migration
/**
 * Minimal template-to-VNode parser for HTML strings
 * Only supports basic tags, attributes, text, and key/data-model
 */
function parseVNodeFromHTML(html: string): VNode {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  const node = template.content.firstChild as ChildNode;
  return node ? createVNodeFromElement(node) : { type: '#text', props: {}, children: [], dom: undefined };
}
/**
 * Virtual Node (VNode) structure for incremental migration
 */
interface VNode {
  type: string; // tag name or '#text'
  key?: string;
  props: Record<string, any>;
  children: VNode[];
  dom?: Element | Text;
}

/**
 * Create a VNode from a DOM ChildNode (Element or Text)
 * Assigns a stable, deterministic key to every element for VDOM reconciliation
 */
function createVNodeFromElement(node: ChildNode, parentPath: string = '', childIndex: number = 0): VNode {
  let debugType = '';
  let debugKey = undefined;
  if (node.nodeType === Node.TEXT_NODE) {
    debugType = '#text';
    debugKey = undefined;
    console.debug('[VNode]', debugType, 'key:', debugKey);
    return { type: '#text', key: undefined, props: { nodeValue: node.nodeValue }, children: [], dom: node as Text };
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    const elem = node as Element;
    const props: Record<string, any> = {};
    Array.from(elem.attributes).forEach(attr => {
      props[attr.name] = attr.value;
    });
    const tagName = elem.tagName.toLowerCase();
    let vnodeKey: string | undefined = undefined;
    // User-typed element: input, textarea, contenteditable
    if (tagName === 'input' && elem.hasAttribute('data-model')) {
      const model = elem.getAttribute('data-model')!;
      props['data-uid'] = model;
      elem.setAttribute('data-uid', model);
      vnodeKey = model;
      console.debug(`[VNode] input[data-model] assigned stable data-uid and key:`, model);
    } else if (tagName === 'input' || tagName === 'textarea' || elem.hasAttribute('contenteditable')) {
      // Use path-based key for uncontrolled user-typed elements
      vnodeKey = `${parentPath}.${tagName}[${childIndex}]`;
      props['data-uid'] = vnodeKey;
      elem.setAttribute('data-uid', vnodeKey);
      console.debug(`[VNode] ${tagName} user-typed element assigned data-uid and key:`, vnodeKey);
    } else {
      // Non-user-typed element: assign deterministic key based on tree path
      vnodeKey = `${parentPath}.${tagName}[${childIndex}]`;
    }
    // Recursively assign stable keys for all children
    const children: VNode[] = Array.from(elem.childNodes).map((child, idx) => {
      return createVNodeFromElement(child, vnodeKey, idx);
    });
    debugType = tagName;
    debugKey = vnodeKey;
    console.debug('[VNode]', debugType, 'key:', debugKey);
    return {
      type: tagName,
      key: vnodeKey,
      props,
      children,
      dom: elem
    };
  }
  // Fallback for unsupported node types
  return { type: '#unknown', key: undefined, props: {}, children: [], dom: undefined };
}

/**
 * Patch two VNodes and update the DOM, preserving controlled inputs
 */
function patchVNode(parent: Element, oldVNode: VNode, newVNode: VNode): void {
  if (oldVNode.key === newVNode.key && oldVNode.type === newVNode.type) {
    // Patch text nodes
    if (oldVNode.type === '#text' && newVNode.type === '#text') {
      if (oldVNode.dom instanceof Text && newVNode.dom instanceof Text) {
        if (oldVNode.dom.textContent !== newVNode.dom.textContent) {
          oldVNode.dom.textContent = newVNode.dom.textContent;
        }
      }
      return;
    }
    // After patching, always update controlled input values for all child nodes
    if (parent instanceof Element) {
      // Find host from shadowRoot
      let host: any = null;
      const rootNode = parent.getRootNode();
      if (rootNode instanceof ShadowRoot && 'host' in rootNode) {
        host = (rootNode as ShadowRoot).host;
      }
      updateControlledInputs(parent, host);
    }
    // Update other attributes
    Object.entries(newVNode.props).forEach(([name, value]) => {
      if (oldVNode.dom instanceof Element) {
        oldVNode.dom.setAttribute(name, value);
      }
    });
    // Controlled input sync: force input.value to match VNode props.value
    if (
      oldVNode.dom instanceof HTMLInputElement &&
      typeof newVNode.props.value !== 'undefined' &&
      oldVNode.dom.value !== newVNode.props.value
    ) {
      oldVNode.dom.value = newVNode.props.value;
    }
    // Also handle textarea
    if (
      oldVNode.dom instanceof HTMLTextAreaElement &&
      typeof newVNode.props.value !== 'undefined' &&
      oldVNode.dom.value !== newVNode.props.value
    ) {
      oldVNode.dom.value = newVNode.props.value;
    }
    // --- Robust keyed children diffing for lists ---
    const oldChildrenByKey: Record<string, VNode> = {};
    oldVNode.children.forEach(child => {
      if (child.key) oldChildrenByKey[child.key] = child;
    });
    // Track DOM children for reconciliation
    const parentEl = oldVNode.dom as Element;
    let domChildren = Array.from(parentEl.childNodes);
    // Remove extra old children
    while (domChildren.length > newVNode.children.length) {
      parentEl.removeChild(domChildren.pop()!);
    }
    // Patch or add new children
    let domIdx = 0;
    for (let i = 0; i < newVNode.children.length; i++) {
      const newChild = newVNode.children[i];
      let oldChild = oldVNode.children[i];
      if (newChild.key && oldChildrenByKey[newChild.key]) {
        oldChild = oldChildrenByKey[newChild.key];
      }
      // Find the matching DOM child by node type
      let domChild: ChildNode | null = null;
      while (domIdx < domChildren.length) {
        if (
          (newChild.type === '#text' && domChildren[domIdx].nodeType === Node.TEXT_NODE) ||
          (newChild.type !== '#text' && domChildren[domIdx].nodeType === Node.ELEMENT_NODE)
        ) {
          domChild = domChildren[domIdx];
          domIdx++;
          break;
        }
        domIdx++;
      }
      if (oldChild && domChild) {
        // If node type changed, replace
        if (oldChild.type !== newChild.type) {
          const newDom = newChild.dom || (newChild.type === '#text' ? document.createTextNode('') : document.createElement(newChild.type));
          parentEl.replaceChild(newDom, domChild);
          newChild.dom = newDom;
        } else if (oldChild.type === '#text' && newChild.type === '#text') {
          // Patch text node content directly
          if (domChild.textContent !== (newChild.dom?.textContent ?? newChild.props?.nodeValue ?? '')) {
            domChild.textContent = newChild.dom?.textContent ?? newChild.props?.nodeValue ?? '';
          }
          newChild.dom = domChild as Element | Text;
        } else {
          patchVNode(parentEl, oldChild, newChild);
          newChild.dom = domChild as Element | Text;
        }
      } else {
        // Add new node
        if (newChild.dom) {
          const appended = parentEl.appendChild(newChild.dom.cloneNode(true));
          newChild.dom = appended as Element | Text;
        }
      }
    }
  } else {
    // Replace node, but only if oldVNode.dom is actually a child of parent
    const newEl = (newVNode.dom as Element) || document.createElement(newVNode.type);
    if (oldVNode.dom && oldVNode.dom.parentNode === parent) {
      parent.replaceChild(newEl, oldVNode.dom);
    } else {
      // Fallback: replace parent's innerHTML for this subtree
      parent.innerHTML = '';
      parent.appendChild(newEl);
    }
  }
}

/**
 * useDataModel - Two-way binding helper for input/select/textarea and state property.
 * Enables v-model-like behavior for custom elements.
 *
 * @template T - State type
 * @param inputEl - The input/select/textarea element to bind
 * @param state - The reactive state object
 * @param key - The property name in state to bind
 */
export function useDataModel<T extends Record<string, any>>(
  inputEl: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  state: T,
  keyWithModifiers: string
): void {
  // Parse key and modifiers
  const [key, ...modifiers] = keyWithModifiers.split('|').map(s => s.trim());
  const eventModifiers = modifiers.filter(m => ['input', 'change', 'blur'].includes(m));
  const valueModifiers = modifiers.filter(m => ['number', 'trim'].includes(m));
  const events = eventModifiers.length ? eventModifiers : ['input', 'change'];

  // Initial value sync
  if ('value' in inputEl && typeof state[key] !== 'undefined') {
    inputEl.value = String(state[key] ?? '');
  }
  if (inputEl.type === 'checkbox') {
    (inputEl as HTMLInputElement).checked = Boolean(state[key]);
  }
  if (inputEl.type === 'radio') {
    (inputEl as HTMLInputElement).checked = inputEl.value === String(state[key]);
  }

  // Batched update logic with modifiers
  let rafId: number | null = null;
  const updateState = (_e: Event) => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      let value: any = inputEl.type === 'checkbox'
        ? (inputEl as HTMLInputElement).checked
        : inputEl.value;
      if (valueModifiers.includes('trim') && typeof value === 'string') value = value.trim();
      if (valueModifiers.includes('number')) value = Number(value);
      if (inputEl.type === 'radio') {
        if ((inputEl as HTMLInputElement).checked) {
          state[key as keyof T] = value as unknown as T[keyof T];
        }
      } else {
        state[key as keyof T] = value as unknown as T[keyof T];
      }
      rafId = null;
    });
  };
  events.forEach(event => inputEl.addEventListener(event, updateState));

  // Listen for state changes (reactive)
  if (typeof state.subscribe === 'function') {
    state.subscribe(() => {
      if ('value' in inputEl && typeof state[key] !== 'undefined') {
        inputEl.value = String(state[key] ?? '');
      }
      if (inputEl.type === 'checkbox') {
        (inputEl as HTMLInputElement).checked = Boolean(state[key]);
      }
      if (inputEl.type === 'radio') {
        (inputEl as HTMLInputElement).checked = inputEl.value === String(state[key]);
      }
    });
  }
}

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
   * Force sync all controlled input values and event listeners after VDOM patching.
   */
  private forceSyncControlledInputs(): void {
    if (!this.shadowRoot) return;
    this.shadowRoot.querySelectorAll('input[data-model]').forEach(input => {
      const modelAttr = input.getAttribute('data-model');
      if (modelAttr && this.stateObj && typeof this.stateObj[modelAttr] !== 'undefined') {
        const inputEl = input as HTMLInputElement;
        const stateValue = String(this.stateObj[modelAttr]);
        const isFocused = document.activeElement === inputEl;
        let selectionStart = null, selectionEnd = null;
        if (isFocused && 'selectionStart' in inputEl && 'selectionEnd' in inputEl) {
          selectionStart = inputEl.selectionStart;
          selectionEnd = inputEl.selectionEnd;
        }
        inputEl.value = stateValue;
        // Restore focus and selection
        if (isFocused) {
          inputEl.focus();
          if (selectionStart !== null && selectionEnd !== null) {
            inputEl.setSelectionRange(selectionStart, selectionEnd);
            console.debug('[forceSync] Restored selection for', modelAttr, 'start:', selectionStart, 'end:', selectionEnd);
          }
        }
        // Debug log for forced sync and input reference
        console.debug('[forceSync] Forced input value for', modelAttr, 'to', stateValue, '| input.value after assignment:', inputEl.value, '| input ref:', inputEl);
      }
      // Always rebind input event
      const handlerName = input.getAttribute('data-on-input');
      if (handlerName && typeof (this as any)[handlerName] === 'function') {
        (input as HTMLInputElement).oninput = (event: Event) => {
          (this as any)[handlerName](event);
        };
        console.debug('[forceSync] Rebound input event for', handlerName);
      }
    });
    // Rebind other events (e.g., data-on-click)
    this.rebindEventListeners();
  }
  /**
   * Sync all controlled inputs and event listeners after render
   */
  private syncControlledInputsAndEvents(): void {
  // No-op: input value sync is handled only by forceSyncControlledInputs after render
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
      // @ts-ignore
      useDataModel(el, this.stateObj, keyWithModifiers);
      (el as any)._dataModelBound = true;
    });
    // --- Post-render sync for all data-model inputs ---
    shadow.querySelectorAll('[data-model]').forEach((el) => {
      const [key] = el.getAttribute('data-model')?.split('|').map(s => s.trim()) ?? [];
      if (!key || !(key in this.stateObj)) return;
      // Only set value/checked for input, textarea, select
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
        if (typeof this.stateObj[key] !== 'undefined') {
          el.value = String(this.stateObj[key] ?? '');
        }
        if (el instanceof HTMLInputElement && el.type === 'checkbox') {
          el.checked = Boolean(this.stateObj[key]);
        }
        if (el instanceof HTMLInputElement && el.type === 'radio') {
          el.checked = el.value === String(this.stateObj[key]);
        }
      }
    });
  }
  private config!: ComponentConfig<S, C>;
  private stateObj!: S & C;
  private api!: ComponentAPI<S & C>;
  private _globalUnsubscribes: Array<() => void> = [];
  private unsubscribes: Array<() => void> = [];
  private refsAttached = false;
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
    console.debug('[vdom] initializeConfig called for', this.tagName);
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
    console.debug('[vdom] Assigned reactive stateObj:', this.stateObj);
    // Subscribe to state changes and batch re-render
    if (typeof (this.stateObj as any).subscribe === 'function') {
      this.unsubscribes.push((this.stateObj as any).subscribe(() => {
        console.debug('[vdom] state subscription fired, calling scheduleRender');
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
      this.processRefs();
    }
    this.config.onMounted?.(this.api.state, this.api);
  }

  connectedCallback(): void {
    console.debug('[vdom] connectedCallback called for', this.tagName);
    this.initializeConfig();
    // ...existing connectedCallback logic...
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
    console.debug('[runtime] render() called');
  // Robust controlled input sync after every render
  this.syncControlledInputsAndEvents();
  setTimeout(() => this.attachControlledInputListeners(), 0);
    try {
      // Plugin hook: onRender
      runtimePlugins.forEach(p => p.onRender?.(this.stateObj, this.api));
      console.debug('[runtime] Calling template function with state:', JSON.stringify(this.stateObj));
      const templateResultOrPromise = this.config.template(this.stateObj, this.api);
      if (templateResultOrPromise instanceof Promise) {
        templateResultOrPromise.then(templateResult => {
          console.debug('[runtime] Template function resolved to:', templateResult);
          this._renderTemplateResult(templateResult);
        }).catch(error => {
          this._handleRenderError(error);
        });
      } else {
        console.debug('[runtime] Template function returned:', templateResultOrPromise);
        this._renderTemplateResult(templateResultOrPromise);
      }
    } catch (error) {
      this._handleRenderError(error);
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
        el.removeEventListener(eventType, (el as any)._boundHandler);
        // Bind new handler
        const boundHandler = (e: Event) => this.config[handlerName](e, this.stateObj, this.api);
        el.addEventListener(eventType, boundHandler);
        (el as any)._boundHandler = boundHandler;
      });
    });
  }
  private _renderTemplateResult(templateResult: any): void {
    try {
      if (typeof templateResult === 'string') {
        console.debug('[vdom] _renderTemplateResult called with string template:', templateResult);
        const newVNode = parseVNodeFromHTML(templateResult);
        console.debug('[vdom] Generated new VNode:', newVNode);
        let shadowAppContainer = this.shadowRoot!.querySelector('[data-root]') as Element | undefined;
        const isInitialRender = !shadowAppContainer;
        if (isInitialRender) {
          if (newVNode.dom instanceof Element) {
            newVNode.dom.setAttribute('data-root', '');
            this.shadowRoot!.innerHTML = '';
            this.shadowRoot!.appendChild(newVNode.dom);
            shadowAppContainer = newVNode.dom;
            this._prevVNode = newVNode;
            this._prevVNode.dom = shadowAppContainer;
            console.debug('[vdom] Initial render complete. VNode stored.');
          }
          this.refsAttached = false;
          this.rebindEventListeners();
        } else {
          if (shadowAppContainer && newVNode && this._prevVNode) {
            // Always patch the [data-root] element itself
            newVNode.dom = shadowAppContainer;
            console.debug('[vdom] Patching DOM with VNode diff. Old:', this._prevVNode, 'New:', newVNode);
            patchVNode(shadowAppContainer, this._prevVNode, newVNode);
            this._prevVNode = newVNode;
            this._prevVNode.dom = shadowAppContainer;
            this.refsAttached = true;
            // Force sync controlled inputs and events after VDOM patch
            this.forceSyncControlledInputs();
          }
        }
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
      }
      this.lastState = safeClone(this.stateObj);
      this.updateStyle();
      if (!this.refsAttached) {
        this.processRefs();
        this.refsAttached = true;
      }
      // Automatic event binding after refs and DOM update
      this.bindEvents();
    // Robust controlled input sync after every render
    this.syncControlledInputsAndEvents();
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
    console.debug('[vdom] scheduleRender called');
    if (this.rafId !== undefined && this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
    this.rafId = requestAnimationFrame(() => {
      console.debug('[vdom] scheduleRender: calling render()');
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
