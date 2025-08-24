import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStore } from '../src/lib/store';

describe('createStore', () => {
  let store: ReturnType<typeof createStore<{ count: number; theme: string }>>;

  beforeEach(() => {
    store = createStore({ count: 0, theme: 'light' });
  });

  it('should initialize with given state', () => {
    expect(store.getState().count).toBe(0);
    expect(store.getState().theme).toBe('light');
  });

  it('should notify subscribers on state change', () => {
    const handler = vi.fn();
    store.subscribe(handler);
    store.getState().count = 1;
    expect(handler).toHaveBeenCalledWith(store.getState());
  });

  it('should call subscriber immediately on subscribe', () => {
    const handler = vi.fn();
    store.subscribe(handler);
    expect(handler).toHaveBeenCalledWith(store.getState());
  });

  it('should update state via Proxy', () => {
    store.getState().theme = 'dark';
    expect(store.getState().theme).toBe('dark');
  });

  it('should notify all subscribers on change', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    store.subscribe(h1);
    store.subscribe(h2);
    store.getState().count = 2;
    expect(h1).toHaveBeenCalledWith(store.getState());
    expect(h2).toHaveBeenCalledWith(store.getState());
  });

  it('should handle multiple property changes', () => {
    const handler = vi.fn();
    store.subscribe(handler);
    store.getState().count = 5;
    store.getState().theme = 'blue';
    expect(handler).toHaveBeenCalledTimes(3); // initial + 2 changes
  });

  it('should not break if no subscribers', () => {
    expect(() => {
      store.getState().count = 10;
    }).not.toThrow();
  });

  it('should allow subscribing after state changes', () => {
    store.getState().count = 7;
    const handler = vi.fn();
    store.subscribe(handler);
    expect(handler).toHaveBeenCalledWith(store.getState());
  });
});