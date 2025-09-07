import { it, expect } from 'vitest';
import { html } from '../src/lib/runtime/template-compiler';
import type { VNode } from '../src/lib/runtime/types';

it('promotes bound :value on option to props', () => {
  const vnode = html`<option :value="optVal">Op</option>` as VNode;
  expect((vnode as VNode).props?.props?.value).toBeDefined();
});

it('promotes bound :multiple on select to props', () => {
  const vnode = html`<select :multiple="isMultiple"></select>` as VNode;
  expect((vnode as VNode).props?.props?.multiple).toBeDefined();
});

it('promotes bound :src on img to props', () => {
  const vnode = html`<img :src="imgSrc" alt="x" />` as VNode;
  expect((vnode as VNode).props?.props?.src).toBeDefined();
});

it('promotes all bound attrs for custom elements', () => {
  const vnode = html`<my-el :foo="bar" :baz="qux"></my-el>` as VNode;
  expect((vnode as VNode).props?.props?.foo).toBeDefined();
  expect((vnode as VNode).props?.props?.baz).toBeDefined();
});
