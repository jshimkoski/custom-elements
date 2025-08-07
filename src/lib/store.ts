
// Usage example
// import { Store } from './lib/store';

// export const globalState = new Store({ theme: 'light', count: 0 });

// // In a component
// globalState.subscribe((state) => {
//   console.log('Global changed:', state.count);
// });

// src/lib/store.ts
type Listener<T> = (state: T) => void;

export class Store<T extends object> {
  private state: T;
  private listeners: Listener<T>[] = [];

  constructor(initial: T) {
    this.state = new Proxy(initial, {
      set: (target, prop, value) => {
        (target as any)[prop] = value;
        this.notify();
        return true;
      }
    });
  }

  subscribe(listener: Listener<T>) {
    this.listeners.push(listener);
    listener(this.state); // Initial call
  }

  getState(): T {
    return this.state;
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.state));
  }
}
