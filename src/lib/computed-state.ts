/**
 * Lightweight dependency-tracking reactive state with computed properties.
 * Developer-friendly, performant, treeshakable, no external deps.
 * Usage:
 *   const { state, update } = createReactiveState(initial, computed)
 *   state.computedProp // always up-to-date
 */


export interface ComputedMap<T> {
  [key: string]: (state: T) => any;
}

export interface ComputedState<T extends object, C extends ComputedMap<T>> {
  state: T & { [K in keyof C]: ReturnType<C[K]> };
  recompute: (changes?: Partial<T>) => void;
  watch: (
    key: keyof T | keyof C,
    callback: (value: any) => void,
  options?: { deep?: boolean; immediate?: boolean }
  ) => () => void;
}

export interface ReactiveState<T extends object> {
  update: (changes: Partial<T>) => void;
  onUpdate: (listener: (key: keyof T, value: T[keyof T]) => void) => () => void;
  state: T;
  recompute: (changes?: Partial<T>) => void;
  watch: (
    key: keyof T,
    callback: (value: any) => void,
    options?: { deep?: boolean; immediate?: boolean }
  ) => () => void;
}

/**
 * Core logic for dependency tracking and computed property definition.
 * Used by both computed() and reactive().
 */
function defineComputed<T extends object, C extends ComputedMap<T>>(
  state: T,
  computed: C,
  listeners?: Set<(key: keyof T | keyof C, value: any) => void>
): {
  state: T & { [K in keyof C]: ReturnType<C[K]> };
  depMap: Record<string, Set<string>>;
  computedCache: Partial<{ [K in keyof C]: ReturnType<C[K]> }>;
  recompute: (changes?: Partial<T>) => void;
  watch: (
    key: keyof T | keyof C,
    callback: (value: any) => void,
    options?: { deep?: boolean; immediate?: boolean }
  ) => () => void;
} {
  const _state = { ...state } as T & { [K in keyof C]: ReturnType<C[K]> };
  const depMap: Record<string, Set<string>> = {};
  const computedCache: Partial<{ [K in keyof C]: ReturnType<C[K]> }> = {};

  // Track dependencies for each computed property
  Object.keys(computed).forEach((compKey) => {
    const accessed = new Set<string>();
    const proxy = new Proxy(_state, {
      get(target, prop) {
        accessed.add(prop as string);
        return target[prop as keyof T];
      }
    });
    computedCache[compKey as keyof C] = computed[compKey](proxy);
    accessed.forEach(dep => {
      if (!depMap[dep]) depMap[dep] = new Set();
      depMap[dep].add(compKey);
    });
  });

  // Attach computed properties to state
  Object.keys(computed).forEach((compKey) => {
    Object.defineProperty(_state, compKey, {
      get() {
        return computedCache[compKey as keyof C];
      },
      enumerable: true,
      configurable: true
    });
  });

  // Deep equality check for arrays/objects
  function deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    }
    if (a && b && typeof a === 'object' && typeof b === 'object') {
      const aKeys = Object.keys(a);
      const bKeys = Object.keys(b);
      if (aKeys.length !== bKeys.length) return false;
      for (const key of aKeys) {
        if (!deepEqual(a[key], b[key])) return false;
      }
      return true;
    }
    return false;
  }

  function recompute(changes?: Partial<T>) {
    if (!changes) return;
    Object.entries(changes).forEach(([key, value]) => {
      if (_state[key as keyof T] !== value) {
        _state[key as keyof T] = value as any;
        const affected = depMap[key];
        if (affected) {
          affected.forEach((compKey) => {
            const prev = computedCache[compKey as keyof C];
            const next = computed[compKey](_state);
            if (!deepEqual(prev, next)) {
              computedCache[compKey as keyof C] = next;
              listeners?.forEach(listener => {
                try {
                  listener(compKey as keyof T, next);
                } catch (error) {
                  console.error('[Computed] Listener error:', error);
                }
              });
            }
          });
        }
        listeners?.forEach(listener => {
          try {
            listener(key as keyof T, value);
          } catch (error) {
            console.error('[Computed] Listener error:', error);
          }
        });
      }
    });
  }

  function watch(
    key: keyof T | keyof C,
    callback: (value: any) => void,
    options?: { deep?: boolean; immediate?: boolean }
  ): () => void {
    let lastValue = _state[key];
    const deep = options?.deep ?? false;
    const immediate = options?.immediate ?? false;
    const listener = (changedKey: keyof T | keyof C, value: any) => {
      if (changedKey === key) {
        if (deep) {
          if (!deepEqual(lastValue, value)) {
            lastValue = value;
            callback(value);
          }
        } else {
          callback(value);
        }
      }
    };
    listeners?.add(listener);
    if (immediate) {
      callback(lastValue);
    }
    return () => listeners?.delete(listener);
  }

  return { state: _state, depMap, computedCache, recompute, watch };
}

/**
 * Define computed properties on a state object, without reactivity.
 * Returns state with computed properties and a recompute method.
 */
export function computed<T extends object, C extends ComputedMap<T>>(
  state: T,
  computedMap: C
): ComputedState<T, C> {
  const result = defineComputed(state, computedMap);
  return {
    state: result.state,
    recompute: result.recompute,
    watch: result.watch
  };
}

/**
 * Create a reactive state object with computed properties and update/onUpdate methods.
 */
export function reactive<T extends object>(
  initial: T
): ReactiveState<T> {
  const listeners = new Set<(key: keyof T, value: T[keyof T]) => void>();
  let proxyState: T;

  const result = defineComputed(initial, {}, listeners);

  function update(changes: Partial<T>): void {
    result.recompute(changes);
  }

  function onUpdate(listener: (key: keyof T, value: T[keyof T]) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  proxyState = result.state;

  return {
    state: proxyState,
    update,
    onUpdate,
    recompute: result.recompute,
    watch: result.watch
  };
}
