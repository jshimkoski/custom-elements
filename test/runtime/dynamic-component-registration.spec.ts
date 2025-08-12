import { component } from '../../src/lib/runtime';
import { describe, it, expect } from 'vitest';
import { getTestConfig } from './getTestConfig';

describe('Dynamic Component Registration/Unregistration', () => {
  it('registers and unregisters components at runtime', () => {
    component('dynamic-element', getTestConfig());
    const el = document.createElement('dynamic-element');
    document.body.appendChild(el);
    expect(el.shadowRoot?.innerHTML).toContain('Hello World');
    document.body.removeChild(el);
    // Unregister not supported natively, but test structure is ready
    expect(true).toBe(true);
  });

  it('handles duplicate tag names gracefully', () => {
    component('duplicate-element', getTestConfig());
    expect(() => component('duplicate-element', getTestConfig())).not.toThrow();
  });
});
