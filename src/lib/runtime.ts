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
// Minimal controlled input binding helper
function useDataModel(el: Element, stateObj: any, keyWithModifiers: string) {
  const [key, ...modifiers] = keyWithModifiers.split('|').map(s => s.trim());
  if (!key) return;
  const updateState = (_e: Event) => {
    let value: any;
    if (el instanceof HTMLInputElement && el.type === 'checkbox') {
      value = el.checked;
    } else if (el instanceof HTMLInputElement && el.type === 'radio') {
      if (el.checked) {
        value = el.value;
      } else {
        return;
      }
    } else {
      value = (el as any).value;
    }
    if (modifiers.includes('trim') && typeof value === 'string') {
      value = value.trim();
    }
    if (modifiers.includes('number')) {
      value = Number(value);
    }
    stateObj[key] = value;
    // Bidirectional sync: update VNode value if available
    if ((el as any)._vnode) {
      (el as any)._vnode.props.value = value;
    }
  };
  // After patching, ensure VNode.dom and value are updated to match DOM for controlled inputs
  el.addEventListener('input', updateState);
  el.addEventListener('change', updateState);
}

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
 * Mount a VNode to the DOM and return the created node
 */
function mountVNode(vnode: VNode): Element | Text | null {
  if (vnode.type === '#whitespace') {
    return null;
  }
  if (vnode.type === '#text') {
    const textNode = document.createTextNode(vnode.props.nodeValue ?? '');
    vnode.dom = textNode;
    return textNode;
  }
  const el = document.createElement(vnode.type);
  for (const [k, v] of Object.entries(vnode.props)) {
    el.setAttribute(k, v as string);
  }
  vnode.dom = el;
  for (const child of vnode.children) {
    const childNode = mountVNode(child);
    if (childNode) el.appendChild(childNode);
  }
  return el;
}

/**
 * Minimal template-to-VNode parser for HTML strings
 * Only supports basic tags, attributes, text, and key/data-model
 */
function parseVNodeFromHTML(html: string): VNode {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  const nodes = Array.from(template.content.childNodes);
  // If only one root node, return as before
  if (nodes.length === 1) {
    return createVNodeFromElement(nodes[0]);
  }
  // If multiple root nodes, create a fragment VNode
  return {
    type: '#fragment',
    key: undefined,
    props: {},
    children: nodes.map((node, idx) => createVNodeFromElement(node, '#fragment', idx)),
    dom: undefined
  };
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
  if (!node) {
    // Guard: skip undefined/null nodes
    return { type: '#unknown', key: undefined, props: {}, children: [], dom: undefined };
  }
  if (node.nodeType === Node.TEXT_NODE) {
    // Ignore pure whitespace text nodes
    if (!node.nodeValue || /^\s*$/.test(node.nodeValue)) {
      return { type: '#whitespace', key: undefined, props: {}, children: [], dom: undefined };
    }
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
  // --- VDOM diagnostics ---
  console.debug('[VDOM][patchVNode][ENTER]', {
    parent,
    oldVNodeType: oldVNode.type,
    oldVNodeKey: oldVNode.key,
    newVNodeType: newVNode.type,
    newVNodeKey: newVNode.key,
    oldDom: oldVNode.dom,
    newDom: newVNode.dom
  });
  // If type or key differ, replace node
  if (oldVNode.type !== newVNode.type || oldVNode.key !== newVNode.key) {
    const newDom = mountVNode(newVNode);
    if (oldVNode.dom && parent.contains(oldVNode.dom)) {
      parent.replaceChild(newDom!, oldVNode.dom);
    } else {
      parent.appendChild(newDom!);
    }
    newVNode.dom = newDom!;
    return;
  }
  // Patch props for Element
  const oldDom = oldVNode.dom;
  if (oldDom && oldDom instanceof Element && newVNode.props) {
    for (const [k, v] of Object.entries(newVNode.props)) {
      if (oldDom.getAttribute(k) !== v) {
        oldDom.setAttribute(k, v as string);
      }
    }
    for (const k of Array.from(oldDom.attributes).map(a => a.name)) {
      if (!(k in newVNode.props)) {
        oldDom.removeAttribute(k);
      }
    }
  }
  // Patch text
  if (newVNode.type === '#text' && oldDom && newVNode.props.nodeValue !== oldVNode.props.nodeValue) {
    (oldDom as Text).nodeValue = newVNode.props.nodeValue;
  }
  // Patch children
  const oldChildren: VNode[] = Array.isArray(oldVNode.children) ? oldVNode.children : [];
  const newChildren: VNode[] = Array.isArray(newVNode.children) ? newVNode.children : [];
  for (let i = 0; i < Math.max(oldChildren.length, newChildren.length); i++) {
    if (oldChildren[i] && newChildren[i]) {
      patchVNode(oldDom as Element, oldChildren[i], newChildren[i]);
    } else if (newChildren[i]) {
      const childDom = mountVNode(newChildren[i]);
      if (childDom) (oldDom as Element).appendChild(childDom);
    } else if (oldChildren[i]) {
      const childDom = oldChildren[i].dom;
      if (childDom && childDom instanceof Node && oldDom instanceof Element && oldDom.contains(childDom)) {
        oldDom.removeChild(childDom);
      }
    }
  }
  newVNode.dom = oldDom;
}

class ComponentElement<S extends ComponentState, C extends Record<string, any> = {}> extends HTMLElement {
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
      const selectionStart = inputEl.selectionStart;
      const selectionEnd = inputEl.selectionEnd;
      // Ensure dirty flag is set on input event
      if (!(inputEl as any)._hasDirtyListener) {
        inputEl.addEventListener('input', () => {
          (inputEl as any)._isDirty = true;
          console.debug('[forceSync][diagnostic] Input event: set _isDirty = true', { inputEl });
        });
        inputEl.addEventListener('blur', () => {
          (inputEl as any)._isDirty = false;
          console.debug('[forceSync][diagnostic] Blur event: set _isDirty = false', { inputEl });
        });
        (inputEl as any)._hasDirtyListener = true;
      }
      const isDirty = Boolean((inputEl as any)._isDirty);
      // Log all relevant info before any assignment
      console.debug('[forceSync][diagnostic] Input:', {
        modelAttr,
        inputEl,
        stateValue,
        currentValue: inputEl.value,
        isFocused,
        isDirty,
        selectionStart,
        selectionEnd,
        callStack: new Error().stack
      });
      // Never set value for focused or dirty inputs—let user typing win
      if (isFocused || isDirty) {
        console.debug('[forceSync][diagnostic] Skipping value assignment for focused/dirty input', {
          modelAttr,
          isFocused,
          isDirty,
          currentValue: inputEl.value,
          stateValue,
          stack: new Error().stack
        });
        return;
      }
      // Only set value for unfocused and clean inputs if it differs
      if (inputEl.value !== stateValue) {
        console.debug('[forceSync][diagnostic] Forcing value assignment for unfocused/clean input:', {
          modelAttr,
          oldValue: inputEl.value,
          newValue: stateValue,
          stack: new Error().stack
        });
        inputEl.value = stateValue;
        console.debug('[forceSync][diagnostic] Forced input value for', modelAttr, 'to', stateValue, {
          afterAssignment: inputEl.value,
          inputRef: inputEl,
          stack: new Error().stack
        });
      } else {
        console.debug('[forceSync][diagnostic] Unfocused input value matches state:', {
          modelAttr,
          value: inputEl.value,
          stateValue,
          selectionStart,
          selectionEnd,
          stack: new Error().stack
        });
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
    this.shadowRoot.querySelectorAll('input[data-model]').forEach(input => {
      const modelAttr = input.getAttribute('data-model');
      if (!modelAttr || !this.stateObj || typeof this.stateObj[modelAttr] === 'undefined') return;
      const inputEl = input as HTMLInputElement;
      const stateValue = String(this.stateObj[modelAttr]);
      if (inputEl.value !== stateValue) {
        inputEl.value = stateValue;
      }
      if (inputEl.type === 'checkbox') {
        inputEl.checked = Boolean(this.stateObj[modelAttr]);
      }
      if (inputEl.type === 'radio') {
        inputEl.checked = inputEl.value === stateValue;
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
        // Recursively assign DOM nodes to all VNodes
        function assignDomRecursive(vnode: VNode, domNode: Element | Text) {
          vnode.dom = domNode;
          if (vnode.children && vnode.children.length && domNode instanceof Element) {
            const domChildren = Array.from(domNode.childNodes) as (Element | Text)[];
            for (let i = 0; i < vnode.children.length; i++) {
              if (domChildren[i]) {
                assignDomRecursive(vnode.children[i], domChildren[i]);
              }
            }
          }
        }
        // Assign DOM nodes to VNode tree
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = templateResult.trim();
        const actualRootNode = tempContainer.firstElementChild as Element;
        assignDomRecursive(newVNode, actualRootNode);
        // --- Key-based granular patching: persistent root node, child reconciliation by key ---
        // Always ensure <style> element is present and up-to-date
        let styleEl = this.shadowRoot!.querySelector('style');
        if (!styleEl) {
          styleEl = document.createElement('style');
          this.shadowRoot!.appendChild(styleEl);
        }
        if (this.config.style) {
          styleEl.textContent = typeof this.config.style === 'function' ? this.config.style(this.stateObj) : this.config.style;
        } else {
          styleEl.textContent = '';
        }
        // If fragment, reconcile all children
        if (newVNode.type === '#fragment') {
          // Remove all non-style children
          Array.from(this.shadowRoot!.childNodes).forEach(node => {
            if (node !== styleEl) this.shadowRoot!.removeChild(node);
          });
          // Append all fragment children
          newVNode.children.forEach(childVNode => {
            if (childVNode.dom) {
              this.shadowRoot!.appendChild(childVNode.dom);
            }
          });
          // Do not assign shadowRoot to VNode.dom; fragment VNode's dom remains undefined
        } else {
          // Find or create persistent root node
          let rootEl = Array.from(this.shadowRoot!.childNodes).find(
            node => node !== styleEl && node.nodeType === 1
          ) as Element | undefined;
          if (rootEl) {
            // If type or key differ, replace root node
            if (this._prevVNode && (this._prevVNode.type !== newVNode.type || this._prevVNode.key !== newVNode.key)) {
              this.shadowRoot!.replaceChild(actualRootNode, rootEl);
              rootEl = actualRootNode;
            } else {
              // Patch root node in place
              patchVNode(rootEl, this._prevVNode!, newVNode);
            }
          } else {
            // No root node, append new
            rootEl = actualRootNode;
            this.shadowRoot!.appendChild(rootEl);
          }
          newVNode.dom = rootEl;
        }
        this._prevVNode = newVNode;
        this.refsAttached = true;
        this.forceSyncControlledInputs();
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
          this.refsAttached = false;
        }
        this.lastCompiledTemplate = templateResult;
      }
      this.lastState = JSON.parse(JSON.stringify(this.stateObj));
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
