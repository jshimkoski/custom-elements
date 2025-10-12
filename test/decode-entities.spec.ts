import { describe, it, expect } from 'vitest';
import { decodeEntities, unsafeHTML } from '../src/lib/runtime/helpers';
import { html, renderToString } from '../src/lib';

describe('decodeEntities & unsafeHTML', () => {
  it('decodeEntities decodes named and numeric entities', () => {
    expect(decodeEntities('&lt;&gt;&amp;&copy;&nbsp;')).toBe('<>&©\u00A0');
    expect(decodeEntities('&#60;&#62;&#38;')).toBe('<>&');
    expect(decodeEntities('&#x3C;&#x3E;')).toBe('<>');
  });

  it('unsafeHTML inserts raw HTML in templates and SSR', () => {
    const raw = '<b>bold</b>';
    const node = html`<div>${unsafeHTML(raw)}</div>`;
    // renderToString should output raw html unescaped
    const out = renderToString(node as any);
    expect(out).toContain('<div><b>bold</b></div>');
  });
});
