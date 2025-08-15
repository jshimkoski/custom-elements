import { component } from '../../src/lib/runtime';
import { describe, it, expect, vi } from 'vitest';
import { getTestConfig } from './getTestConfig';

describe('SSR Hydration Edge Cases', () => {
  it('handles mismatched templates during hydration', () => {
    const config = {
      ...getTestConfig(),
      hydrate: (el, state) => {
        state.name = 'Hydrated';
      }
    };
    component('ssr-hydrate-element', config);
    const el = document.createElement('ssr-hydrate-element');
    el.setAttribute('data-hydrated', 'true');
    document.body.appendChild(el);
    expect(el.shadowRoot?.innerHTML).toContain('Hydrated');
    document.body.removeChild(el);
  });

  it('handles missing data during hydration', () => {
    const config = {
      ...getTestConfig(),
      hydrate: (el, state) => {
        state.name = undefined;
      }
    };
    component('ssr-missing-data-element', config);
    const el = document.createElement('ssr-missing-data-element');
    el.setAttribute('data-hydrated', 'true');
    document.body.appendChild(el);
    expect(el.shadowRoot?.innerHTML).toContain('Hello');
    document.body.removeChild(el);
  });

  it('handles corrupted SSR markup gracefully', () => {
    const config = {
      ...getTestConfig(),
      hydrate: (el, state) => {
        throw new Error('Corrupted SSR');
      },
      onError: vi.fn()
    };
    component('ssr-corrupt-element', config);
    const el = document.createElement('ssr-corrupt-element');
    el.setAttribute('data-hydrated', 'true');
    document.body.appendChild(el);
    expect(config.onError).toHaveBeenCalled();
    document.body.removeChild(el);
  });
});
