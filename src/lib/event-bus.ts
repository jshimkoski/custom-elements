type EventHandler<T = any> = (data: T) => void;
type EventMap = { [eventName: string]: EventHandler[] };

class GlobalEventBus extends EventTarget {
  private handlers: EventMap = {};
  private static instance: GlobalEventBus;

  static getInstance(): GlobalEventBus {
    if (!GlobalEventBus.instance) {
      GlobalEventBus.instance = new GlobalEventBus();
    }
    return GlobalEventBus.instance;
  }

  // Enhanced emit method with better typing
  emit<T = any>(eventName: string, data?: T): void {
    // Use native CustomEvent for better browser integration
    this.dispatchEvent(new CustomEvent(eventName, { 
      detail: data,
      bubbles: false, // Global events don't need to bubble
      cancelable: true 
    }));

    // Also trigger registered handlers for backward compatibility
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

  // Convenience method for simple handler registration
  on<T = any>(eventName: string, handler: EventHandler<T>): () => void {
    if (!this.handlers[eventName]) {
      this.handlers[eventName] = [];
    }
    this.handlers[eventName].push(handler);

    // Return unsubscribe function
    return () => this.off(eventName, handler);
  }

  // Remove specific handler
  off<T = any>(eventName: string, handler: EventHandler<T>): void {
    const eventHandlers = this.handlers[eventName];
    if (eventHandlers) {
      const index = eventHandlers.indexOf(handler);
      if (index > -1) {
        eventHandlers.splice(index, 1);
      }
    }
  }

  // Remove all handlers for an event
  offAll(eventName: string): void {
    delete this.handlers[eventName];
  }

  // Use native addEventListener for more advanced use cases
  listen<T = any>(eventName: string, handler: (event: CustomEvent<T>) => void, options?: AddEventListenerOptions): () => void {
    this.addEventListener(eventName, handler as EventListener, options);
    
    return () => this.removeEventListener(eventName, handler as EventListener);
  }

  // One-time event listener
  once<T = any>(eventName: string, handler: EventHandler<T>): Promise<T> {
    return new Promise((resolve) => {
      const unsubscribe = this.on(eventName, (data: T) => {
        unsubscribe();
        handler(data);
        resolve(data);
      });
    });
  }

  // Get list of all active event names
  getActiveEvents(): string[] {
    return Object.keys(this.handlers).filter(eventName => 
      this.handlers[eventName] && this.handlers[eventName].length > 0
    );
  }

  // Clear all handlers (useful for testing or cleanup)
  clear(): void {
    this.handlers = {};
    // Note: This doesn't clear native event listeners, use removeAllListeners if needed
  }

  // Debug helper
  getHandlerCount(eventName: string): number {
    return this.handlers[eventName]?.length || 0;
  }
}

// Export singleton instance
export const eventBus = GlobalEventBus.getInstance();

// Export class for testing or custom instances
export { GlobalEventBus };

// Convenience functions for global access
export const emit = <T = any>(eventName: string, data?: T) => eventBus.emit(eventName, data);
export const on = <T = any>(eventName: string, handler: EventHandler<T>) => eventBus.on(eventName, handler);
export const off = <T = any>(eventName: string, handler: EventHandler<T>) => eventBus.off(eventName, handler);
export const once = <T = any>(eventName: string, handler: EventHandler<T>) => eventBus.once(eventName, handler);
export const listen = <T = any>(eventName: string, handler: (event: CustomEvent<T>) => void, options?: AddEventListenerOptions) => 
  eventBus.listen(eventName, handler, options);
