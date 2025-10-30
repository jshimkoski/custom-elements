import { describe, it, expect } from 'vitest';
import { renderToString } from '../src/lib/runtime/vdom-ssr';

function vnode(tag: any, children?: any, key?: any, props?: any) {
  return { tag, children, key, props } as any;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

describe('vdom SSR namespace serialization and mixed-namespace edge cases', () => {
  it('serializes explicit xmlns on <svg> and preserves child elements', () => {
    const tree = vnode(
      'svg',
      [vnode('path', undefined, undefined, { attrs: { d: 'M0 0 L10 10' } })],
      undefined,
      { attrs: { xmlns: SVG_NS, viewBox: '0 0 24 24' } },
    );

    const out = renderToString(tree);
    expect(out).toContain('xmlns="' + SVG_NS + '"');
    expect(out).toContain('<path');
    expect(out).toContain('</svg>');
  });

  it('preserves mixed child xmlns attributes (child overrides parent namespace)', () => {
    const customNS = 'http://example.com/custom';
    const tree = vnode(
      'svg',
      [
        vnode('g', [
          vnode('foreign', undefined, undefined, {
            attrs: { xmlns: customNS },
          }),
        ]),
      ],
      undefined,
      { attrs: { xmlns: SVG_NS } },
    );

    const out = renderToString(tree);
    // Parent svg should have SVG namespace
    expect(out).toContain('xmlns="' + SVG_NS + '"');
    // Child explicit xmlns should be present verbatim
    expect(out).toContain('xmlns="' + customNS + '"');
    expect(out).toContain('<foreign');
  });

  it('does not auto-insert an xmlns on <svg> when none is provided (SSR mirrors vnode.attrs)', () => {
    const tree = vnode('svg', [
      vnode('circle', undefined, undefined, { attrs: { r: '4' } }),
    ]);
    const out = renderToString(tree);
    // Default behavior: injection enabled
    expect(out).toContain('xmlns="' + SVG_NS + '"');
    expect(out).toContain('<circle');

    // When opted-out, SSR should not inject the namespace
    const outNoInject = renderToString(tree, { injectSvgNamespace: false });
    expect(outNoInject).not.toContain('xmlns="' + SVG_NS + '"');
  });
});
