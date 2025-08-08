export { Store } from './store';
export { eventBus } from './event-bus';
export { html, css, classes, styles, ref, on } from './template-helpers';
export { compileTemplate, compile, renderCompiledTemplate, updateCompiledTemplate } from './template-compiler';
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

// ============================================================================
// CORE TYPES
// ============================================================================

import type { CompiledTemplate } from './template-compiler.js';
import { renderCompiledTemplate, updateCompiledTemplate } from './template-compiler.js';

export interface ComponentState extends Record<string, unknown> {}

export interface ComponentAPI<T extends ComponentState = ComponentState> {
  readonly state: T;
  emit(eventName: string, detail?: unknown): void;
  update(changes: Partial<T>): void;
  updateKey<K extends keyof T>(key: K, value: T[K]): void;
}

export interface ComponentConfig<T extends ComponentState = ComponentState> {
  readonly tag: string;
  readonly template: (state: T, api: ComponentAPI<T>) => string | CompiledTemplate<T>;
  /**
   * State object can include computed properties as getter functions that accept state as a parameter.
   * Example:
   * state: {
   *   count: 0,
   *   doubled(state) { return state.count * 2 }
   * }
   */
  readonly state: T;
  readonly style?: string | ((state: T) => string);
  readonly refs?: Record<string, RefHandler<T>>;
  readonly onMounted?: LifecycleHandler<T>;
  readonly onUnmounted?: LifecycleHandler<T>;
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
// SSR TYPES & INTERFACES
// ============================================================================

export interface SSRComponentConfig<T extends ComponentState = ComponentState> {
  readonly tag: string;
  readonly template: (state: T, api: ComponentAPI<T>) => string;
  /**
   * State object can include computed properties as getter functions that accept state as a parameter.
   */
  readonly state: T;
  readonly style?: string | ((state: T) => string);
  readonly attrs?: Record<string, string>;
}

export interface SSRRenderOptions {
  /** Include component styles in the output */
  includeStyles?: boolean;
  /** Pretty print the HTML output */
  prettyPrint?: boolean;
  /** Custom attribute sanitization function */
  sanitizeAttributes?: (attrs: Record<string, string>) => Record<string, string>;
}

export interface SSRContext {
  /** Track rendered components for hydration */
  components: Map<string, SSRComponentConfig>;
  /** Global styles collected during SSR */
  styles: Set<string>;
}

// Environment detection for treeshaking
const isServer = typeof window === 'undefined' || typeof document === 'undefined';

// ============================================================================
// SSR IMPLEMENTATION (Treeshakable)
// ============================================================================

/**
 * Create a minimal API for SSR that doesn't rely on DOM
 */
function createSSRAPI<T extends ComponentState>(state: T): ComponentAPI<T> {
  return {
    state,
    emit: () => {}, // No-op on server
    update: () => {}, // No-op on server
    updateKey: () => {}, // No-op on server
  };
}

/**
 * Render a component to HTML string on the server
 * This function is treeshakable - only included when imported
 */
export function renderToString<T extends ComponentState>(
  config: SSRComponentConfig<T>,
  options: SSRRenderOptions = {}
): string {
  if (!isServer) {
    console.warn('renderToString should only be used on the server');
  }

  try {
    // Use state directly (getters will be available)
    const state = config.state;

    // Create API and render template
    const api = createSSRAPI(state);
    const innerHTML = config.template(state, api);
    
    // Generate component styles if needed
    let styleContent = '';
    if (options.includeStyles && config.style) {
      const css = typeof config.style === 'function' 
        ? config.style(state) 
        : config.style;
      styleContent = `<style>${css}</style>`;
    }

    // Sanitize attributes
    const attrs = options.sanitizeAttributes 
      ? options.sanitizeAttributes(config.attrs || {})
      : config.attrs || {};

    // Build attribute string
    const attrString = Object.entries(attrs)
      .map(([key, value]) => `${escapeAttribute(key)}="${escapeAttribute(value)}"`)
      .join(' ');

    // Construct final HTML
    const openTag = attrString 
      ? `<${config.tag} ${attrString}>` 
      : `<${config.tag}>`;
    
    const html = `${openTag}${styleContent}${innerHTML}</${config.tag}>`;

    return options.prettyPrint ? formatHTML(html) : html;
    
  } catch (error) {
    console.error(`[SSR] Error rendering ${config.tag}:`, error);
    return `<${config.tag}><div style="color: red;">SSR Error: ${escapeHTML(String(error))}</div></${config.tag}>`;
  }
}

/**
 * Render multiple components to HTML with shared context
 */
export function renderComponentsToString(
  components: SSRComponentConfig<any>[],
  options: SSRRenderOptions = {}
): { html: string; styles: string; context: SSRContext } {
  const context: SSRContext = {
    components: new Map(),
    styles: new Set(),
  };

  const htmlParts: string[] = [];
  
  components.forEach(config => {
    // Track component for hydration
    context.components.set(config.tag, config);
    
    // Collect styles
    if (config.style) {
      const css = typeof config.style === 'function' 
        ? config.style(config.state) 
        : config.style;
      context.styles.add(css);
    }
    
    // Render component
    const html = renderToString(config, { ...options, includeStyles: false });
    htmlParts.push(html);
  });

  const styles = Array.from(context.styles).join('\n');
  const html = htmlParts.join('\n');

  return { html, styles, context };
}

/**
 * Generate hydration script for client-side takeover
 */
export function generateHydrationScript(context: SSRContext): string {
  const componentConfigs = Array.from(context.components.entries()).map(([tag, config]) => ({
    tag,
    state: config.state,
  }));

  return `
<script type="module">
  // Hydration data from SSR
  window.__SSR_CONTEXT__ = ${JSON.stringify({ components: componentConfigs })};
  
  // Auto-hydrate when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrate);
  } else {
    hydrate();
  }
  
  function hydrate() {
    const context = window.__SSR_CONTEXT__;
    if (!context?.components) return;
    
    context.components.forEach(({ tag, state }) => {
      const elements = document.querySelectorAll(tag);
      elements.forEach(el => {
        // Mark as hydrated to prevent re-initialization
        if (!el.hasAttribute('data-hydrated')) {
          el.setAttribute('data-hydrated', 'true');
          // Restore state if component supports it
          if (el._hydrateWithState) {
            el._hydrateWithState(state);
          }
        }
      });
    });
    
    // Clean up
    delete window.__SSR_CONTEXT__;
  }
</script>`.trim();
}

// ============================================================================
// SSR UTILITIES
// ============================================================================

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatHTML(html: string): string {
  // Simple HTML formatting for development
  return html
    .replace(/></g, '>\n<')
    .split('\n')
    .map(line => {
      const depth = (line.match(/^<[^\/]/g) || []).length - (line.match(/<\//g) || []).length;
      return '  '.repeat(Math.max(0, depth)) + line.trim();
    })
    .join('\n');
}

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
          this.updateFormValue(oldEl as HTMLInputElement | HTMLTextAreaElement, attr, null);
        }
        oldEl.removeAttribute(attr);
      }
    }

    // Set new/changed attributes
    for (const attr of newAttrs) {
      const newValue = newEl.getAttribute(attr);
      const oldValue = oldEl.getAttribute(attr);
      
      // For value attributes, we need to handle empty string vs null properly
      if (this.isFormElement(oldEl) && this.isValueAttribute(attr)) {
        // Always call updateFormValue for form elements, even if values seem the same
        // because DOM element value might differ from attribute value
        this.updateFormValue(oldEl as HTMLInputElement | HTMLTextAreaElement, attr, newValue);
      } else if (oldValue !== newValue) {
        oldEl.setAttribute(attr, newValue || '');
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

  private static updateFormValue(el: HTMLInputElement | HTMLTextAreaElement, attr: string, value: string | null): void {
    switch (attr) {
      case 'value':
        const newValue = value || '';
        const currentValue = el.value;
        
        // Only update if the values are actually different
        if (currentValue !== newValue) {
          const isFocused = el === document.activeElement;
          
          if (!isFocused) {
            // Element not focused - always safe to update
            el.value = newValue;
          } else {
            // Element is focused - only update for significant programmatic changes
            const lengthDiff = Math.abs(currentValue.length - newValue.length);
            const isClearing = newValue.length === 0;
            const isLargeChange = lengthDiff > 20;
            const isCompletelyDifferent = newValue.length > 50 && !currentValue.toLowerCase().includes(newValue.toLowerCase().substring(0, 30));
            
            if (isClearing || isLargeChange || isCompletelyDifferent) {
              el.value = newValue;
              // Preserve cursor position for large changes
              if (!isClearing && el === document.activeElement) {
                const cursorPos = Math.min(newValue.length, (el as any).selectionStart || newValue.length);
                setTimeout(() => {
                  if (el === document.activeElement) {
                    (el as any).setSelectionRange(cursorPos, cursorPos);
                  }
                }, 0);
              }
            }
          }
        }
        break;
        
      case 'checked':
        const newChecked = value !== null;
        (el as HTMLInputElement).checked = newChecked;
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
  initialState: T
): {
  state: T;
  onUpdate: (listener: (key: keyof T, value: T[keyof T]) => void) => () => void;
  update: (changes: Partial<T>) => void;
} {
  const listeners = new Set<(key: keyof T, value: T[keyof T]) => void>();

  // We'll reference this later
  let proxyState: T;

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
  proxyState = new Proxy(safeClone(initialState), {
    get: (target, key) => {
      return target[key as keyof T];
    },
    
    set: (target, key, value) => {
      const oldValue = target[key as keyof T];
      if (oldValue === value) return true;

      target[key as keyof T] = value;
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
  private lastCompiledTemplate: CompiledTemplate<T> | null = null;
  private lastState: T | null = null;
  private unsubscribes: Array<() => void> = [];
  private refsAttached = false;
  private isHydrating = false;

  constructor(config: ComponentConfig<T>) {
    super();
    this.config = config;
    
    // Create reactive state
    this.reactiveSystem = createReactiveState(
      config.state
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

    // Add hydration support
    (this as any)._hydrateWithState = (ssrState: T) => {
      this.isHydrating = true;
      this.reactiveSystem.update(ssrState);
      this.isHydrating = false;
    };
  }

  connectedCallback(): void {
    // Subscribe to state changes
    const unsubscribe = this.reactiveSystem.onUpdate(() => {
      if (!this.isHydrating) {
        scheduler.schedule(() => this.render());
      }
    });
    this.unsubscribes.push(unsubscribe);

    // Check if this is SSR hydration
    const isSSRHydration = this.hasAttribute('data-hydrated') || this.shadowRoot!.hasChildNodes();
    
    if (!isSSRHydration) {
      // Initial render for client-side components
      this.render();
    } else {
      // SSR hydration - preserve existing DOM, just attach refs and events
      this.lastHTML = this.shadowRoot!.innerHTML;
      this.processRefs();
    }
    
    // Call lifecycle hook
    this.config.onMounted?.(this.api.state, this.api);
  }

  disconnectedCallback(): void {
    // Cleanup subscriptions
    this.unsubscribes.forEach(fn => fn());
    this.unsubscribes = [];
    
    // Call lifecycle hook
    this.config.onUnmounted?.(this.api.state, this.api);
  }

  private render(): void {
    try {
      const templateResult = this.config.template(this.api.state, this.api);
      
      // Handle both string and compiled templates
      if (typeof templateResult === 'string') {
        // Traditional string template
        if (templateResult === this.lastHTML) {
          return;
        }
        
        const isInitialRender = !this.shadowRoot!.firstElementChild;
        
        if (isInitialRender) {
          // Initial render
          const fragment = TemplateParser.parseTemplate(templateResult);
          this.shadowRoot!.appendChild(fragment);
          this.refsAttached = false; // New DOM, need to attach refs
        } else {
          // Update render - DOM morphing replaces elements, so refs need reattachment
          const firstElement = this.shadowRoot!.firstElementChild;
          if (firstElement) {
            DOMDiffer.morph(firstElement, templateResult);
            this.refsAttached = false; // DOM was morphed, need to reattach refs
          }
        }
        
        this.lastHTML = templateResult;
        this.lastCompiledTemplate = null; // Clear compiled template cache
      } else {
        // Compiled template
        const isInitialRender = !this.shadowRoot!.firstElementChild;
        const isSameTemplate = this.lastCompiledTemplate?.id === templateResult.id;
        
        if (isInitialRender) {
          // Initial render with compiled template
          const fragment = renderCompiledTemplate(templateResult, this.api.state, this.api);
          this.shadowRoot!.appendChild(fragment);
          this.refsAttached = false;
        } else if (isSameTemplate && this.shadowRoot!.firstElementChild) {
          // Efficient update using compiled template - this is the key performance benefit!
          const oldState = this.lastState; // Capture old state before update
          updateCompiledTemplate(
            templateResult,
            this.shadowRoot!.firstElementChild,
            this.api.state,
            this.api,
            oldState || undefined
          );
          // For compiled templates with stable structure, refs should already be attached
          // Only force reattachment if refs haven't been attached yet
        } else {
          // Template changed, full re-render
          const fragment = renderCompiledTemplate(templateResult, this.api.state, this.api);
          this.shadowRoot!.innerHTML = '';
          this.shadowRoot!.appendChild(fragment);
          this.refsAttached = false;
        }
        
        this.lastCompiledTemplate = templateResult;
        
        this.lastHTML = ''; // Clear string template cache
      }
      
      // Store current state for next update comparison
      this.lastState = safeClone(this.api.state);
      
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
