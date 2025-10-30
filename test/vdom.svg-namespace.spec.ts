import { describe, it, expect } from 'vitest';
import { createElement } from '../src/lib/runtime/vdom';

function vnode(tag: any, children?: any, key?: any, props?: any) {
  return { tag, children, key, props } as any;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

describe('vdom createElement SVG namespace handling', () => {
  it('creates svg and child elements in SVG namespace when xmlns provided on vnode', () => {
    const tree = vnode(
      'svg',
      [vnode('path', undefined, undefined, { attrs: { d: 'M0 0 L10 10' } })],
      undefined,
      { attrs: { xmlns: SVG_NS, viewBox: '0 0 24 24' } },
    );

    const el = createElement(tree) as Element;
    expect(el).not.toBeNull();
    expect(el.namespaceURI).toBe(SVG_NS);

    const path = el.querySelector('path') as Element | null;
    expect(path).not.toBeNull();
    expect(path!.namespaceURI).toBe(SVG_NS);
  });

  it('respects explicit non-SVG xmlns if provided (creates with that namespace)', () => {
    const customNS = 'http://example.com/custom';
    const tree = vnode('foo', undefined, undefined, {
      attrs: { xmlns: customNS },
    });
    const el = createElement(tree) as Element;
    expect(el).not.toBeNull();
    expect(el.namespaceURI).toBe(customNS);
  });

  it('creates children in SVG namespace when parent is an svg even if child has no xmlns', () => {
    const tree = vnode(
      'svg',
      [
        vnode('g', [
          vnode('path', undefined, undefined, { attrs: { d: 'M0 0' } }),
        ]),
      ],
      undefined,
      { attrs: { xmlns: SVG_NS } },
    );

    const el = createElement(tree) as Element;
    const g = el.querySelector('g') as Element | null;
    const path = el.querySelector('path') as Element | null;
    expect(g).not.toBeNull();
    expect(path).not.toBeNull();
    expect(g!.namespaceURI).toBe(SVG_NS);
    expect(path!.namespaceURI).toBe(SVG_NS);
  });
});
