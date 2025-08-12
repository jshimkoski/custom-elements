import { component } from '../../src/lib/runtime';
import { describe, it, expect } from 'vitest';
import { getTestConfig } from './getTestConfig';

describe('Accessibility', () => {
  it('supports ARIA attributes', () => {
    const config = {
      ...getTestConfig(),
      template: () => `<div aria-label=\"Greeting\">Hello</div>`
    };
    component('aria-element', config);
    const el = document.createElement('aria-element');
    document.body.appendChild(el);
    const div = el.shadowRoot!.querySelector('div');
    expect(div?.getAttribute('aria-label')).toBe('Greeting');
    document.body.removeChild(el);
  });

  it('supports keyboard navigation and focus management', () => {
    const config = {
      ...getTestConfig(),
      template: () => `<input type=\"text\" data-model=\"name\">`
    };
    component('focus-element', config);
    const el = document.createElement('focus-element');
    document.body.appendChild(el);
    const input = el.shadowRoot!.querySelector('input')!;
    input.focus();
    expect(document.activeElement).toBe(input);
    document.body.removeChild(el);
  });
});
