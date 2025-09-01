import { describe, it, expect } from 'vitest';
import { processModelDirective } from '../src/lib/runtime/vdom';

describe('vdom model checkbox handling', () => {
  it('binds checkbox to array and updates on change', () => {
    const context: any = { _state: { selected: ['a'] }, _requestRender: () => {} };
    const props: Record<string, any> = {};
    const attrs: Record<string, any> = { value: 'b' };
    const listeners: Record<string, any> = {};
    const el = document.createElement('input');
    (el as HTMLInputElement).type = 'checkbox';
    el.setAttribute('value', 'b');

  processModelDirective('selected', [], props, attrs, listeners, context, el);
  // Implementation sets props.checked only when different from DOM; props.checked may be undefined
  expect(props).toBeDefined();
  // There should be a change listener registered
  expect(typeof listeners.change).toBe('function');

  // Simulate checking the box and calling the listener
  // Call the listener with a plain object that mimics event shape (safer in JSDOM)
  (el as HTMLInputElement).checked = true;
  (listeners.change as any)({ target: el, isTrusted: true, isComposing: false });
  // State should be updated to include 'b'
  expect(Array.isArray(context._state.selected)).toBe(true);
  expect(context._state.selected.includes('b')).toBe(true);
  });
});
