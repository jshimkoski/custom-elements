import { describe, it, expect } from 'vitest';
import { processModelDirective } from '../src/lib/runtime/vdom';

describe('vdom model directive listens for update:prop on custom elements', () => {
  it('updates parent state when custom element emits update:prop', () => {
    const context: any = {
      _state: { foo: 'initial' },
      _requestRender: () => {},
    };
    const props: Record<string, any> = {};
    const attrs: Record<string, any> = {};
    const listeners: Record<string, any> = {};

    // Create a custom element (not an input/select/textarea)
    const el = document.createElement('div');

    processModelDirective(
      'foo',
      [],
      props,
      attrs,
      listeners,
      context,
      el,
      'prop',
    );

    // There should be an 'update:prop' listener registered
    expect(typeof listeners['update:prop']).toBe('function');

    // Simulate emitting the custom event with detail
    const ev = new CustomEvent('update:prop', { detail: 'newValue' });
    listeners['update:prop'](ev as any);

    expect(context._state.foo).toBe('newValue');
  });
});
