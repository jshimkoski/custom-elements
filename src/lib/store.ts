
// Usage example
// import { Store } from './lib/store';

// export const globalState = Store({ theme: 'light', count: 0 });

// // In a component
// globalState.subscribe((state) => {
//   console.log('Global changed:', state.count);
// });

// src/lib/store.ts
type Listener<T> = (state: T) => void;

export function Store<T extends object>(initial: T) {
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
