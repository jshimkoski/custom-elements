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
  const computedKeys = computedMap ? Object.keys(computedMap) : [];
  const state = { ...initialState } as T;

  // Subscribe API
  function subscribe(fn: (state: T) => void) {
    listeners.push(fn);
    return () => {
      const idx = listeners.indexOf(fn);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }

  // Mutation API (for compatibility)
  function set(changes: Partial<T>) {
    Object.assign(proxy, changes);
    listeners.forEach(fn => fn(proxy));
  }

  // Proxy handler for reactivity and computed properties
  const proxy = new Proxy(state as T, {
    get(target, prop, receiver) {
      if (prop === 'subscribe') return subscribe;
      if (prop === 'set') return set;
      if (computedMap && computedKeys.includes(prop as string)) {
        return computedMap[prop as keyof C](proxy);
      }
      return Reflect.get(target, prop, receiver);
    },
    set(target, prop, value, receiver) {
      if (computedMap && computedKeys.includes(prop as string)) {
        // Computed properties are read-only
        return false;
      }
      const oldValue = target[prop as keyof T];
      const result = Reflect.set(target, prop, value, receiver);
      if (oldValue !== value) {
        listeners.forEach(fn => fn(proxy));
      }
      return result;
    },
    deleteProperty(target, prop) {
      if (computedMap && computedKeys.includes(prop as string)) {
        // Computed properties are read-only
        return false;
      }
      const result = Reflect.deleteProperty(target, prop);
      listeners.forEach(fn => fn(proxy));
      return result;
    }
  });

  return proxy as T & { subscribe: (fn: (state: T) => void) => () => void; set: (changes: Partial<T>) => void } & { [K in keyof C]: ReturnType<C[K]> };
}
