import { component, useRuntimePlugin } from '../../src/lib/runtime';
import { describe, it, expect, vi } from 'vitest';
import { getTestConfig } from './getTestConfig';

describe('Plugin System', () => {
  it('calls plugin hooks in correct order', () => {
    const calls: string[] = [];
    useRuntimePlugin({ onInit: () => calls.push('A') });
    useRuntimePlugin({ onInit: () => calls.push('B') });
    component('plugin-order-element', getTestConfig());
    const el = document.createElement('plugin-order-element');
    document.body.appendChild(el);
    expect(calls).toEqual(['A', 'B']);
    document.body.removeChild(el);
  });

  it('handles plugin errors gracefully', () => {
    useRuntimePlugin({ onInit: () => { throw new Error('Plugin error'); } });
    const config = getTestConfig();
    config.onError = vi.fn();
    component('plugin-error-element', config);
    const el = document.createElement('plugin-error-element');
    document.body.appendChild(el);
    expect(config.onError).toHaveBeenCalled();
    document.body.removeChild(el);
  });
});
