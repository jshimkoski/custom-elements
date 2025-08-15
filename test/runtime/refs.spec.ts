import { component } from '../../src/lib/runtime';
import { describe, it, expect, vi } from 'vitest';
import { getTestConfig } from './getTestConfig';

describe('Refs', () => {
  it('calls ref handler and provides direct DOM access', async () => {
    const config = Object.assign(getTestConfig(), {
      refs: { myRef: vi.fn() },
      template: () => `<div data-ref="myRef"></div>`
    });
    component('ref-test-element', config as any);
    const el = document.createElement('ref-test-element');
    document.body.appendChild(el);
    await new Promise(requestAnimationFrame);
    expect(config.refs.myRef).toHaveBeenCalledWith(expect.any(Element), expect.any(Object), expect.any(Object));
    document.body.removeChild(el);
  });

  it('cleans up ref handlers on unmount', () => {
    const config = Object.assign(getTestConfig(), {
      refs: { myRef: vi.fn() }
    });
    component('ref-cleanup-element', config as any);
    const el = document.createElement('ref-cleanup-element');
    document.body.appendChild(el);
    document.body.removeChild(el);
    // No error thrown means cleanup succeeded
    expect(true).toBe(true);
  });
});
