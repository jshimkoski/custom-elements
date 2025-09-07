import { it, expect } from 'vitest';
import { html } from '../src/lib/runtime/template-compiler';
import type { VNode } from '../src/lib/runtime/types';

it('promotes bound :selected on option to props', () => {
  const vnode = html`<option :selected="isSelected">Option</option>` as VNode;
  expect((vnode as VNode).props).toBeDefined();
  expect((vnode as VNode).props?.props?.selected).toBeDefined();
});

it('promotes bound :muted on video to props', () => {
  const vnode = html`<video :muted="isMuted"></video>` as VNode;
  expect((vnode as VNode).props).toBeDefined();
  expect((vnode as VNode).props?.props?.muted).toBeDefined();
});

it('does not promote static value attribute for input', () => {
  const vnode = html`<input type="text" value="foo" />` as VNode;
  expect((vnode as VNode).props?.attrs?.value).toBe('foo');
  expect((vnode as VNode).props?.props?.value).toBeUndefined();
});
