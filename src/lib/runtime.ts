export { Store } from './store.js';
export { eventBus } from './event-bus.js';
export { html, css, classes, styles, ref, on } from './template-helpers.js';

/**
 * Modern Web Component Runtime - v2.0
 * 
 * Completely rewritten for:
 * - Strict TypeScript
 * - Memory efficiency
 * - Developer experience
 * - Performance
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export interface ComponentState extends Record<string, unknown> {}

export interface ComponentAPI<T extends ComponentState = ComponentState> {
  readonly state: T;
  emit(eventName: string, detail?: unknown): void;
  update(changes: Partial<T>): void;
  updateKey<K extends keyof T>(key: K, value: T[K]): void;
}

export interface ComponentConfig<T extends ComponentState = ComponentState> {
  readonly tag: string;
  readonly template: (state: T, api: ComponentAPI<T>) => string;
  readonly state: T;
  readonly style?: string | ((state: T) => string);
  readonly refs?: Record<string, RefHandler<T>>;
  readonly computed?: Record<string, ComputedHandler<T>>;
  readonly onMount?: LifecycleHandler<T>;
  readonly onUnmount?: LifecycleHandler<T>;
}

export type RefHandler<T extends ComponentState> = (
  element: Element,
  state: T,
  api: ComponentAPI<T>
) => void;

export type ComputedHandler<T extends ComponentState> = (state: T) => unknown;

export type LifecycleHandler<T extends ComponentState> = (
  state: T,
  api: ComponentAPI<T>
) => void;

// ============================================================================
// PERFORMANCE OPTIMIZATIONS
// ============================================================================

// Efficient string template cache
const templateCache = new Map<string, DocumentFragment>();

// RAF scheduler for batched updates
class RenderScheduler {
  private readonly queue = new Set<() => void>();
  private rafId: number | null = null;

  schedule(callback: () => void): void {
    this.queue.add(callback);
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => this.flush());
    }
  }

  private flush(): void {
    const callbacks = Array.from(this.queue);
    this.queue.clear();
    this.rafId = null;
    
    for (const callback of callbacks) {
      try {
        callback();
      } catch (error) {
        console.error('[Component] Render error:', error);
      }
    }
  }
}

const scheduler = new RenderScheduler();

// ============================================================================
// OPTIMIZED DOM MORPHING
// ============================================================================

class TemplateParser {
  private static readonly parser = new window.DOMParser();

  static parseTemplate(html: string): DocumentFragment {
    const cached = templateCache.get(html);
    if (cached) {
      return cached.cloneNode(true) as DocumentFragment;
    }

    const doc = this.parser.parseFromString(html, 'text/html');
    const fragment = document.createDocumentFragment();
    
    while (doc.body.firstChild) {
      fragment.appendChild(doc.body.firstChild);
    }

    templateCache.set(html, fragment.cloneNode(true) as DocumentFragment);
    return fragment;
  }
}

class DOMDiffer {
  static morph(oldElement: Element, newHTML: string): void {
    const newFragment = TemplateParser.parseTemplate(newHTML);
    const newElement = newFragment.firstElementChild;
    
    if (!newElement) {
      oldElement.innerHTML = '';
      return;
    }

    this.morphElement(oldElement, newElement);
  }

  private static morphElement(oldEl: Element, newEl: Element): void {
    // Fast path: if tag names differ, replace entirely
    if (oldEl.tagName !== newEl.tagName) {
      oldEl.replaceWith(newEl.cloneNode(true));
      return;
    }

    // Morph attributes efficiently
    this.morphAttributes(oldEl, newEl);

    // Morph children (includes text nodes)
    this.morphChildren(oldEl, newEl);
  }

  private static morphAttributes(oldEl: Element, newEl: Element): void {
    // Remove old attributes not in new element
    const oldAttrs = oldEl.getAttributeNames();
    const newAttrs = newEl.getAttributeNames();
    
    for (const attr of oldAttrs) {
      if (!newAttrs.includes(attr) && !attr.startsWith('data-refs-')) {
        // Special handling for form elements when removing form attributes
        if (this.isFormElement(oldEl) && this.isValueAttribute(attr)) {
          this.updateFormValue(oldEl as HTMLInputElement, attr, null);
        }
        oldEl.removeAttribute(attr);
      }
    }

    // Set new/changed attributes
    for (const attr of newAttrs) {
      const newValue = newEl.getAttribute(attr);
      if (oldEl.getAttribute(attr) !== newValue) {
        // Special handling for form elements
        if (this.isFormElement(oldEl) && this.isValueAttribute(attr)) {
          this.updateFormValue(oldEl as HTMLInputElement, attr, newValue);
        } else {
          oldEl.setAttribute(attr, newValue || '');
        }
      }
    }
  }

  private static morphChildren(oldEl: Element, newEl: Element): void {
    const oldChildren = Array.from(oldEl.childNodes);
    const newChildren = Array.from(newEl.childNodes);

    // Try key-based morphing first for elements with keys
    if (this.hasKeyedElements(oldChildren) || this.hasKeyedElements(newChildren)) {
      this.morphNodesByKey(oldEl, oldChildren, newChildren);
    } else {
      // Fall back to position-based morphing
      this.morphNodesByPosition(oldEl, oldChildren, newChildren);
    }
  }

  private static hasKeyedElements(nodes: Node[]): boolean {
    return nodes.some(node => 
      node.nodeType === Node.ELEMENT_NODE && 
      (node as Element).hasAttribute('key')
    );
  }

  private static morphNodesByKey(parent: Element, oldNodes: Node[], newNodes: Node[]): void {
    // Create maps for keyed elements
    const oldKeyedElements = new Map<string, Element>();
    const newKeyedElements = new Map<string, Element>();
    const oldNonKeyedNodes: Node[] = [];
    const newNonKeyedNodes: Node[] = [];

    // Categorize old nodes
    oldNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const key = element.getAttribute('key');
        if (key) {
          oldKeyedElements.set(key, element);
        } else {
          oldNonKeyedNodes.push(node);
        }
      } else {
        oldNonKeyedNodes.push(node);
      }
    });

    // Categorize new nodes
    newNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const key = element.getAttribute('key');
        if (key) {
          newKeyedElements.set(key, element);
        } else {
          newNonKeyedNodes.push(node);
        }
      } else {
        newNonKeyedNodes.push(node);
      }
    });

    // Remove old keyed elements that don't exist in new
    oldKeyedElements.forEach((element, key) => {
      if (!newKeyedElements.has(key)) {
        parent.removeChild(element);
      }
    });

    // Process nodes in order from new template
    let currentNode = parent.firstChild;
    
    newNodes.forEach(newNode => {
      if (newNode.nodeType === Node.ELEMENT_NODE) {
        const newElement = newNode as Element;
        const key = newElement.getAttribute('key');
        
        if (key) {
          // Handle keyed element
          const oldElement = oldKeyedElements.get(key);
          if (oldElement) {
            // Move existing element to correct position if needed
            if (currentNode !== oldElement) {
              parent.insertBefore(oldElement, currentNode);
            }
            // Morph the element
            this.morphElement(oldElement, newElement);
            currentNode = oldElement.nextSibling;
          } else {
            // Add new keyed element
            const cloned = newElement.cloneNode(true);
            parent.insertBefore(cloned, currentNode);
            currentNode = cloned.nextSibling;
          }
        } else {
          // Handle non-keyed element
          if (currentNode?.nodeType === Node.ELEMENT_NODE) {
            this.morphElement(currentNode as Element, newElement);
            currentNode = currentNode.nextSibling;
          } else {
            const cloned = newElement.cloneNode(true);
            parent.insertBefore(cloned, currentNode);
            currentNode = cloned.nextSibling;
          }
        }
      } else {
        // Handle text nodes and other node types
        if (currentNode?.nodeType === newNode.nodeType) {
          if (currentNode.nodeType === Node.TEXT_NODE && 
              currentNode.textContent !== newNode.textContent) {
            currentNode.textContent = newNode.textContent;
          }
          currentNode = currentNode.nextSibling;
        } else {
          const cloned = newNode.cloneNode(true);
          parent.insertBefore(cloned, currentNode);
          currentNode = cloned.nextSibling;
        }
      }
    });

    // Remove any remaining old nodes
    while (currentNode) {
      const next = currentNode.nextSibling;
      parent.removeChild(currentNode);
      currentNode = next;
    }
  }

  private static morphNodesByPosition(parent: Element, oldNodes: Node[], newNodes: Node[]): void {
    const maxLength = Math.max(oldNodes.length, newNodes.length);

    for (let i = 0; i < maxLength; i++) {
      const oldNode = oldNodes[i];
      const newNode = newNodes[i];

      if (!oldNode && newNode) {
        // Add new node
        parent.appendChild(newNode.cloneNode(true));
      } else if (oldNode && !newNode) {
        // Remove old node
        parent.removeChild(oldNode);
      } else if (oldNode && newNode) {
        // Morph existing node
        if (oldNode.nodeType !== newNode.nodeType) {
          // Different node types, replace
          parent.replaceChild(newNode.cloneNode(true), oldNode);
        } else if (oldNode.nodeType === Node.TEXT_NODE) {
          // Text node - update content
          if (oldNode.textContent !== newNode.textContent) {
            oldNode.textContent = newNode.textContent;
          }
        } else if (oldNode.nodeType === Node.ELEMENT_NODE) {
          // Element node - recurse
          this.morphElement(oldNode as Element, newNode as Element);
        }
      }
    }
  }

  private static isFormElement(el: Element): boolean {
    return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT';
  }

  private static isValueAttribute(attr: string): boolean {
    return attr === 'value' || attr === 'checked' || attr === 'selected';
  }

  private static updateFormValue(el: HTMLInputElement, attr: string, value: string | null): void {
    // Only update if element is not focused (preserve user input)
    if (el === document.activeElement) return;

    switch (attr) {
      case 'value':
        el.value = value || '';
        break;
      case 'checked':
        // For checkboxes, the presence of the attribute means checked=true
        // null/undefined means checked=false
        const newChecked = value !== null;
        el.checked = newChecked;
        break;
      case 'selected':
        (el as any).selected = value !== null;
        break;
    }
  }
}

// ============================================================================
// REACTIVE STATE SYSTEM
// ============================================================================

function createReactiveState<T extends ComponentState>(
  initialState: T,
  computedHandlers: Record<string, ComputedHandler<T>> = {}
): {
  state: T;
  onUpdate: (listener: (key: keyof T, value: T[keyof T]) => void) => () => void;
  update: (changes: Partial<T>) => void;
} {
  const listeners = new Set<(key: keyof T, value: T[keyof T]) => void>();
  const computedCache = new Map<string, unknown>();
  
  // We'll reference this later
  let proxyState: T;

  const getComputed = (key: string): unknown => {
    if (!computedCache.has(key)) {
      const value = computedHandlers[key](proxyState);
      computedCache.set(key, value);
    }
    return computedCache.get(key);
  };

  const invalidateComputed = (): void => {
    computedCache.clear();
  };

  const notifyListeners = (key: keyof T, value: T[keyof T]): void => {
    listeners.forEach(listener => {
      try {
        listener(key, value);
      } catch (error) {
        console.error('[ReactiveState] Listener error:', error);
      }
    });
  };

  // Create state with proper reference
  proxyState = new Proxy(structuredClone(initialState), {
    get: (target, key) => {
      if (typeof key === 'string' && key in computedHandlers) {
        return getComputed(key);
      }
      return target[key as keyof T];
    },
    
    set: (target, key, value) => {
      const oldValue = target[key as keyof T];
      if (oldValue === value) return true;

      target[key as keyof T] = value;
      invalidateComputed();
      notifyListeners(key as keyof T, value);
      return true;
    }
  });

  const onUpdate = (listener: (key: keyof T, value: T[keyof T]) => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const update = (changes: Partial<T>): void => {
    Object.assign(proxyState, changes);
    invalidateComputed();
    
    Object.entries(changes).forEach(([key, value]) => {
      notifyListeners(key as keyof T, value as T[keyof T]);
    });
  };

  return { state: proxyState, onUpdate, update };
}

// ============================================================================
// COMPONENT IMPLEMENTATION
// ============================================================================

class ComponentElement<T extends ComponentState> extends HTMLElement {
  private readonly config: ComponentConfig<T>;
  private readonly reactiveSystem: ReturnType<typeof createReactiveState<T>>;
  private readonly api: ComponentAPI<T>;
  private lastHTML = '';
  private unsubscribes: Array<() => void> = [];
  private refsAttached = false;

  constructor(config: ComponentConfig<T>) {
    super();
    this.config = config;
    
    // Create reactive state
    this.reactiveSystem = createReactiveState(
      config.state,
      config.computed || {}
    );

    // Create API
    const reactiveSystem = this.reactiveSystem;
    const element = this;
    this.api = {
      get state() { return reactiveSystem.state; },
      emit: (eventName: string, detail?: unknown) => {
        element.dispatchEvent(new CustomEvent(eventName, { detail, bubbles: true }));
      },
      update: (changes: Partial<T>) => {
        reactiveSystem.update(changes);
      },
      updateKey: <K extends keyof T>(key: K, value: T[K]) => {
        (reactiveSystem.state as any)[key] = value;
      }
    };

    // Attach shadow DOM
    this.attachShadow({ mode: 'open' });
    
    // Setup style
    if (config.style) {
      const style = document.createElement('style');
      this.shadowRoot!.appendChild(style);
      this.updateStyle();
    }
  }

  connectedCallback(): void {
    // Subscribe to state changes
    const unsubscribe = this.reactiveSystem.onUpdate(() => {
      scheduler.schedule(() => this.render());
    });
    this.unsubscribes.push(unsubscribe);

    // Initial render
    this.render();
    
    // Call lifecycle hook
    this.config.onMount?.(this.api.state, this.api);
  }

  disconnectedCallback(): void {
    // Cleanup subscriptions
    this.unsubscribes.forEach(fn => fn());
    this.unsubscribes = [];
    
    // Call lifecycle hook
    this.config.onUnmount?.(this.api.state, this.api);
  }

  private render(): void {
    try {
      const html = this.config.template(this.api.state, this.api);
      
      if (html === this.lastHTML) {
        return;
      }
      
      const isInitialRender = !this.shadowRoot!.firstElementChild;
      
      if (isInitialRender) {
        // Initial render
        const fragment = TemplateParser.parseTemplate(html);
        this.shadowRoot!.appendChild(fragment);
        this.refsAttached = false; // New DOM, need to attach refs
      } else {
        // Update render - DOM morphing replaces elements, so refs need reattachment
        const firstElement = this.shadowRoot!.firstElementChild;
        if (firstElement) {
          DOMDiffer.morph(firstElement, html);
          this.refsAttached = false; // DOM was morphed, need to reattach refs
        }
      }
      
      this.lastHTML = html;
      this.updateStyle();
      
      // Process refs if not already attached for this render
      if (!this.refsAttached) {
        this.processRefs();
        this.refsAttached = true;
      }
      
    } catch (error) {
      console.error(`[${this.config.tag}] Render error:`, error);
      this.renderError(error as Error);
    }
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

    Object.entries(this.config.refs).forEach(([refName, handler]) => {
      const element = this.shadowRoot!.querySelector(`[data-ref="${refName}"]`);
      if (element) {
        // Check if refs are already processed for this element
        if (element.hasAttribute('data-refs-processed')) {
          return;
        }

        element.setAttribute('data-refs-processed', 'true');
        handler(element, this.api.state, this.api);
      }
      // Silently skip missing refs as they may be conditionally rendered
    });
  }

  private renderError(error: Error): void {
    this.shadowRoot!.innerHTML = `
      <div style="color: red; border: 1px solid red; padding: 1rem; border-radius: 4px;">
        <h3>Component Error</h3>
        <p><strong>${this.config.tag}:</strong> ${error.message}</p>
      </div>
    `;
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

export function component<T extends ComponentState>(config: ComponentConfig<T>): void {
  // Validate config
  if (!config.tag || !config.template || !config.state) {
    throw new Error('Component requires tag, template, and state');
  }

  if (customElements.get(config.tag)) {
    console.warn(`Component "${config.tag}" already registered`);
    return;
  }

  // Create and register component class
  const ComponentClass = class extends ComponentElement<T> {
    constructor() {
      super(config);
    }
  };

  customElements.define(config.tag, ComponentClass);
}
