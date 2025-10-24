import { describe, it, expect } from 'vitest';
import {
  assignKeysDeep,
  createElement,
  patch,
  vdomRenderer,
} from '../src/lib/runtime/vdom';
import { renderToString } from '../src/lib/runtime/vdom-ssr';

describe('vdom.additional', () => {
  it('assignKeysDeep assigns unique keys for siblings and nested children', () => {
    const nodes = [
      { tag: 'div', props: { attrs: { id: 'a' } } },
      { tag: 'div', props: { attrs: { id: 'a' } } },
      { tag: 'span' },
    ];
    const out = assignKeysDeep(nodes as any, 'base') as any[];
    expect(out[0].key).toMatch(/^base:div:a/);
    expect(out[1].key).toMatch(/^base:div:a#/);
    expect(out[2].key).toBe('base:span');
  });

  it('renderToString renders elements, anchors and text correctly', () => {
    const vnode = {
      tag: 'div',
      props: { attrs: { id: 'root' } },
      children: [
        { tag: '#text', children: 'hello' },
        { tag: '#anchor', children: [{ tag: 'span', children: 'inner' }] },
      ],
    } as any;
    const out = renderToString(vnode as any);
    expect(out).toContain('<div');
    expect(out).toContain('hello');
    expect(out).toContain('<span');
    expect(out).toContain('inner');
  });

  it('createElement creates anchor fragments with start/end markers', () => {
    const vnode = {
      tag: '#anchor',
      key: 'block',
      children: [{ tag: 'b', children: 'x' }],
    } as any;
    const node = createElement(vnode as any);
    // Should be a DocumentFragment
    expect(node.nodeType).toBe(Node.DOCUMENT_FRAGMENT_NODE);
    // Ensure there are 3 child nodes (start, child, end)
    expect((node as DocumentFragment).childNodes.length).toBe(3);
  });

  it('patch replaces node when tag changes', () => {
    const root = document.createElement('div');
    const oldVNode = { tag: 'p', key: 'k', children: 'old' } as any;
    const newVNode = { tag: 'span', key: 'k', children: 'new' } as any;
    const oldEl = createElement(oldVNode);
    root.appendChild(oldEl);
    const out = patch(oldEl, oldVNode, newVNode);
    expect(out.parentNode).toBe(root);
    expect(root.firstChild?.nodeName.toLowerCase()).toBe('span');
  });

  it('vdomRenderer mounts and replaces nodes and preserves style elements removal behavior', () => {
    const host = document.createElement('div');
    const sr = host.attachShadow({ mode: 'open' });
    vdomRenderer(
      sr as any,
      {
        tag: 'div',
        key: 'root',
        children: [{ tag: 'span', children: 'a' }],
      } as any,
    );
    expect(sr.firstChild).toBeTruthy();
    // Insert a STYLE that should be preserved
    const style = document.createElement('style');
    sr.appendChild(style);
    vdomRenderer(
      sr as any,
      {
        tag: 'div',
        key: 'root',
        children: [{ tag: 'span', children: 'b' }],
      } as any,
    );
    // Style should still exist
    expect(Array.from(sr.childNodes).some((n) => n.nodeName === 'STYLE')).toBe(
      true,
    );
  });
});
