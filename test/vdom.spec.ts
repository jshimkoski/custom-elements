import { describe, it, expect } from 'vitest';
import { vdomRenderer, renderToString } from '../src/lib/runtime/vdom';
import type { VNode } from '../src/lib/runtime/types';

function vnode(tag: any, children: any, key: any, props: any): VNode {
  return { tag, children, key, props };
}

describe('vdom', () => {
  it('should render simple VNode tree', () => {
    const root = document.createElement('div').attachShadow({ mode: 'open' });
    const tree = vnode('div', [
      vnode('span', 'A', undefined, undefined),
      vnode('span', 'B', undefined, undefined)
    ], undefined, undefined);
    expect(() => vdomRenderer(root, tree)).not.toThrow();
    expect(root.innerHTML).toContain('span');
  });

  it('should SSR render to string', () => {
    const tree = vnode('div', [
      vnode('span', 'A', undefined, undefined),
      vnode('span', 'B', undefined, undefined)
    ], undefined, undefined);
    const htmlStr = renderToString(tree);
    expect(htmlStr).toContain('<div>');
    expect(htmlStr).toContain('<span>');
    expect(htmlStr).toContain('A');
    expect(htmlStr).toContain('B');
  });

  it('should handle anchor blocks and keyed children', () => {
    const anchor = { tag: '#anchor', key: 'a', children: [
      vnode('li', 'X', undefined, undefined),
      vnode('li', 'Y', undefined, undefined)
    ] };
    const tree = vnode('ul', [anchor], undefined, undefined);
    const htmlStr = renderToString(tree);
    expect(htmlStr).toContain('<ul>');
    expect(htmlStr).toContain('li');
    expect(htmlStr).toContain('X');
    expect(htmlStr).toContain('Y');
  });

  it('should handle deeply nested VNodes', () => {
    const deep = vnode('div', [
      vnode('ul', [
        vnode('li', 'X', undefined, undefined),
        vnode('li', 'Y', undefined, undefined)
      ], undefined, undefined)
    ], undefined, undefined);
    const htmlStr = renderToString(deep);
    expect(htmlStr).toContain('<ul>');
    expect(htmlStr).toContain('<li>');
    expect(htmlStr).toContain('X');
    expect(htmlStr).toContain('Y');
  });

  it('should handle empty children and missing props', () => {
    const v = vnode('div', undefined, undefined, undefined);
    const htmlStr = renderToString(v);
    expect(htmlStr).toContain('<div');
  });

  // Edge case: SSR serialization for anchor block with empty children
  it('should SSR render anchor block with empty children', () => {
    const anchor = { tag: '#anchor', key: 'empty', children: [] };
    const htmlStr = renderToString(anchor);
    expect(htmlStr).toBe('');
  });

  // Edge case: SSR serialization for text node
  it('should SSR render text node', () => {
    const textVNode = { tag: '#text', children: 'TextContent' };
    const htmlStr = renderToString(textVNode);
    expect(htmlStr).toBe('TextContent');
  });

  // Edge case: SSR serialization for deeply nested anchor blocks
  it('should SSR render deeply nested anchor blocks', () => {
    const deepAnchor = {
      tag: '#anchor',
      key: 'deep',
      children: [
        { tag: '#anchor', key: 'inner', children: [
          { tag: 'span', children: 'Inner' }
        ]}
      ]
    };
    const htmlStr = renderToString(deepAnchor);
    expect(htmlStr).toContain('Inner');
  });

  // Edge case: SSR serialization for VNode with undefined children
  it('should SSR render VNode with undefined children', () => {
    const vnode = { tag: 'div', children: undefined };
    const htmlStr = renderToString(vnode);
    expect(htmlStr).toContain('<div');
  });

  // Edge case: SSR serialization for VNode with children as string
  it('should SSR render VNode with string children', () => {
    const vnode = { tag: 'span', children: 'StringChild' };
    const htmlStr = renderToString(vnode);
    expect(htmlStr).toContain('StringChild');
  });

  // Edge case: SSR serialization for VNode with children as array of text nodes
  it('should SSR render VNode with array of text nodes', () => {
    const vnode = { tag: 'div', children: [
      { tag: '#text', children: 'A' },
      { tag: '#text', children: 'B' }
    ]};
    const htmlStr = renderToString(vnode);
    expect(htmlStr).toContain('A');
    expect(htmlStr).toContain('B');
  });

  // Patch with null/undefined nodes
  it.skip('should handle patching with null nodes', () => {
    const dom = document.createElement('div');
    expect(() => {
      // patch(dom, null, null, {});
    }).not.toThrow();
  });

  // SSR: anchor block with undefined children
  it('should SSR anchor block with undefined children', () => {
    const anchor = { tag: '#anchor', key: 'empty', children: undefined };
    const htmlStr = renderToString(anchor);
    expect(htmlStr).toBe('');
  });

  // SSR: VNode with children as array of undefined
  it.skip('should SSR VNode with children as array of undefined', () => {
    const vnode = { tag: 'div', children: [undefined, undefined] };
    // const htmlStr = renderToString(vnode);
    // expect(htmlStr).toContain('<div');
  });

  // SSR: deeply nested anchor blocks with undefined children
  it('should SSR deeply nested anchor blocks with undefined children', () => {
    const deepAnchor = {
      tag: '#anchor',
      key: 'deep',
      children: [
        { tag: '#anchor', key: 'inner', children: undefined }
      ]
    };
    const htmlStr = renderToString(deepAnchor);
    expect(htmlStr).toBe('');
  });

  it('should patch element with same tag and key', () => {
    const root = document.createElement('div').attachShadow({ mode: 'open' });
    const tree1 = vnode('div', [vnode('span', 'A', 'k1', undefined)], 'root', undefined);
    vdomRenderer(root, tree1);
    const tree2 = vnode('div', [vnode('span', 'B', 'k1', undefined)], 'root', undefined);
    expect(() => vdomRenderer(root, tree2)).not.toThrow();
    expect(root.innerHTML).toContain('B');
  });

  it('should replace DOM when tag or key changes', () => {
    const root = document.createElement('div').attachShadow({ mode: 'open' });
    const tree1 = vnode('div', 'A', 'root', undefined);
    vdomRenderer(root, tree1);
    const tree2 = vnode('span', 'B', 'root2', undefined);
    expect(() => vdomRenderer(root, tree2)).not.toThrow();
    expect(root.innerHTML).toContain('B');
    expect(root.innerHTML).toContain('span');
  });

  it('should remove extra nodes but preserve style elements', () => {
    const root = document.createElement('div').attachShadow({ mode: 'open' });
    const styleVNode = { tag: 'style', children: '.x{}' };
    const tree = vnode('div', [styleVNode, vnode('span', 'A', 'k1', undefined)], 'root', undefined);
    vdomRenderer(root, tree);
    expect(root.querySelector('style')).not.toBeNull();
    expect(root.innerHTML).toContain('A');
  });

  it('should escape HTML entities in text', () => {
    const html = renderToString({ tag: 'div', children: 'Tom & Jerry <script> "Hello"' });
    expect(html).toBe('<div>Tom &amp; Jerry &lt;script&gt; &quot;Hello&quot;</div>');
  });

  it.skip('should serialize props as HTML attributes', () => {
    const vnodeObj = { tag: 'div', props: { props: { id: 'foo', title: 'bar & baz' } }, children: 'X' };
    const htmlStr = renderToString(vnodeObj);
    expect(htmlStr).toContain('id="foo"');
    expect(htmlStr).toContain('title="bar &amp; baz"');
    expect(htmlStr).toContain('X');
  });
});

describe('vdomRenderer edge cases', () => {
  it('removes extra nodes except style', () => {
    const host = document.createElement('div');
    const shadowRoot = host.attachShadow({ mode: 'open' });
    // Add extra nodes
    shadowRoot.appendChild(document.createElement('div'));
    shadowRoot.appendChild(document.createElement('span'));
    const style = document.createElement('style');
    shadowRoot.appendChild(style);

    const vnode: VNode = { tag: 'div', children: 'Test' };
    vdomRenderer(shadowRoot, vnode, {}, {});
    // Only the rendered node and style should remain
    expect(shadowRoot.querySelector('style')).not.toBeNull();
    expect(shadowRoot.childNodes.length).toBe(2);
  });

  it('tracks previous VNode and DOM node', () => {
    const host = document.createElement('div');
    const shadowRoot = host.attachShadow({ mode: 'open' });
    const vnode: VNode = { tag: 'div', children: 'First' };
    vdomRenderer(shadowRoot, vnode, {}, {});
    // Should set _prevVNode and _prevDom
    expect((shadowRoot as any)._prevVNode).toBeTruthy();
    expect((shadowRoot as any)._prevDom).toBeTruthy();
  });

  it('handles null refs cleanup', () => {
    const host = document.createElement('div');
    const shadowRoot = host.attachShadow({ mode: 'open' });
    const refs: any = {};
    // First render with ref and key
    vdomRenderer(shadowRoot, { tag: 'div', key: 'old', props: { ref: 'myRef' } }, {}, refs);
    expect(refs.myRef).toBeInstanceOf(HTMLElement);
    // Second render with a different key/tag, should replace and clean up
    vdomRenderer(shadowRoot, { tag: 'span', key: 'new', children: 'X' }, {}, refs);
    expect(shadowRoot.querySelector('div')).toBeNull();
    expect(shadowRoot.querySelector('span')).not.toBeNull();
  });
});

describe('renderToString edge cases', () => {
  it('renders empty children', () => {
    const vnode: VNode = { tag: 'div' };
    expect(renderToString(vnode)).toBe('<div></div>');
  });

  it('renders deeply nested VNodes', () => {
    const vnode: VNode = {
      tag: 'section',
      children: [
        { tag: 'header', children: 'Title' },
        { tag: 'main', children: [
          { tag: 'article', children: 'Content' }
        ]}
      ]
    };
    expect(renderToString(vnode)).toBe('<section><header>Title</header><main><article>Content</article></main></section>');
  });
});