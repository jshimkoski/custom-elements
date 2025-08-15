import { component } from '../../src/lib/runtime';
import { describe, it, expect, vi } from 'vitest';
import { getTestConfig } from './getTestConfig';

describe('Error Boundary Fallback UI', () => {
  it('renders fallback UI when error occurs in template', () => {
    const config = {
      ...getTestConfig(),
      template: () => { throw new Error('Render error'); },
      onError: vi.fn()
    };
    component('fallback-ui-element', config);
    const el = document.createElement('fallback-ui-element');
    document.body.appendChild(el);
    // @ts-ignore
    expect(el.shadowRoot?.innerHTML).toContain('Error');
    expect(config.onError).toHaveBeenCalled();
    document.body.removeChild(el);
  });

  it('renders fallback UI when error occurs in lifecycle', () => {
    const config = {
      ...getTestConfig(),
      onMounted: vi.fn(() => { throw new Error('Lifecycle error'); }),
      onError: vi.fn()
    };
    component('fallback-lifecycle-element', config);
    const el = document.createElement('fallback-lifecycle-element');
    document.body.appendChild(el);
    // @ts-ignore
    expect(el.shadowRoot?.innerHTML).toContain('Error');
    expect(config.onError).toHaveBeenCalled();
    document.body.removeChild(el);
  });
});
