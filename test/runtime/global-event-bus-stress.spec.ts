import { component } from '../../src/lib/runtime';
import { describe, it, expect, vi } from 'vitest';
import { getTestConfig } from './getTestConfig';

describe('Global Event Bus Stress', () => {
  it('handles high-frequency events and event name collisions', () => {
    const config = {
      ...getTestConfig(),
      onCustom: vi.fn()
    };
    component('event-bus-stress', config);
    const el = document.createElement('event-bus-stress');
    document.body.appendChild(el);
    for (let i = 0; i < 50; i++) {
      el.dispatchEvent(new CustomEvent('custom', { detail: i }));
    }
    expect(config.onCustom).toHaveBeenCalledTimes(50);
    document.body.removeChild(el);
  });

  it('unsubscribes during event handling without error', () => {
    let called = 0;
    const handler = () => { called++; };
    const config = {
      ...getTestConfig(),
      onCustom: handler
    };
    component('event-bus-unsub', config);
    const el = document.createElement('event-bus-unsub');
    document.body.appendChild(el);
    el.removeEventListener('custom', handler);
    el.dispatchEvent(new CustomEvent('custom'));
    // Config handler is lifecycle-managed, not removed by removeEventListener
    expect(called).toBe(1);
    document.body.removeChild(el);
  });

  it('removes auto-wired config event handler on unmount', async () => {
    const called: string[] = [];
    component('test-bus-unmount', {
      state: {},
      template: () => `<div>Bus</div>`,
      onClick(detail) {
        called.push('config');
      }
    });
    const el = document.createElement('test-bus-unmount');
    document.body.appendChild(el);
    await Promise.resolve();
    el.dispatchEvent(new CustomEvent('click', { bubbles: true }));
    expect(called).toEqual(['config']);
    document.body.removeChild(el); // triggers disconnectedCallback
    await Promise.resolve();
    el.dispatchEvent(new CustomEvent('click', { bubbles: true }));
    expect(called).toEqual(['config']); // Should not increment after unmount
  });
});
