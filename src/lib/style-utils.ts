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
 * Common CSS utility classes
 */
export const cssUtilities = `
  /* Reset */
  * { box-sizing: border-box; }

  /* Display utilities */
  .flex { display: flex; }
  .block { display: block; }
  .inline { display: inline; }
  .inline-block { display: inline-block; }
  .hidden { display: none; }
  .visible { visibility: visible; }
  .invisible { visibility: hidden; }

  /* Position utilities */
  .relative { position: relative; }
  .absolute { position: absolute; }
  .fixed { position: fixed; }
  .sticky { position: sticky; }

  /* Flexbox utilities */
  .flex-col { flex-direction: column; }
  .flex-row { flex-direction: row; }
  .justify-center { justify-content: center; }
  .justify-between { justify-content: space-between; }
  .items-center { align-items: center; }
  .items-stretch { align-items: stretch; }
  .flex-1 { flex: 1; }
  .flex-shrink-0 { flex-shrink: 0; }

  /* Spacing utilities */
  .p-0 { padding: 0; }
  .p-1 { padding: 0.25rem; }
  .p-2 { padding: 0.5rem; }
  .p-3 { padding: 0.75rem; }
  .p-4 { padding: 1rem; }
  .m-0 { margin: 0; }
  .m-1 { margin: 0.25rem; }
  .m-2 { margin: 0.5rem; }
  .m-3 { margin: 0.75rem; }
  .m-4 { margin: 1rem; }
  .mx-auto { margin-left: auto; margin-right: auto; }

  /* Text utilities */
  .text-center { text-align: center; }
  .text-left { text-align: left; }
  .text-right { text-align: right; }
  .font-bold { font-weight: bold; }
  .font-normal { font-weight: normal; }
  .text-sm { font-size: 0.875rem; }
  .text-base { font-size: 1rem; }
  .text-lg { font-size: 1.125rem; }
  .text-xl { font-size: 1.25rem; }

  /* Border utilities */
  .border { border: 1px solid #e5e5e5; }
  .border-none { border: none; }
  .rounded { border-radius: 0.25rem; }
  .rounded-md { border-radius: 0.375rem; }
  .rounded-lg { border-radius: 0.5rem; }
  .rounded-full { border-radius: 9999px; }

  /* Color utilities */
  .bg-white { background-color: #fff; }
  .bg-gray-100 { background-color: #f5f5f5; }
  .bg-gray-200 { background-color: #e5e5e5; }
  .bg-blue-500 { background-color: #3b82f6; }
  .text-black { color: #000; }
  .text-gray-600 { color: #6b7280; }
  .text-blue-600 { color: #2563eb; }

  /* Interactive utilities */
  .cursor-pointer { cursor: pointer; }
  .cursor-default { cursor: default; }
  .pointer-events-none { pointer-events: none; }
  .select-none { user-select: none; }

  /* Responsive utilities */
  @media (min-width: 640px) {
    .sm\\:block { display: block; }
    .sm\\:hidden { display: none; }
    .sm\\:flex { display: flex; }
  }

  @media (min-width: 768px) {
    .md\\:block { display: block; }
    .md\\:hidden { display: none; }
    .md\\:flex { display: flex; }
  }

  @media (min-width: 1024px) {
    .lg\\:block { display: block; }
    .lg\\:hidden { display: none; }
    .lg\\:flex { display: flex; }
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
