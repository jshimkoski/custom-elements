import { afterEach, expect, it } from 'vitest';
import { component, html, ref, useLazyContent } from '../src/lib';
afterEach(() => document.body.replaceChildren());
const tick = () => new Promise((done) => setTimeout(done, 0));
it('avoids constructing closed content and retains its DOM after first open', async () => {
  let calls = 0;
  component('test-lazy-content', () => {
    const open = ref(false);
    const content = useLazyContent(open.value, () => { calls++; return html`<input value="Initial">`; });
    return html`<button @click="${() => { open.value = !open.value; }}">Toggle</button>${content}`;
  });
  const host = document.createElement('test-lazy-content'); document.body.append(host); await tick();
  expect(calls).toBe(0); expect(host.shadowRoot!.querySelector('input')).toBeNull();
  host.shadowRoot!.querySelector('button')!.click(); await tick();
  const input = host.shadowRoot!.querySelector('input')!; input.value = 'Edited';
  host.shadowRoot!.querySelector('button')!.click(); await tick();
  expect(host.shadowRoot!.querySelector('input')).toBe(input); expect(input.value).toBe('Edited');
});
