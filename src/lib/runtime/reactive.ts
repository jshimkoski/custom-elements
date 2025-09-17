import { scheduleDOMUpdate } from "./scheduler";
import { ProxyOptimizer } from "./reactive-proxy-cache";

/**
 * Global reactive system for tracking dependencies and triggering updates
 */
class ReactiveSystem {
  private currentComponent: string | null = null;
  private componentDependencies = new Map<string, Set<ReactiveState<any>>>();
  private componentRenderFunctions = new Map<string, () => void>();
  private componentStateStorage = new Map<string, Map<string, ReactiveState<any>>>();
  private stateIndexCounter = new Map<string, number>();
  private trackingDisabled = false;

  /**
   * Set the current component being rendered for dependency tracking
   */
  setCurrentComponent(componentId: string, renderFn: () => void): void {
    this.currentComponent = componentId;
    this.componentRenderFunctions.set(componentId, renderFn);
    if (!this.componentDependencies.has(componentId)) {
      this.componentDependencies.set(componentId, new Set());
    }
    if (!this.componentStateStorage.has(componentId)) {
      this.componentStateStorage.set(componentId, new Map());
    }
    // Reset state index for this render
    this.stateIndexCounter.set(componentId, 0);
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
      // If not in component context, create standalone state
      return new ReactiveState(initialValue);
    }
    
    const componentId = this.currentComponent;
    const stateStorage = this.componentStateStorage.get(componentId)!;
    const currentIndex = this.stateIndexCounter.get(componentId) || 0;
    const stateKey = `state-${currentIndex}`;
    
    // Increment state index for next state call
    this.stateIndexCounter.set(componentId, currentIndex + 1);
    
    if (stateStorage.has(stateKey)) {
      // Return existing state instance
      return stateStorage.get(stateKey)! as ReactiveState<T>;
    } else {
      // Create new state instance
      const stateInstance = new ReactiveState(initialValue);
      stateStorage.set(stateKey, stateInstance);
      return stateInstance;
    }
  }

  /**
   * Track a dependency for the current component
   */
  trackDependency(state: ReactiveState<any>): void {
    if (this.trackingDisabled) return;
    
    if (this.currentComponent) {
      this.componentDependencies.get(this.currentComponent)?.add(state);
      state.addDependent(this.currentComponent);
    }
  }

  /**
   * Trigger updates for all components that depend on a state
   */
  triggerUpdate(state: ReactiveState<any>): void {
    state.getDependents().forEach(componentId => {
      const renderFn = this.componentRenderFunctions.get(componentId);
      if (renderFn) {
        scheduleDOMUpdate(renderFn, componentId);
      }
    });
  }

  /**
   * Clean up component dependencies when component is destroyed
   */
  cleanup(componentId: string): void {
    const dependencies = this.componentDependencies.get(componentId);
    if (dependencies) {
      dependencies.forEach(state => state.removeDependent(componentId));
      this.componentDependencies.delete(componentId);
    }
    this.componentRenderFunctions.delete(componentId);
    this.componentStateStorage.delete(componentId);
    this.stateIndexCounter.delete(componentId);
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
  }

  get value(): T {
    // Track this state as a dependency when accessed during render
    reactiveSystem.trackDependency(this);
    return this._value;
  }

  set value(newValue: T) {
    // Check for state modifications during render (potential infinite loop)
    if (reactiveSystem.isRenderingComponent()) {
      console.warn(
        '🚨 State modification detected during render! This can cause infinite loops.\n' +
        '  • Move state updates to event handlers\n' +
        '  • Use useEffect/watch for side effects\n' +
        '  • Ensure computed properties don\'t modify state'
      );
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
