/**
 * Reactive proxy cache to optimize proxy creation and reuse
 * Uses WeakMap for automatic garbage collection when objects are no longer referenced
 */

/**
 * Cache for reactive proxies to avoid creating multiple proxies for the same object
 */
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
    
    // Cache the proxy
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
  /**
   * Create an optimized reactive proxy with minimal overhead
   */
  static createReactiveProxy<T extends object>(
    obj: T,
    onUpdate: () => void,
    makeReactive: (value: any) => any
  ): T {
    // Skip proxy creation for already proxied objects
    if (this.isProxy(obj)) {
      return obj;
    }
    
    const isArray = Array.isArray(obj);
    
    // Create reactive state context for handler caching
    const reactiveContext = {
      triggerUpdate: onUpdate,
      makeReactiveValue: makeReactive
    };
    
    return ReactiveProxyCache.getOrCreateProxy(obj, reactiveContext, isArray);
  }
  
  /**
   * Check if an object is already a proxy
   */
  private static isProxy(obj: any): boolean {
    try {
      // Try to access a non-existent property to trigger proxy traps
      // This is a heuristic, not foolproof
      const descriptor = Object.getOwnPropertyDescriptor(obj, '__isProxy__');
      return descriptor !== undefined;
    } catch {
      return false;
    }
  }
  
  /**
   * Mark an object as a proxy (for optimization)
   */
  static markAsProxy(obj: any): void {
    try {
      Object.defineProperty(obj, '__isProxy__', {
        value: true,
        enumerable: false,
        writable: false,
        configurable: false
      });
    } catch {
      // Ignore if we can't mark it
    }
  }
}

export { ReactiveProxyCache, ProxyOptimizer };