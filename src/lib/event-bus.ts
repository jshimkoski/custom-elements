
/**
 * Event handler type for global event bus
 */
export type EventHandler<T = any> = (data: T) => void;

/**
 * Event map type using Set for efficient handler management
 */
type EventMap = { [eventName: string]: Set<EventHandler> };

/**
 * GlobalEventBus provides a singleton event bus for cross-component communication.
 * Uses Set for handler storage to optimize add/remove operations and prevent duplicates.
 */
export class GlobalEventBus extends EventTarget {
  private handlers: EventMap = {};
  private static instance: GlobalEventBus;
  private eventCounters: Map<string, { count: number; window: number }> = new Map();


  /**
   * Returns the singleton instance of GlobalEventBus
   */
  static getInstance(): GlobalEventBus {
    if (!GlobalEventBus.instance) {
      GlobalEventBus.instance = new GlobalEventBus();
    }
    return GlobalEventBus.instance;
  }

  // Enhanced emit method with better typing and event storm protection
  /**
   * Emit a global event with optional data. Includes event storm protection.
   * @param eventName - Name of the event
   * @param data - Optional event payload
   */
  emit<T = any>(eventName: string, data?: T): void {
    // Event storm protection
    const now = Date.now();
    const counter = this.eventCounters.get(eventName);
    
    if (!counter || now - counter.window > 1000) {
      // Reset counter every second
      this.eventCounters.set(eventName, { count: 1, window: now });
    } else {
      counter.count++;
      
      if (counter.count > 50) {
        // Too many events of the same type in one second
        console.error(`Event storm detected for "${eventName}": ${counter.count} events in 1 second. Throttling...`);
        
        // Throttle this event type for a short period
        if (counter.count > 100) {
          console.warn(`Blocking further "${eventName}" events to prevent infinite loop`);
          return;
        }
      }
    }

    // Use native CustomEvent for better browser integration
    this.dispatchEvent(new CustomEvent(eventName, { 
      detail: data,
      bubbles: false, // Global events don't need to bubble
      cancelable: true 
    }));

    // Also trigger registered handlers
    const eventHandlers = this.handlers[eventName];
    if (eventHandlers) {
      eventHandlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in global event handler for "${eventName}":`, error);
        }
      });
    }
  }


  /**
   * Register a handler for a global event. Returns an unsubscribe function.
   * @param eventName - Name of the event
   * @param handler - Handler function
   */
  on<T = any>(eventName: string, handler: EventHandler<T>): () => void {
    if (!this.handlers[eventName]) {
      this.handlers[eventName] = new Set();
    }
    this.handlers[eventName].add(handler);
    return () => this.off(eventName, handler);
  }


  /**
   * Remove a specific handler for a global event.
   * @param eventName - Name of the event
   * @param handler - Handler function to remove
   */
  off<T = any>(eventName: string, handler: EventHandler<T>): void {
    const eventHandlers = this.handlers[eventName];
    if (eventHandlers) {
      eventHandlers.delete(handler);
    }
  }


  /**
   * Remove all handlers for a specific event.
   * @param eventName - Name of the event
   */
  offAll(eventName: string): void {
    delete this.handlers[eventName];
  }


  /**
   * Listen for a native CustomEvent. Returns an unsubscribe function.
   * @param eventName - Name of the event
   * @param handler - CustomEvent handler
   * @param options - AddEventListener options
   */
  listen<T = any>(eventName: string, handler: (event: CustomEvent<T>) => void, options?: AddEventListenerOptions): () => void {
    this.addEventListener(eventName, handler as EventListener, options);
    return () => this.removeEventListener(eventName, handler as EventListener);
  }


  /**
   * Register a one-time event handler. Returns a promise that resolves with the event data.
   * @param eventName - Name of the event
   * @param handler - Handler function
   */
  once<T = any>(eventName: string, handler: EventHandler<T>): Promise<T> {
    return new Promise((resolve) => {
      const unsubscribe = this.on(eventName, (data: T) => {
        unsubscribe();
        handler(data);
        resolve(data);
      });
    });
  }


  /**
   * Get a list of all active event names with registered handlers.
   */
  getActiveEvents(): string[] {
    return Object.keys(this.handlers).filter(eventName => 
      this.handlers[eventName] && this.handlers[eventName].size > 0
    );
  }


  /**
   * Clear all event handlers (useful for testing or cleanup).
   */
  clear(): void {
    this.handlers = {};
    // Note: This doesn't clear native event listeners, use removeAllListeners if needed
  }


  /**
   * Get the number of handlers registered for a specific event.
   * @param eventName - Name of the event
   */
  getHandlerCount(eventName: string): number {
    return this.handlers[eventName]?.size || 0;
  }


  /**
   * Get event statistics for debugging.
   */
  getEventStats(): Record<string, { count: number; handlersCount: number }> {
    const stats: Record<string, { count: number; handlersCount: number }> = {};
    for (const [eventName, counter] of this.eventCounters.entries()) {
      stats[eventName] = {
        count: counter.count,
        handlersCount: this.getHandlerCount(eventName)
      };
    }
    return stats;
  }


  /**
   * Reset event counters (useful for testing or after resolving issues).
   */
  resetEventCounters(): void {
    this.eventCounters.clear();
  }
}

/**
 * Singleton instance of the global event bus
 */
export const eventBus = GlobalEventBus.getInstance();

/**
 * Emit a global event
 */
export const emit = <T = any>(eventName: string, data?: T) => eventBus.emit(eventName, data);

/**
 * Register a handler for a global event
 */
export const on = <T = any>(eventName: string, handler: EventHandler<T>) => eventBus.on(eventName, handler);

/**
 * Remove a handler for a global event
 */
export const off = <T = any>(eventName: string, handler: EventHandler<T>) => eventBus.off(eventName, handler);

/**
 * Register a one-time handler for a global event
 */
export const once = <T = any>(eventName: string, handler: EventHandler<T>) => eventBus.once(eventName, handler);

/**
 * Listen for a native CustomEvent
 */
export const listen = <T = any>(eventName: string, handler: (event: CustomEvent<T>) => void, options?: AddEventListenerOptions) => 
  eventBus.listen(eventName, handler, options);
