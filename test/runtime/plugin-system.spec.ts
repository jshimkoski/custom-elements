import { component, useRuntimePlugin } from '../../src/lib/runtime';
import { vi, describe, it, expect } from 'vitest';
import { getTestConfig } from './getTestConfig';

describe('Plugin System', () => {
  it('executes plugins in correct order', () => {
    const calls: string[] = [];
    const pluginA = { onInit: () => calls.push('A') };
    const pluginB = { onInit: () => calls.push('B') };
    useRuntimePlugin(pluginA);
    useRuntimePlugin(pluginB);
    component('plugin-order-element', getTestConfig());
    const el = document.createElement('plugin-order-element');
    document.body.appendChild(el);
    expect(calls).toEqual(['A', 'B']);
    document.body.removeChild(el);
  });
  it('handles plugin errors gracefully', () => {
    const plugin = { onInit: () => { throw new Error('Plugin error'); } };
    useRuntimePlugin(plugin);
    const config = getTestConfig();
    config.onError = vi.fn();
    component('plugin-error-element', config);
    const el = document.createElement('plugin-error-element');
    document.body.appendChild(el);
    expect(config.onError).toHaveBeenCalled();
    document.body.removeChild(el);
  });
});