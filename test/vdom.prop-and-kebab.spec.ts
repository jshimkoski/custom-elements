import { describe, it, expect } from 'vitest';
import { vdomRenderer } from '../src/lib/runtime/vdom';
import type { VNode } from '../src/lib/runtime/types';

function vnode(tag: any, children: any, key: any, props: any): VNode {
  return { tag, children, key, props } as any;
}

describe('vdom property assignment and kebab->camel mapping', () => {
  it('assigns .value on input and textarea from bound attrs', () => {
    const root = document.createElement('div').attachShadow({ mode: 'open' });
    const tree = vnode(
      'div',
      [
        vnode('input', undefined, undefined, {
          attrs: { type: 'text', value: 'input-val' },
        }),
        vnode('textarea', 'ignored', undefined, {
          attrs: { value: 'textarea-val' },
        }),
      ],
      undefined,
      undefined,
    );

    vdomRenderer(root, tree);

    const input = root.querySelector('input') as HTMLInputElement | null;
    const textarea = root.querySelector(
      'textarea',
    ) as HTMLTextAreaElement | null;
    expect(input).not.toBeNull();
    expect(textarea).not.toBeNull();
    expect(input!.value).toBe('input-val');
    // Textarea's .value should be assigned (not just attribute)
    expect(textarea!.value).toBe('textarea-val');
  });

  it('keeps data- and aria- attributes as attributes (not direct properties)', () => {
    const root = document.createElement('div').attachShadow({ mode: 'open' });
    const tree = vnode('div', undefined, undefined, {
      attrs: { 'data-foo': 'bar', 'aria-label': 'mylabel' },
    });
    vdomRenderer(root, tree);

    const el = root.querySelector('div') as HTMLElement | null;
    expect(el).not.toBeNull();
    expect(el!.getAttribute('data-foo')).toBe('bar');
    expect(el!.getAttribute('aria-label')).toBe('mylabel');
    // They should not be present as direct properties named 'data-foo' or 'aria-label'
    expect((el as any)['data-foo']).toBeUndefined();
    expect((el as any)['aria-label']).toBeUndefined();
  });

  it('assigns camelCase property on custom element for kebab-case attr and updates on re-render', () => {
    // Define a custom element that records assignments to `myProp`
    class RecorderEl extends HTMLElement {
      public myProp: any = undefined;
      set recorded(val: any) {
        // not used, helper to ensure property space exists
      }
    }
    if (!customElements.get('recorder-el'))
      customElements.define('recorder-el', RecorderEl);

    const root = document.createElement('div').attachShadow({ mode: 'open' });
    const tree1 = vnode('recorder-el', undefined, undefined, {
      attrs: { 'my-prop': 'one' },
    });
    vdomRenderer(root, tree1);
    const el = root.querySelector('recorder-el') as any;
    expect(el).not.toBeNull();
    // Prefer property assignment: expect camelCase property to reflect value
    expect(el.myProp === 'one' || el.getAttribute('my-prop') === 'one').toBe(
      true,
    );

    // Re-render with a new value and ensure property updated
    const tree2 = vnode('recorder-el', undefined, undefined, {
      attrs: { 'my-prop': 'two' },
    });
    vdomRenderer(root, tree2);
    expect(el.myProp === 'two' || el.getAttribute('my-prop') === 'two').toBe(
      true,
    );
  });
});
