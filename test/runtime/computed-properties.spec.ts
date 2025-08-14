import { component } from '../../src/lib/runtime';
import { describe, it, expect, vi } from 'vitest';
import { getTestConfig } from './getTestConfig';

describe('Computed Properties', () => {
  it('updates computed values reactively and triggers re-render', () => {
    const config = Object.assign(getTestConfig(), {
      computed: {
        doubled: (state: any) => state.count * 2
      },
      state: { count: 0 }
    });
    component('computed-element', config as any);
    const el = document.createElement('computed-element');
    document.body.appendChild(el);
    // @ts-ignore
    el['stateObj'].count = 2;
    // @ts-ignore
    expect(el['stateObj'].doubled).toBe(4);
    document.body.removeChild(el);
  });

  it('handles errors in computed properties', () => {
    const config = Object.assign(getTestConfig(), {
      computed: {
        broken: () => { throw new Error('Computed error'); }
      },
      onError: vi.fn(),
      state: { count: 0 }
    });
    component('computed-error-element', config as any);
    const el = document.createElement('computed-error-element');
    document.body.appendChild(el);
    expect(config.onError).toHaveBeenCalled();
    document.body.removeChild(el);
  });
});
