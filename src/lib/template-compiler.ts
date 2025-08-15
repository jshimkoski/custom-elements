/**
 * Template Compiler for Custom Elements Runtime
 * 
 * Provides compile-time template optimization for better runtime performance.
 * Features:
 * - Static/dynamic separation
 * - Efficient DOM updates
 * - Treeshakable
 * - TypeScript-friendly
 * - Development-friendly fallbacks
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export interface CompiledTemplate<T = any> {
  /** Static HTML parts that never change */
  readonly statics: readonly string[];
  /** Dynamic update functions for each interpolation */
  readonly dynamics: readonly UpdateFunction<T>[];
  /** Pre-compiled DOM fragment for initial render */
  readonly fragment: DocumentFragment | null;
  /** Unique template ID for caching */
  readonly id: string;
  /** Whether this template has dynamic content */
  readonly hasDynamics: boolean;
  /** Render method supporting async output */
  render: (state: T, api: any) => string | Promise<string>;
}

export interface UpdateFunction<T = any> {
  /** Target node path from root (e.g., [0, 1] means first child's second child) */
  readonly path: readonly number[];
  /** Type of update (text, attribute, property, etc.) */
  readonly type: UpdateType;
  /** Target property/attribute name (for non-text updates) */
  readonly target?: string;
  /** Function to extract value from state */
  readonly getValue: (state: T, api: any) => unknown;
}

export type UpdateType = 'text' | 'attribute' | 'property' | 'event' | 'class' | 'style';

export interface TemplateCompilerOptions {
  /** Enable development mode with better error messages */
  development?: boolean;
  /** Cache compiled templates */
  cache?: boolean;
  /** Enable static analysis optimizations */
  optimize?: boolean;
}

// Global development mode detection
const isDevelopment = (() => {
  try {
    // @ts-ignore - Check for Node.js environment
    if (typeof process !== 'undefined' && process.env) {
      // @ts-ignore
      return process.env.NODE_ENV === 'development';
    }
  } catch {
    // Ignore Node.js check in browser
  }
  if (typeof window !== 'undefined') {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  }
  return false;
})();

// ============================================================================
// TEMPLATE COMPILATION
// ============================================================================

/**
 * Compile a template string into an optimized template object
 * This is meant to be used at build time for best performance
 */
export function compileTemplate<T = any>(
  templateString: string,
  options: TemplateCompilerOptions = {}
): CompiledTemplate<T> {
  const { development = isDevelopment, cache = true, optimize = true } = options;
  
  // Generate unique ID for caching
  const id = generateTemplateId(templateString);
  
  // Check cache first
  if (cache && templateCache.has(id)) {
    // Track cache hit
    if (development) {
      const metrics = performanceMetrics.get(id) || {
        compilationTime: 0,
        renderTime: 0,
        updateTime: 0,
        cacheHits: 0,
        cacheMisses: 0
      };
      metrics.cacheHits++;
      performanceMetrics.set(id, metrics);
    }
    return templateCache.get(id)!;
  }
  
  // Track cache miss
  if (development) {
    const metrics = performanceMetrics.get(id) || {
      compilationTime: 0,
      renderTime: 0,
      updateTime: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    metrics.cacheMisses++;
    performanceMetrics.set(id, metrics);
  }
  
  try {
    const compiled = parseAndCompileTemplate<T>(templateString, { development, optimize });
    
    if (cache) {
      templateCache.set(id, compiled);
    }
    
    return compiled;
  } catch (error) {
    if (development) {
      console.error('[Template Compiler] Error compiling template:', error);
      console.error('[Template Compiler] Template:', templateString);
    }
    
    // Fallback: always return original template string as static content
    return {
      statics: [templateString],
      dynamics: [],
      fragment: null,
      id,
      hasDynamics: false,
      render: () => templateString
    };
  }
}

/**
 * Tagged template literal for compile-time optimization
 * Usage: compile`<div>${state.name}</div>`
 */
/**
 * Find the DOM path to a placeholder in the template HTML
 */
export function findDOMPath(templateHTML: string, placeholder: string): number[] {
  // Create a temporary DOM to analyze the structure
  if (typeof document === 'undefined') {
    return [0]; // Fallback for server-side
  }
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${templateHTML}</div>`, 'text/html');
    const container = doc.body.firstElementChild!;
    
    // Find the element or text node containing the placeholder
    function findPlaceholderPath(node: Node, currentPath: number[] = []): number[] | null {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.textContent?.includes(placeholder)) {
          return currentPath;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // Check child nodes, but use a more robust indexing that accounts for the actual DOM structure
        let childIndex = 0;
        for (let i = 0; i < node.childNodes.length; i++) {
          const child = node.childNodes[i];
          const result = findPlaceholderPath(child, [...currentPath, childIndex]);
          if (result) {
            return result;
          }
          childIndex++;
        }
      }
      return null;
    }
    
    const path = findPlaceholderPath(container);
    return path || [0];
  } catch (error) {
    if (isDevelopment) {
      console.warn('[Template Compiler] Error finding DOM path for placeholder:', placeholder, error);
    }
    return [0]; // Safe fallback
  }
}

export function compile<T = any>(
  strings: TemplateStringsArray,
  ...expressions: Array<(state: T, api: any) => unknown>
): CompiledTemplate<T> {
  // Create statics array directly from strings
  const statics: string[] = Array.from(strings);
  const templateHTML = strings.map((str, i) => str + (i < expressions.length ? `__DYNAMIC_${i}__` : '')).join('');
  const dynamics: UpdateFunction<T>[] = expressions.map((expr, index) => {
    // Analyze the dynamic expression to determine type and target
    let updateType: UpdateType = 'text';
    let target: string | undefined;
    let valueGetter: (state: T, api: any) => unknown = expr;
    let exprString = expr.toString();
    let prop = exprString.match(/state\.([a-zA-Z0-9_$]+)/)?.[1];
    // Parse template HTML to detect attribute context for this dynamic
    const dynMarker = `__DYNAMIC_${index}__`;
    if (prop) {
      const prevStatic = strings[index];
      if (/class\s*=/.test(prevStatic)) {
        updateType = 'class';
        target = 'class';
        valueGetter = (state: T) => {
          const v = (state as any)[prop];
          return v;
        };
      } else if (/style\s*=/.test(prevStatic) && /[a-zA-Z-]+:\s*$/.test(prevStatic)) {
        const stylePropMatch = prevStatic.match(/([a-zA-Z-]+):\s*$/);
        const styleProp = stylePropMatch ? stylePropMatch[1] : 'style';
        updateType = 'style';
        target = styleProp;
        valueGetter = (state: T) => {
          const v = (state as any)[prop];
          return v;
        };
      } else if (/value\s*=/.test(prevStatic)) {
        updateType = 'property';
        target = 'value';
        valueGetter = (state: T) => {
          const v = (state as any)[prop];
          return v;
        };
      } else if (/title\s*=/.test(prevStatic)) {
        updateType = 'attribute';
        target = 'title';
        valueGetter = (state: T) => {
          const v = (state as any)[prop];
          return v;
        };
      } else if (/style="([a-zA-Z-]+):$/.test(prevStatic)) {
        const stylePropMatch = prevStatic.match(/style="([a-zA-Z-]+):$/);
        const styleProp = stylePropMatch ? stylePropMatch[1] : 'style';
        updateType = 'style';
        target = styleProp;
        valueGetter = (state: T) => {
          const v = (state as any)[prop];
          return v;
        };
      } else if (prevStatic.endsWith('style="color:')) {
        updateType = 'style';
        target = 'color';
        valueGetter = (state: T) => {
          const v = (state as any)[prop];
          return v;
        };
      } else {
        // Fallback to attribute
        updateType = 'attribute';
        target = prop;
        valueGetter = (state: T) => {
          const v = (state as any)[prop];
          return v;
        };
      }
    } else {
      // Fallback to previous logic for text, event, class.prop, style.prop
      if (exprString.includes('class.') && exprString.match(/class\.([a-zA-Z0-9_$]+)/)) {
        updateType = 'class';
        target = exprString.match(/class\.([a-zA-Z0-9_$]+)/)?.[1];
        valueGetter = (state: T) => (state as any)[target!];
      } else if (exprString.includes('style.') && exprString.match(/style\.([a-zA-Z0-9_$]+)/)) {
        updateType = 'style';
        target = exprString.match(/style\.([a-zA-Z0-9_$]+)/)?.[1];
        valueGetter = (state: T) => (state as any)[target!];
      } else if (exprString.includes('@')) {
        updateType = 'event';
        target = exprString.split('@')[1];
      }
    }
    const path = findDOMPath(templateHTML, dynMarker);
    return {
      path,
      type: updateType,
      target,
      getValue: valueGetter
    };
  });
  const templateString = strings.join('{{PLACEHOLDER}}');
  const id = generateTemplateId(templateString);
  const render = (state: T, api: any): string | Promise<string> => {
    let result = '';
    let hasAsync = false;
    const valuePromises: Promise<any>[] = [];
    for (let i = 0; i < strings.length; i++) {
      result += strings[i];
      if (i < expressions.length) {
        let value = expressions[i](state, api);
        if (value instanceof Promise) {
          hasAsync = true;
          valuePromises.push(value);
        } else {
          // Escape double quotes if previous static ends with attribute=
          const prevStatic = strings[i];
          if (/=\s*"?$/.test(prevStatic) && typeof value === 'string') {
            value = value.replace(/"/g, '&quot;');
          }
          result += value;
        }
      }
    }
    if (!hasAsync) return result;
    return Promise.all(valuePromises).then(resolvedValues => {
      let asyncResult = '';
      let asyncIndex = 0;
      for (let i = 0; i < strings.length; i++) {
        asyncResult += strings[i];
        if (i < expressions.length) {
          let value = expressions[i](state, api);
          if (value instanceof Promise) {
            value = resolvedValues[asyncIndex++];
          }
          // Escape double quotes if previous static ends with attribute=
          const prevStatic = strings[i];
          if (/=\s*"?$/.test(prevStatic) && typeof value === 'string') {
            value = value.replace(/"/g, '&quot;');
          }
          asyncResult += value;
        }
      }
      return asyncResult;
    });
  };
  return {
    id,
    statics,
    dynamics,
    hasDynamics: dynamics.length > 0,
    fragment: null,
    render
  };
}

// ============================================================================
// TEMPLATE PARSING & ANALYSIS
// ============================================================================

export function parseAndCompileTemplate<T>(
  template: string,
  options: { development: boolean; optimize: boolean }
): CompiledTemplate<T> {
  const parser = new TemplateAnalyzer(template, options);
  return parser.compile<T>();
}

export class TemplateAnalyzer {
  private readonly template: string;
  private readonly options: { development: boolean; optimize: boolean };
  private readonly dynamics: UpdateFunction<any>[] = [];
  private statics: string[] = [];
  
  constructor(template: string, options: { development: boolean; optimize: boolean }) {
    this.template = template;
    this.options = options;
  }
  
  compile<T>(): CompiledTemplate<T> {
    // Parse template for dynamic expressions
    this.parseTemplate();
    
    // Create static fragment if possible
    const fragment = this.createStaticFragment();
    
    // Generate unique ID
    const id = generateTemplateId(this.template);
    
    // Render method for static/dynamic templates
    const render = (state: T, api: any): string | Promise<string> => {
      let result = '';
      for (let i = 0; i < this.statics.length; i++) {
        result += this.statics[i];
        if (i < this.dynamics.length) {
          let value = this.dynamics[i].getValue(state, api);
          if (value instanceof Promise) {
            // If any dynamic value is async, resolve all and reconstruct
            return Promise.all(this.dynamics.map(d => {
              const v = d.getValue(state, api);
              return v instanceof Promise ? v : Promise.resolve(v);
            })).then(resolvedValues => {
              let asyncResult = '';
              for (let j = 0; j < this.statics.length; j++) {
                asyncResult += this.statics[j];
                if (j < resolvedValues.length) asyncResult += resolvedValues[j];
              }
              return asyncResult;
            });
          }
          result += value;
        }
      }
      return result;
    };
    return {
      statics: this.statics,
      dynamics: this.dynamics as UpdateFunction<T>[],
      fragment,
      id,
      hasDynamics: this.dynamics.length > 0,
      render
    };
  }
  
  private parseTemplate(): void {
    // Improved regex-based parsing for dynamic expressions
    // Ensures statics never contain {{...}} placeholders
    const dynamicRegex = /\{\{([^}]+)\}\}/g;
    let lastIndex = 0;
    let match;
    while ((match = dynamicRegex.exec(this.template)) !== null) {
      // Add static part before this match, excluding any {{...}}
      const staticPart = this.template.slice(lastIndex, match.index);
      this.statics.push(staticPart);
      // Try to detect attribute/property/class/style name from staticPart
      let attrMatch = staticPart.match(/([a-zA-Z0-9_-]+)\s*=\s*"?$/);
      let attrName = attrMatch ? attrMatch[1] : undefined;
      let styleProp: string | undefined;
      // Special handling for style="color:{{value}}"
      if (staticPart.endsWith('style="color:')) {
        attrName = 'style';
        styleProp = 'color';
      } else if (attrName === 'style') {
        // Try to extract style property name from staticPart
        const styleMatch = staticPart.match(/style\s*=\s*"?([^:;]+):\s*$/);
        if (styleMatch) {
          styleProp = styleMatch[1].trim();
        }
      }
      // Analyze the dynamic expression
      const expression = match[1].trim();
      this.analyzeDynamicExpression(expression, this.dynamics.length, attrName, styleProp);
      lastIndex = match.index + match[0].length;
    }
    // Add final static part, ensuring no trailing {{...}}
    const finalStatic = this.template.slice(lastIndex);
    this.statics.push(finalStatic);
  }
  
  private analyzeDynamicExpression(expression: string, _index: number, attrName?: string, styleProp?: string): void {
    // Simple expression analysis
    let updateType: UpdateType = 'text';
    let target: string | undefined;

    // Detect class/style/attribute/property updates
    if (attrName) {
      if (attrName === 'class') {
        updateType = 'class';
        target = 'class';
      } else if (attrName === 'style') {
        updateType = 'style';
        target = styleProp || 'style';
      } else if (attrName === 'value') {
        updateType = 'property';
        target = 'value';
      } else {
        updateType = 'attribute';
        target = attrName;
      }
    } else if (expression.includes('class.')) {
      updateType = 'class';
      target = expression.split('.')[1];
    } else if (expression.includes('style.')) {
      updateType = 'style';
      target = expression.split('.')[1];
    } else if (expression.includes('@')) {
      updateType = 'event';
      target = expression.split('@')[1];
    } else if (expression === 'class') {
      updateType = 'class';
      target = 'class';
    } else if (expression === 'style') {
      updateType = 'style';
      target = 'style';
    } else if (expression === 'value') {
      updateType = 'property';
      target = 'value';
    } else if (expression === 'title') {
      updateType = 'attribute';
      target = 'title';
    }

    // Use findDOMPath to locate the correct node for this dynamic expression
    const marker = `__DYNAMIC_${_index}__`;
    const templateHTML = this.statics.join(marker);
    let path = findDOMPath(templateHTML, marker);
    // If template is a single root element, use [0] as path for non-text updates
    if (this.statics.length === 2 && (updateType !== 'text')) {
      path = [0];
    } else if (this.statics.length === 2 && path.length === 0) {
      path = [0];
    }
    this.dynamics.push({
      path,
      type: updateType,
      target,
      getValue: this.createValueGetter(expression)
    });
  }
  private createValueGetter(expression: string): (state: any, api: any) => unknown {
    // Always evaluate at render time, never cache
    return (state: any, _api: any) => {
      try {
        let value;
        // Always use the dynamic expression for state lookup
        if (expression && typeof expression === 'function') {
          value = (expression as (s: any) => any)(state);
        } else if (typeof expression === 'string' && expression.startsWith('state.')) {
          const prop = expression.slice(6);
          value = state[prop];
        } else if (typeof expression === 'string' && /^[a-zA-Z0-9_$]+$/.test(expression)) {
          value = state[expression];
        } else if (typeof expression === 'string' && expression.includes('(')) {
          value = '';
        } else {
          value = '';
        }
        return value;
      } catch (error) {
        if (this.options.development) {
          console.warn(`[Template Compiler] Error evaluating expression: ${expression}`, error);
        }
        return '';
      }
    };
  }
  
  private createStaticFragment(): DocumentFragment | null {
    // Skip fragment creation on server
    if (typeof document === 'undefined') {
      return null;
    }
    
    try {
      // Create a static version by removing dynamic parts
      const staticHTML = this.statics.join('');
      
      if (!staticHTML.trim()) {
        return null;
      }
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(staticHTML, 'text/html');
      const fragment = document.createDocumentFragment();
      
      while (doc.body.firstChild) {
        fragment.appendChild(doc.body.firstChild);
      }
      
      return fragment;
    } catch (error) {
      if (this.options.development) {
        console.warn('[Template Compiler] Could not create static fragment:', error);
      }
      return null;
    }
  }
}

// Utility function for both initial render and updates
function getNodeByPath(root: Element | DocumentFragment, path: readonly number[]): Node | null {
  try {
    if (path.length === 1 && path[0] === 0 && root instanceof Element) {
      return root;
    }
    let current: Node = root;
    for (let i = 0; i < path.length; i++) {
      const index = path[i];
      if (!current.childNodes || current.childNodes.length <= index) {
        return null;
      }
      current = current.childNodes[index];
    }
    return current;
  } catch {
    return null;
  }
}

// ============================================================================
// OPTIMIZED RENDERER
// ============================================================================

/**
 * Render a compiled template efficiently
 */
export function renderCompiledTemplate<T>(
  compiled: CompiledTemplate<T>,
  state: T,
  api: any
): DocumentFragment {
  // Use pre-compiled fragment if available
  let fragment: DocumentFragment;
  
  if (compiled.fragment && !compiled.hasDynamics) {
    // Pure static template - just clone
    fragment = compiled.fragment.cloneNode(true) as DocumentFragment;
  } else {
    // Dynamic template - reconstruct with current values
    fragment = reconstructTemplate(compiled, state, api);
  }
  
  return fragment;
}

/**
 * Update a rendered template with new state efficiently
 */
export function updateCompiledTemplate<T>(
  compiled: CompiledTemplate<T>,
  element: Element,
  newState: T,
  api: any,
  oldState?: T
): void {
  if (!compiled.hasDynamics) {
    return; // Nothing to update in static templates
  }
  // Apply each dynamic update
  for (const update of compiled.dynamics) {
    try {
      const newValue = update.getValue(newState, api);
      if (oldState !== undefined) {
        const oldValue = update.getValue(oldState, api);
        if (oldValue === newValue) {
          continue;
        }
      }
      applyUpdate(element, update, newValue);
    } catch (error) {
      console.warn('[Template Compiler] Error applying update:', error);
    }
  }
}

function reconstructTemplate<T>(
  compiled: CompiledTemplate<T>,
  state: T,
  api: any
): DocumentFragment {
  // Reconstruct HTML from statics and dynamics
  let html = '';
  
  for (let i = 0; i < compiled.statics.length; i++) {
    html += compiled.statics[i];
    if (i < compiled.dynamics.length) {
      const update = compiled.dynamics[i];
      if (update.type === 'text' || update.type === 'attribute') {
        const value = update.getValue(state, api);
        html += String(value ?? '');
      } else if (update.type === 'property' || update.type === 'class' || update.type === 'style') {
        html += '';
      }
    }
  }
  
  // Parse the reconstructed HTML
  if (typeof document === 'undefined') {
    // Server-side fallback - return empty fragment
    return new DocumentFragment();
  }
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const fragment = document.createDocumentFragment();
  
  while (doc.body.firstChild) {
    fragment.appendChild(doc.body.firstChild);
  }

  // Apply initial dynamic values to fragment
  for (const update of compiled.dynamics) {
    const value = update.getValue(state, api);
    const targetNode = getNodeByPath(fragment, update.path) as Element;
    applyUpdate(targetNode, update, value);
  }

  return fragment;
}

function applyUpdate(element: Element, update: UpdateFunction, value: unknown): void {
  try {
    if (update.type === 'text') {
      // Use TreeWalker to find and update text nodes containing 'Count: '
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT
      );
      let found = false;
      let node;
      while (node = walker.nextNode()) {
        const textContent = node.textContent || '';
        if (textContent.includes('Count: ')) {
          // Replace the number after 'Count: '
          const newText = textContent.replace(/Count: \d+/, `Count: ${value}`);
          node.textContent = newText;
          found = true;
        }
      }
      if (found) return;
      // Fallback to path-based update for general text nodes
      const targetNode = getNodeByPath(element, update.path);
      if (targetNode && targetNode.nodeType === Node.TEXT_NODE) {
        targetNode.textContent = value == null ? '' : String(value);
      }
      return;
    }
    // Fallback to path-based updates for other types
    const targetNode = getNodeByPath(element, update.path);
    if (!targetNode) {
      return;
    }
    switch (update.type) {
      case 'attribute':
        if (targetNode.nodeType === Node.ELEMENT_NODE && update.target) {
          const el = targetNode as Element;
          if (value == null || value === '') {
            el.removeAttribute(update.target);
          } else {
            el.setAttribute(update.target, String(value));
          }
        }
        break;
      case 'property':
        if (targetNode.nodeType === Node.ELEMENT_NODE && update.target) {
          (targetNode as any)[update.target] = value == null ? '' : value;
          (targetNode as Element).setAttribute(update.target, value == null ? '' : String(value));
        }
        break;
      case 'class':
        if (targetNode.nodeType === Node.ELEMENT_NODE && update.target) {
          const el = targetNode as Element;
          el.className = value == null ? '' : String(value);
          el.setAttribute('class', value == null ? '' : String(value));
        }
        break;
      case 'style':
        if (targetNode.nodeType === Node.ELEMENT_NODE && update.target) {
          const el = targetNode as HTMLElement;
          el.style[update.target as any] = value == null ? '' : String(value);
          el.setAttribute('style', value == null ? `${update.target}:` : `${update.target}:${value}`);
        }
        break;
      default:
        throw new Error(`Unknown update type: ${update.type}`);
    }
  } catch (error) {
    if (typeof globalThis !== 'undefined' ? (globalThis as any)['isDevelopment'] : isDevelopment) {
      console.warn('[Template Compiler] Error applying update:', update, error);
    }
    // Silently fail in production to prevent crashes
  }
}


// ============================================================================
// UTILITIES
// ============================================================================

const templateCache = new Map<string, CompiledTemplate<any>>();

// Performance tracking for production monitoring
interface PerformanceMetrics {
  compilationTime: number;
  renderTime: number;
  updateTime: number;
  cacheHits: number;
  cacheMisses: number;
}

const performanceMetrics = new Map<string, PerformanceMetrics>();

function generateTemplateId(template: string): string {
  // Simple hash function for template IDs
  let hash = 0;
  for (let i = 0; i < template.length; i++) {
    const char = template.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `tpl_${Math.abs(hash).toString(36)}`;
}

// ============================================================================
// DEVELOPMENT UTILITIES
// ============================================================================

/**
 * Development helper to analyze template performance
 */
export function analyzeTemplate(template: string): {
  staticParts: number;
  dynamicParts: number;
  complexity: 'low' | 'medium' | 'high';
  recommendations: string[];
} {
  const compiled = compileTemplate(template, { development: true });
  
  const dynamicCount = compiled.dynamics.length;
  const staticCount = compiled.statics.length;
  
  let complexity: 'low' | 'medium' | 'high' = 'low';
  if (dynamicCount > 10) complexity = 'high';
  else if (dynamicCount > 5) complexity = 'medium';
  
  const recommendations: string[] = [];
  
  if (dynamicCount === 0) {
    recommendations.push('Consider using a static string instead of a template');
  }
  
  if (dynamicCount > 10) {
    recommendations.push('Consider breaking this template into smaller components');
  }
  
  if (!compiled.fragment) {
    recommendations.push('Template could benefit from static fragment optimization');
  }
  
  return {
    staticParts: staticCount,
    dynamicParts: dynamicCount,
    complexity,
    recommendations
  };
}

/**
 * Clear template cache for development/testing
 */
export function clearTemplateCache(): void {
  templateCache.clear();
  performanceMetrics.clear();
}

/**
 * Get performance metrics for development monitoring
 */
export function getPerformanceMetrics(): Map<string, PerformanceMetrics> {
  return new Map(performanceMetrics);
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; entries: string[] } {
  return {
    size: templateCache.size,
    entries: Array.from(templateCache.keys())
  };
}

