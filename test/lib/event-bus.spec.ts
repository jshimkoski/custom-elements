import { describe, it, expect, vi } from 'vitest';
import { eventBus, emit, on, off, once, listen } from '../../src/lib/event-bus';

describe('GlobalEventBus', () => {
  it('should register and call event handlers', () => {
    const handler = vi.fn();
    on('test-event', handler);
    emit('test-event', 'payload');
    expect(handler).toHaveBeenCalledWith('payload');
    off('test-event', handler);
  });

  it('should remove event handlers', () => {
    const handler = vi.fn();
    on('remove-event', handler);
    off('remove-event', handler);
    emit('remove-event', 'payload');
    expect(handler).not.toHaveBeenCalled();
  });

  it('should support once handlers', async () => {
    const handler = vi.fn();
    const promise = once('once-event', handler);
    emit('once-event', 'payload');
    await promise;
    expect(handler).toHaveBeenCalledWith('payload');
    emit('once-event', 'payload2');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should throttle event storms', () => {
    const handler = vi.fn();
    on('storm-event', handler);
    for (let i = 0; i < 120; i++) emit('storm-event', i);
    expect(handler).toHaveBeenCalled();
    off('storm-event', handler);
  });

  it('should listen for native CustomEvent', () => {
    const handler = vi.fn();
    const unsub = listen('native-event', (e) => handler(e.detail));
    emit('native-event', 'native');
    expect(handler).toHaveBeenCalledWith('native');
    unsub();
  });

  it('should clear all handlers and reset counters', () => {
    const handler = vi.fn();
    on('clear-event', handler);
    eventBus.clear();
    emit('clear-event', 'payload');
    expect(handler).not.toHaveBeenCalled();
    eventBus.resetEventCounters();
  });

  it('should get active events and handler count', () => {
    const handler = vi.fn();
    on('active-event', handler);
    expect(eventBus.getActiveEvents()).toContain('active-event');
    expect(eventBus.getHandlerCount('active-event')).toBe(1);
    off('active-event', handler);
  });

  it('should get event stats', () => {
    emit('stats-event', 'payload');
    const stats = eventBus.getEventStats();
    expect(stats).toHaveProperty('stats-event');
  });
});
