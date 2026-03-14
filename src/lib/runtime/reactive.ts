import { scheduleDOMUpdate } from './scheduler';
import { ProxyOptimizer } from './reactive-proxy-cache';
import { devWarn } from './logger';
import { isDiscoveryRender } from './discovery-state';
import type { WatchOptions } from './types';

// Monotonic counter used to generate deterministic hook IDs.
// Cheaper than crypto.randomUUID() and produces stable, debuggable identifiers.
let _hookIdCounter = 0;
function nextHookId(prefix: string): string {
  return `${prefix}-${++_hookIdCounter}`;
}

/**
 * Global reactive system for tracking dependencies and triggering updates
 */
class ReactiveSystem {
  // Use a stack to support nested callers (component render -> watcher)
  // so that watchers can temporarily become the "current component" while
  // establishing dependencies without clobbering the outer component id.
  private currentComponentStack: string[] = [];
  // Consolidated component data: stores dependencies, render function, state index, and last warning time
  private componentData = new Map<
    string,
    {
      dependencies: Set<ReactiveState<unknown>>;
      renderFn: () => void;
      stateIndex: number;
      lastWarnTime: number;
      // watchers registered by the component during render
      watchers: Map<string, string>;
    }
  >();
  // Flat storage: compound key `${componentId}:${stateIndex}` -> ReactiveState
  private stateStorage = new Map<string, ReactiveState<unknown>>();
  private trackingDisabled = false;

  /**
   * Set the current component being rendered for dependency tracking
   */
  setCurrentComponent(componentId: string, renderFn: () => void): void {
    // Push onto the stack so nested calls can restore previous component
    this.currentComponentStack.push(componentId);
    // (no-op) push logged in debug builds
    if (!this.componentData.has(componentId)) {
      this.componentData.set(componentId, {
        dependencies: new Set(),
        renderFn,
        stateIndex: 0,
        lastWarnTime: 0,
        watchers: new Map(),
      });
    } else {
      const data = this.componentData.get(componentId)!;
      // Clean up watchers from previous renders so they don't accumulate
      if (data.watchers && data.watchers.size) {
        for (const wid of data.watchers.values()) {
          try {
            this.cleanup(wid);
          } catch {
            // swallow
          }
        }
        data.watchers.clear();
      }
      data.renderFn = renderFn;
      data.stateIndex = 0; // Reset state index for this render
    }
  }

  /**
   * Clear the current component after rendering
   */
  clearCurrentComponent(): void {
    // Pop the current component off the stack and restore the previous one
    this.currentComponentStack.pop();
  }

  /**
   * Get the current component id (top of stack) or null
   */
  getCurrentComponentId(): string | null {
    return this.currentComponentStack.length
      ? this.currentComponentStack[this.currentComponentStack.length - 1]
      : null;
  }

  /**
   * Register a watcher id under a component so it can be cleaned up on re-render
   */
  registerWatcher(componentId: string, watcherId: string): void {
    const data = this.componentData.get(componentId);
    if (!data) return;
    data.watchers.set(watcherId, watcherId);
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
    return this.currentComponentStack.length > 0;
  }

  /**
   * Return whether we should emit a render-time warning for the current component.
   * This throttles warnings to avoid spamming the console for legitimate rapid updates.
   */
  shouldEmitRenderWarning(): boolean {
    const current = this.currentComponentStack.length
      ? this.currentComponentStack[this.currentComponentStack.length - 1]
      : null;
    if (!current) return true;
    const data = this.componentData.get(current);
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
    const current = this.currentComponentStack.length
      ? this.currentComponentStack[this.currentComponentStack.length - 1]
      : null;
    if (!current) {
      return new ReactiveState(initialValue);
    }

    const data = this.componentData.get(current);
    if (!data) {
      return new ReactiveState(initialValue);
    }
    const stateKey = `${current}:${data.stateIndex++}`;
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
  trackDependency(state: ReactiveState<unknown>): void {
    if (this.trackingDisabled) return;
    const current = this.currentComponentStack.length
      ? this.currentComponentStack[this.currentComponentStack.length - 1]
      : null;
    if (!current) return;

    const data = this.componentData.get(current);
    if (data) {
      data.dependencies.add(state);
      state.addDependent(current);
      // dependency tracked
    }
  }

  /**
   * Re-register all reactive dependencies that `fromId` tracks into the
   * currently-active (outer) component context.
   *
   * Used by `computed()` to forward its dep-set to the consuming component
   * without re-executing the getter function a second time.
   */
  propagateDependencies(fromId: string): void {
    if (this.trackingDisabled) return;
    const current = this.currentComponentStack.length
      ? this.currentComponentStack[this.currentComponentStack.length - 1]
      : null;
    if (!current || current === fromId) return;
    const sourceData = this.componentData.get(fromId);
    if (!sourceData) return;
    const targetData = this.componentData.get(current);
    if (!targetData) return;
    for (const state of sourceData.dependencies) {
      targetData.dependencies.add(state);
      state.addDependent(current);
    }
  }

  /**
   * Trigger updates for all components that depend on a state
   */
  triggerUpdate(state: ReactiveState<unknown>): void {
    const deps = state.getDependents();
    // trigger update for dependents
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
  /** The unwrapped value last assigned — used for Object.is equality checks. */
  private _rawValue: T;
  private dependents = new Set<string>();

  constructor(initialValue: T) {
    this._rawValue = initialValue;
    this._value = this.makeReactive(initialValue);
    // Mark instances with a stable cross-bundle symbol so other modules
    // can reliably detect ReactiveState objects even when classes are
    // renamed/minified or when multiple copies of the package exist.
    try {
      // Use a global symbol key to make it resilient across realms/bundles
      const key = Symbol.for('@cer/ReactiveState');
      Object.defineProperty(this, key, {
        value: true,
        enumerable: false,
        configurable: false,
      });
    } catch {
      // ignore if Symbol.for or defineProperty fails in exotic runtimes
    }
  }

  get value(): T {
    // Track this state as a dependency when accessed during render
    reactiveSystem.trackDependency(this);
    return this._value;
  }

  set value(newValue: T) {
    // Skip update entirely when the new value is identical to the current raw
    // value. This prevents spurious triggerUpdate() calls and downstream
    // re-renders when the same primitive or same object reference is re-assigned
    // (e.g. setting viewYear.value = viewYear.value has zero cost).
    if (Object.is(newValue, this._rawValue)) return;

    // Check for state modifications during render (potential infinite loop)
    if (reactiveSystem.isRenderingComponent()) {
      if (reactiveSystem.shouldEmitRenderWarning()) {
        devWarn(
          '🚨 State modification detected during render! This can cause infinite loops.\n' +
            '  • Move state updates to event handlers\n' +
            '  • Use watchEffect/watch for side effects\n' +
            "  • Ensure computed properties don't modify state",
        );
      }
    }

    this._rawValue = newValue;
    this._value = this.makeReactive(newValue);
    // Trigger updates for all dependent components
    reactiveSystem.triggerUpdate(this);
  }

  /**
   * Read the current value without registering a reactive dependency.
   * Useful for internal infrastructure (e.g. stable hook slots) that must
   * inspect the stored value without re-triggering the containing component.
   * @internal
   */
  peek(): T {
    return this._value;
  }

  /**
   * Set the initial value without triggering any reactive updates or warnings.
   * Only intended for internal/infrastructure use (e.g. storing a stable hook
   * handle in a reactive slot without causing a spurious re-render).
   * The value is stored as-is without reactive proxy wrapping so that opaque
   * objects (e.g. TeleportHandle) are not accidentally instrumented.
   * @internal
   */
  initSilent(value: T): void {
    this._rawValue = value;
    this._value = value;
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

  private makeReactive<U>(obj: U): U {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    // Skip reactivity for DOM nodes - they should not be made reactive
    if (
      (obj as unknown) instanceof Node ||
      (obj as unknown) instanceof Element ||
      (obj as unknown) instanceof HTMLElement
    ) {
      return obj;
    }

    // Use optimized proxy creation
    return ProxyOptimizer.createReactiveProxy(
      obj as unknown as object,
      () => reactiveSystem.triggerUpdate(this),
      (value: unknown) => this.makeReactive(value),
    ) as U;
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
export function ref(): ReactiveState<null>;
export function ref<T>(initialValue: T): ReactiveState<T>;
export function ref<T>(initialValue?: T): ReactiveState<T | null> {
  // Ensure the created state has the union type T | null and explicitly
  // tell getOrCreateState the correct generic to avoid conditional-type recursion.
  return reactiveSystem.getOrCreateState<T | null>(
    (initialValue === undefined ? null : (initialValue as T)) as T | null,
  );
}

/**
 * Type guard to detect ReactiveState instances in a robust way that works
 * across bundlers, minifiers, and multiple package copies.
 */
export function isReactiveState(v: unknown): v is ReactiveState<unknown> {
  if (!v || typeof v !== 'object') return false;
  try {
    const key = Symbol.for('@cer/ReactiveState');
    // Safely check for the presence of the symbol-keyed property without indexing with a unique symbol
    return Object.prototype.hasOwnProperty.call(v, key);
  } catch {
    return false;
  }
}

/**
 * Create computed state that derives from other reactive state.
 * The result is cached and only recomputed when tracked reactive dependencies change.
 *
 * @example
 * ```ts
 * const firstName = ref('John');
 * const lastName = ref('Doe');
 * const fullName = computed(() => `${firstName.value} ${lastName.value}`);
 * console.log(fullName.value); // 'John Doe' — cached until firstName or lastName changes
 * ```
 */
export function computed<T>(fn: () => T): { readonly value: T } {
  let cachedValue: T;
  let isDirty = true;

  // Unique identifier used ONLY to track which reactive states this computed depends
  // on (for cache invalidation). It does NOT serve as a "current component" for
  // downstream notification — that is handled by running fn() in the outer context.
  const computedId = nextHookId('computed');

  // invalidate() only marks the cache stale. It does NOT call triggerUpdate because
  // the calling component is notified directly via the outer fn() call (see get value()).
  const invalidate = (): void => {
    isDirty = true;
  };

  // Register under the current component (if inside a render) so cleanup is automatic.
  try {
    const parentComp = reactiveSystem.getCurrentComponentId();
    if (parentComp) {
      reactiveSystem.registerWatcher(parentComp, computedId);
    }
  } catch {
    /* ignore */
  }

  // Initial computation: establishes which reactive sources this computed depends on
  // for invalidation tracking.
  reactiveSystem.setCurrentComponent(computedId, invalidate);
  cachedValue = fn();
  reactiveSystem.clearCurrentComponent();
  isDirty = false;

  return {
    get value(): T {
      if (isDirty) {
        // Re-run fn() in computedId's context to re-subscribe for future invalidations.
        reactiveSystem.setCurrentComponent(computedId, invalidate);
        cachedValue = fn();
        reactiveSystem.clearCurrentComponent();
        isDirty = false;
      }

      // Forward the computed's tracked dependencies into the calling context so
      // that the outer component (or outer computed) is notified directly when any
      // dep changes — without re-executing fn() a second time.
      reactiveSystem.propagateDependencies(computedId);

      return cachedValue;
    },
  };
}

/**
 * Run a side-effect function immediately and automatically re-run it whenever
 * any reactive state accessed inside `fn` changes. Similar to Vue's `watchEffect`.
 *
 * @returns A cleanup function that stops the effect.
 *
 * @example
 * ```ts
 * const count = ref(0);
 * const stop = watchEffect(() => {
 *   document.title = `Count: ${count.value}`;
 * });
 * count.value++; // automatically re-runs the effect
 * stop(); // cancel the effect
 * ```
 */
export function watchEffect(fn: () => void): () => void {
  // During discovery render, skip setting up effects — fn may have side effects
  // (API calls, mutations) that should only run in real render contexts.
  if (isDiscoveryRender()) return () => {};

  const effectId = nextHookId('effect');

  // Register under the current component for automatic cleanup on re-render/destroy.
  try {
    const parentComp = reactiveSystem.getCurrentComponentId();
    if (parentComp) {
      reactiveSystem.registerWatcher(parentComp, effectId);
    }
  } catch {
    /* ignore */
  }

  const run = (): void => {
    reactiveSystem.setCurrentComponent(effectId, run);
    try {
      fn();
    } finally {
      reactiveSystem.clearCurrentComponent();
    }
  };

  // Run immediately to establish dependencies and execute the initial side effect.
  run();

  return () => {
    reactiveSystem.cleanup(effectId);
  };
}

/**
 * Recursively deep-clone a value into a plain (non-reactive) snapshot.
 *
 * Rules:
 *  - Primitives and functions are returned as-is.
 *  - `Date` instances are cloned.
 *  - Arrays are cloned element-by-element (works through Proxy).
 *  - Plain objects are cloned key-by-key (works through Proxy `get` traps).
 *  - DOM nodes are returned as-is (cloning nodes is out of scope).
 *  - Circular references are handled via a `WeakMap` seen-set.
 *
 * @internal — used by deep watchers to capture before/after state snapshots.
 */
function deepClone<T>(value: T, seen = new WeakMap<object, unknown>()): T {
  if (value === null || typeof value !== 'object') return value;
  const obj = value as object;
  if (seen.has(obj)) return seen.get(obj) as T;
  // Do not attempt to clone DOM nodes
  if (typeof Node !== 'undefined' && obj instanceof Node) return value;
  // Clone Date
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  // Clone Array (Array.isArray is Proxy-transparent)
  if (Array.isArray(obj)) {
    const arr: unknown[] = [];
    seen.set(obj, arr);
    for (let i = 0; i < (obj as unknown[]).length; i++) {
      arr.push(deepClone((obj as unknown[])[i], seen));
    }
    return arr as unknown as T;
  }
  // Clone plain object (Object.keys + Reflect.get work through Proxy)
  const copy: Record<string, unknown> = {};
  seen.set(obj, copy);
  for (const key of Object.keys(obj)) {
    try {
      copy[key] = deepClone((obj as Record<string, unknown>)[key], seen);
    } catch {
      // skip inaccessible or throwing properties
    }
  }
  return copy as unknown as T;
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
  source: ReactiveState<T>,
  callback: (newValue: T, oldValue?: T) => void,
  options?: WatchOptions,
): () => void;
export function watch<T>(
  source: () => T,
  callback: (newValue: T, oldValue?: T) => void,
  options?: WatchOptions,
): () => void;
export function watch<T>(
  source: ReactiveState<T> | (() => T),
  callback: (newValue: T, oldValue?: T) => void,
  options?: WatchOptions,
): () => void {
  // During discovery render, skip setting up watchers — callbacks may contain
  // side effects that should only run against real component instances.
  if (isDiscoveryRender()) return () => {};

  // Note: we must establish reactive dependencies first (a tracked
  // call) and only then capture the initial `oldValue`. Capturing
  // `oldValue` before registering as a dependent means the first
  // tracked value may differ and lead to missed or spurious callbacks.
  let oldValue: T;
  // Normalize source: accept either a ReactiveState or a getter function
  const getter: () => T = ((): (() => T) => {
    // runtime check for ReactiveState instances
    if (isReactiveState(source)) {
      // cast to ReactiveState<T> and return getter
      return () => (source as ReactiveState<T>).value;
    }
    return source as () => T;
  })();

  // Create a dummy component to track dependencies
  const watcherId = nextHookId('watch');

  // If called during a component render, register this watcher under that
  // component so watchers created in render are cleaned up on re-render.
  try {
    const parentComp = reactiveSystem.getCurrentComponentId();
    if (parentComp) {
      reactiveSystem.registerWatcher(parentComp, watcherId);
    }
  } catch {
    /* ignore */
  }

  const updateWatcher = () => {
    reactiveSystem.setCurrentComponent(watcherId, updateWatcher);
    const newValue = getter();
    reactiveSystem.clearCurrentComponent();

    if (options?.deep) {
      // Deep watchers: nested mutations keep the same proxy reference, so
      // reference equality is not a reliable change signal. Always fire
      // the callback and provide independent deep-cloned snapshots so
      // callers receive distinct before/after plain-object values.
      const newSnapshot = reactiveSystem.withoutTracking(() =>
        deepClone(newValue),
      ) as T;
      callback(newSnapshot, oldValue);
      oldValue = newSnapshot;
    } else if (newValue !== oldValue) {
      callback(newValue, oldValue);
      oldValue = newValue;
    }
  };

  // Initial run to establish dependencies
  reactiveSystem.setCurrentComponent(watcherId, updateWatcher);
  // Capture the tracked initial value as the baseline
  oldValue = getter();
  reactiveSystem.clearCurrentComponent();

  // For deep watchers, snapshot the initial value so that oldValue is a
  // stable plain-object clone that won't be mutated in-place by the user.
  if (options?.deep) {
    oldValue = reactiveSystem.withoutTracking(() => deepClone(oldValue)) as T;
  }

  // If immediate is requested, invoke the callback once with the
  // current value as `newValue` and `undefined` as the previous value
  // to match Vue's common semantics.
  if (options && options.immediate) {
    callback(oldValue, undefined);
  }

  // Return cleanup function
  return () => {
    reactiveSystem.cleanup(watcherId);
  };
}
