import { component, useRuntimePlugin } from '../../src/lib/runtime';
import { describe, it, expect, vi } from 'vitest';
import { getTestConfig } from './getTestConfig';

describe('Plugin Execution Order and Error Propagation', () => {
  it('executes plugins in correct order with dependencies', () => {
    const calls: string[] = [];
    const pluginA = { onInit: () => calls.push('A') };
    const pluginB = { onInit: () => calls.push('B') };
    useRuntimePlugin(pluginA);
    useRuntimePlugin(pluginB);
    component('plugin-order-test', getTestConfig());
    const el = document.createElement('plugin-order-test');
    document.body.appendChild(el);
    expect(calls).toEqual(['A', 'B']);
    document.body.removeChild(el);
  });

  it('propagates plugin errors to error boundary', () => {
    const plugin = { onInit: () => { throw new Error('Plugin error'); } };
    useRuntimePlugin(plugin);
    const config = getTestConfig();
    config.onError = vi.fn();
    component('plugin-error-test', config);
    const el = document.createElement('plugin-error-test');
    document.body.appendChild(el);
    expect(config.onError).toHaveBeenCalled();
    document.body.removeChild(el);
  });
});
