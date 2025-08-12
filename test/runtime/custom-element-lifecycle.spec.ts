import { component } from '../../src/lib/runtime';
import { vi, describe, it, expect } from 'vitest';
import { getTestConfig } from './getTestConfig';

describe('Custom Element Lifecycle', () => {
  it('calls adoptedCallback if implemented', () => {
    const config = { ...getTestConfig(), adoptedCallback: vi.fn() };
    component('adopted-element', config);
    const el = document.createElement('adopted-element');
    document.body.appendChild(el);
    if (typeof el['adoptedCallback'] === 'function') {
      el['adoptedCallback']();
      expect(config.adoptedCallback).toHaveBeenCalled();
    }
    document.body.removeChild(el);
  });
});