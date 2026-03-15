import type { VNode } from '../types';

// Strict LRU cache helper for fully static templates (no interpolations, no context).
// Uses Map's guaranteed insertion-order iteration: deleting and re-inserting a key
// promotes it to MRU position, and the first key is always the LRU — making both
// promotion and eviction O(1) without any auxiliary data structure.
export class LRUCache<K, V> {
  private map = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = Math.max(1, maxSize);
  }

  get(key: K): V | undefined {
    const value = this.map.get(key);
    if (value === undefined) return undefined;
    // Promote to MRU by re-inserting (Map preserves insertion order).
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      // Re-insert to promote to MRU position.
      this.map.delete(key);
    }
    this.map.set(key, value);
    // Evict the LRU entry (first in Map) when over capacity.
    if (this.map.size > this.maxSize) {
      const lruKey = this.map.keys().next().value as K;
      this.map.delete(lruKey);
    }
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}

// Adaptive cache size based on environment
export const getCacheSize = (): number => {
  if (typeof navigator !== 'undefined' && 'deviceMemory' in navigator) {
    // Use device memory to determine cache size (GB * 100, min 200, max 1000)
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number })
      .deviceMemory;
    if (deviceMemory) {
      return Math.min(1000, Math.max(200, deviceMemory * 100));
    }
  }
  // Default cache size with environment detection
  const isTest = (() => {
    try {
      const globalObj = globalThis as Record<string, unknown>;
      const processObj = globalObj.process as
        | Record<string, unknown>
        | undefined;
      const envObj = processObj?.env as Record<string, unknown> | undefined;
      return envObj?.NODE_ENV === 'test';
    } catch {
      return false;
    }
  })();
  return isTest ? 100 : 500; // Smaller cache in tests
};

export const TEMPLATE_COMPILE_CACHE = new LRUCache<string, VNode | VNode[]>(
  getCacheSize(),
);

/**
 * Clear the template compile cache (useful for tests)
 */
export function clearTemplateCompileCache(): void {
  TEMPLATE_COMPILE_CACHE.clear();
}
