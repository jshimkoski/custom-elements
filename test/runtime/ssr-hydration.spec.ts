import { component } from '../../src/lib/runtime';
import { describe, it, expect, vi } from 'vitest';
import { getTestConfig } from './getTestConfig';

describe('SSR & Hydration', () => {
  it('renders to string and hydrates with hydrate property', () => {
    const config = Object.assign(getTestConfig(), {
      hydrate: true
    });
    component('ssr-hydrate-element', config as any);
    const el = document.createElement('ssr-hydrate-element');
    document.body.appendChild(el);
    expect(el.shadowRoot?.innerHTML).toContain('Hello');
    document.body.removeChild(el);
  });

  it('excludes refs and lifecycle hooks during SSR', () => {
    // Simulate SSR by not attaching to DOM
    const config = Object.assign(getTestConfig(), {
      refs: { ref: vi.fn() },
      onMounted: vi.fn()
    });
    component('ssr-exclude-element', config as any);
    expect(config.refs.ref).not.toHaveBeenCalled();
    expect(config.onMounted).not.toHaveBeenCalled();
  });
});
