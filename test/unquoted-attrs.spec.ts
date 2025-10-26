import { it, expect } from 'vitest';
import { html } from '../src/lib/runtime/template-compiler';

it('parses unquoted :model binding', () => {
  const value = { a: 1 };
  const vnode = html`<input :model=${value} />` as any;
  expect(vnode).toBeDefined();
  expect(vnode.props).toBeDefined();
  expect(vnode.props.directives).toBeDefined();
  expect(vnode.props.directives.model.value).toBe(value);
});

it('parses unquoted :model:prop binding', () => {
  const vnode = html`<input :model:checked=${true} />` as any;
  expect(vnode).toBeDefined();
  expect(vnode.props.directives['model:checked'].value).toBe(true);
});

it('parses unquoted @click handler and wraps it as a prop', () => {
  let called = false;
  const handler = () => {
    called = true;
    return 'ok';
  };

  const vnode = html`<button @click=${handler}></button>` as any;
  expect(vnode).toBeDefined();
  // Event handler should be wrapped and assigned to props.props.onClick
  const onClick = vnode.props?.props?.onClick;
  expect(typeof onClick).toBe('function');

  const result = onClick?.(new Event('click'));
  expect(called).toBe(true);
  expect(result).toBe('ok');
});

it('parses unquoted :class and :style into directives', () => {
  const vnode = html`<div
    :class=${'foo bar'}
    :style=${'color: red;'}
  ></div>` as any;
  expect(vnode).toBeDefined();
  expect(vnode.props.directives.class.value).toBe('foo bar');
  expect(vnode.props.directives.style.value).toBe('color: red;');
});
