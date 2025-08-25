/**
 * Style utilities for component style management, caching, and optimization
 */

export interface StyleCacheEntry {
  css: string;
  timestamp: number;
  dependencies: string[];
}

export interface DynamicStyleConfig {
  css: string | ((state: any) => string);
  dependencies?: string[];
  cache?: boolean;
  media?: string;
  priority?: number;
}

export interface StyleOptimizations {
  enableCaching: boolean;
  enableMinification: boolean;
  enableDeduplication: boolean;
  cacheSize: number;
  debounceMs: number;
}

/**
 * Advanced style cache with LRU eviction and dependency tracking
 */
export class StyleCache {
  private cache = new Map<string, StyleCacheEntry>();
  private maxSize: number;
  private accessOrder = new Map<string, number>();
  private accessCounter = 0;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  set(key: string, css: string, dependencies: string[] = []): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      css,
      timestamp: Date.now(),
      dependencies,
    });
    this.accessOrder.set(key, ++this.accessCounter);
  }

  get(key: string): string | null {
    const entry = this.cache.get(key);
    if (entry) {
      this.accessOrder.set(key, ++this.accessCounter);
      return entry.css;
    }
    return null;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  invalidate(dependency: string): void {
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache) {
      if (entry.dependencies.includes(dependency)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.accessOrder.delete(key);
    });
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
  }

  private evictOldest(): void {
    let oldestKey = '';
    let oldestAccess = Infinity;

    for (const [key, access] of this.accessOrder) {
      if (access < oldestAccess) {
        oldestAccess = access;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.accessCounter > 0 ? (this.cache.size / this.accessCounter) : 0,
    };
  }
}

/**
 * CSS minification utility (basic)
 */
export function minifyCSS(css: string): string {
  return css
    // Remove comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove unnecessary whitespace
    .replace(/\s+/g, ' ')
    // Remove spaces around specific characters
    .replace(/\s*([{}:;,>+~])\s*/g, '$1')
    // Remove trailing semicolons before closing braces
    .replace(/;}/g, '}')
    // Remove leading/trailing whitespace
    .trim();
}

/**
 * Create a stable hash from state values for caching
 */
export function createStateHash(values: any[]): string {
  try {
    return JSON.stringify(values, (_key, value) => {
      // Handle circular references and functions
      if (typeof value === 'function') {
        return value.toString();
      }
      if (typeof value === 'object' && value !== null) {
        // Simple circular reference detection
        if (value.__hashed) return '[Circular]';
        value.__hashed = true;
        const result = { ...value };
        delete result.__hashed;
        return result;
      }
      return value;
    });
  } catch {
    // Fallback for complex objects
    return values.map(v => String(v)).join('|');
  }
}

/**
 * CSS deduplication utility
 */
export function deduplicateCSS(css: string): string {
  const rules = css.split('}').filter(rule => rule.trim());
  const seen = new Set<string>();
  const deduplicated: string[] = [];

  for (const rule of rules) {
    const normalized = rule.trim().replace(/\s+/g, ' ');
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      deduplicated.push(rule + '}');
    }
  }

  return deduplicated.join('').replace(/}$/, '');
}

/**
 * Debounced function utility for style updates
 */
export function createDebouncer<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T & { cancel: () => void } {
  let timeoutId: number | null = null;

  const debounced = ((...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  }) as T & { cancel: () => void };

  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}

/**
 * Extract CSS custom properties (CSS variables) from a style string
 */
export function extractCSSVariables(css: string): Record<string, string> {
  const variables: Record<string, string> = {};
  const regex = /--([\w-]+):\s*([^;]+)/g;
  let match;

  while ((match = regex.exec(css)) !== null) {
    variables[match[1]] = match[2].trim();
  }

  return variables;
}

/**
 * Generate scoped CSS by prefixing selectors
 */
export function scopeCSS(css: string, scope: string): string {
  // Simple CSS selector scoping
  return css.replace(
    /([^{}]+){/g,
    (match, selector) => {
      // Skip keyframes and other @ rules
      if (selector.trim().startsWith('@')) {
        return match;
      }

      // Scope each selector
      const scopedSelectors = selector
        .split(',')
        .map((sel: string) => {
          const trimmed = sel.trim();
          if (trimmed.startsWith(':host')) {
            return trimmed.replace(':host', scope);
          }
          return `${scope} ${trimmed}`;
        })
        .join(', ');

      return `${scopedSelectors} {`;
    }
  );
}

/**
 * CSS animation and transition utilities
 */
export const cssAnimations = {
  fadeIn: `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `,
  fadeOut: `
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
  `,
  slideIn: `
    @keyframes slideIn {
      from { transform: translateX(-100%); }
      to { transform: translateX(0); }
    }
  `,
  slideOut: `
    @keyframes slideOut {
      from { transform: translateX(0); }
      to { transform: translateX(100%); }
    }
  `,
  scaleIn: `
    @keyframes scaleIn {
      from { transform: scale(0.8); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `,
  scaleOut: `
    @keyframes scaleOut {
      from { transform: scale(1); opacity: 1; }
      to { transform: scale(0.8); opacity: 0; }
    }
  `,
};

/**
 * CSS Reset
 */
export const cssReset = `
/* CSS Reset */
  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    vertical-align: baseline;
  }
  html {
    line-height: 1.5;
    -webkit-text-size-adjust: 100%;
    -moz-tab-size: 4;
    tab-size: 4;
    font-family: ui-sans-serif, system-ui, sans-serif;
    color: #111827;
    background: #fff;
  }
  body {
    min-height: 100vh;
    text-rendering: optimizeLegibility;
    font-size: 1rem;
    font-weight: 400;
    line-height: 1.5;
    background: #fff;
  }
  ul, ol { list-style: none; }
  button, input, select, textarea {
    background: none;
    border: none;
    outline: none;
    font: inherit;
    color: inherit;
  }
  a { text-decoration: none; color: inherit; }
`;

/**
 * Common CSS utility classes (Tailwind CSS 4 inspired, with custom properties)
 * Includes a CSS reset and scalable spacing utilities.
 */
export const cssUtilities = `
  /* CSS Custom Properties for Spacing  */
  :root {
    --space-0: 0rem;
    --space-1: 0.25rem;
    --space-2: 0.5rem;
    --space-3: 0.75rem;
    --space-4: 1rem;
    --space-5: 1.25rem;
    --space-6: 1.5rem;
    --space-7: 1.75rem;
    --space-8: 2rem;
    --space-9: 2.25rem;
    --space-10: 2.5rem;
    --space-11: 2.75rem;
    --space-12: 3rem;
  }

  /* Spacing utilities (up to 12) */
  .p-0 { padding: var(--space-0); }
  .p-1 { padding: var(--space-1); }
  .p-2 { padding: var(--space-2); }
  .p-3 { padding: var(--space-3); }
  .p-4 { padding: var(--space-4); }
  .p-5 { padding: var(--space-5); }
  .p-6 { padding: var(--space-6); }
  .p-7 { padding: var(--space-7); }
  .p-8 { padding: var(--space-8); }
  .p-9 { padding: var(--space-9); }
  .p-10 { padding: var(--space-10); }
  .p-11 { padding: var(--space-11); }
  .p-12 { padding: var(--space-12); }

  .pt-0 { padding-top: var(--space-0); }
  .pt-1 { padding-top: var(--space-1); }
  .pt-2 { padding-top: var(--space-2); }
  .pt-3 { padding-top: var(--space-3); }
  .pt-4 { padding-top: var(--space-4); }
  .pt-5 { padding-top: var(--space-5); }
  .pt-6 { padding-top: var(--space-6); }
  .pt-7 { padding-top: var(--space-7); }
  .pt-8 { padding-top: var(--space-8); }
  .pt-9 { padding-top: var(--space-9); }
  .pt-10 { padding-top: var(--space-10); }
  .pt-11 { padding-top: var(--space-11); }
  .pt-12 { padding-top: var(--space-12); }

  .pb-0 { padding-bottom: var(--space-0); }
  .pb-1 { padding-bottom: var(--space-1); }
  .pb-2 { padding-bottom: var(--space-2); }
  .pb-3 { padding-bottom: var(--space-3); }
  .pb-4 { padding-bottom: var(--space-4); }
  .pb-5 { padding-bottom: var(--space-5); }
  .pb-6 { padding-bottom: var(--space-6); }
  .pb-7 { padding-bottom: var(--space-7); }
  .pb-8 { padding-bottom: var(--space-8); }
  .pb-9 { padding-bottom: var(--space-9); }
  .pb-10 { padding-bottom: var(--space-10); }
  .pb-11 { padding-bottom: var(--space-11); }
  .pb-12 { padding-bottom: var(--space-12); }

  .pl-0 { padding-left: var(--space-0); }
  .pl-1 { padding-left: var(--space-1); }
  .pl-2 { padding-left: var(--space-2); }
  .pl-3 { padding-left: var(--space-3); }
  .pl-4 { padding-left: var(--space-4); }
  .pl-5 { padding-left: var(--space-5); }
  .pl-6 { padding-left: var(--space-6); }
  .pl-7 { padding-left: var(--space-7); }
  .pl-8 { padding-left: var(--space-8); }
  .pl-9 { padding-left: var(--space-9); }
  .pl-10 { padding-left: var(--space-10); }
  .pl-11 { padding-left: var(--space-11); }
  .pl-12 { padding-left: var(--space-12); }

  .pr-0 { padding-right: var(--space-0); }
  .pr-1 { padding-right: var(--space-1); }
  .pr-2 { padding-right: var(--space-2); }
  .pr-3 { padding-right: var(--space-3); }
  .pr-4 { padding-right: var(--space-4); }
  .pr-5 { padding-right: var(--space-5); }
  .pr-6 { padding-right: var(--space-6); }
  .pr-7 { padding-right: var(--space-7); }
  .pr-8 { padding-right: var(--space-8); }
  .pr-9 { padding-right: var(--space-9); }
  .pr-10 { padding-right: var(--space-10); }
  .pr-11 { padding-right: var(--space-11); }
  .pr-12 { padding-right: var(--space-12); }

  .m-0 { margin: var(--space-0); }
  .m-1 { margin: var(--space-1); }
  .m-2 { margin: var(--space-2); }
  .m-3 { margin: var(--space-3); }
  .m-4 { margin: var(--space-4); }
  .m-5 { margin: var(--space-5); }
  .m-6 { margin: var(--space-6); }
  .m-7 { margin: var(--space-7); }
  .m-8 { margin: var(--space-8); }
  .m-9 { margin: var(--space-9); }
  .m-10 { margin: var(--space-10); }
  .m-11 { margin: var(--space-11); }
  .m-12 { margin: var(--space-12); }

  .mt-0 { margin-top: var(--space-0); }
  .mt-1 { margin-top: var(--space-1); }
  .mt-2 { margin-top: var(--space-2); }
  .mt-3 { margin-top: var(--space-3); }
  .mt-4 { margin-top: var(--space-4); }
  .mt-5 { margin-top: var(--space-5); }
  .mt-6 { margin-top: var(--space-6); }
  .mt-7 { margin-top: var(--space-7); }
  .mt-8 { margin-top: var(--space-8); }
  .mt-9 { margin-top: var(--space-9); }
  .mt-10 { margin-top: var(--space-10); }
  .mt-11 { margin-top: var(--space-11); }
  .mt-12 { margin-top: var(--space-12); }

  .mb-0 { margin-bottom: var(--space-0); }
  .mb-1 { margin-bottom: var(--space-1); }
  .mb-2 { margin-bottom: var(--space-2); }
  .mb-3 { margin-bottom: var(--space-3); }
  .mb-4 { margin-bottom: var(--space-4); }
  .mb-5 { margin-bottom: var(--space-5); }
  .mb-6 { margin-bottom: var(--space-6); }
  .mb-7 { margin-bottom: var(--space-7); }
  .mb-8 { margin-bottom: var(--space-8); }
  .mb-9 { margin-bottom: var(--space-9); }
  .mb-10 { margin-bottom: var(--space-10); }
  .mb-11 { margin-bottom: var(--space-11); }
  .mb-12 { margin-bottom: var(--space-12); }

  .ml-0 { margin-left: var(--space-0); }
  .ml-1 { margin-left: var(--space-1); }
  .ml-2 { margin-left: var(--space-2); }
  .ml-3 { margin-left: var(--space-3); }
  .ml-4 { margin-left: var(--space-4); }
  .ml-5 { margin-left: var(--space-5); }
  .ml-6 { margin-left: var(--space-6); }
  .ml-7 { margin-left: var(--space-7); }
  .ml-8 { margin-left: var(--space-8); }
  .ml-9 { margin-left: var(--space-9); }
  .ml-10 { margin-left: var(--space-10); }
  .ml-11 { margin-left: var(--space-11); }
  .ml-12 { margin-left: var(--space-12); }

  .mr-0 { margin-right: var(--space-0); }
  .mr-1 { margin-right: var(--space-1); }
  .mr-2 { margin-right: var(--space-2); }
  .mr-3 { margin-right: var(--space-3); }
  .mr-4 { margin-right: var(--space-4); }
  .mr-5 { margin-right: var(--space-5); }
  .mr-6 { margin-right: var(--space-6); }
  .mr-7 { margin-right: var(--space-7); }
  .mr-8 { margin-right: var(--space-8); }
  .mr-9 { margin-right: var(--space-9); }
  .mr-10 { margin-right: var(--space-10); }
  .mr-11 { margin-right: var(--space-11); }
  .mr-12 { margin-right: var(--space-12); }

  .my-auto { margin-block: auto; }
  .mx-auto { margin-inline: auto; }

  /* Display utilities */
  .block { display: block; }
  .inline { display: inline; }
  .inline-block { display: inline-block; }
  .flex { display: flex; }
  .inline-flex { display: inline-flex; }
  .grid { display: grid; }
  .hidden { display: none; }

  /* Flexbox utilities */
  .flex-row { flex-direction: row; }
  .flex-col { flex-direction: column; }
  .items-center { align-items: center; }
  .items-start { align-items: flex-start; }
  .items-end { align-items: flex-end; }
  .justify-center { justify-content: center; }
  .justify-between { justify-content: space-between; }
  .justify-start { justify-content: flex-start; }
  .justify-end { justify-content: flex-end; }
  .gap-1 { gap: var(--space-1); }
  .gap-2 { gap: var(--space-2); }
  .gap-3 { gap: var(--space-3); }
  .gap-4 { gap: var(--space-4); }
  .gap-5 { gap: var(--space-5); }
  .gap-6 { gap: var(--space-6); }
  .gap-7 { gap: var(--space-7); }
  .gap-8 { gap: var(--space-8); }
  .gap-9 { gap: var(--space-9); }
  .gap-10 { gap: var(--space-10); }
  .gap-11 { gap: var(--space-11); }
  .gap-12 { gap: var(--space-12); }

  /* Sizing utilities */
  .w-full { width: 100%; }
  .h-full { height: 100%; }
  .min-h-screen { min-height: 100vh; }
  .max-w-xs { max-width: 20rem; }
  .max-w-sm { max-width: 24rem; }
  .max-w-md { max-width: 28rem; }
  .max-w-lg { max-width: 32rem; }
  .max-w-xl { max-width: 36rem; }

  /* Typography utilities */
  .text-xs { font-size: 0.75rem; }
  .text-sm { font-size: 0.875rem; }
  .text-base { font-size: 1rem; }
  .text-lg { font-size: 1.125rem; }
  .text-xl { font-size: 1.25rem; }
  .font-bold { font-weight: 700; }
  .font-semibold { font-weight: 600; }
  .font-normal { font-weight: 400; }
  .font-light { font-weight: 300; }
  .text-center { text-align: center; }
  .text-left { text-align: left; }
  .text-right { text-align: right; }

  /* Border utilities */
  .border { border: 1px solid #e5e7eb; }
  .border-0 { border: none; }
  .rounded { border-radius: 0.25rem; }
  .rounded-md { border-radius: 0.375rem; }
  .rounded-lg { border-radius: 0.5rem; }
  .rounded-full { border-radius: 9999px; }

  /* Color utilities */
  .bg-white { background-color: #fff; }
  .bg-gray-50 { background-color: #f9fafb; }
  .bg-gray-100 { background-color: #f3f4f6; }
  .bg-gray-200 { background-color: #e5e7eb; }
  .bg-blue-500 { background-color: #3b82f6; }
  .bg-red-500 { background-color: #ef4444; }
  .text-black { color: #000; }
  .text-gray-600 { color: #4b5563; }
  .text-blue-600 { color: #2563eb; }
  .text-red-600 { color: #dc2626; }

  /* Interactive utilities */
  .cursor-pointer { cursor: pointer; }
  .cursor-default { cursor: default; }
  .pointer-events-none { pointer-events: none; }
  .select-none { user-select: none; }

  /* Shadow utilities */
  .shadow { box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05); }
  .shadow-md { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
  .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }

  /* Responsive utilities (mobile-first) */
  @media (min-width: 640px) {
    .sm\\:block { display: block; }
    .sm\\:hidden { display: none; }
    .sm\\:flex { display: flex; }
    .sm\\:grid { display: grid; }
    .sm\\:w-full { width: 100%; }
  }
  @media (min-width: 768px) {
    .md\\:block { display: block; }
    .md\\:hidden { display: none; }
    .md\\:flex { display: flex; }
    .md\\:grid { display: grid; }
    .md\\:w-full { width: 100%; }
  }
  @media (min-width: 1024px) {
    .lg\\:block { display: block; }
    .lg\\:hidden { display: none; }
    .lg\\:flex { display: flex; }
    .lg\\:grid { display: grid; }
    .lg\\:w-full { width: 100%; }
  }
  @media (min-width: 1280px) {
    .xl\\:block { display: block; }
    .xl\\:hidden { display: none; }
    .xl\\:flex { display: flex; }
    .xl\\:grid { display: grid; }
    .xl\\:w-full { width: 100%; }
  }
  @media (min-width: 1536px) {
    .2xl\\:block { display: block; }
    .2xl\\:hidden { display: none; }
    .2xl\\:flex { display: flex; }
    .2xl\\:grid { display: grid; }
    .2xl\\:w-full { width: 100%; }
  }
`;

/**
 * Performance monitoring for style operations
 */
export class StylePerformanceMonitor {
  private metrics = new Map<string, number[]>();

  startTimer(operation: string): () => number {
    const start = performance.now();

    return () => {
      const duration = performance.now() - start;
      this.recordMetric(operation, duration);
      return duration;
    };
  }

  private recordMetric(operation: string, duration: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }

    const times = this.metrics.get(operation)!;
    times.push(duration);

    // Keep only last 100 measurements
    if (times.length > 100) {
      times.shift();
    }
  }

  getStats(operation?: string) {
    if (operation) {
      const times = this.metrics.get(operation) || [];
      if (times.length === 0) return null;

      return {
        operation,
        count: times.length,
        average: times.reduce((a, b) => a + b, 0) / times.length,
        min: Math.min(...times),
        max: Math.max(...times),
      };
    }

    const stats: Record<string, any> = {};
    for (const [op, times] of this.metrics) {
      if (times.length > 0) {
        stats[op] = {
          count: times.length,
          average: times.reduce((a, b) => a + b, 0) / times.length,
          min: Math.min(...times),
          max: Math.max(...times),
        };
      }
    }
    return stats;
  }

  reset(operation?: string): void {
    if (operation) {
      this.metrics.delete(operation);
    } else {
      this.metrics.clear();
    }
  }
}

// Default performance monitor instance
export const stylePerformanceMonitor = new StylePerformanceMonitor();
