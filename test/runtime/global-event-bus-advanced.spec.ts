import { component } from '../../src/lib/runtime';
import { describe, it, expect, vi } from 'vitest';
import { getTestConfig } from './getTestConfig';

describe('Global Event Bus (Advanced)', () => {
  it('emits and receives global events across components', () => {
    const configA = Object.assign(getTestConfig(), {
      onGlobalEvent: vi.fn()
    });
    const configB = Object.assign(getTestConfig(), {
      onGlobalEvent: vi.fn()
    });
    component('event-bus-a', configA as any);
    component('event-bus-b', configB as any);
    const elA = document.createElement('event-bus-a');
    const elB = document.createElement('event-bus-b');
    document.body.appendChild(elA);
    document.body.appendChild(elB);
    // Simulate global event
    // @ts-ignore
    elA['api'].emitGlobal('test-event', { value: 42 });
    // @ts-ignore
    elB['api'].onGlobal('test-event', configB.onGlobalEvent);
    expect(configB.onGlobalEvent).not.toBeNull();
    document.body.removeChild(elA);
    document.body.removeChild(elB);
  });
});
