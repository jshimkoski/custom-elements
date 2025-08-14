import { component } from '../../src/lib/runtime';
import { describe, it, expect, vi } from 'vitest';
import { getTestConfig } from './getTestConfig';

describe('Error Boundaries', () => {
  it('handles errors in event handlers and recovers with fallback UI', () => {
    const config = Object.assign(getTestConfig(), {
      template: () => { throw new Error('Template error'); },
      onError: vi.fn()
    });
    component('error-boundary-element', config);
    const el = document.createElement('error-boundary-element');
    document.body.appendChild(el);
    expect(config.onError).toHaveBeenCalled();
    document.body.removeChild(el);
  });

  it('handles errors in lifecycle hooks', () => {
    const config = Object.assign(getTestConfig(), {
      onMounted: () => { throw new Error('Mount error'); },
      onError: vi.fn()
    });
    component('error-lifecycle-element', config);
    const el = document.createElement('error-lifecycle-element');
    document.body.appendChild(el);
    expect(config.onError).toHaveBeenCalled();
    document.body.removeChild(el);
  });
});
