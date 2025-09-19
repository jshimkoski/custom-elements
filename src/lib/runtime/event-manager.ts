/**
 * Event Manager for tracking and cleaning up event listeners
 * Prevents memory leaks by maintaining cleanup functions
 */

/**
 * Manages event listeners and their cleanup for elements
 */
class EventManager {
  private static cleanupFunctions = new WeakMap<HTMLElement, (() => void)[]>();
  
  /**
   * Add an event listener with automatic cleanup tracking
   */
  static addListener(
    element: HTMLElement, 
    event: string, 
    handler: EventListener,
    options?: AddEventListenerOptions
  ): void {
    element.addEventListener(event, handler, options);
    
    const cleanup = () => element.removeEventListener(event, handler, options);
    const meta = { event, handler, options, cleanup, addedAt: Date.now() };

    if (!this.cleanupFunctions.has(element)) {
      // store an array of metadata objects
      this.cleanupFunctions.set(element, [] as any);
    }

    const list = this.cleanupFunctions.get(element) as any[];
    list.push(meta);
    // also expose metadata for backward-compatible removal routines
    (this.cleanupFunctions.get(element) as any).__metaList = list;
  }
  
  /**
   * Remove a specific event listener
   */
  static removeListener(
    element: HTMLElement, 
    event: string, 
    handler: EventListener,
    options?: EventListenerOptions
  ): void {
    element.removeEventListener(event, handler, options);
    // Remove matching cleanup from tracking by matching the specific handler/options
    const cleanups = this.cleanupFunctions.get(element);
    if (cleanups) {
      // Each cleanup was created as a closure capturing event/handler/options;
      // we can't introspect that closure, so store a small metadata tuple instead
      // to allow precise removal. We'll convert the internal representation lazily
      // if needed: if the stored element is the old-style function, rebuild metadata.
      // New approach: store an array of objects { event, handler, options, cleanup }
      const metaList: any[] = (cleanups as any).__metaList || null;
      if (metaList) {
        const idx = metaList.findIndex(m => m.event === event && m.handler === handler && JSON.stringify(m.options) === JSON.stringify(options));
        if (idx >= 0) {
          // Remove actual cleanup function and metadata
          try { metaList[idx].cleanup(); } catch (e) { /* ignore */ }
          metaList.splice(idx, 1);
        }
        if (metaList.length === 0) {
          this.cleanupFunctions.delete(element);
        }
      } else {
        // Backwards-compat: try to find a cleanup by invoking and comparing length
        // This is best-effort only. Prefer DetailedEventManager for robust behavior.
        const index = cleanups.findIndex(() => true);
        if (index >= 0) {
          cleanups.splice(index, 1);
          if (cleanups.length === 0) this.cleanupFunctions.delete(element);
        }
      }
    }
  }
  
  /**
   * Clean up all event listeners for an element
   */
  static cleanup(element: HTMLElement): void {
    const list = this.cleanupFunctions.get(element) as any[] | undefined;
    if (list) {
      const metaList = (list as any).__metaList || list;
      metaList.forEach((m: any) => {
        try {
          if (typeof m === 'function') m();
          else if (m && typeof m.cleanup === 'function') m.cleanup();
        } catch (error) {
          // Silently ignore cleanup errors to avoid breaking the cleanup process
          console.error('Error during event cleanup:', error);
        }
      });
      this.cleanupFunctions.delete(element);
    }
  }
  
  /**
   * Clean up all tracked event listeners (useful for testing)
   */
  static cleanupAll(): void {
    // WeakMap doesn't have a clear method, but we can iterate and cleanup
    // Note: This is primarily for testing, as WeakMap automatically cleans up
    // when elements are garbage collected
    try {
      // We can't iterate over WeakMap, so this is more of a reset for internal state
      this.cleanupFunctions = new WeakMap();
    } catch (error) {
      console.error('Error during global cleanup:', error);
    }
  }
  
  /**
   * Check if an element has any tracked event listeners
   */
  static hasListeners(element: HTMLElement): boolean {
    const list = this.cleanupFunctions.get(element) as any[] | undefined;
    const metaList = list ? (list as any).__metaList || list : undefined;
    return !!(metaList && metaList.length > 0);
  }
  
  /**
   * Get the number of tracked event listeners for an element
   */
  static getListenerCount(element: HTMLElement): number {
    const list = this.cleanupFunctions.get(element) as any[] | undefined;
    const metaList = list ? (list as any).__metaList || list : undefined;
    return metaList ? metaList.length : 0;
  }
}

/**
 * Enhanced event listener tracker that stores more metadata
 * for better debugging and cleanup
 */
interface EventListenerMetadata {
  event: string;
  handler: EventListener;
  options?: AddEventListenerOptions;
  cleanup: () => void;
  addedAt: number; // timestamp
}

class DetailedEventManager {
  private static listeners = new WeakMap<HTMLElement, EventListenerMetadata[]>();
  
  static addListener(
    element: HTMLElement,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ): void {
    element.addEventListener(event, handler, options);
    
    const metadata: EventListenerMetadata = {
      event,
      handler,
      options,
      cleanup: () => element.removeEventListener(event, handler, options),
      addedAt: Date.now()
    };
    
    if (!this.listeners.has(element)) {
      this.listeners.set(element, []);
    }
    
    this.listeners.get(element)!.push(metadata);
  }
  
  static removeListener(
    element: HTMLElement,
    event: string,
    handler: EventListener,
    options?: EventListenerOptions
  ): boolean {
    const elementListeners = this.listeners.get(element);
    if (!elementListeners) return false;
    
    const index = elementListeners.findIndex(meta => 
      meta.event === event && 
      meta.handler === handler &&
      JSON.stringify(meta.options) === JSON.stringify(options)
    );
    
    if (index >= 0) {
      const metadata = elementListeners[index];
      metadata.cleanup();
      elementListeners.splice(index, 1);
      
      if (elementListeners.length === 0) {
        this.listeners.delete(element);
      }
      
      return true;
    }
    
    return false;
  }
  
  static cleanup(element: HTMLElement): void {
    const elementListeners = this.listeners.get(element);
    if (elementListeners) {
      elementListeners.forEach(metadata => {
        try {
          metadata.cleanup();
        } catch (error) {
          console.error(`Error cleaning up ${metadata.event} listener:`, error);
        }
      });
      this.listeners.delete(element);
    }
  }
  
  static getListenerInfo(element: HTMLElement): EventListenerMetadata[] {
    return this.listeners.get(element) || [];
  }
  
  static findStaleListeners(_maxAge: number = 300000): Array<{element: HTMLElement, listeners: EventListenerMetadata[]}> {
    const stale: Array<{element: HTMLElement, listeners: EventListenerMetadata[]}> = [];
    
    // Note: Can't iterate WeakMap, this is more for the concept
    // In practice, you'd need to track elements separately if you want this functionality
    
    return stale;
  }
}

export { EventManager, DetailedEventManager };
export type { EventListenerMetadata };