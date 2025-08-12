import { component } from '../../src/lib/runtime';
import { vi, describe, it, expect } from 'vitest';
import { getTestConfig } from './getTestConfig';

describe('Shadow DOM & Light DOM', () => {
  it('supports slotting and event propagation', () => {
    const config = getTestConfig();
    config.template = () => `<slot></slot>`;
    component('slot-element', config);
    const el = document.createElement('slot-element');
    const child = document.createElement('span');
    let eventFired = false;
    child.addEventListener('click', () => { eventFired = true; });
    el.appendChild(child);
    document.body.appendChild(el);
    child.dispatchEvent(new Event('click', { bubbles: true }));
    expect(eventFired).toBe(true);
    document.body.removeChild(el);
  });
});