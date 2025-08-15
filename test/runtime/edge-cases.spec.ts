import { component } from '../../src/lib/runtime';
import { vi, describe, it, expect } from 'vitest';
import { getTestConfig } from './getTestConfig';

describe('Edge Cases', () => {
  it('handles deeply nested components', () => {
    const config = getTestConfig();
    config.template = () => `<nested-element></nested-element>`;
    component('nested-element', getTestConfig());
    component('deep-element', config);
    const el = document.createElement('deep-element');
    document.body.appendChild(el);
    expect(el.shadowRoot?.innerHTML).toContain('nested-element');
    document.body.removeChild(el);
  });
  it('handles circular references in state', () => {
    const config = getTestConfig();
    // @ts-ignore
    config.state.self = config.state;
    component('circular-element', config);
    const el = document.createElement('circular-element');
    document.body.appendChild(el);
    expect(el.shadowRoot?.innerHTML).toContain('Hello World');
    document.body.removeChild(el);
  });
  it('handles malformed configs gracefully', () => {
    const config = {} as any;
    expect(() => component('malformed-element', config)).not.toThrow();
  });
});