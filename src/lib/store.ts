type Listener<T> = (state: T) => void;

export interface Store<T extends object> {
  /**
   * Subscribe to store updates.
   * Returns an unsubscribe function to remove the listener.
   */
  subscribe(listener: Listener<T>): () => void;
  getState(): T;
  setState(partial: Partial<T> | ((prev: T) => Partial<T>)): void;
}

export function createStore<T extends object>(initial: T): Store<T> {
  let state = { ...initial } as T; // no Proxy needed if we update via setState
  const listeners: Listener<T>[] = [];

  function subscribe(listener: Listener<T>) {
    listeners.push(listener);
    listener(state); // initial push

    // Return unsubscribe function
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }

  function getState(): T {
    return state;
  }

  function setState(partial: Partial<T> | ((prev: T) => Partial<T>)) {
    const next = typeof partial === 'function' ? partial(state) : partial;

    state = { ...state, ...next };
    notify();
  }

  function notify() {
    for (const fn of listeners) fn(state);
  }

  return { subscribe, getState, setState };
}
