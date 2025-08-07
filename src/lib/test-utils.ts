// Testing utilities for reactive components
import type { ReactiveComponentOptions } from './runtime.js';
import { createReactiveComponent } from './runtime.js';
import { eventBus } from './event-bus.js';

export interface TestComponentOptions<TState extends object = any> extends Partial<ReactiveComponentOptions<TState>> {
  tag: string;
  state: TState;
}

export class TestUtils {
  private static cleanupCallbacks: Array<() => void> = [];

  /**
   * Create a component for testing
   */
  static createComponent<TState extends object>(
    options: TestComponentOptions<TState>
  ): HTMLElement {
    const fullOptions: ReactiveComponentOptions<TState> = {
      template: '',
      ...options
    };

    const ComponentClass = createReactiveComponent(fullOptions);
    const instance = new ComponentClass();

    // Auto-cleanup
    this.cleanupCallbacks.push(() => {
      if (instance.parentNode) {
        instance.parentNode.removeChild(instance);
      }
    });

    return instance;
  }

  /**
   * Mount a component to the DOM
   */
  static mount(component: HTMLElement, container?: HTMLElement): HTMLElement {
    const mountPoint = container || document.body;
    mountPoint.appendChild(component);
    return component;
  }

  /**
   * Wait for the next render cycle
   */
  static async waitForRender(): Promise<void> {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  }

  /**
   * Wait for a specific amount of time
   */
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Trigger a global event
   */
  static triggerGlobalEvent<T = any>(eventName: string, data?: T): void {
    eventBus.emit(eventName, data);
  }

  /**
   * Listen for a global event (auto-cleaned up)
   */
  static onGlobalEvent<T = any>(
    eventName: string, 
    handler: (data: T) => void
  ): () => void {
    const unsubscribe = eventBus.on(eventName, handler);
    this.cleanupCallbacks.push(unsubscribe);
    return unsubscribe;
  }

  /**
   * Wait for a global event to be emitted
   */
  static async waitForGlobalEvent<T = any>(
    eventName: string, 
    timeout = 5000
  ): Promise<T> {
    return Promise.race([
      eventBus.once(eventName, () => {}),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout waiting for event: ${eventName}`)), timeout)
      )
    ]);
  }

  /**
   * Get component state
   */
  static getState<T = any>(component: HTMLElement): T {
    return (component as any).state;
  }

  /**
   * Set component state
   */
  static setState<T extends object>(component: HTMLElement, updates: Partial<T>): void {
    const state = (component as any).state;
    Object.assign(state, updates);
  }

  /**
   * Query elements in component's shadow DOM
   */
  static query(component: HTMLElement, selector: string): Element | null {
    const shadowRoot = (component as any).shadowRoot;
    return shadowRoot ? shadowRoot.querySelector(selector) : null;
  }

  /**
   * Query all elements in component's shadow DOM
   */
  static queryAll(component: HTMLElement, selector: string): NodeListOf<Element> | Element[] {
    const shadowRoot = (component as any).shadowRoot;
    return shadowRoot ? shadowRoot.querySelectorAll(selector) : [];
  }

  /**
   * Simulate user input on an element
   */
  static input(element: HTMLElement, value: string): void {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  /**
   * Simulate a click on an element
   */
  static click(element: HTMLElement): void {
    element.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    }));
  }

  /**
   * Simulate a keyboard event
   */
  static keydown(element: HTMLElement, key: string, options: KeyboardEventInit = {}): void {
    element.dispatchEvent(new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...options
    }));
  }

  /**
   * Assert that an element exists
   */
  static assertExists(element: Element | null, message?: string): asserts element is Element {
    if (!element) {
      throw new Error(message || 'Expected element to exist');
    }
  }

  /**
   * Assert that text content matches
   */
  static assertTextContent(element: Element, expected: string): void {
    const actual = element.textContent?.trim();
    if (actual !== expected) {
      throw new Error(`Expected text content "${expected}", got "${actual}"`);
    }
  }

  /**
   * Assert that attribute value matches
   */
  static assertAttribute(element: Element, attr: string, expected: string): void {
    const actual = element.getAttribute(attr);
    if (actual !== expected) {
      throw new Error(`Expected attribute "${attr}" to be "${expected}", got "${actual}"`);
    }
  }

  /**
   * Assert that state property matches
   */
  static assertState<T>(component: HTMLElement, property: keyof T, expected: any): void {
    const state = this.getState<T>(component);
    const actual = state[property];
    if (actual !== expected) {
      throw new Error(`Expected state.${String(property)} to be ${expected}, got ${actual}`);
    }
  }

  /**
   * Create a spy function that tracks calls
   */
  static createSpy<T extends (...args: any[]) => any>(
    implementation?: T
  ): T & { calls: Array<Parameters<T>>; callCount: number; reset: () => void } {
    const calls: Array<Parameters<T>> = [];
    
    const spy = ((...args: Parameters<T>) => {
      calls.push(args);
      return implementation?.(...args);
    }) as T & { calls: Array<Parameters<T>>; callCount: number; reset: () => void };

    Object.defineProperty(spy, 'calls', { get: () => calls });
    Object.defineProperty(spy, 'callCount', { get: () => calls.length });
    spy.reset = () => calls.length = 0;

    return spy;
  }

  /**
   * Mock a global event bus method
   */
  static mockGlobalEvent(eventName: string, mockData?: any): () => void {
    const originalEmit = eventBus.emit;
    const mockEmit = this.createSpy((name: string, data: any) => {
      if (name === eventName && mockData !== undefined) {
        originalEmit.call(eventBus, name, mockData);
      } else {
        originalEmit.call(eventBus, name, data);
      }
    });

    eventBus.emit = mockEmit;

    const restore = () => {
      eventBus.emit = originalEmit;
    };

    this.cleanupCallbacks.push(restore);
    return restore;
  }

  /**
   * Clean up all test resources
   */
  static cleanupAll(): void {
    this.cleanupCallbacks.forEach(fn => {
      try {
        fn();
      } catch (error) {
        console.warn('Cleanup error:', error);
      }
    });
    this.cleanupCallbacks.length = 0;
    
    // Clear event bus
    eventBus.clear();
  }

  /**
   * Run a test with automatic cleanup
   */
  static async runTest<T>(
    testFn: () => T | Promise<T>
  ): Promise<T> {
    try {
      const result = await testFn();
      return result;
    } finally {
      this.cleanupAll();
    }
  }
}

// Export convenience functions
export const {
  createComponent,
  mount,
  waitForRender,
  wait,
  triggerGlobalEvent,
  onGlobalEvent,
  waitForGlobalEvent,
  getState,
  setState,
  query,
  queryAll,
  input,
  click,
  keydown,
  assertExists,
  assertTextContent,
  assertAttribute,
  assertState,
  createSpy,
  mockGlobalEvent,
  cleanupAll,
  runTest
} = TestUtils;
