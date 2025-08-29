type Listener<T> = (state: T) => void;

export interface Store<T extends object> {
  subscribe(listener: Listener<T>): void;
  getState(): T;
  setState(partial: Partial<T> | ((prev: T) => Partial<T>)): void;
}

export function createStore<T extends object>(initial: T): Store<T> {
  let state = { ...initial } as T; // no Proxy needed if we update via setState
  const listeners: Listener<T>[] = [];

  function subscribe(listener: Listener<T>) {
    listeners.push(listener);
    listener(state); // initial push
  }

  function getState(): T {
    return state;
  }

  function setState(partial: Partial<T> | ((prev: T) => Partial<T>)) {
    const next = typeof partial === 'function'
      ? partial(state)
      : partial;

    state = { ...state, ...next };
    notify();
  }

  function notify() {
    listeners.forEach(fn => fn(state));
  }

  return { subscribe, getState, setState };
}
