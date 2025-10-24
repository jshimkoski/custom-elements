import { describe, it, expect } from 'vitest';
import { html } from '../src/lib/runtime/template-compiler';
import type { VNode } from '../src/lib/runtime/types';

describe('template-compiler automatic hyphenation detection', () => {
  it('treats hyphenated tag as custom element and canonicalizes plain :model to modelValue', () => {
    const vnode = html`<my-widget :model="foo" />` as VNode;
    // Compiler should mark props for modelValue and attach an onUpdate handler
    expect(vnode.props).toBeDefined();
    expect((vnode.props as any).props).toBeDefined();
    expect(
      (vnode.props as any).props.modelValue !== undefined ||
        (vnode.props as any).attrs?.['model-value'] !== undefined,
    ).toBe(true);
    // Event handler should be present as onUpdateModelValue or onUpdate:model-value camelized
    const hasHandler = Object.keys((vnode.props as any).props).some((k) =>
      k.toLowerCase().includes('onupdate'),
    );
    expect(hasHandler).toBe(true);
  });

  it('treats hyphenated tag as custom element and canonicalizes :model:prop correctly', () => {
    const vnode = html`<fancy-input :model:value="bar" />` as VNode;
    // Compiler should set prop `value` (or kebab attr) and attach update:value handler
    expect(vnode.props).toBeDefined();
    const p = (vnode.props as any).props || {};
    const attrs = (vnode.props as any).attrs || {};
    expect(p.value !== undefined || attrs['value'] !== undefined).toBe(true);
    const handlerPresent = Object.keys(p).some((k) =>
      k.toLowerCase().includes('onupdate'),
    );
    expect(handlerPresent).toBe(true);
  });

  it('does not require context or registry opt-in for hyphenated tags', () => {
    // Ensure that without passing any context, hyphenated tags were treated as custom
    const vnode = html`<x-thing :model="baz" />` as VNode;
    expect(
      (vnode.props as any).isCustomElement === true ||
        (vnode.props as any).props.modelValue !== undefined ||
        (vnode.props as any).attrs?.['model-value'] !== undefined,
    ).toBe(true);
  });
});
