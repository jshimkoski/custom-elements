import { component } from '../../src/lib/runtime';
import { describe, it, expect } from 'vitest';
import { getTestConfig } from './getTestConfig';

describe('Concurrent State Updates', () => {
  it('handles multiple rapid state changes without error', async () => {
    const config = getTestConfig();
    component('concurrent-element', config);
    const el = document.createElement('concurrent-element');
    document.body.appendChild(el);
    for (let i = 0; i < 10; i++) {
      // @ts-ignore
      el['stateObj'].name = `Name${i}`;
      // @ts-ignore
      el['render']();
    }
    expect(el.shadowRoot?.innerHTML).toContain('Name9');
    document.body.removeChild(el);
  });
});
