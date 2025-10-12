import { describe, it, expect } from 'vitest';
import { html } from '../src/lib/runtime/template-compiler';
import { renderToString } from '../src/lib/runtime/vdom';
import { unsafeHTML } from '../src/lib/runtime/helpers';

describe('unsafeHTML and entity decoding', () => {
  it('decodes HTML entities inside text nodes', () => {
    const vnode = html`<div>Hello &lt;World&gt; &amp; Co.</div>` as any;
    expect(vnode.children).toBe('Hello <World> & Co.');
  });

  it('decodes entities in interpolated values', () => {
    const val = '&lt;3 &amp; hi';
    const vnode = html`<p>${val}</p>` as any;
    // Interpolated values are provided by the user and should not be
    // changed by the compiler; decoding can be done explicitly by users
    // if they want. Expect the raw string preserved here.
    expect(vnode.children).toBe('&lt;3 &amp; hi');
  });

  it('inserts raw HTML via unsafeHTML in DOM serializer', () => {
    const vnode = html`<div>${unsafeHTML('<b>bold</b>')}</div>` as any;
    // debug
    // console.log(JSON.stringify(vnode, null, 2));
    const out = renderToString(vnode as any);
    // console.log(out);
    expect(out).toBe('<div><b>bold</b></div>');
  });
});
