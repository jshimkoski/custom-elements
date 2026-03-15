/**
 * Event handler type for global event bus
 */
export type EventHandler<T> = (data: T) => void;

import { devError } from './runtime/logger';

/**
 * Event map type using Set for efficient handler management
 */
type EventMap<Events extends Record<string, unknown>> = {
  [K in keyof Events]: Set<EventHandler<Events[K]>>;
};

/**
 * GlobalEventBus provides a singleton event bus for cross-component communication.
 * Uses Set for handler storage to optimize add/remove operations and prevent duplicates.
 */
export class GlobalEventBus extends EventTarget {
  private handlers: EventMap<Record<string, unknown>> = {};
  private static instance: GlobalEventBus;
  private eventCounters: Map<string, { count: number; window: number }> =
    new Map();
  private nativeUnsubscribers: Map<() => void, true> = new Map();
  private readonly MAX_EVENT_COUNTERS = 1000;

  /**
   * Returns the singleton instance of GlobalEventBus
   */
  static getInstance(): GlobalEventBus {
    if (!GlobalEventBus.instance) {
      GlobalEventBus.instance = new GlobalEventBus();
    }
    return GlobalEventBus.instance;
  }

  /**
   * Emit a global event with optional data. Includes event storm protection.
   * @param eventName - Name of the event
   * @param data - Optional event payload
   */
  emit<T = unknown>(eventName: string, data?: T): void {
    // Event storm protection
    const now = Date.now();
    const counter = this.eventCounters.get(eventName);

    if (!counter || now - counter.window > 1000) {
      // Evict oldest entry if the map is at capacity to prevent unbounded growth.
      if (!counter && this.eventCounters.size >= this.MAX_EVENT_COUNTERS) {
        const firstKey = this.eventCounters.keys().next().value;
        if (firstKey !== undefined) this.eventCounters.delete(firstKey);
      }
      // Reset counter every second
      this.eventCounters.set(eventName, { count: 1, window: now });
    } else {
      counter.count++;

      if (counter.count === 51) {
        // Warn once at the throttle threshold so developers know emissions are being dropped.
        devError(
          `[EventBus] Event "${eventName}" is firing too frequently (>${counter.count - 1}/s). ` +
            'Emissions above 50/s are throttled and above 100/s are dropped to prevent event storms. ' +
            'Consider debouncing the emitter.',
        );
      }
      if (counter.count > 100) {
        // Drop the event to protect against runaway event storms.
        return;
      }
    }

    // Use native CustomEvent for better browser integration
    this.dispatchEvent(
      new CustomEvent(eventName, {
        detail: data,
        bubbles: false, // Global events don't need to bubble
        cancelable: true,
      }),
    );

    // Also trigger registered handlers
    const eventHandlers = this.handlers[eventName];
    if (eventHandlers) {
      eventHandlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          devError(`Error in global event handler for "${eventName}":`, error);
        }
      });
    }
  }

  /**
   * Register a handler for a global event. Returns an unsubscribe function.
   * @param eventName - Name of the event
   * @param handler - Handler function
   */
  on<T = unknown>(eventName: string, handler: EventHandler<T>): () => void {
    if (!this.handlers[eventName]) {
      this.handlers[eventName] = new Set<EventHandler<unknown>>();
    }
    this.handlers[eventName].add(handler as EventHandler<unknown>);
    return () => this.off(eventName, handler);
  }

  /**
   * Remove a specific handler for a global event.
   * @param eventName - Name of the event
   * @param handler - Handler function to remove
   */
  off<T = unknown>(eventName: string, handler: EventHandler<T>): void {
    const eventHandlers = this.handlers[eventName];
    if (eventHandlers) {
      eventHandlers.delete(handler as EventHandler<unknown>);
      // Remove the entry entirely once it is empty so stale keys don't
      // accumulate indefinitely in long-lived apps.
      if (eventHandlers.size === 0) {
        delete this.handlers[eventName];
      }
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
  listen<T = unknown>(
    eventName: string,
    handler: (event: CustomEvent<T>) => void,
    options?: AddEventListenerOptions,
  ): () => void {
    this.addEventListener(eventName, handler as EventListener, options);
    // Use a wrapper so calling unsubscribe also removes it from nativeUnsubscribers,
    // preventing indefinite accumulation in long-lived apps.
    const unsubscribe: () => void = () => {
      this.removeEventListener(eventName, handler as EventListener);
      this.nativeUnsubscribers.delete(unsubscribe);
    };
    this.nativeUnsubscribers.set(unsubscribe, true);
    return unsubscribe;
  }

  /**
   * Register a one-time event handler (callback form).
   * The handler is invoked exactly once, then automatically unsubscribed.
   * @param eventName - Name of the event
   * @param handler - Handler function
   */
  once<T = unknown>(eventName: string, handler: EventHandler<T>): void;
  /**
   * Returns a Promise that resolves with the first emission of the event
   * (Promise form — no handler argument).
   * @param eventName - Name of the event
   */
  once<T = unknown>(eventName: string): Promise<T>;
  once<T = unknown>(
    eventName: string,
    handler?: EventHandler<T>,
  ): void | Promise<T> {
    if (handler !== undefined) {
      // Callback form: fire-and-forget, returns void
      const unsubscribe = this.on(eventName, (data: T) => {
        unsubscribe();
        handler(data);
      });
    } else {
      // Promise form: resolves on first emission
      return new Promise<T>((resolve) => {
        const unsubscribe = this.on(eventName, (data: T) => {
          unsubscribe();
          resolve(data);
        });
      });
    }
  }

  /**
   * Get a list of all active event names with registered handlers.
   */
  getActiveEvents(): string[] {
    return Object.keys(this.handlers).filter(
      (eventName) =>
        this.handlers[eventName] && this.handlers[eventName].size > 0,
    );
  }

  /**
   * Clear all event handlers and native EventTarget listeners (useful for testing or cleanup).
   */
  clear(): void {
    this.handlers = {};
    const toCleanup = Array.from(this.nativeUnsubscribers.keys());
    this.nativeUnsubscribers.clear();
    for (const unsubscribe of toCleanup) {
      unsubscribe();
    }
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
        handlersCount: this.getHandlerCount(eventName),
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
/**
 * Lazily-instantiated event bus.
 *
 * We preserve the `eventBus` export for backward compatibility but avoid
 * creating the underlying GlobalEventBus instance at module import time.
 * A small proxy defers the call to `GlobalEventBus.getInstance()` until a
 * property is accessed. This reduces import-time side-effects and helps
 * bundlers tree-shake unused entrypoints.
 */
export const eventBus = new Proxy(
  {},
  {
    get(_target, prop: PropertyKey) {
      const inst = GlobalEventBus.getInstance();
      const val = (inst as unknown as Record<PropertyKey, unknown>)[prop];
      // If the property is a function (method), bind it to the instance
      // so callers using `eventBus.method(...)` get the correct `this`.
      if (typeof val === 'function')
        return (val as (...args: unknown[]) => unknown).bind(inst);
      return val;
    },
    apply() {
      throw new TypeError('eventBus is not a callable function');
    },
  },
) as unknown as GlobalEventBus;

/**
 * Emit a global event
 */
export const emit = <T = unknown>(eventName: string, data?: T) =>
  eventBus.emit(eventName, data);

/**
 * Register a handler for a global event
 */
export const on = <T = unknown>(eventName: string, handler: EventHandler<T>) =>
  eventBus.on(eventName, handler);

/**
 * Remove a handler for a global event
 */
export const off = <T = unknown>(eventName: string, handler: EventHandler<T>) =>
  eventBus.off(eventName, handler);

/**
 * Register a one-time handler for a global event (callback form).
 * The handler fires once then auto-unsubscribes.
 */
export function once<T = unknown>(
  eventName: string,
  handler: EventHandler<T>,
): void;
/**
 * Returns a Promise that resolves with the next emission of the event
 * (Promise form — no handler argument needed).
 */
export function once<T = unknown>(eventName: string): Promise<T>;
export function once<T = unknown>(
  eventName: string,
  handler?: EventHandler<T>,
): void | Promise<T> {
  if (handler !== undefined) {
    return eventBus.once(eventName, handler);
  }
  return eventBus.once<T>(eventName);
}

/**
 * Listen for a native CustomEvent
 */
export const listen = <T = unknown>(
  eventName: string,
  handler: (event: CustomEvent<T>) => void,
  options?: AddEventListenerOptions,
) => eventBus.listen(eventName, handler, options);
