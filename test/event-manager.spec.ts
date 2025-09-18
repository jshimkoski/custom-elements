import { describe, it, expect, beforeEach } from 'vitest';
import { EventManager, DetailedEventManager } from '../src/lib/runtime/event-manager';

describe('EventManager', () => {
  beforeEach(() => {
    // Reset global state
    // @ts-ignore access testing helper
    EventManager.cleanupAll();
  });

  it('adds and removes listeners and tracks counts', () => {
    const el = document.createElement('div');
    const handler = () => {};

    expect(EventManager.hasListeners(el)).toBe(false);
    EventManager.addListener(el, 'click', handler);
    expect(EventManager.hasListeners(el)).toBe(true);
    expect(EventManager.getListenerCount(el)).toBe(1);

    EventManager.removeListener(el, 'click', handler);
    // removeListener implementation may leave WeakMap empty, so count may be 0
    expect(EventManager.getListenerCount(el)).toBe(0);
  });

  it('cleanup removes all listeners', () => {
    const el = document.createElement('div');
    const calls: string[] = [];
    const handler = () => calls.push('called');

    EventManager.addListener(el, 'click', handler);
    el.dispatchEvent(new Event('click'));
    expect(calls.length).toBe(1);

    EventManager.cleanup(el);
    el.dispatchEvent(new Event('click'));
    expect(calls.length).toBe(1);
  });
});

describe('DetailedEventManager', () => {
  it('tracks metadata and allows removal', () => {
    const el = document.createElement('div');
    const handler = () => {};

    DetailedEventManager.addListener(el, 'custom', handler, { capture: true });
    const info = DetailedEventManager.getListenerInfo(el);
    expect(info.length).toBe(1);
    expect(info[0].event).toBe('custom');

    const removed = DetailedEventManager.removeListener(el, 'custom', handler, { capture: true });
    expect(removed).toBe(true);
    expect(DetailedEventManager.getListenerInfo(el).length).toBe(0);
  });

  it('cleanup removes all detailed listeners', () => {
    const el = document.createElement('div');
    let called = 0;
    const handler = () => called++;

    DetailedEventManager.addListener(el, 'x', handler);
    el.dispatchEvent(new Event('x'));
    expect(called).toBe(1);

    DetailedEventManager.cleanup(el);
    el.dispatchEvent(new Event('x'));
    expect(called).toBe(1);
  });
});
