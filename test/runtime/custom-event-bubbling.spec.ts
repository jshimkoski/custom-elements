import { component } from '../../src/lib/runtime';
import { describe, it, expect, vi } from 'vitest';
import { getTestConfig } from './getTestConfig';

describe('Custom Event Bubbling and Cancellation', () => {
  it('bubbles custom events through Shadow DOM', () => {
    const config = {
      ...getTestConfig(),
      template: () => `<button data-on-click=\"onCustom\">Click</button>`,
      onCustom: vi.fn()
    };
    component('bubble-element', config);
    const el = document.createElement('bubble-element');
    document.body.appendChild(el);
    const btn = el.shadowRoot!.querySelector('button')!;
    btn.dispatchEvent(new Event('click', { bubbles: true }));
    expect(config.onCustom).toHaveBeenCalled();
    document.body.removeChild(el);
  });

  it('can cancel custom events', () => {
    const config = {
      ...getTestConfig(),
      template: () => `<button data-on-click=\"onCustom\">Click</button>`,
      onCustom: vi.fn((e: Event) => e.preventDefault())
    };
    component('cancel-element', config);
    const el = document.createElement('cancel-element');
    document.body.appendChild(el);
    const btn = el.shadowRoot!.querySelector('button')!;
    const event = new Event('click', { bubbles: true, cancelable: true });
    btn.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    document.body.removeChild(el);
  });
});
