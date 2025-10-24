import { describe, it, expect } from 'vitest';
import { html } from '../src/lib/runtime/template-compiler';
import type { VNode } from '../src/lib/runtime/types';

describe('template-compiler additional cases', () => {
  it('does not treat non-hyphenated tags as custom elements by default', () => {
    const vnode = html`<div :model="foo" />` as unknown as VNode;
    // For plain non-hyphenated elements, the compiler should not canonicalize
    // :model into modelValue; directive should remain attached.
    const directives = (vnode.props as any)?.directives;
    expect(directives).toBeDefined();
    expect(directives.model).toBeDefined();
    // Ensure props were not modified with modelValue
    const props = (vnode.props as any)?.props || {};
    expect(props.modelValue).toBeUndefined();
  });

  it('honors context __customElements opt-in (Set) and canonicalizes :model', () => {
    const ctx = {
      __customElements: new Set(['x-custom']),
      _state: { foo: 'hello' },
    };
    const vnode = html`<x-custom :model="foo" />${ctx}` as unknown as VNode;
    const props = (vnode.props as any)?.props || {};
    const attrs = (vnode.props as any)?.attrs || {};
    // modelValue should be set from state
    expect(props.modelValue).toBe('hello');
    // Kebab attr should also be present
    expect(attrs['model-value']).toBe('hello');
    // Marked as custom element
    expect((vnode.props as any).isCustomElement).toBe(true);
  });

  it('honors context __isCustomElements opt-in (array) and canonicalizes :model:prop', () => {
    const ctx = { __isCustomElements: ['fancy-el'], _state: { bar: 42 } };
    const vnode = html`<fancy-el :model:bar="bar" />${ctx}` as unknown as VNode;
    const props = (vnode.props as any)?.props || {};
    const attrs = (vnode.props as any)?.attrs || {};
    expect(props.bar).toBe(42);
    expect(attrs['bar']).toBe(42);
    expect((vnode.props as any).isCustomElement).toBe(true);
  });

  it('honors Symbol-backed global registry opt-in and canonicalizes :model', () => {
    const key = Symbol.for('cer.registry');
    // Use a Set in the registry for membership testing
    const prev = (globalThis as any)[key];
    try {
      (globalThis as any)[key] = new Set(['regged-element']);
      const vnode = html`<regged-element :model="baz" />` as unknown as VNode;
      const props = (vnode.props as any)?.props || {};
      const attrs = (vnode.props as any)?.attrs || {};
      // Model prop should be present even without explicit context
      expect(
        props.modelValue !== undefined || attrs['model-value'] !== undefined,
      ).toBe(true);
      expect((vnode.props as any).isCustomElement).toBe(true);
    } finally {
      // restore previous registry value
      if (typeof prev === 'undefined') delete (globalThis as any)[key];
      else (globalThis as any)[key] = prev;
    }
  });

  it('handles multiple :model variants on one tag (plain + arg)', () => {
    const ctx = {
      __customElements: new Set(['multi-widget']),
      _state: { a: 1, b: 2 },
    };
    const vnode = html`<multi-widget
        :model="a"
        :model:beta="b"
      />${ctx}` as unknown as VNode;
    const props = (vnode.props as any)?.props || {};
    const attrs = (vnode.props as any)?.attrs || {};
    expect(props.modelValue).toBe(1);
    expect(props.beta).toBe(2);
    expect(attrs['model-value']).toBe(1);
    expect(attrs['beta']).toBe(2);
    expect((vnode.props as any).isCustomElement).toBe(true);
  });
});
