import { describe, expect, it } from 'vitest';
import { html } from '../src/lib/runtime/template-compiler';
import { renderToString } from '../src/lib/runtime/vdom-ssr';
import { renderToStringDSD } from '../src/lib/runtime/vdom-ssr-dsd';

describe('native bound properties during SSR', () => {
  for (const render of [renderToString, renderToStringDSD]) {
    it(`retains image alternatives and form constraints (${render.name})`, () => {
      const image = render(html`<img :src="${'/photo.webp'}" :alt="${'Photo & detail'}">` as any);
      expect(image).toContain('src="/photo.webp"');
      expect(image).toContain('alt="Photo &amp; detail"');
      const input = render(html`<input :required="${true}" :disabled="${false}" :value="${'Ready'}">` as any);
      expect(input).toContain(' required');
      expect(input).not.toContain(' disabled');
      expect(input).toContain('value="Ready"');
    });
    it(`serializes bound textarea and select values using native HTML semantics (${render.name})`, () => {
      expect(render(html`<textarea :value="${'Saved & safe'}"></textarea>` as any)).toContain('<textarea>Saved &amp; safe</textarea>');
      const select = render(html`<select :value="${'b'}"><option value="a">A</option><optgroup label="Group"><option value="b">B</option></optgroup></select>` as any);
      expect(select).toContain('<option value="b" selected>B</option>');
      expect(select).not.toContain('<select value=');
      const parsed = document.createElement('div');
      parsed.innerHTML = render(html`<textarea :value="${'\nFirst line'}"></textarea>` as any);
      expect(parsed.querySelector('textarea')!.value).toBe('\nFirst line');
      parsed.innerHTML = render(html`<select multiple :value="${['a', 'b']}"><option value="a">A</option><option value="b">B</option></select>` as any);
      expect(Array.from(parsed.querySelector('select')!.selectedOptions).map(option => option.value)).toEqual(['a', 'b']);
    });
  }
});
