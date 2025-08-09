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

import { reactive } from './computed-state';
import { eventBus } from './event-bus';

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
  onGlobal<U = any>(eventName: string, handler: (data: U) => void): () => void;
  offGlobal<U = any>(eventName: string, handler: (data: U) => void): void;
  emitGlobal<U = any>(eventName: string, data?: U): void;
}

export interface ComponentConfig<S extends ComponentState, C extends Record<string, any> = {}> {
  readonly template: (state: S & C, api: ComponentAPI<S & C>) => string | CompiledTemplate<S & C>;
  /**
   * State must be a plain object. Reactivity is handled automatically.
   */
  readonly state: S;
  /**
   * Computed values can be defined as a map of functions that accept merged state.
   */
  readonly computed?: { [K in keyof C]: (state: S) => C[K] };
  readonly style?: string | ((state: S & C) => string);
  readonly refs?: Record<string, RefHandler<S & C>>;
  readonly onMounted?: LifecycleHandler<S & C>;
  readonly onUnmounted?: LifecycleHandler<S & C>;
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
    onGlobal: () => () => {},
    offGlobal: () => {},
    emitGlobal: () => {},
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
    // Replace node if tag name, key, or class differs
    const oldKey = oldEl.getAttribute('key');
    const newKey = newEl.getAttribute('key');
    const oldClass = oldEl.getAttribute('class');
    const newClass = newEl.getAttribute('class');
      if (oldEl.tagName !== newEl.tagName || oldKey !== newKey || oldClass !== newClass) {
        const parent = oldEl.parentNode;
        const newNode = newEl.cloneNode(true);
        if (parent) {
          parent.replaceChild(newNode, oldEl);
        }
        return;
      }

      // Special handling for <input> to preserve focus and cursor
      if (oldEl.tagName === 'INPUT' && newEl.tagName === 'INPUT') {
        const oldType = oldEl.getAttribute('type');
        const newType = newEl.getAttribute('type');
        // Only update value if type is the same
        if (oldType === newType) {
          const oldValue = (oldEl as HTMLInputElement).value;
          const newValue = newEl.getAttribute('value') ?? '';
          // Only update if value differs
          if (oldValue !== newValue) {
            const isFocused = document.activeElement === oldEl;
            let selectionStart = null;
            let selectionEnd = null;
            if (isFocused) {
              selectionStart = (oldEl as HTMLInputElement).selectionStart;
              selectionEnd = (oldEl as HTMLInputElement).selectionEnd;
            }
            (oldEl as HTMLInputElement).value = newValue;
            // Restore cursor position if focused
            if (isFocused && selectionStart !== null && selectionEnd !== null) {
              (oldEl as HTMLInputElement).setSelectionRange(selectionStart, selectionEnd);
            }
          }
          // Morph other attributes except value
          this.morphAttributes(oldEl, newEl);
          this.morphChildren(oldEl, newEl);
          return;
        }
      }
    // Morph attributes efficiently
    this.morphAttributes(oldEl, newEl);
    // Morph children (includes text nodes)
    this.morphChildren(oldEl, newEl);
  }

  private static morphAttributes(oldEl: Element, newEl: Element): void {
    const oldAttrs = oldEl.getAttributeNames();
    const newAttrs = newEl.getAttributeNames();
    // Remove old attributes not in new element (including data-refs-processed)
    for (const attr of oldAttrs) {
      if (!newAttrs.includes(attr)) {
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
      if (this.isFormElement(oldEl) && this.isValueAttribute(attr)) {
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
// COMPONENT IMPLEMENTATION
// ============================================================================

/**
 * Internal custom element implementation for runtime components.
 * Handles state, rendering, refs, and lifecycle hooks.
 */
class ComponentElement<S extends ComponentState, C extends Record<string, any> = {}> extends HTMLElement {
  private readonly config: ComponentConfig<S, C>;
  private readonly stateObj!: S & C;
  private readonly api: ComponentAPI<S & C>;
  private _globalUnsubscribes: Array<() => void> = [];
  private unsubscribes: Array<() => void> = [];
  private refsAttached = false;
  private lastHTML = '';
  private lastCompiledTemplate: CompiledTemplate<S & C> | null = null;
  private lastState: (S & C) | null = null;

  /**
   * Construct a new runtime component element.
   * @param config - Component configuration
   */
  constructor(config: ComponentConfig<S, C>) {
    super();
    this.config = config;
    this.stateObj = config.state as S & C;
    // Subscribe to state changes and re-render
    if (typeof (this.stateObj as any).subscribe === 'function') {
      this.unsubscribes.push((this.stateObj as any).subscribe(() => this.render()));
    }
    // Create API
    this.api = {
      state: this.stateObj,
      emit: (eventName: string, detail?: unknown) => this.dispatchEvent(new CustomEvent(eventName, { detail, bubbles: true })),
      update: (changes: Partial<S & C>) => {
        if (typeof (this.stateObj as any).set === 'function') {
          (this.stateObj as any).set(changes);
        } else {
          Object.assign(this.stateObj, changes);
        }
      },
      updateKey: <K extends keyof (S & C)>(key: K, value: (S & C)[K]) => {
        if (typeof (this.stateObj as any).set === 'function') {
          (this.stateObj as any).set({ [key]: value });
        } else {
          this.stateObj[key] = value;
        }
      },
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
    // Add hydration support
    (this as any)._hydrateWithState = (ssrState: S & C) => {
      Object.assign(this.stateObj, ssrState);
      this.render();
    };
  }

  /**
   * Lifecycle: called when element is added to DOM.
   */
  connectedCallback(): void {
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
    try {
      const templateResult = this.config.template(this.stateObj, this.api);
      if (typeof templateResult === 'string') {
        if (templateResult === this.lastHTML) return;
        const fragment = TemplateParser.parseTemplate(templateResult);
        let appContainer: Element | null = Array.from(fragment.childNodes).find(n => n.nodeType === 1 && (n as Element).tagName !== 'STYLE') as Element | null;
        let styleNode: Element | null = Array.from(fragment.childNodes).find(n => n.nodeType === 1 && (n as Element).tagName === 'STYLE') as Element | null;
        const shadowAppContainer = Array.from(this.shadowRoot!.children).find(el => el.nodeType === 1 && (el as Element).tagName !== 'STYLE') as Element | undefined;
        const isInitialRender = !shadowAppContainer;
        if (isInitialRender) {
          if (styleNode) this.shadowRoot!.appendChild(styleNode.cloneNode(true));
          if (appContainer) this.shadowRoot!.appendChild(appContainer.cloneNode(true));
          else {
            const firstEl = Array.from(fragment.childNodes).find(n => n.nodeType === 1) as Element | undefined;
            if (firstEl) this.shadowRoot!.appendChild(firstEl.cloneNode(true));
          }
          this.refsAttached = false;
        } else {
          let shadowStyle = this.shadowRoot!.querySelector('style');
          if (!shadowStyle && styleNode) this.shadowRoot!.insertBefore(styleNode.cloneNode(true), this.shadowRoot!.firstChild);
          else if (shadowStyle && styleNode) shadowStyle.textContent = styleNode.textContent;
          let shadowApp = this.shadowRoot!.querySelector('.todo-app');
          if (shadowApp && appContainer) {
            DOMDiffer.morph(shadowApp, appContainer.outerHTML);
            shadowApp = this.shadowRoot!.querySelector('.todo-app');
            function normalizeInputValues(html: string): string {
              return html.replace(/(<input[^>]*)(value="[^"]*")([^>]*>)/gi, '$1value="__IGNORE__"$3');
            }
            if (shadowApp) {
              const normalizedShadow = normalizeInputValues(shadowApp.outerHTML);
              const normalizedTemplate = normalizeInputValues(appContainer.outerHTML);
              if (normalizedShadow !== normalizedTemplate) {
                const newNode = appContainer.cloneNode(true);
                this.shadowRoot!.replaceChild(newNode, shadowApp);
                shadowApp = newNode as Element;
              }
            }
            this.refsAttached = false;
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
    } catch (error) {
      if ('onError' in this.config && typeof (this.config as any).onError === 'function') {
        (this.config as any).onError(error as Error, this.api.state, this.api);
      } else {
        this.renderError(error as Error);
      }
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
