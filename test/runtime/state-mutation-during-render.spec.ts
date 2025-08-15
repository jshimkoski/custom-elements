import { component } from '../../src/lib/runtime';
import { describe, it, expect, vi } from 'vitest';
import { getTestConfig } from './getTestConfig';

describe('State Mutation During Render', () => {
  it('does not cause infinite loop or inconsistent UI when state is mutated during render', () => {
    const config = getTestConfig();
    let renderCount = 0;
    config.template = (state: any) => {
      renderCount++;
      if (renderCount === 1) state.name = 'Mutated';
      return `<div>${state.name}</div>`;
    };
    component('mutation-render-element', config);
    const el = document.createElement('mutation-render-element');
    document.body.appendChild(el);
    expect(el.shadowRoot?.innerHTML).toContain('Mutated');
    expect(renderCount).toBeLessThan(5); // Should not loop infinitely
    document.body.removeChild(el);
  });
});
