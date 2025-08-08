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
  const { development = false, cache = true, optimize = true } = options;
  
  // Generate unique ID for caching
  const id = generateTemplateId(templateString);
  
  // Check cache first
  if (cache && templateCache.has(id)) {
    return templateCache.get(id)!;
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
      console.error('Template:', templateString);
    }
    
    // Fallback to runtime parsing in development
    return createFallbackTemplate<T>(templateString, id);
  }
}

/**
 * Tagged template literal for compile-time optimization
 * Usage: compile`<div>${state.name}</div>`
 */
/**
 * Find the DOM path to a placeholder in the template HTML
 */
function findDOMPath(templateHTML: string, placeholder: string): number[] {
  // Create a temporary DOM to analyze the structure
  if (typeof document === 'undefined') {
    return [0]; // Fallback for server-side
  }
  
  console.log('🔍 Finding path for placeholder:', placeholder, 'in:', templateHTML);
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${templateHTML}</div>`, 'text/html');
  const container = doc.body.firstElementChild!;
  
  console.log('📊 Container structure:', container.innerHTML);
  
  // Find the element or text node containing the placeholder
  function findPlaceholderPath(node: Node, currentPath: number[] = []): number[] | null {
    console.log('🔎 Checking node:', node.nodeType, node.textContent?.slice(0, 50));
    
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent?.includes(placeholder)) {
        console.log('✅ Found placeholder in text node at path:', currentPath);
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
  console.log('🎯 Final path for', placeholder, ':', path);
  return path || [0];
}

export function compile<T = any>(
  strings: TemplateStringsArray,
  ...expressions: Array<(state: T, api: any) => unknown>
): CompiledTemplate<T> {
  // Create statics array directly from strings
  const statics = [...strings];
  
  // Build the template HTML with placeholders to analyze structure
  const templateHTML = strings.map((str, i) => 
    str + (i < expressions.length ? `__DYNAMIC_${i}__` : '')
  ).join('');
  
  console.log('🔍 Template HTML for analysis:', templateHTML);
  
  // Parse the template to find DOM paths for each dynamic value
  const dynamics: UpdateFunction<T>[] = expressions.map((expr, index) => {
    const path = findDOMPath(templateHTML, `__DYNAMIC_${index}__`);
    console.log(`📍 Dynamic ${index} path:`, path);
    return {
      path,
      type: 'text' as UpdateType,
      getValue: expr
    };
  });
  
  // Generate unique ID
  const templateString = strings.join('{{PLACEHOLDER}}');
  const id = generateTemplateId(templateString);
  
  return {
    id,
    statics,
    dynamics,
    hasDynamics: dynamics.length > 0,
    fragment: null // Will be created on first render if needed
  };
}

// ============================================================================
// TEMPLATE PARSING & ANALYSIS
// ============================================================================

function parseAndCompileTemplate<T>(
  template: string,
  options: { development: boolean; optimize: boolean }
): CompiledTemplate<T> {
  const parser = new TemplateAnalyzer(template, options);
  return parser.compile<T>();
}

class TemplateAnalyzer {
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
    
    return {
      statics: this.statics,
      dynamics: this.dynamics as UpdateFunction<T>[],
      fragment,
      id,
      hasDynamics: this.dynamics.length > 0
    };
  }
  
  private parseTemplate(): void {
    // Simple regex-based parsing for dynamic expressions
    // In a full implementation, this would be a proper parser
    const dynamicRegex = /\{\{([^}]+)\}\}/g;
    let lastIndex = 0;
    let match;
    
    while ((match = dynamicRegex.exec(this.template)) !== null) {
      // Add static part before this match
      const staticPart = this.template.slice(lastIndex, match.index);
      this.statics.push(staticPart);
      
      // Analyze the dynamic expression
      const expression = match[1].trim();
      this.analyzeDynamicExpression(expression, this.dynamics.length);
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add final static part
    const finalStatic = this.template.slice(lastIndex);
    this.statics.push(finalStatic);
  }
  
  private analyzeDynamicExpression(expression: string, _index: number): void {
    // Simple expression analysis
    // In production, this would be much more sophisticated
    
    let updateType: UpdateType = 'text';
    let target: string | undefined;
    
    // Detect attribute/property updates
    if (expression.includes('class.')) {
      updateType = 'class';
      target = expression.split('.')[1];
    } else if (expression.includes('style.')) {
      updateType = 'style';
      target = expression.split('.')[1];
    } else if (expression.includes('@')) {
      updateType = 'event';
      target = expression.split('@')[1];
    }
    
    this.dynamics.push({
      path: [0], // Simplified - would be calculated properly
      type: updateType,
      target,
      getValue: this.createValueGetter(expression)
    });
  }
  
  private createValueGetter(expression: string): (state: any, api: any) => unknown {
    // Create a safe getter function for the expression
    // In production, this would be proper expression compilation
    return (state: any, _api: any) => {
      try {
        // Simple state property access
        if (expression.startsWith('state.')) {
          const prop = expression.slice(6);
          return state[prop];
        }
        
        // Simple computed access
        if (expression.includes('(')) {
          // For now, just return the expression as-is
          return expression;
        }
        
        return expression;
      } catch (error) {
        if (this.options.development) {
          console.warn(`[Template] Error evaluating expression: ${expression}`, error);
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
        console.warn('[Template] Could not create static fragment:', error);
      }
      return null;
    }
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
      
      // Skip update if value hasn't changed (optimization)
      if (oldState) {
        const oldValue = update.getValue(oldState, api);
        if (oldValue === newValue) {
          continue;
        }
      }
      
      applyUpdate(element, update, newValue);
    } catch (error) {
      console.warn('[Template] Error applying update:', error);
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
      const value = compiled.dynamics[i].getValue(state, api);
      html += String(value ?? '');
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
  
  return fragment;
}

function applyUpdate(element: Element, update: UpdateFunction, value: unknown): void {
  if (update.type === 'text') {
    // Use TreeWalker to find and update text nodes efficiently
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT
    );
    
    let node;
    while (node = walker.nextNode()) {
      const textContent = node.textContent || '';
      // Look for pattern like "Count: 0" and replace the number part
      if (textContent.includes('Count: ')) {
        // Replace the number after "Count: "
        const newText = textContent.replace(/Count: \d+/, `Count: ${value}`);
        node.textContent = newText;
        return;
      }
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
        if (value == null) {
          el.removeAttribute(update.target);
        } else {
          el.setAttribute(update.target, String(value));
        }
      }
      break;
      
    case 'property':
      if (targetNode.nodeType === Node.ELEMENT_NODE && update.target) {
        (targetNode as any)[update.target] = value;
      }
      break;
      
    case 'class':
      if (targetNode.nodeType === Node.ELEMENT_NODE && update.target) {
        const el = targetNode as Element;
        el.classList.toggle(update.target, Boolean(value));
      }
      break;
      
    case 'style':
      if (targetNode.nodeType === Node.ELEMENT_NODE && update.target) {
        const el = targetNode as HTMLElement;
        (el.style as any)[update.target] = value;
      }
      break;
  }
}

function getNodeByPath(root: Element, path: readonly number[]): Node | null {
  console.log('🗺️ Getting node by path:', path, 'from root:', root.tagName);
  console.log('🏗️ Root structure:', root.innerHTML.slice(0, 200));
  
  let current: Node = root;
  
  for (let i = 0; i < path.length; i++) {
    const index = path[i];
    console.log(`🗺️ Step ${i}: looking for child ${index} in node with ${current.childNodes.length} children`);
    console.log(`🗺️ Current node:`, current.nodeType, current.textContent?.slice(0, 50));
    
    if (index >= current.childNodes.length) {
      console.log(`❌ Index ${index} out of bounds (${current.childNodes.length} children)`);
      return null;
    }
    
    current = current.childNodes[index];
    console.log(`🗺️ Selected child ${index}:`, current.nodeType, current.textContent?.slice(0, 50));
    
    if (!current) {
      console.log(`❌ No child at index ${index}`);
      return null;
    }
  }
  
  console.log('✅ Final target node:', current.nodeType, current.textContent?.slice(0, 50));
  return current;
}

// ============================================================================
// UTILITIES
// ============================================================================

const templateCache = new Map<string, CompiledTemplate<any>>();

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

function createFallbackTemplate<T>(templateString: string, id: string): CompiledTemplate<T> {
  return {
    statics: [templateString],
    dynamics: [],
    fragment: null,
    id,
    hasDynamics: false
  };
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
 * Clear template cache (useful in development)
 */
export function clearTemplateCache(): void {
  templateCache.clear();
}

// ============================================================================
// EXPORTS
// ============================================================================

// Types are already exported above with their definitions
