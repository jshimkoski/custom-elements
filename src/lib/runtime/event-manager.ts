/**
 * Event Manager for tracking and cleaning up event listeners
 * Prevents memory leaks by maintaining cleanup functions
 */

/**
 * Manages event listeners and their cleanup for elements
 */
class EventManager {
  private static cleanupFunctions = new WeakMap<
    HTMLElement,
    Array<{
      event: string;
      handler: EventListener;
      wrapper: EventListener;
      options?: AddEventListenerOptions;
      cleanup: () => void;
      addedAt: number;
    }>
  >();

  /**
   * Add an event listener with automatic cleanup tracking
   */
  static addListener(
    element: HTMLElement,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions,
  ): void {
    element.addEventListener(event, handler, options);

    const cleanup = () => element.removeEventListener(event, handler, options);
    const meta = {
      event,
      handler,
      wrapper: handler,
      options,
      cleanup,
      addedAt: Date.now(),
    };

    if (!this.cleanupFunctions.has(element)) {
      this.cleanupFunctions.set(element, []);
    }

    const list = this.cleanupFunctions.get(element)!;
    list.push(meta);
    (list as Array<unknown> & { __metaList?: unknown }).__metaList = list;
  }

  /**
   * Remove a specific event listener
   */
  static removeListener(
    element: HTMLElement,
    event: string,
    handler: EventListener,
    options?: EventListenerOptions,
  ): void {
    element.removeEventListener(event, handler, options);

    const cleanups = this.cleanupFunctions.get(element);
    if (!cleanups) return;

    // Optimized: find and remove in single pass
    for (let i = 0; i < cleanups.length; i++) {
      const m = cleanups[i];
      if (m.event === event && m.handler === handler) {
        cleanups.splice(i, 1);
        if (cleanups.length === 0) {
          this.cleanupFunctions.delete(element);
        }
        return;
      }
    }
  }

  /**
   * Clean up all event listeners for an element
   */
  static cleanup(element: HTMLElement): void {
    const list = this.cleanupFunctions.get(element);
    if (list) {
      list.forEach((m) => {
        try {
          m.cleanup();
        } catch {
          // Silently ignore cleanup errors
        }
      });
      this.cleanupFunctions.delete(element);
    }
  }

  /**
   * Clean up all tracked event listeners (useful for testing)
   */
  static cleanupAll(): void {
    // WeakMap doesn't have a clear method and automatically cleans up
    // when elements are garbage collected. Reset internal state for testing.
    this.cleanupFunctions = new WeakMap();
  }

  /**
   * Check if an element has any tracked event listeners
   */
  static hasListeners(element: HTMLElement): boolean {
    const list = this.cleanupFunctions.get(element);
    return !!(list && list.length > 0);
  }

  /**
   * Get the number of tracked event listeners for an element
   */
  static getListenerCount(element: HTMLElement): number {
    const list = this.cleanupFunctions.get(element);
    return list ? list.length : 0;
  }

  /**
   * Return listener metadata stored for the element (test/debug only)
   */
  static getListenerInfo(element: HTMLElement): Array<{
    event: string;
    handler?: EventListener;
    wrapper?: EventListener;
    options?: AddEventListenerOptions;
  }> {
    const list = this.cleanupFunctions.get(element);
    if (!list) return [];
    return list.map((m) => ({
      event: m.event,
      handler: m.handler,
      wrapper: m.wrapper,
      options: m.options,
    }));
  }
}

export { EventManager };
