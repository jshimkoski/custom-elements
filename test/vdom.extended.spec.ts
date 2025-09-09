import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  cleanupRefs,
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
} from '../src/lib/runtime/vdom';
import { getNestedValue, setNestedValue } from '../src/lib/runtime/helpers';
import type { VNode, VDomRefs, AnchorBlockVNode } from '../src/lib/runtime/types';

describe('vdom.ts', () => {
  describe('cleanupRefs', () => {
    it('removes refs for node and descendants', () => {
      const div = document.createElement('div');
      const span = document.createElement('span');
      div.appendChild(span);
      const refs: VDomRefs = { foo: div, bar: span };
      cleanupRefs(div, refs);
      expect(refs.foo).toBeUndefined();
      expect(refs.bar).toBeUndefined();
    });
    it('does nothing if refs is undefined', () => {
      const div = document.createElement('div');
      expect(() => cleanupRefs(div)).not.toThrow();
    });
  });

  describe('getNestedValue', () => {
    it('gets nested value using dot notation', () => {
      const obj = { a: { b: { c: 42 } } };
      expect(getNestedValue(obj, 'a.b.c')).toBe(42);
    });
    it('returns undefined for missing path', () => {
      expect(getNestedValue({}, 'x.y.z')).toBeUndefined();
    });
  });

  describe('setNestedValue', () => {
    it('sets nested value using dot notation', () => {
      const obj: any = {};
      setNestedValue(obj, 'a.b.c', 99);
      expect(obj.a.b.c).toBe(99);
    });
    it('does nothing if path is empty', () => {
      const obj: any = {};
      setNestedValue(obj, '', 1);
      expect(obj).toEqual({});
    });
  });

  describe('processModelDirective', () => {
    let el: HTMLInputElement;
    let context: any;
    let props: Record<string, any>;
    let attrs: Record<string, any>;
    let listeners: Record<string, EventListener>;
    beforeEach(() => {
      el = document.createElement('input');
      context = { _state: { foo: 'bar' }, _requestRender: vi.fn() };
      props = {};
      attrs = { type: 'text' };
      listeners = {};
    });
    it('sets initial value for text input', () => {
      processModelDirective('foo', [], props, attrs, listeners, context, el);
      expect(props.value).toBe('bar');
    });
    it('creates input event listener', () => {
      processModelDirective('foo', [], props, attrs, listeners, context, el);
      expect(typeof listeners.input).toBe('function');
    });
    it('updates context on input event', () => {
      processModelDirective('foo', [], props, attrs, listeners, context, el);
      el.value = 'baz';
      listeners.input({ target: el, isTrusted: true } as any);
      expect(context._state.foo).toBe('baz');
      expect(context._requestRender).toHaveBeenCalled();
    });
    it('handles lazy modifier', () => {
      processModelDirective('foo', ['lazy'], props, attrs, listeners, context, el);
      expect(listeners.change).toBeDefined();
    });
    it('handles trim and number modifiers', () => {
      processModelDirective('foo', ['trim', 'number'], props, attrs, listeners, context, el);
      el.value = ' 123 ';
      listeners.input({ target: el, isTrusted: true } as any);
      expect(context._state.foo).toBe(123);
    });
    it('handles checkbox array', () => {
      el.type = 'checkbox';
      attrs.type = 'checkbox';
      context._state.foo = ['a'];
      el.setAttribute('value', 'b');
      processModelDirective('foo', [], props, attrs, listeners, context, el);
      el.checked = true;
      listeners.change({ target: el, isTrusted: true } as any);
      expect(context._state.foo).toContain('b');
    });
    it('handles radio input', () => {
      el.type = 'radio';
      attrs.type = 'radio';
      attrs.value = 'r';
      context._state.foo = 'r';
      processModelDirective('foo', [], props, attrs, listeners, context, el);
      expect(props.checked).toBe(true);
    });
    it('handles select input', () => {
      const select = document.createElement('select');
      context._state.foo = 'x';
      processModelDirective('foo', [], props, attrs, listeners, context, select);
      expect(typeof listeners.change).toBe('function');
    });
  });

  describe('processBindDirective', () => {
    it('binds object properties to props', () => {
      const props: any = {};
      const attrs: any = {};
      processBindDirective('{"x":1,"y":2}', props, attrs, { x: 1, y: 2 });
      expect(props.x).toBe(1);
      expect(props.y).toBe(2);
    });
    it('binds single property to attrs', () => {
      const props: any = {};
      const attrs: any = {};
      processBindDirective('foo', props, attrs, { foo: 42 });
      expect(attrs.foo).toBe(42);
    });
  });

  describe('processShowDirective', () => {
    it('sets display:none when not visible', () => {
      const attrs: any = {};
      processShowDirective('foo', attrs, { foo: false });
      expect(attrs.style).toContain('display: none');
    });
    it('removes display:none when visible', () => {
      const attrs: any = { style: 'color: red; display: none;' };
      processShowDirective('foo', attrs, { foo: true });
      expect(attrs.style).toBe('color: red;');
    });
  });

  describe('processClassDirective', () => {
    it('adds class from string', () => {
      const attrs: any = {};
      processClassDirective('foo', attrs, { foo: 'bar' });
      expect(attrs.class).toContain('bar');
    });
    it('adds classes from array', () => {
      const attrs: any = {};
      processClassDirective('foo', attrs, { foo: ['a', 'b'] });
      expect(attrs.class).toContain('a');
      expect(attrs.class).toContain('b');
    });
    it('adds classes from object', () => {
      const attrs: any = {};
      processClassDirective('foo', attrs, { foo: { x: true, y: false, z: true } });
      expect(attrs.class).toContain('x');
      expect(attrs.class).toContain('z');
      expect(attrs.class).not.toContain('y');
    });
  });

  describe('processStyleDirective', () => {
    it('applies style from string', () => {
      const attrs: any = {};
      processStyleDirective('foo', attrs, { foo: 'color: blue;' });
      expect(attrs.style).toContain('color: blue;');
    });
    it('applies style from object', () => {
      const attrs: any = {};
      processStyleDirective('foo', attrs, { foo: { color: 'red', width: 10 } });
      expect(attrs.style).toContain('color: red');
      expect(attrs.style).toContain('width: 10px');
    });
  });

  describe('processDirectives', () => {
    it('merges props, attrs, listeners from directives', () => {
      const directives = {
        model: { value: 'foo', modifiers: [] },
        class: { value: 'foo', modifiers: [] },
        style: { value: { color: 'red' }, modifiers: [] },
      };
      const result = processDirectives(directives, { foo: 'bar' }, document.createElement('input'));
      expect(result.props).toBeDefined();
      expect(result.attrs.class).toBeDefined();
      expect(result.attrs.style).toContain('color: red');
      expect(result.listeners).toBeDefined();
    });
  });

  describe('assignKeysDeep', () => {
    it('assigns keys to nodes and children', () => {
      const vnode: VNode = {
        tag: 'div',
        children: [
          { tag: 'span', children: '', props: {} },
          { tag: 'span', children: '', props: {} },
        ],
        props: {},
      };
      const result = assignKeysDeep(vnode, 'base') as VNode;
      expect(result.key).toBeDefined();
      expect((result.children![0] as VNode).key).toContain('base');
    });
    it('assigns unique keys among siblings', () => {
      const vnodes: VNode[] = [
        { tag: 'div', props: {}, children: [] },
        { tag: 'div', props: {}, children: [] },
      ];
      const result = assignKeysDeep(vnodes, 'root') as VNode[];
      expect(result[0].key).not.toBe(result[1].key);
    });
  });

  describe('patchProps', () => {
    let el: HTMLElement;
    beforeEach(() => {
      el = document.createElement('input');
    });
    it('sets value and checked props', () => {
      patchProps(el, { props: { value: 'a', checked: false }, attrs: {} }, { props: { value: 'b', checked: true }, attrs: {} });
      expect((el as HTMLInputElement).value).toBe('b');
      expect((el as HTMLInputElement).checked).toBe(true);
    });
    it('sets/removes attributes', () => {
      patchProps(el, { props: {}, attrs: { foo: 'bar' } }, { props: {}, attrs: { foo: undefined } });
      expect(el.hasAttribute('foo')).toBe(false);
    });
    it('adds event listeners', () => {
      const fn = vi.fn();
  patchProps(el, { props: {}, attrs: {} }, { props: { onClick: fn }, attrs: {} });
      el.dispatchEvent(new Event('click'));
      expect(fn).toHaveBeenCalled();
    });
  });

  describe('createElement', () => {
    it('creates text node for string', () => {
      const node = createElement('hello');
      expect(node.nodeType).toBe(Node.TEXT_NODE);
      expect(node.textContent).toBe('hello');
    });
    it('creates element node for VNode', () => {
  const vnode: VNode = { tag: 'div', props: {}, children: 'hi' };
      const node = createElement(vnode);
      expect(node.nodeType).toBe(Node.ELEMENT_NODE);
      expect((node as HTMLElement).tagName).toBe('DIV');
      expect(node.textContent).toBe('hi');
    });
    it('creates anchor block fragment', () => {
  const vnode: AnchorBlockVNode = { tag: '#anchor', key: 'a', children: [ { tag: '#text', children: 'x' } ] };
      const node = createElement(vnode);
      expect(node.nodeType).toBe(Node.DOCUMENT_FRAGMENT_NODE);
    });
  });

  describe('patchChildren', () => {
    let parent: HTMLElement;
    beforeEach(() => {
      parent = document.createElement('div');
    });
    it('patches text children', () => {
      parent.textContent = 'old';
      patchChildren(parent, 'old', 'new');
      expect(parent.textContent).toBe('new');
    });
    it('patches array children', () => {
      const oldVNodes: VNode[] = [
        { tag: 'span', key: 'a', props: {}, children: '1' },
      ];
      const newVNodes: VNode[] = [
        { tag: 'span', key: 'a', props: {}, children: '2' },
      ];
      parent.appendChild(createElement(oldVNodes[0]));
      patchChildren(parent, oldVNodes, newVNodes);
      expect(parent.firstChild!.textContent).toBe('2');
    });
  });

  describe('patch', () => {
    it('patches text node', () => {
      const dom = document.createTextNode('a');
      const node = patch(dom, 'a', 'b');
      expect(node.textContent).toBe('b');
    });
    it('patches element node', () => {
  const oldVNode: VNode = { tag: 'div', key: 'x', props: {}, children: 'a' };
  const newVNode: VNode = { tag: 'div', key: 'x', props: {}, children: 'b' };
      const dom = createElement(oldVNode);
      const node = patch(dom, oldVNode, newVNode);
      expect(node.textContent).toBe('b');
    });
    it('replaces node if tag or key changes', () => {
      const oldVNode: VNode = { tag: 'div', key: 'x', props: {}, children: [] };
      const newVNode: VNode = { tag: 'span', key: 'y', props: {}, children: [] };
      const dom = createElement(oldVNode);
      const node = patch(dom, oldVNode, newVNode);
      expect((node as HTMLElement).tagName).toBe('SPAN');
    });
    it('removes node if newVNode is null', () => {
      const oldVNode: VNode = { tag: 'div', key: 'x', props: {}, children: [] };
      const dom = createElement(oldVNode);
      const node = patch(dom, oldVNode, null);
      expect(node.nodeType).toBe(Node.COMMENT_NODE);
    });
  });

  describe('vdomRenderer', () => {
    let root: ShadowRoot;
    beforeEach(() => {
      const host = document.createElement('div');
      root = host.attachShadow({ mode: 'open' });
    });
    it('renders vnode to shadow root', () => {
  const vnode: VNode = { tag: 'div', props: {}, children: 'hi' };
      vdomRenderer(root, vnode);
      expect(root.firstChild).toBeInstanceOf(HTMLElement);
      expect((root.firstChild as HTMLElement).textContent).toBe('hi');
    });
    it('updates on subsequent renders', () => {
  const vnode1: VNode = { tag: 'div', props: {}, children: 'a' };
  const vnode2: VNode = { tag: 'div', props: {}, children: 'b' };
      vdomRenderer(root, vnode1);
      vdomRenderer(root, vnode2);
      expect((root.firstChild as HTMLElement).textContent).toBe('b');
    });
  });

  describe('renderToString', () => {
    it('renders text vnode', () => {
      expect(renderToString({ tag: '#text', children: 'hi' })).toBe('hi');
    });
    it('renders element vnode', () => {
      expect(renderToString({ tag: 'div', props: { attrs: { id: 'x' } }, children: 'hi' })).toBe('<div id="x">hi</div>');
    });
    it('renders anchor block vnode', () => {
      expect(renderToString({ tag: '#anchor', children: [ { tag: '#text', children: 'a' }, { tag: '#text', children: 'b' } ] })).toBe('ab');
    });
  });
});
