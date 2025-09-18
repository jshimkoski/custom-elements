/**
 * Reactive proxy cache to optimize proxy creation and reuse
 * Uses WeakMap for automatic garbage collection when objects are no longer referenced
 */

/**
 * Cache for reactive proxies to avoid creating multiple proxies for the same object
 */
// legacy symbol marker removed — use WeakSet and non-enumerable flag instead
// Track actual proxy instances with a WeakSet for robust detection
const proxiedObjects = new WeakSet<object>();
// No legacy flag: rely solely on WeakSet and WeakMap for proxy detection

class ReactiveProxyCache {
  private static cache = new WeakMap<object, object>();
  private static arrayHandlerCache = new WeakMap<object, ProxyHandler<any>>();
  private static objectHandlerCache = new WeakMap<object, ProxyHandler<any>>();
  
  /**
   * Get or create a reactive proxy for an object
   */
  static getOrCreateProxy<T extends object>(
    obj: T, 
    reactiveState: any,
    isArray: boolean = false
  ): T {
    // Check if we already have a cached proxy
    const cached = this.cache.get(obj);
    if (cached) {
      return cached as T;
    }
    
    // Create appropriate handler
    const handler = isArray 
      ? this.getOrCreateArrayHandler(reactiveState)
      : this.getOrCreateObjectHandler(reactiveState);
    
    // Create proxy
    const proxy = new Proxy(obj, handler);

    // Mark and track the proxy instance (do this via the optimizer helper)
    try { ProxyOptimizer.markAsProxy(proxy as any); } catch {}

    // Cache the proxy by the original target object
    this.cache.set(obj, proxy);
    
    return proxy as T;
  }
  
  /**
   * Get or create a cached array handler
   */
  private static getOrCreateArrayHandler(reactiveState: any): ProxyHandler<any> {
    // Create a unique handler for this reactive state
    if (!this.arrayHandlerCache.has(reactiveState)) {
      const handler: ProxyHandler<any> = {
        get: (target, prop, receiver) => {
          const value = Reflect.get(target, prop, receiver);

          // Intercept array mutating methods
          if (typeof value === "function" && typeof prop === "string") {
            const mutatingMethods = [
              "push", "pop", "shift", "unshift", "splice", 
              "sort", "reverse", "fill", "copyWithin"
            ];
            if (mutatingMethods.includes(prop)) {
              return function (...args: any[]) {
                const result = value.apply(target, args);
                // Trigger update after mutation
                reactiveState.triggerUpdate();
                return result;
              };
            }
          }

          return value;
        },
        set: (target, prop, value) => {
          (target as any)[prop] = reactiveState.makeReactiveValue(value);
          reactiveState.triggerUpdate();
          return true;
        },
        deleteProperty: (target, prop) => {
          delete (target as any)[prop];
          reactiveState.triggerUpdate();
          return true;
        }
      };
      
      this.arrayHandlerCache.set(reactiveState, handler);
    }
    
    return this.arrayHandlerCache.get(reactiveState)!;
  }
  
  /**
   * Get or create a cached object handler
   */
  private static getOrCreateObjectHandler(reactiveState: any): ProxyHandler<any> {
    // Create a unique handler for this reactive state
    if (!this.objectHandlerCache.has(reactiveState)) {
      const handler: ProxyHandler<any> = {
        get: (target, prop, receiver) => {
          return Reflect.get(target, prop, receiver);
        },
        set: (target, prop, value) => {
          (target as any)[prop] = reactiveState.makeReactiveValue(value);
          reactiveState.triggerUpdate();
          return true;
        },
        deleteProperty: (target, prop) => {
          delete (target as any)[prop];
          reactiveState.triggerUpdate();
          return true;
        }
      };
      
      this.objectHandlerCache.set(reactiveState, handler);
    }
    
    return this.objectHandlerCache.get(reactiveState)!;
  }
  
  /**
   * Check if an object already has a cached proxy
   */
  static hasProxy(obj: object): boolean {
    return this.cache.has(obj);
  }
  
  /**
   * Clear all cached proxies (useful for testing)
   */
  static clear(): void {
    this.cache = new WeakMap();
    this.arrayHandlerCache = new WeakMap();
    this.objectHandlerCache = new WeakMap();
  }
  
  /**
   * Get cache statistics (for debugging)
   * Note: WeakMap doesn't provide size, so this is limited
   */
  static getStats(): { hasCachedProxies: boolean } {
    // WeakMap doesn't expose size, but we can check if we have any handlers cached
    return {
      hasCachedProxies: this.cache instanceof WeakMap
    };
  }
}

/**
 * Optimized proxy creation utilities
 */
class ProxyOptimizer {
  // Cache a stable reactiveContext object keyed by onUpdate -> makeReactive
  // This allows handler caches in ReactiveProxyCache to reuse handlers
  // for identical reactive contexts instead of creating a new context object
  // on each createReactiveProxy call.
  private static contextCache = new WeakMap<Function, WeakMap<Function, { triggerUpdate: Function; makeReactiveValue: Function }>>();
  /**
   * Create an optimized reactive proxy with minimal overhead
   */
  static createReactiveProxy<T extends object>(
    obj: T,
    onUpdate: () => void,
    makeReactive: (value: any) => any
  ): T {
    // If the argument is already a proxy instance, return it directly.
    try {
      if (proxiedObjects.has(obj)) return obj;
    } catch {
      // ignore
    }
    
    const isArray = Array.isArray(obj);

    // Reuse a stable reactiveContext object per (onUpdate, makeReactive) pair.
    let inner = this.contextCache.get(onUpdate as any);
    if (!inner) {
      inner = new WeakMap();
      this.contextCache.set(onUpdate as any, inner);
    }
    let reactiveContext = inner.get(makeReactive as any);
    if (!reactiveContext) {
      reactiveContext = {
        triggerUpdate: onUpdate,
        makeReactiveValue: makeReactive
      };
      inner.set(makeReactive as any, reactiveContext);
    }
    
    // Delegate to the cache which will return an existing proxy for the target
    // or create one if it doesn't exist yet.
    return ReactiveProxyCache.getOrCreateProxy(obj, reactiveContext, isArray);
  }
  
  /**
   * Mark an object as a proxy (for optimization)
   */
  static markAsProxy(obj: any): void {
    if (!obj) return;

    // Prefer adding the actual proxy instance to the WeakSet which does not trigger proxy traps
    try {
      proxiedObjects.add(obj);
    } catch {
      // ignore
    }
  }
}

export { ReactiveProxyCache, ProxyOptimizer };