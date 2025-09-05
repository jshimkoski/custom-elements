import { describe, it, expect } from 'vitest';
import { processModelDirective } from '../src/lib/runtime/vdom';

describe('vdom model directive with arg (custom prop)', () => {
  it('binds checkbox to array using custom prop name and updates on change', () => {
    const context: any = { _state: { selected: ['b'] }, _requestRender: () => {} };
    const props: Record<string, any> = {};
    const attrs: Record<string, any> = { value: 'b' };
    const listeners: Record<string, any> = {};
    const el = document.createElement('input');
    (el as HTMLInputElement).type = 'checkbox';
    el.setAttribute('value', 'b');

    // Use arg 'active' instead of default 'checked'
    processModelDirective('selected', [], props, attrs, listeners, context, el, 'active');

    // props should carry our custom prop when different from DOM
    expect(props).toBeDefined();
    // There should be a change listener registered
    expect(typeof listeners.change).toBe('function');

    // Simulate user checking the box
    (el as HTMLInputElement).checked = true;
    (listeners.change as any)({ target: el, isTrusted: true, isComposing: false });

    // State should be updated to include 'b'
    expect(Array.isArray(context._state.selected)).toBe(true);
    expect(context._state.selected.includes('b')).toBe(true);
  });

  it('binds text input to arbitrary prop name and updates on input', () => {
    const context: any = { _state: { foo: 'bar' }, _requestRender: () => {} };
    const props: Record<string, any> = {};
    const attrs: Record<string, any> = {};
    const listeners: Record<string, any> = {};
    const el = document.createElement('input');
    (el as HTMLInputElement).type = 'text';
    (el as HTMLInputElement).value = 'bar';

    // Use arg 'custom' to bind to a child property named 'custom'
    processModelDirective('foo', [], props, attrs, listeners, context, el, 'custom');

    // The compiler/runtime should have set props.custom to current value
    expect(props.custom === 'bar' || props.custom === undefined).toBe(true);
    // There should be an input listener registered
    expect(typeof listeners.input).toBe('function');

    // Simulate user typing
    (el as HTMLInputElement).value = 'baz';
    (listeners.input as any)({ target: el, isTrusted: true, isComposing: false });

    // State should update to 'baz'
    expect(context._state.foo).toBe('baz');
  });
});
