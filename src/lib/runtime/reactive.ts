import { scheduleDOMUpdate } from "./scheduler";
import { ProxyOptimizer } from "./reactive-proxy-cache";
import { devWarn } from "./logger";

/**
 * Global reactive system for tracking dependencies and triggering updates
 */
class ReactiveSystem {
  private currentComponent: string | null = null;
  // Consolidated component data: stores dependencies, render function, state index, and last warning time
  private componentData = new Map<string, {
    dependencies: Set<ReactiveState<any>>;
    renderFn: () => void;
    stateIndex: number;
    lastWarnTime: number;
  }>();
  // Flat storage: compound key `${componentId}:${stateIndex}` -> ReactiveState
  private stateStorage = new Map<string, ReactiveState<any>>();
  private trackingDisabled = false;

  /**
   * Set the current component being rendered for dependency tracking
   */
  setCurrentComponent(componentId: string, renderFn: () => void): void {
    this.currentComponent = componentId;
    if (!this.componentData.has(componentId)) {
      this.componentData.set(componentId, {
        dependencies: new Set(),
        renderFn,
        stateIndex: 0,
        lastWarnTime: 0,
      });
    } else {
      const data = this.componentData.get(componentId)!;
      data.renderFn = renderFn;
      data.stateIndex = 0; // Reset state index for this render
    }
  }

  /**
   * Clear the current component after rendering
   */
  clearCurrentComponent(): void {
    this.currentComponent = null;
  }

  /**
   * Temporarily disable dependency tracking
   */
  disableTracking(): void {
    this.trackingDisabled = true;
  }

  /**
   * Re-enable dependency tracking
   */
  enableTracking(): void {
    this.trackingDisabled = false;
  }

  /**
   * Check if a component is currently rendering
   */
  isRenderingComponent(): boolean {
    return this.currentComponent !== null;
  }

  /**
   * Return whether we should emit a render-time warning for the current component.
   * This throttles warnings to avoid spamming the console for legitimate rapid updates.
   */
  shouldEmitRenderWarning(): boolean {
    if (!this.currentComponent) return true;
    const data = this.componentData.get(this.currentComponent);
    if (!data) return true;
    
    const now = Date.now();
    const THROTTLE_MS = 1000; // 1 second per component
    if (now - data.lastWarnTime < THROTTLE_MS) return false;
    
    data.lastWarnTime = now;
    return true;
  }

  /**
   * Execute a function with tracking disabled
   */
  withoutTracking<T>(fn: () => T): T {
    const wasDisabled = this.trackingDisabled;
    this.trackingDisabled = true;
    try {
      return fn();
    } finally {
      this.trackingDisabled = wasDisabled;
    }
  }

  /**
   * Get or create a state instance for the current component
   */
  getOrCreateState<T>(initialValue: T): ReactiveState<T> {
    if (!this.currentComponent) {
      return new ReactiveState(initialValue);
    }
    
    const data = this.componentData.get(this.currentComponent);
    if (!data) {
      return new ReactiveState(initialValue);
    }

    const stateKey = `${this.currentComponent}:${data.stateIndex++}`;
    let state = this.stateStorage.get(stateKey) as ReactiveState<T> | undefined;
    
    if (!state) {
      state = new ReactiveState(initialValue);
      this.stateStorage.set(stateKey, state);
    }
    
    return state;
  }

  /**
   * Track a dependency for the current component
   */
  trackDependency(state: ReactiveState<any>): void {
    if (this.trackingDisabled || !this.currentComponent) return;
    
    const data = this.componentData.get(this.currentComponent);
    if (data) {
      data.dependencies.add(state);
      state.addDependent(this.currentComponent);
    }
  }

  /**
   * Trigger updates for all components that depend on a state
   */
  triggerUpdate(state: ReactiveState<any>): void {
    const deps = state.getDependents();
    for (const componentId of deps) {
      const data = this.componentData.get(componentId);
      if (data) {
        scheduleDOMUpdate(data.renderFn, componentId);
      }
    }
  }

  /**
   * Clean up component dependencies when component is destroyed
   */
  cleanup(componentId: string): void {
    const data = this.componentData.get(componentId);
    if (data) {
      for (const state of data.dependencies) {
        state.removeDependent(componentId);
      }
      this.componentData.delete(componentId);
    }
    // Remove any flat-stored state keys for this component
    const prefix = componentId + ':';
    for (const key of this.stateStorage.keys()) {
      if (key.startsWith(prefix)) {
        this.stateStorage.delete(key);
      }
    }
  }
}

const reactiveSystem = new ReactiveSystem();

// Export for internal use
export { reactiveSystem };

/**
 * Internal reactive state class
 */
export class ReactiveState<T> {
  private _value: T;
  private dependents = new Set<string>();

  constructor(initialValue: T) {
    this._value = this.makeReactive(initialValue);
    // Mark instances with a stable cross-bundle symbol so other modules
    // can reliably detect ReactiveState objects even when classes are
    // renamed/minified or when multiple copies of the package exist.
    try {
      // Use a global symbol key to make it resilient across realms/bundles
      const key = Symbol.for('@cer/ReactiveState');
      Object.defineProperty(this, key, { value: true, enumerable: false, configurable: false });
    } catch (e) {
      // ignore if Symbol.for or defineProperty fails in exotic runtimes
    }
  }

  get value(): T {
    // Track this state as a dependency when accessed during render
    reactiveSystem.trackDependency(this);
    return this._value;
  }

  set value(newValue: T) {
    // Check for state modifications during render (potential infinite loop)
    if (reactiveSystem.isRenderingComponent()) {
      if (reactiveSystem.shouldEmitRenderWarning()) {
        devWarn(
          '🚨 State modification detected during render! This can cause infinite loops.\n' +
          '  • Move state updates to event handlers\n' +
          '  • Use useEffect/watch for side effects\n' +
          '  • Ensure computed properties don\'t modify state'
        );
      }
    }
    
    this._value = this.makeReactive(newValue);
    // Trigger updates for all dependent components
    reactiveSystem.triggerUpdate(this);
  }

  addDependent(componentId: string): void {
    this.dependents.add(componentId);
  }

  removeDependent(componentId: string): void {
    this.dependents.delete(componentId);
  }

  getDependents(): Set<string> {
    return this.dependents;
  }

  private makeReactive(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    // Skip reactivity for DOM nodes - they should not be made reactive
    if (obj instanceof Node || obj instanceof Element || obj instanceof HTMLElement) {
      return obj;
    }

    // Use optimized proxy creation
    return ProxyOptimizer.createReactiveProxy(
      obj,
      () => reactiveSystem.triggerUpdate(this),
      (value: any) => this.makeReactive(value)
    );
  }
}

/**
 * Create reactive state that automatically triggers component re-renders
 * when accessed during render and modified afterwards.
 * Defaults to null if no initial value is provided (Vue-style ref).
 * 
 * @example
 * ```ts
 * const counter = ref(0);
 * const user = ref({ name: 'John', age: 30 });
 * const emptyRef = ref(); // defaults to null
 * 
 * // Usage in component
 * counter.value++; // triggers re-render
 * user.value.name = 'Jane'; // triggers re-render
 * console.log(emptyRef.value); // null
 * ```
 */
export function ref<T = null>(initialValue?: T): ReactiveState<T extends undefined ? null : T> {
  return reactiveSystem.getOrCreateState(initialValue === undefined ? null as any : initialValue);
}

/**
 * Type guard to detect ReactiveState instances in a robust way that works
 * across bundlers, minifiers, and multiple package copies.
 */
export function isReactiveState(v: any): v is ReactiveState<any> {
  if (!v || typeof v !== 'object') return false;
  try {
    const key = Symbol.for('@cer/ReactiveState');
    return !!v[key];
  } catch (e) {
    return false;
  }
}

/**
 * Create computed state that derives from other reactive state
 * 
 * @example
 * ```ts
 * const firstName = ref('John');
 * const lastName = ref('Doe');
 * const fullName = computed(() => `${firstName.value} ${lastName.value}`);
 * ```
 */
export function computed<T>(fn: () => T): { readonly value: T } {
  const computedState = new ReactiveState(fn());
  
  // We need to track dependencies when the computed function runs
  // For now, we'll re-evaluate on every access (can be optimized later)
  return {
    get value(): T {
      reactiveSystem.trackDependency(computedState as any);
      return fn();
    }
  };
}

/**
 * Create a watcher that runs when dependencies change
 * 
 * @example
 * ```ts
 * const count = ref(0);
 * watch(() => count.value, (newVal, oldVal) => {
 *   console.log(`Count changed from ${oldVal} to ${newVal}`);
 * });
 * ```
 */
export function watch<T>(
  source: () => T,
  callback: (newValue: T, oldValue: T) => void,
  options: { immediate?: boolean } = {}
): () => void {
  let oldValue = source();
  
  if (options.immediate) {
    callback(oldValue, oldValue);
  }

  // Create a dummy component to track dependencies
  const watcherId = `watch-${Math.random().toString(36).substr(2, 9)}`;
  
  const updateWatcher = () => {
    reactiveSystem.setCurrentComponent(watcherId, updateWatcher);
    const newValue = source();
    reactiveSystem.clearCurrentComponent();
    
    if (newValue !== oldValue) {
      callback(newValue, oldValue);
      oldValue = newValue;
    }
  };

  // Initial run to establish dependencies
  reactiveSystem.setCurrentComponent(watcherId, updateWatcher);
  source();
  reactiveSystem.clearCurrentComponent();

  // Return cleanup function
  return () => {
    reactiveSystem.cleanup(watcherId);
  };
}
