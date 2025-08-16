import { describe, it, expect } from 'vitest';
import { Store } from '../../src/lib/store';

describe('Store', () => {
  it('should initialize and get state', () => {
    const store = Store({ a: 1, b: 2 });
    expect(store.getState().a).toBe(1);
    expect(store.getState().b).toBe(2);
  });

  it('should notify listeners on state change', () => {
    const store = Store({ a: 1 });
    let called = false;
    store.subscribe((state) => {
      if (state.a === 2) called = true;
    });
    store.getState().a = 2;
    expect(called).toBe(true);
  });

  it('should call all listeners', () => {
    const store = Store({ a: 1 });
    let count = 0;
    store.subscribe(() => { count++; });
    store.subscribe(() => { count++; });
    store.getState().a = 2;
    expect(count).toBe(4); // 2 initial + 2 notify
  });

  it('should allow multiple state properties', () => {
    const store = Store({ x: 1, y: 2 });
    let xVal = 0, yVal = 0;
    store.subscribe((state) => { xVal = state.x; yVal = state.y; });
    store.getState().x = 5;
    store.getState().y = 10;
    expect(xVal).toBe(5);
    expect(yVal).toBe(10);
  });

  it('should not break with no listeners', () => {
    const store = Store({ a: 1 });
    store.getState().a = 2;
    expect(store.getState().a).toBe(2);
  });
});
