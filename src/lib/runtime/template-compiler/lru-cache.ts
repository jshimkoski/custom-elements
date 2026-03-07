import type { VNode } from '../types';

// Strict LRU cache helper for fully static templates (no interpolations, no context)
export class LRUCache<K, V> {
  private map = new Map<K, V>();
  private maxSize: number;
  private accessOrder = new Map<K, number>();
  private accessCounter = 0;

  constructor(maxSize: number) {
    this.maxSize = Math.max(1, maxSize);
  }

  get(key: K): V | undefined {
    const value = this.map.get(key);
    if (value === undefined) return undefined;

    // Update access order efficiently
    this.accessOrder.set(key, ++this.accessCounter);
    return value;
  }

  set(key: K, value: V): void {
    const exists = this.map.has(key);
    this.map.set(key, value);
    this.accessOrder.set(key, ++this.accessCounter);

    // Only evict if we're over limit and this is a new key
    if (!exists && this.map.size > this.maxSize) {
      this.evictLRU();
    }
  }

  private evictLRU(): void {
    let lruKey: K | undefined;
    let lruAccess = Infinity;

    // Find least recently used key
    for (const [key, access] of this.accessOrder) {
      if (access < lruAccess) {
        lruAccess = access;
        lruKey = key;
      }
    }

    if (lruKey !== undefined) {
      this.map.delete(lruKey);
      this.accessOrder.delete(lruKey);
    }
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  clear(): void {
    this.map.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
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
