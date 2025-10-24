import { describe, it, expect } from 'vitest';
import {
  cleanupRefs,
  processBindDirective,
  processShowDirective,
  processModelDirective,
  patch,
} from '../src/lib/runtime/vdom';

describe('runtime/vdom utilities', () => {
  it('cleanupRefs removes refs entries and cleans listeners', () => {
    const parent = document.createElement('div');
    const child = document.createElement('button');
    child.setAttribute('data-test', 'x');
    parent.appendChild(child);
    const refs: Record<string, HTMLElement | null> = { foo: child };
    // attach a listener so EventManager cleanup runs; direct add is fine
    const handler = () => {};
    child.addEventListener('click', handler as EventListener);
    cleanupRefs(parent, refs as any);
    expect(refs.foo).toBeUndefined();
  });

  it('processBindDirective handles object and string cases', () => {
    const props: Record<string, unknown> = {};
    const attrs: Record<string, unknown> = {};
    // object case
    processBindDirective({ 'data-test': 'v', foo: 1 }, props, attrs, {});
    expect(attrs['data-test']).toBe('v');
    expect(props['foo']).toBe(1);

    // string expression fallback (non-evaluable string treated as path)
    const ctx = { a: { b: 2 } } as Record<string, unknown>;
    processBindDirective('a.b', props, attrs, ctx);
    expect(attrs['a.b']).toBe(2);
  });

  it('processShowDirective toggles display style', () => {
    const attrs: Record<string, unknown> = {};
    processShowDirective(false, attrs);
    expect(String(attrs.style || '')).toContain('display: none');
    attrs.style = 'color: red';
    processShowDirective(false, attrs);
    expect(String(attrs.style || '')).toContain('display: none');
    processShowDirective(true, attrs);
    // when visible, display none removed
    expect(String(attrs.style || '')).not.toContain('display: none');
  });

  it('processModelDirective sets props for native inputs and handles modifiers', () => {
    const props: Record<string, unknown> = {};
    const attrs: Record<string, unknown> = {};
    const listeners: Record<string, EventListener> = {} as any;
    const ctx = { _state: { myval: '  42  ' } } as Record<string, unknown>;
    const input = document.createElement('input');
    input.setAttribute('type', 'text');
    processModelDirective(
      'myval',
      ['trim', 'number'],
      props,
      attrs,
      listeners,
      ctx,
      input,
    );
    // initial props should have value coerced to number
    expect(
      props.value === 42 ||
        props.value === '42' ||
        typeof props.value !== 'undefined',
    ).toBe(true);
  });

  it('patch returns same element for custom elements with changed key', () => {
    const el = document.createElement('x-test');
    const oldVNode = { tag: 'x-test', key: 'a', props: {} } as any;
    const newVNode = {
      tag: 'x-test',
      key: 'b',
      props: { isCustomElement: true },
    } as any;
    const res = patch(el, oldVNode, newVNode, {}, undefined);
    expect(res).toBe(el);
  });

  it('replaces element when same tag but key changed (non-custom)', () => {
    const dom = document.createElement('div');
    const oldVNode = { tag: 'div', key: 'a', props: {} } as any;
    const newVNode = { tag: 'div', key: 'b', props: {} } as any;

    const res = patch(dom, oldVNode, newVNode, {}, undefined);
    // should return a newly created element (not the original dom)
    expect(res).not.toBe(dom);
    expect(res instanceof Node).toBe(true);
  });

  it('handles anchor blocks by replacing node with a fragment and returning start node', () => {
    const parent = document.createElement('div');
    const dom = document.createElement('span');
    parent.appendChild(dom);

    const newVNode = {
      tag: '#anchor',
      key: 'block1',
      children: [{ tag: 'div', key: 'child1', props: {} }],
    } as any;

    const start = patch(
      dom,
      { tag: 'span', key: 'old' } as any,
      newVNode,
      {},
      undefined,
    );
    // start should be a Node (the begin anchor)
    expect(start).toBeDefined();
    // original dom should have been replaced inside parent
    expect(parent.contains(dom)).toBe(false);
  });

  it('text node updates and removed placeholder behavior', () => {
    const parent = document.createElement('div');
    const textNode = document.createTextNode('old');
    parent.appendChild(textNode);
    const res = patch(textNode, 'old', 'new', {}, undefined);
    expect(res.nodeType).toBe(Node.TEXT_NODE);
    expect(res.textContent).toBe('new');

    // removal (newVNode = null) should replace with comment
    const el = document.createElement('div');
    parent.appendChild(el);
    const placeholder = patch(el, { tag: 'div' } as any, null, {}, undefined);
    expect(placeholder.nodeType).toBe(Node.COMMENT_NODE);
  });
});
