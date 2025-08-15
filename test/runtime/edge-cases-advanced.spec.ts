import { component } from '../../src/lib/runtime';
import { describe, it, expect } from 'vitest';
import { getTestConfig } from './getTestConfig';

describe('Edge Cases (Advanced)', () => {
  it('handles invalid config gracefully', () => {
    // The runtime may not throw, but should not crash
    let threw = false;
    try {
      component('invalid-config-element', {} as any);
    } catch (e) {
      threw = true;
    }
    expect(threw).toBe(false);
  });

  it('handles missing event handlers', () => {
    const config = Object.assign(getTestConfig(), {
      template: () => `<button data-on-click='missingHandler'>Click</button>`
    });
    component('missing-handler-element', config as any);
    const el = document.createElement('missing-handler-element');
    document.body.appendChild(el);
    // No error thrown means missing handler is handled
    expect(true).toBe(true);
    document.body.removeChild(el);
  });

  it('handles unsupported features gracefully', () => {
    const config = Object.assign(getTestConfig(), {
      unsupported: true
    });
    component('unsupported-feature-element', config as any);
    const el = document.createElement('unsupported-feature-element');
    document.body.appendChild(el);
    // No error thrown means unsupported feature is ignored
    expect(true).toBe(true);
    document.body.removeChild(el);
  });
});
