import { describe, it, expect } from 'vitest';
import { createElement } from '../src/lib/runtime/vdom';

describe('vdom custom element property assignment', () => {
  it('sets JS properties on custom elements (tag contains a dash) and avoids attributes', () => {
    const vnode: any = {
      tag: 'my-widget',
      props: {
        props: { value: 'hello', custom: 42 },
        attrs: {},
  isCustomElement: true,
      },
      children: undefined,
    };

    const node = createElement(vnode) as HTMLElement;

    // Should be an element with the custom tag
    expect(node.tagName.toLowerCase()).toBe('my-widget');

    // JS properties should have been assigned
    expect((node as any).value).toBe('hello');
    expect((node as any).custom).toBe(42);

    // Attributes should not have been set as strings
    expect(node.getAttribute('value')).toBeNull();
    expect(node.getAttribute('custom')).toBeNull();
  });
});
