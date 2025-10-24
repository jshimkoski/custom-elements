import { describe, it, expect, vi } from 'vitest';
import {
  hasValueChanged,
  updateStateValue,
  triggerStateUpdate,
  emitUpdateEvents,
  syncElementWithState,
  getCurrentStateValue,
} from '../src/lib/runtime/vdom-model-helpers';

describe('vdom-model-helpers', () => {
  it('hasValueChanged compares arrays and primitives', () => {
    expect(hasValueChanged([2, 1], [1, 2])).toBe(false);
    expect(hasValueChanged([1, 2, 3], [1, 2])).toBe(true);
    expect(hasValueChanged('a', 'b')).toBe(true);
  });

  it('updateStateValue updates reactive arg path and non-reactive state', () => {
    const reactive: any = { value: { a: 1 } };
    updateStateValue(true, reactive, 2, {} as any, 'a');
    expect(reactive.value.a).toBe(2);

    const ctx: any = { _state: { nested: { x: 1 } } };
    updateStateValue(false, 'nested.x', 5, ctx);
    expect(ctx._state.nested.x).toBe(5);
  });

  it('triggerStateUpdate calls requestRender and triggerWatchers', () => {
    const ctx: any = {
      _requestRender: vi.fn(),
      _triggerWatchers: vi.fn(),
    };
    triggerStateUpdate(ctx, true, 'irrelevant', 42);
    expect(ctx._requestRender).toHaveBeenCalled();
    expect(ctx._triggerWatchers).toHaveBeenCalled();
  });

  it('emitUpdateEvents dispatches both kebab and camel events', () => {
    const el = document.createElement('div');
    const kcb = vi.fn();
    const ccb = vi.fn();
    el.addEventListener('update:my-prop', kcb as EventListener);
    el.addEventListener('update:myProp', ccb as EventListener);
    emitUpdateEvents(el, 'myProp', 123);
    expect(kcb).toHaveBeenCalled();
    expect(ccb).toHaveBeenCalled();
  });

  it('syncElementWithState sets attributes and removes when serialized null', () => {
    const el = document.createElement('div');
    syncElementWithState(el, 'dataVal', 'hello', true);
    const attr = el.getAttribute('data-val');
    expect(attr && attr.includes('hello')).toBe(true);

    // test removeAttribute path by sending undefined (safeSerializeAttr returns null)
    syncElementWithState(el, 'dataVal', undefined, true);
    // should not throw and should remove attribute
    expect(el.hasAttribute('data-val')).toBe(false);
  });

  it('getCurrentStateValue returns reactive and non-reactive values correctly', () => {
    const reactive: any = { value: { a: 10 } };
    expect(getCurrentStateValue(true, reactive, {} as any, 'a')).toBe(10);
    const ctx: any = { _state: { foo: 7 } };
    expect(getCurrentStateValue(false, 'foo', ctx)).toBe(7);
  });
});
