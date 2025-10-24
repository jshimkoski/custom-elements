import { htmlImpl } from '../src/lib/runtime/template-compiler';
import { describe, it, expect } from 'vitest';

describe('template-compiler :model (plain) -> modelValue', () => {
  it('canonicalizes plain :model on custom element to modelValue prop and onUpdate:model-value handler', () => {
    // Construct a TemplateStringsArray-like object
    const tpl = Object.assign([`<my-custom :model="value"></my-custom>`], {
      raw: ['<my-custom :model="value"></my-custom>'],
    }) as unknown as TemplateStringsArray;
    // Provide explicit compile-time hint that 'my-custom' is a custom element
    const vnode = htmlImpl(tpl, [], {
      value: 123,
      __isCustomElements: ['my-custom'],
    }) as any;

    // vnode should be an element VNode with props containing props.modelValue and onUpdateModelValue
    expect(vnode.tag).toBe('my-custom');
    expect(vnode.props).toBeDefined();
    const props = vnode.props.props || vnode.props;
    // modelValue should be present and equal to 123
    expect(props.modelValue).toBe(123);
    // Handler prop should be onUpdate:model-value -> normalized to onUpdate:model-value prop key in props
    const handlerKey = Object.keys(props).find((k) =>
      k.toLowerCase().includes('onupdate'),
    );
    expect(handlerKey).toBeDefined();
    expect(typeof props[handlerKey!]).toBe('function');
  });
});
