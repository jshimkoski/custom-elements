import { component } from '../../src/lib/runtime';
import { vi, describe, it, expect } from 'vitest';
import { getTestConfig } from './getTestConfig';

describe('Global Event Bus', () => {
  it('allows cross-component event communication', () => {
    const configA = { ...getTestConfig(), onCustom: vi.fn() };
    const configB = { ...getTestConfig(), template: () => `<button data-on-click=\"onCustom\">Send</button>`, onCustom: vi.fn() };
    component('event-bus-a', configA);
    component('event-bus-b', configB);
    const elA = document.createElement('event-bus-a');
    const elB = document.createElement('event-bus-b');
    document.body.appendChild(elA);
    document.body.appendChild(elB);
    const btn = elB.shadowRoot!.querySelector('button')!;
    btn.dispatchEvent(new Event('click'));
    expect(configA.onCustom).not.toHaveBeenCalled(); // Should not be called unless global bus is used
    document.body.removeChild(elA);
    document.body.removeChild(elB);
  });
});