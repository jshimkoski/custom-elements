import { it, expect, describe } from 'vitest';
import { html } from '../src/lib/runtime/template-compiler';
import type { VNode } from '../src/lib/runtime/types';

describe('unquoted regular attributes', () => {
  it('parses regular attrs without quotes', () => {
    const name = 'test-input';
    const id = 'my-id';
    const dataAttr = 'some-data';

    const vnode = html`<input
      name=${name}
      id=${id}
      data-test=${dataAttr}
    />` as VNode;

    expect(vnode).toBeDefined();
    expect(vnode.props?.attrs?.name).toBe('test-input');
    expect(vnode.props?.attrs?.id).toBe('my-id');
    expect(vnode.props?.attrs?.['data-test']).toBe('some-data');
  });

  it('parses regular attrs with quotes (for comparison)', () => {
    const name = 'test-input';
    const id = 'my-id';
    const dataAttr = 'some-data';

    const vnode = html`<input
      name="${name}"
      id="${id}"
      data-test="${dataAttr}"
    />` as VNode;

    expect(vnode).toBeDefined();
    expect(vnode.props?.attrs?.name).toBe('test-input');
    expect(vnode.props?.attrs?.id).toBe('my-id');
    expect(vnode.props?.attrs?.['data-test']).toBe('some-data');
  });

  it('parses mixed quoted and unquoted attrs', () => {
    const name = 'test';
    const disabled = true;

    const vnode = html`<input
      name=${name}
      type="text"
      :disabled=${disabled}
    />` as VNode;

    expect(vnode).toBeDefined();
    expect(vnode.props?.attrs?.name).toBe('test');
    expect(vnode.props?.attrs?.type).toBe('text');
    expect(vnode.props?.props?.disabled).toBe(true);
  });

  it('parses unquoted :disabled directive', () => {
    const disabled = true;
    const vnode = html`<input :disabled=${disabled} />` as VNode;

    expect(vnode).toBeDefined();
    expect(vnode.props?.props?.disabled).toBe(true);
  });

  it('parses unquoted :style directive', () => {
    const style = 'color: red; background: blue;';
    const vnode = html`<div :style=${style}></div>` as VNode;

    expect(vnode).toBeDefined();
    expect(vnode.props?.directives?.style?.value).toBe(style);
  });

  it('parses unquoted :class directive', () => {
    const classes = 'foo bar baz';
    const vnode = html`<div :class=${classes}></div>` as VNode;

    expect(vnode).toBeDefined();
    expect(vnode.props?.directives?.class?.value).toBe(classes);
  });

  it('parses unquoted :class with object', () => {
    const classObj = { active: true, disabled: false };
    const vnode = html`<div :class=${classObj}></div>` as VNode;

    expect(vnode).toBeDefined();
    expect(vnode.props?.directives?.class?.value).toBe(classObj);
  });

  it('parses unquoted @event handlers', () => {
    const handler = () => console.log('clicked');
    const vnode = html`<button @click=${handler}></button>` as VNode;

    expect(vnode).toBeDefined();
    expect(typeof vnode.props?.props?.onClick).toBe('function');
  });

  it('handles complex unquoted bindings', () => {
    const obj = { foo: 'bar', num: 42 };
    const arr = [1, 2, 3];
    const bool = false;

    const vnode = html`<custom-el
      :bind=${obj}
      :data=${arr}
      :enabled=${bool}
    ></custom-el>` as VNode;

    expect(vnode).toBeDefined();
    expect(vnode.props?.directives?.bind?.value).toBe(obj);
    // For custom elements, bound attrs are promoted to props, not attrs
    expect(vnode.props?.props?.data).toBe(arr);
    expect(vnode.props?.props?.enabled).toBe(false);
  });
});
