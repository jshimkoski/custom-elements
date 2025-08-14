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
export { compileTemplate, renderCompiledTemplate, updateCompiledTemplate } from './template-compiler';

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
import { renderCompiledTemplate, updateCompiledTemplate } from './template-compiler';

// ============================================================================
// Sanitation
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

// ============================================================================
// Data/Event Binding
// ============================================================================

/**
 * Minimal controlled input binding helper for data-model attributes.
 * Handles checkboxes, radios, text, and modifiers (trim, number).
 * @param el - Input/select/textarea element
 * @param stateObj - State object to bind
 * @param keyWithModifiers - Key and optional modifiers (e.g. 'name|trim|number')
 */
function useDataModel<T extends Record<string, unknown>>(el: Element, stateObj: T, keyWithModifiers: string) {
  const [rawKey, ...modifiers] = keyWithModifiers.split('|').map(s => s.trim());
  if (!rawKey || rawKey === '__proto__' || rawKey === 'constructor' || rawKey === 'prototype') return;
  // Helper to set nested state (dot notation)
  function setNestedState(obj: any, path: string, value: unknown) {
    const keys = path.split('.');
    let target = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in target)) target[keys[i]] = {};
      target = target[keys[i]];
    }
    target[keys[keys.length - 1]] = value;
  }
  const updateState = (e: Event) => {
    let value: unknown;
    if (el instanceof HTMLInputElement && el.type === 'checkbox') {
      value = el.value;
      const trueValue = el.getAttribute('data-true-value');
      const falseValue = el.getAttribute('data-false-value');
      let arr = Array.isArray(stateObj[rawKey]) ? (stateObj[rawKey] as unknown[]) : undefined;
      if (arr) {
        if (el.checked) {
          if (!arr.includes(value)) arr.push(value);
        } else {
          const idx = arr.indexOf(value);
          if (idx !== -1) arr.splice(idx, 1);
        }
        setNestedState(stateObj, rawKey, [...arr]);
      } else {
        if (trueValue !== null || falseValue !== null) {
          if (el.checked) {
            setNestedState(stateObj, rawKey, trueValue);
          } else {
            setNestedState(stateObj, rawKey, falseValue !== null ? falseValue : false);
          }
        } else {
          setNestedState(stateObj, rawKey, el.checked);
        }
      }
    } else if (el instanceof HTMLInputElement && el.type === 'radio') {
      value = el.value;
      setNestedState(stateObj, rawKey, value);
      const radios = (el.form || el.closest('form') || el.getRootNode()) instanceof Element
        ? ((el.form || el.closest('form') || el.getRootNode()) as Element).querySelectorAll(`input[type="radio"][name="${el.name}"][data-model="${keyWithModifiers}"]`)
        : [];
      radios.forEach((radio: Element) => {
        (radio as HTMLInputElement).checked = (radio as HTMLInputElement).value === String(value);
      });
    } else {
      // Always read value from event target for input events
      // Always read value from the input element itself for robustness
      value = (el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
      if (el instanceof HTMLInputElement && el.type === 'number') {
        value = Number(value);
      }
      if (modifiers.includes('trim') && typeof value === 'string') {
        value = value.trim();
      }
      if (modifiers.includes('number')) {
        value = Number(value);
      }
      setNestedState(stateObj, rawKey, value);
    }
    if ('_vnode' in el && typeof (el as any)._vnode === 'object' && (el as any)._vnode?.props) {
      (el as any)._vnode.props.value = value;
    }
    if (e.type === 'input') {
      (el as { _isDirty?: boolean })._isDirty = true;
    }
    if (e.type === 'keydown' && (e as KeyboardEvent).key === 'Enter') {
      (el as { _isDirty?: boolean })._isDirty = false;
      if (el instanceof HTMLElement && el.isConnected) {
        let parent = el.parentElement;
        while (parent && !(parent instanceof HTMLElement && parent.shadowRoot)) {
          parent = parent.parentElement;
        }
        if (parent && typeof parent === 'object' && parent !== null && 'render' in parent && typeof (parent as any).render === 'function') {
          (parent as HTMLElement & { render: () => void }).render();
        }
      }
    }
    if (e.type === 'blur') {
      (el as { _isDirty?: boolean })._isDirty = false;
    }
  };
  el.addEventListener('input', updateState);
  el.addEventListener('change', updateState);
  el.addEventListener('keydown', updateState);
  el.addEventListener('blur', updateState);
}

// ============================================================================
// VDOM
// ============================================================================

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
 * Safely replaces a child node, guarding against NotFoundError and out-of-sync trees.
 * Falls back to appendChild if oldChild is not present.
 * Logs mutation for debugging if enabled.
 * @param parent - Parent node
 * @param newChild - New node to insert
 * @param oldChild - Old node to replace
 */
function safeReplaceChild(parent: Node | null, newChild: Node, oldChild: Node): void {
  // Get debug flag from parent custom element instance if available
  let debug = false;
  if (parent && parent instanceof Element && 'debug' in parent) {
    debug = (parent as Element & { debug?: boolean }).debug === true;
  }
  if (!parent || !(parent instanceof Element)) {
    if (debug) console.warn('[runtime] safeReplaceChild: parent is missing or not an Element', { parent, newChild, oldChild });
    return;
  }
  if (parent.contains(oldChild) && oldChild.parentNode === parent) {
    try {
      parent.replaceChild(newChild, oldChild);
    } catch (err) {
      if (debug) console.error('[runtime] safeReplaceChild: error replacing child', err, {
        parent,
        newChild,
        oldChild,
        parentHTML: (parent as Element).outerHTML,
        newChildHTML: (newChild as Element).outerHTML,
        oldChildHTML: (oldChild as Element).outerHTML
      });
    }
  } else {
    // Do NOT append newChild if oldChild is missing during patching
    if (debug) console.warn('[runtime] safeReplaceChild: attempted to replace missing child, skipping mutation', {
      parent,
      newChild,
      oldChild,
      parentChildren: Array.from(parent.childNodes).map(n => n.nodeName),
      parentHTML: (parent as Element).outerHTML,
      newChildHTML: (newChild as Element).outerHTML,
      oldChildHTML: (oldChild as Element).outerHTML
    });
  }
}

/**
 * Mounts a VNode to the DOM and returns the created node.
 * Handles text, fragment, and element nodes.
 * @param vnode - Virtual node to mount
 * @returns DOM node or null
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
    if (k === 'value' && el instanceof HTMLInputElement) {
      if (el.type === 'radio') {
        // Always set value attribute for radios, never assign to property
        el.setAttribute('value', v as string);
      } else if (el.type === 'checkbox') {
        // Always set value property and attribute for checkboxes
        el.value = v as string;
        el.setAttribute('value', v as string);
      } else {
        el.value = v as string;
        el.setAttribute('value', v as string);
      }
    } else {
      el.setAttribute(k, v as string);
    }
  }
  vnode.dom = el;
  for (const child of vnode.children) {
    const childNode = mountVNode(child);
    if (childNode) el.appendChild(childNode);
  }
  return el;
}

/**
 * Parses an HTML string into a VNode tree.
 * Supports basic tags, attributes, text, and key/data-model.
 * @param html - HTML string
 * @returns VNode tree
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
 * Creates a VNode from a DOM ChildNode (Element or Text).
 * Assigns a stable, deterministic key for VDOM reconciliation.
 * @param node - DOM node
 * @param parentPath - Path for key generation
 * @param childIndex - Index for key generation
 * @returns VNode
 */
function createVNodeFromElement(node: ChildNode, parentPath: string = '', childIndex: number = 0): VNode {
  // Log all input elements and their attributes at VNode creation
  if (node.nodeType === Node.ELEMENT_NODE) {
    const elem = node as Element;
    if (elem.tagName.toLowerCase() === 'input') {
      const attrs: Record<string, string> = {};
      Array.from(elem.attributes).forEach(attr => {
        attrs[attr.name] = attr.value;
      });
    }
  }
  // let debugType = '';
  // let debugKey = undefined;
  if (!node) {
    // Guard: skip undefined/null nodes
    return { type: '#unknown', key: undefined, props: {}, children: [], dom: undefined };
  }
  if (node.nodeType === Node.TEXT_NODE) {
    // Ignore pure whitespace text nodes
    if (!node.nodeValue || /^\s*$/.test(node.nodeValue)) {
      return { type: '#whitespace', key: undefined, props: {}, children: [], dom: undefined };
    }
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
      const inputType = elem.getAttribute('type');
      // Always assign value 'on' for single checkbox if missing
      if (inputType === 'checkbox' && !elem.hasAttribute('value')) {
        elem.setAttribute('value', 'on');
        props['value'] = 'on';
      }
      if (inputType === 'radio' || inputType === 'checkbox') {
        // Always use DOM value attribute, fallback to 'on' if missing
        let valueAttr = elem.getAttribute('value');
        if (!valueAttr) {
          valueAttr = 'on';
          elem.setAttribute('value', valueAttr);
        }
        vnodeKey = `${model}:${valueAttr}`;
        props['data-uid'] = vnodeKey;
        elem.setAttribute('data-uid', vnodeKey);
        props['value'] = valueAttr;
      } else {
        props['data-uid'] = model;
        elem.setAttribute('data-uid', model);
        vnodeKey = model;
      }
    } else if (tagName === 'input' || tagName === 'textarea' || elem.hasAttribute('contenteditable')) {
      // Use path-based key for uncontrolled user-typed elements
      vnodeKey = `${parentPath}.${tagName}[${childIndex}]`;
      props['data-uid'] = vnodeKey;
      elem.setAttribute('data-uid', vnodeKey);
    } else {
      // Non-user-typed element: assign deterministic key based on tree path
      vnodeKey = `${parentPath}.${tagName}[${childIndex}]`;
    }
    // Recursively assign stable keys for all children
    const children: VNode[] = Array.from(elem.childNodes).map((child, idx) => {
      return createVNodeFromElement(child, vnodeKey, idx);
    });
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
 * Patches two VNodes and updates the DOM, preserving controlled inputs.
 * Handles keyed and index-based reconciliation.
 * @param parent - Parent DOM element
 * @param oldVNode - Previous VNode
 * @param newVNode - New VNode
 */
function patchVNode(parent: Element, oldVNode: VNode, newVNode: VNode): void {
  // Guard clause: if either VNode is undefined, return early
  if (!oldVNode || !newVNode) {
    return;
  }

  // Focus/selection preservation for replaced input elements
  let restoreFocus: null | {
    selectionStart: number | null;
    selectionEnd: number | null;
    value: string;
    type: string;
  } = null;
  if (
    oldVNode.dom instanceof HTMLInputElement &&
    document.activeElement === oldVNode.dom
  ) {
    restoreFocus = {
      selectionStart: oldVNode.dom.selectionStart,
      selectionEnd: oldVNode.dom.selectionEnd,
      value: oldVNode.dom.value,
      type: oldVNode.dom.type
    };
  }

  // If type or key differ, replace node
  if (oldVNode.type !== newVNode.type || oldVNode.key !== newVNode.key) {
    const newDom = mountVNode(newVNode);
    // Only replace if both are valid Node instances
    if (newDom instanceof Node && oldVNode.dom instanceof Node && parent.contains(oldVNode.dom)) {
      if (parent.contains(oldVNode.dom) && oldVNode.dom.parentNode === parent) {
        safeReplaceChild(parent, newDom, oldVNode.dom);
        // Restore focus/selection if needed, try synchronously first
        if (
          restoreFocus &&
          newDom instanceof HTMLInputElement &&
          newDom.type === restoreFocus.type
        ) {
          try {
            newDom.focus();
            newDom.selectionStart = restoreFocus.selectionStart;
            newDom.selectionEnd = restoreFocus.selectionEnd;
          } catch {}
          // If not focused, fallback to rAF
          if (document.activeElement !== newDom) {
            requestAnimationFrame(() => {
              newDom.focus();
              newDom.selectionStart = restoreFocus.selectionStart;
              newDom.selectionEnd = restoreFocus.selectionEnd;
            });
          }
        }
      }
    } else if ((newDom as any) instanceof Node) {
      if (newDom) {
        parent.appendChild(newDom);
        newVNode.dom = newDom;
      }
      return;
    } else {
      // else: skip invalid node replacement
      newVNode.dom = undefined;
      return;
    }
  }
  // Patch props for Element
  const oldDom = oldVNode.dom;

  // --- Robust keyed reconciliation ---

  // Filter out whitespace-only VDOM nodes for robust reconciliation
  function isMeaningfulVNode(v: VNode | undefined): v is VNode {
    return !!v && v.type !== '#whitespace' && !(v.type === '#text' && (!v.props?.nodeValue || /^\s*$/.test(v.props.nodeValue)));
  }
  const oldChildren: VNode[] = Array.isArray(oldVNode.children) ? oldVNode.children.filter(isMeaningfulVNode) : [];
  const newChildren: VNode[] = Array.isArray(newVNode.children) ? newVNode.children.filter(isMeaningfulVNode) : [];

  // If children keys or count differ, replace parent node
  const oldKeys = oldChildren.map(c => c.key).join(',');
  const newKeys = newChildren.map(c => c.key).join(',');
  if (oldKeys !== newKeys || oldChildren.length !== newChildren.length) {
    const newDom = mountVNode(newVNode);
    if (newDom && oldVNode.dom) {
      if (parent.contains(oldVNode.dom) && oldVNode.dom.parentNode === parent) {
        safeReplaceChild(parent, newDom, oldVNode.dom);
      } else {
        const grandparent = parent.parentNode;
        if (grandparent && grandparent instanceof Element) {
          grandparent.replaceChild(newDom, parent);
          let debug = false;
          if (parent && 'debug' in parent) debug = (parent as any).debug === true;
          if (debug) console.warn('[runtime] patchVNode: replaced parent in grandparent due to out-of-sync DOM', {
            grandparent,
            parent,
            newDom,
            oldDom: oldVNode.dom
          });
        } else {
          // Fallback: replace parent node in its host using replaceChild or replaceWith
          const host = parent.parentNode;
          if (host && typeof (host as Node).replaceChild === 'function') {
            (host as Node).replaceChild(newDom, parent);
          } else if ('replaceWith' in parent && typeof parent.replaceWith === 'function') {
            parent.replaceWith(newDom);
          }
        }
      }
      newVNode.dom = newDom;
      return;
    }
  }
  if (oldDom && oldDom instanceof Element && newVNode.props) {
    const inputType = oldDom.tagName.toLowerCase() === 'input' ? oldDom.getAttribute('type') : undefined;
    const isCustomElement = oldDom.tagName.includes('-');
    for (const [k, v] of Object.entries(newVNode.props)) {
      if (inputType === 'radio' && k === 'value') {
        // Never set value for radios
        continue;
      }
      // For checkboxes, always set value attribute
      if (inputType === 'checkbox' && k === 'value') {
        oldDom.setAttribute('value', v as string);
        continue;
      }
      // Always set attribute to ensure attributeChangedCallback fires
      oldDom.setAttribute(k, v as string);
    }
    // For custom elements, explicitly set all attributes again to guarantee reactivity
    if (isCustomElement) {
      for (const [k, v] of Object.entries(newVNode.props)) {
        oldDom.setAttribute(k, v as string);
      }
    }
    // Remove attributes not present in newVNode.props, except value for radios/checkboxes
    for (const k of Array.from(oldDom.attributes).map(a => a.name)) {
      if (!(k in newVNode.props)) {
        if (inputType === 'radio' && k === 'value') continue;
        if (inputType === 'checkbox' && k === 'value') continue;
        oldDom.removeAttribute(k);
      }
    }
  }
  // Patch text: always update nodeValue for text nodes
  if (newVNode.type === '#text') {
    if (oldDom && oldDom.nodeType === Node.TEXT_NODE) {
      if ((oldDom as Text).nodeValue !== newVNode.props.nodeValue) {
        (oldDom as Text).nodeValue = newVNode.props.nodeValue;
      }
      newVNode.dom = oldDom;
    } else {
      // Replace or insert text node at correct position
      const newTextNode = document.createTextNode(newVNode.props.nodeValue ?? '');
      if (oldDom && parent.contains(oldDom) && oldDom.parentNode === parent) {
        safeReplaceChild(parent, newTextNode, oldDom);
      } else {
        const grandparent = parent.parentNode;
        if (grandparent && grandparent instanceof Element) {
          grandparent.replaceChild(newTextNode, parent);
        } else {
          parent.innerHTML = '';
          while (parent.firstChild) parent.removeChild(parent.firstChild);
          parent.appendChild(newTextNode);
        }
      }
      newVNode.dom = newTextNode;
    }
    return;
  }

  // Always reconcile the full set of children for the parent element
  if (parent !== oldVNode.dom && oldVNode.dom instanceof Element) {
    // If patchVNode is called on a child, redirect to parent with full children
    patchVNode(oldVNode.dom, oldVNode, newVNode);
    return;
  }
  // Symbol for storing keys on DOM nodes
  const DOM_KEY: unique symbol = Symbol('vdom-key');
  const oldKeyed: Record<string, VNode> = {};
  const newKeyed: Record<string, VNode> = {};
  let hasKeys = false;
  oldChildren.forEach(child => {
    if (child.key) {
      oldKeyed[child.key] = child;
      hasKeys = true;
    }
  });
  newChildren.forEach(child => {
    if (child.key) {
      newKeyed[child.key] = child;
      hasKeys = true;
    }
  });
  if (hasKeys) {
    // Remove old keyed children not present in newChildren
    Object.keys(oldKeyed).forEach(key => {
      if (!newKeyed[key]) {
        const childDom = oldKeyed[key].dom;
        if (childDom && childDom instanceof Node && oldDom instanceof Element && oldDom.contains(childDom)) {
          oldDom.removeChild(childDom);
        }
      }
    });
    // Insert or patch new keyed children
    newChildren.forEach((newChild) => {
      if (newChild.key && oldKeyed[newChild.key]) {
        const oldChild = oldKeyed[newChild.key];
        let isCheckbox = false;
        if (oldChild.dom && oldChild.dom instanceof Element) {
          isCheckbox = oldChild.dom.tagName.toLowerCase() === 'input' && oldChild.dom.getAttribute('type') === 'checkbox';
        }
        const isControlledCheckbox = isCheckbox && oldChild.dom && oldChild.dom instanceof Element && (oldChild.dom.hasAttribute('data-bind') || oldChild.dom.hasAttribute('data-model'));
        if (isControlledCheckbox) {
          // Always patch in place for controlled checkboxes
          patchVNode(oldDom as Element, oldChild, newChild);
        } else if (isCheckbox) {
          // Only replace if not controlled
          const newDom = mountVNode(newChild);
          if (newDom && oldChild.dom && oldChild.dom instanceof Element && oldChild.dom.contains(oldChild.dom)) {
            if (oldDom && oldDom.contains && oldDom.contains(oldChild.dom)) {
              oldDom.replaceChild(newDom, oldChild.dom);
            }
            newChild.dom = newDom;
          }
        } else {
          patchVNode(oldDom as Element, oldChild, newChild);
        }
      } else {
        const childDom = mountVNode(newChild);
        if (childDom) (oldDom as Element).appendChild(childDom);
      }
    });
    // After patching all keyed children, remove any extra DOM nodes beyond the newChildren count
    if (oldDom instanceof Element) {
      while (oldDom.childNodes.length > newChildren.length) {
        oldDom.removeChild(oldDom.lastChild!);
      }
    }
  } else {
    // Fallback: index-based reconciliation ONLY if no keys at all
    if (!oldDom) return; // Guard for undefined oldDom

    if (
      oldChildren.length > 0 &&
      newChildren.length > 0 &&
      (oldChildren.some(c => c.key) || newChildren.some(c => c.key))
    ) {
      // If any child has a key, do keyed reconciliation
      Object.keys(oldKeyed).forEach(key => {
        if (!newKeyed[key]) {
          const childDom = oldKeyed[key].dom;
          if (childDom && childDom instanceof Node && oldDom instanceof Element && oldDom.contains(childDom)) {
            oldDom.removeChild(childDom);
          }
        }
      });
      newChildren.forEach((newChild) => {
        if (newChild.key && oldKeyed[newChild.key]) {
          const oldChild = oldKeyed[newChild.key];
          let isCheckbox = false;
          if (oldChild.dom && oldChild.dom instanceof Element) {
            isCheckbox = oldChild.dom.tagName.toLowerCase() === 'input' && oldChild.dom.getAttribute('type') === 'checkbox';
          }
          if (isCheckbox) {
            // Always replace checkbox DOM node to ensure unique value
            const newDom = mountVNode(newChild);
            if (newDom && oldChild.dom && oldChild.dom instanceof Element && oldChild.dom.contains(oldChild.dom)) {
              if (oldDom.contains(oldChild.dom)) {
                oldDom.replaceChild(newDom, oldChild.dom);
              }
              newChild.dom = newDom;
            }
          } else {
            patchVNode(oldDom as Element, oldChild, newChild);
          }
        } else {
          const childDom = mountVNode(newChild);
          if (childDom && oldDom instanceof Element) oldDom.appendChild(childDom);
        }
      });
      if (oldDom instanceof Element) {
        while (oldDom.childNodes.length > newChildren.length) {
          oldDom.removeChild(oldDom.lastChild!);
        }
      }
    } else {
      // True fallback: index-based reconciliation for children with no keys
      for (let i = 0; i < newChildren.length; i++) {
        const newChild = newChildren[i];
        const domChild = oldDom.childNodes[i];
        const nextSibling = oldDom.childNodes[i + 1] || null;
        const isCheckbox = newChild.type === 'input' && newChild.props?.type === 'checkbox';
        if (!domChild) {
          const newDom = mountVNode(newChild);
          if (newDom && oldDom instanceof Element) {
            oldDom.insertBefore(newDom, nextSibling);
            newChild.dom = newDom;
          }
        } else if (isCheckbox) {
          // Always replace checkbox DOM node to guarantee unique value
          const newDom = mountVNode(newChild);
          if (newDom && oldDom instanceof Element && oldDom.contains(domChild)) {
            if (oldDom.contains(domChild)) {
              oldDom.replaceChild(newDom, domChild);
            }
            if (newChild.key) (newDom as any)[DOM_KEY] = newChild.key;
            newChild.dom = newDom;
          }
        } else {
          const vdomType = newChild.type;
          const domType = domChild.nodeType === Node.TEXT_NODE ? '#text' : domChild.nodeName.toLowerCase();
          const vKey = newChild.key;
          const domKey = (domChild as any)[DOM_KEY];
          const isCustomElement = domType.includes('-');
          if (vdomType !== domType || (vKey && domKey !== vKey) || isCustomElement) {
            // Always replace custom elements when key changes or type differs
            const newDom = mountVNode(newChild);
            if (newDom && oldDom instanceof Element && oldDom.contains(domChild)) {
              if (oldDom.contains(domChild)) {
                oldDom.replaceChild(newDom, domChild);
              }
              if (vKey) (newDom as any)[DOM_KEY] = vKey;
              newChild.dom = newDom;
            }
          } else {
            if (oldDom instanceof Element) {
              patchVNode(oldDom, oldChildren[i], newChild);
            }
          }
        }
      }
      while (oldDom instanceof Element && oldDom.childNodes.length > newChildren.length) {
        oldDom.removeChild(oldDom.lastChild!);
      }
    }
  }
  newVNode.dom = oldDom;
}

// ============================================================================
// Component Lifecycle
// ============================================================================

/**
 * Type guard to check if a value is Promise-like.
 */
function isPromise(val: unknown): val is Promise<unknown> {
  return !!val && typeof (val as any).then === 'function';
}

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
  public setState(newState: Partial<S & C>): void {
    // Replace stateObj with a new sanitized, null-prototype object
    const merged = { ...this.stateObj, ...newState };
    this.stateObj = deepSanitizeObject(merged) as S & C;
  (this.api as any).state = this.stateObj;
    this.render();
  }

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
        const boundHandler = (e: Event) => {
          const handler = this.config[handlerName];
          if (typeof handler === 'function') {
            handler(e, this.stateObj, this.api);
          }
        };
        el.addEventListener(eventType, boundHandler);
        if (!(el as any)._boundHandlers) (el as any)._boundHandlers = {};
        (el as any)._boundHandlers[eventType] = boundHandler;
      });
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
