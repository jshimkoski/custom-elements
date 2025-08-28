type Listener<T> = (state: T) => void;

export interface Store<T extends object> {
  subscribe(listener: Listener<T>): void;
  getState(): T;
}

export function createStore<T extends object>(initial: T) {
  let state = new Proxy(initial, {
    set: (target, prop, value) => {
      (target as any)[prop] = value;
      notify();
      return true;
    }
  });

  const listeners: Listener<T>[] = [];

  function subscribe(listener: Listener<T>) {
    listeners.push(listener);
    listener(state); // Initial call
  }

  function getState(): T {
    return state;
  }

  function notify() {
    listeners.forEach((fn) => fn(state));
  }

  return { subscribe, getState };
}
