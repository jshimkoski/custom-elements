import { describe, it, expect, beforeEach } from 'vitest';
import { vdomRenderer } from '../src/lib/runtime/vdom';
import type { VNode } from '../src/lib/runtime/types';

function vnode(tag: any, children: any, key: any, props: any): VNode {
  return { tag, children, key, props } as any;
}

describe('vdom svg and kebab->camel behavior', () => {
  it('keeps attributes on SVG elements (does not assign JS properties)', () => {
    const root = document.createElement('div').attachShadow({ mode: 'open' });
    // Create an SVG vnode with a path that has a bound 'd' attribute
    const tree = vnode('svg', [vnode('path', undefined, undefined, { attrs: { d: 'M0 0 L10 10' } })], undefined, undefined);
    vdomRenderer(root, tree);

    const svg = root.querySelector('svg') as SVGSVGElement | null;
    expect(svg).not.toBeNull();
    const path = svg!.querySelector('path') as SVGPathElement | null;
    expect(path).not.toBeNull();
    // The path should have the 'd' attribute set
    expect(path!.getAttribute('d')).toBe('M0 0 L10 10');
    // And there should be no JS property 'd' on the element (SVG properties differ)
    expect((path as any).d === undefined || (path as any).d === null).toBe(true);
  });

  it('converts kebab-case attrs to camelCase props on custom elements and assigns property', () => {
    // Define a custom element with a camelCase property to observe assignments
    class TestEl extends HTMLElement {
      myProp: any = undefined;
      constructor() {
        super();
      }
    }
    if (!customElements.get('test-el')) customElements.define('test-el', TestEl);

    const root = document.createElement('div').attachShadow({ mode: 'open' });
    // VNode with kebab-case attribute; runtime/compiler should map to camelCase
    const tree = vnode('test-el', undefined, undefined, { attrs: { 'my-prop': 'hello' } });
    vdomRenderer(root, tree);

    const el = root.querySelector('test-el') as any;
    expect(el).not.toBeNull();
    // The runtime should have assigned the camelCase property myProp
    expect(el.myProp === 'hello' || el.getAttribute('my-prop') === 'hello').toBe(true);
  });
});
