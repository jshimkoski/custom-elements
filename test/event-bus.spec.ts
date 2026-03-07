import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eventBus, emit, on, off, once, listen } from '../src/lib/event-bus';

describe('event-bus', () => {
  beforeEach(() => {
    eventBus.clear();
    eventBus.resetEventCounters();
  });

  it('should register and emit events', () => {
    const handler = vi.fn();
    on('test', handler);
    emit('test', 42);
    expect(handler).toHaveBeenCalledWith(42);
  });

  it('should remove event handler with off', () => {
    const handler = vi.fn();
    on('test', handler);
    off('test', handler);
    emit('test', 123);
    expect(handler).not.toHaveBeenCalled();
  });

  it('once() callback form — fires handler exactly once, returns void', async () => {
    const handler = vi.fn();
    const ret = once('test', handler);
    // Callback form must return void, not a Promise
    expect(ret).toBeUndefined();
    emit('test', 'hello');
    expect(handler).toHaveBeenCalledWith('hello');
    emit('test', 'again');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('once() promise form — resolves on first emission, no handler needed', async () => {
    const promise = once<string>('test-promise');
    // Must return a real Promise
    expect(promise).toBeInstanceOf(Promise);
    emit('test-promise', 'data');
    const result = await promise;
    expect(result).toBe('data');
  });

  it('once() promise form — does not resolve for subsequent emissions', async () => {
    let resolvedValue: string | undefined;
    const promise = once<string>('test-once-only');
    promise.then((v) => {
      resolvedValue = v;
    });
    emit('test-once-only', 'first');
    // Allow microtask queue to flush
    await Promise.resolve();
    expect(resolvedValue).toBe('first');
    // second emission should not change the already-resolved promise
    emit('test-once-only', 'second');
    await Promise.resolve();
    expect(resolvedValue).toBe('first');
  });

  it('should support listen for native CustomEvent', () => {
    const handler = vi.fn();
    const unsub = listen('native', handler);
    eventBus.dispatchEvent(new CustomEvent('native', { detail: 'data' }));
    expect(handler).toHaveBeenCalled();
    unsub();
    eventBus.dispatchEvent(new CustomEvent('native', { detail: 'data2' }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should remove all handlers for an event with offAll', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    on('multi', h1);
    on('multi', h2);
    eventBus.offAll('multi');
    emit('multi', 'gone');
    expect(h1).not.toHaveBeenCalled();
    expect(h2).not.toHaveBeenCalled();
  });

  it('should clear all handlers with clear', () => {
    const h1 = vi.fn();
    on('a', h1);
    eventBus.clear();
    emit('a', 'nope');
    expect(h1).not.toHaveBeenCalled();
  });

  it('should return active events', () => {
    const h1 = vi.fn();
    on('a', h1);
    expect(eventBus.getActiveEvents()).toContain('a');
    off('a', h1);
    expect(eventBus.getActiveEvents()).not.toContain('a');
  });

  it('should return correct handler count', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    on('a', h1);
    on('a', h2);
    expect(eventBus.getHandlerCount('a')).toBe(2);
    off('a', h1);
    expect(eventBus.getHandlerCount('a')).toBe(1);
  });

  it('should provide event stats', () => {
    const h1 = vi.fn();
    on('stat', h1);
    emit('stat', 1);
    emit('stat', 2);
    const stats = eventBus.getEventStats();
    expect(stats.stat.count).toBeGreaterThan(0);
    expect(stats.stat.handlersCount).toBe(1);
  });

  it('should reset event counters', () => {
    const h1 = vi.fn();
    on('reset', h1);
    emit('reset', 1);
    eventBus.resetEventCounters();
    const stats = eventBus.getEventStats();
    expect(stats.reset).toBeUndefined();
  });

  it('should protect against event storms', () => {
    const handler = vi.fn();
    on('storm', handler);
    for (let i = 0; i < 120; i++) {
      emit('storm', i);
    }
    // Should throttle/block after 100 events
    expect(handler).toHaveBeenCalledTimes(100);
  });
});
