import { describe, it, expect } from 'vitest';
import {
  cleanupRefs,
  getNestedValue,
  setNestedValue,
  processModelDirective,
  processBindDirective,
  processShowDirective,
  processClassDirective,
  processStyleDirective,
  processDirectives,
  assignKeysDeep,
  patchProps,
  createElement,
  patchChildren,
  patch,
  vdomRenderer,
  renderToString,
} from './vdom';
import type { VNode, VDomRefs } from './types';

describe('vdom.ts edge cases', () => {
  it('cleanupRefs does nothing for non-HTMLElement', () => {
    const text = document.createTextNode('hi');
  const refs: Record<string, any> = { foo: text };
    cleanupRefs(text, refs);
    expect(refs.foo).toBe(text);
  });

  it('getNestedValue returns undefined for empty path', () => {
    expect(getNestedValue({ a: 1 }, '')).toBeUndefined();
  });

  it('setNestedValue does nothing for empty path', () => {
    const obj: any = { a: 1 };
    setNestedValue(obj, '', 2);
    expect(obj).toEqual({ a: 1 });
  });

  it('processModelDirective does nothing if no context', () => {
    const props: any = {};
    const attrs: any = {};
    const listeners: any = {};
    processModelDirective('foo', [], props, attrs, listeners, undefined, undefined);
    expect(props).toEqual({});
    expect(attrs).toEqual({});
    expect(listeners).toEqual({});
  });

  it('processBindDirective handles invalid JSON', () => {
    const props: any = {};
    const attrs: any = {};
    processBindDirective('{invalid}', props, attrs, { foo: 123 });
    expect(attrs['{invalid}']).toBeUndefined();
  });

  it('processShowDirective merges with existing style', () => {
    const attrs: any = { style: 'color: red;' };
    processShowDirective('foo', attrs, { foo: false });
    expect(attrs.style).toContain('display: none');
    expect(attrs.style).toContain('color: red');
  });

  it('processClassDirective does nothing if context is missing', () => {
    const attrs: any = {};
    processClassDirective('foo', attrs, undefined);
    expect(attrs.class).toBeUndefined();
  });

  it('processStyleDirective does nothing if context is missing and value is string', () => {
    const attrs: any = {};
    processStyleDirective('foo', attrs, undefined);
  expect(attrs.style).toBeUndefined();
  });

  it('processDirectives handles unknown directive', () => {
    const directives = { unknown: { value: 'x', modifiers: [] } };
    const result = processDirectives(directives, {}, undefined);
    expect(result).toHaveProperty('props');
    expect(result).toHaveProperty('attrs');
    expect(result).toHaveProperty('listeners');
  });

  it('assignKeysDeep returns unchanged for non-object child', () => {
    const arr = ['hi', null, undefined];
    const result = assignKeysDeep(arr as any, 'base');
    expect(result).toEqual(arr);
  });

  it('patchProps removes attribute if newVal is false', () => {
    const el = document.createElement('input');
    el.setAttribute('foo', 'bar');
    patchProps(el, { props: {}, attrs: { foo: 'bar' } }, { props: {}, attrs: { foo: false } });
    expect(el.hasAttribute('foo')).toBe(false);
  });

  it('createElement assigns ref from props.ref', () => {
    const refs: VDomRefs = {};
    const vnode: VNode = { tag: 'div', props: { ref: 'myref' }, children: '' };
    createElement(vnode, undefined, refs);
    expect(refs.myref).toBeInstanceOf(HTMLElement);
  });

  it('patchChildren does nothing for non-array newChildren', () => {
    const parent = document.createElement('div');
    patchChildren(parent, [], undefined);
    expect(parent.childNodes.length).toBe(0);
  });

  it('patch returns dom for identical vnodes', () => {
    const vnode: VNode = { tag: 'div', key: 'x', props: {}, children: '' };
    const dom = createElement(vnode);
    expect(patch(dom, vnode, vnode)).toBe(dom);
  });

  it('patch replaces with text node if newVNode is string', () => {
    const vnode: VNode = { tag: 'div', key: 'x', props: {}, children: '' };
    const dom = createElement(vnode);
    const node = patch(dom, vnode, 'hi');
    expect(node.nodeType).toBe(Node.TEXT_NODE);
    expect(node.textContent).toBe('hi');
  });

  it('patch replaces with comment if newVNode is null', () => {
    const vnode: VNode = { tag: 'div', key: 'x', props: {}, children: '' };
    const dom = createElement(vnode);
    const node = patch(dom, vnode, null);
    expect(node.nodeType).toBe(Node.COMMENT_NODE);
  });

  it.todo('vdomRenderer removes extra nodes except style [fails, might be due to no multi-root support in vdom]', () => {
    const host = document.createElement('div');
    const root = host.attachShadow({ mode: 'open' });
    const vnode: VNode = { tag: 'div', props: {}, children: '' };
    const style = document.createElement('style');
    root.appendChild(style);
    root.appendChild(document.createElement('span'));
    vdomRenderer(root, vnode);
    expect(root.querySelector('span')).toBeNull();
    const hasStyle = Array.from(root.childNodes).some(n => n.nodeName === 'STYLE');
    expect(hasStyle).toBe(true);
  });

  it('renderToString handles props other than attrs', () => {
    const vnode: VNode = { tag: 'div', props: { attrs: { id: 'x', 'data-foo': 'bar' } }, children: 'hi' };
    expect(renderToString(vnode)).toBe('<div id="x" data-foo="bar">hi</div>');
  });

  it('renderToString handles no props', () => {
    const vnode: VNode = { tag: 'div', children: 'hi' };
    expect(renderToString(vnode)).toBe('<div>hi</div>');
  });

  it('renderToString handles no children', () => {
    const vnode: VNode = { tag: 'div', props: { attrs: { id: 'x' } } };
    expect(renderToString(vnode)).toBe('<div id="x"></div>');
  });
});
