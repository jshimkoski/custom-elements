import { describe, it, expect } from 'vitest';
import { processModelDirective } from '../src/lib/runtime/vdom';

describe('vdom model directive update event fallback', () => {
  it('uses event.target.value when CustomEvent.detail is undefined', () => {
    const context: any = { _state: { foo: 'start' }, _requestRender: () => {} };
    const props: Record<string, any> = {};
    const attrs: Record<string, any> = {};
    const listeners: Record<string, any> = {};

    const el = document.createElement('div');

    processModelDirective('foo', [], props, attrs, listeners, context, el, 'prop');

    expect(typeof listeners['update:prop']).toBe('function');

    // Simulate event without detail but with target.value
    const fakeEvent: any = { target: { value: 'fallback' } };
    listeners['update:prop'](fakeEvent);

    expect(context._state.foo).toBe('fallback');
  });
});
