import { component } from '../../src/lib/runtime';
import { vi, describe, it, expect } from 'vitest';
import { getTestConfig } from './getTestConfig';

describe('Error Boundaries & Recovery', () => {
  it('recovers from errors in computed properties', () => {
    const config = getTestConfig();
    config.computed.greeting = () => { throw new Error('Computed error'); };
    config.onError = vi.fn();
    component('error-computed-element', config);
    const el = document.createElement('error-computed-element');
    document.body.appendChild(el);
    // @ts-ignore
    el['render']();
    expect(config.onError).toHaveBeenCalled();
    document.body.removeChild(el);
  });
  it('recovers from errors in lifecycle hooks', () => {
    const config = getTestConfig();
    config.onMounted = vi.fn(() => { throw new Error('Mount error'); });
    config.onError = vi.fn();
    component('error-lifecycle-element', config);
    const el = document.createElement('error-lifecycle-element');
    document.body.appendChild(el);
    expect(config.onError).toHaveBeenCalled();
    document.body.removeChild(el);
  });
});