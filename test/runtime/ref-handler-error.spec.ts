import { component } from '../../src/lib/runtime';
import { describe, it, expect, vi } from 'vitest';
import { getTestConfig } from './getTestConfig';

describe('Ref Handler Error Routing', () => {
  it('routes errors in ref handlers to error boundary', () => {
    const config = {
      ...getTestConfig(),
      refs: {
        testRef: vi.fn(() => { throw new Error('Ref error'); })
      },
      onError: vi.fn()
    };
    component('ref-error-element', config);
    const el = document.createElement('ref-error-element');
    document.body.appendChild(el);
    // Simulate ref element
    const refEl = document.createElement('div');
    refEl.setAttribute('data-ref', 'testRef');
    el.shadowRoot?.appendChild(refEl);
    // @ts-ignore
    el['processRefs']();
    expect(config.onError).toHaveBeenCalled();
    document.body.removeChild(el);
  });
});
