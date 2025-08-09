/**
 * Lightweight reactive state with computed properties and change notification.
 * @template T - State shape
 * @template C - Computed property map
 */
export function reactive<T extends object, C extends Record<string, (state: T) => any>>(
  initialState: T,
  computedMap?: C
): T & { subscribe: (fn: (state: T) => void) => () => void } & { [K in keyof C]: ReturnType<C[K]> } {
  const listeners: Array<(state: T) => void> = [];
  const state = { ...initialState } as T & { [K in keyof C]: ReturnType<C[K]> };

  // Attach computed property getters
  if (computedMap) {
    for (const key in computedMap) {
      Object.defineProperty(state, key, {
        get() {
          return computedMap[key](state);
        },
        enumerable: true,
        configurable: true,
      });
    }
  }

  // Mutation API
  function set(changes: Partial<T>) {
    Object.assign(state, changes);
    listeners.forEach(fn => fn(state));
  }

  // Subscribe API
  function subscribe(fn: (state: T) => void) {
    listeners.push(fn);
    return () => {
      const idx = listeners.indexOf(fn);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }

  // Attach mutation and subscribe
  Object.defineProperty(state, 'set', {
    value: set,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  Object.defineProperty(state, 'subscribe', {
    value: subscribe,
    enumerable: false,
    configurable: false,
    writable: false,
  });

  return state as T & { subscribe: (fn: (state: T) => void) => () => void } & { [K in keyof C]: ReturnType<C[K]> };
}
