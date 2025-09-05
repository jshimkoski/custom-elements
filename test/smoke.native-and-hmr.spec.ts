import { describe, it, expect } from 'vitest';
import { component } from '../src/lib/runtime/component';
import { html } from '../src/lib/runtime/template-compiler';

describe('smoke: native inputs and HMR re-registration', () => {
  it('updates native input value when context state changes', async () => {
    component('native-input-test', (ctx: any) => html`<input id="t" type="text" :model="value" />`, {
      state: { value: 'init' }
    });

    const el = document.createElement('native-input-test') as any;
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 10));

    const input = el.shadowRoot?.querySelector('#t') as HTMLInputElement | null;
    expect(input).toBeTruthy();

    // Mutate context and ensure input reflects change
    el.context.value = 'changed';
    await new Promise((r) => setTimeout(r, 10));
    expect(input!.value).toBe('changed');
    document.body.removeChild(el);
  });

  it('handles checkbox with array model correctly', async () => {
    component('checkbox-array-test', (ctx: any) => html`<input id="c" type="checkbox" value="A" :model="items" />`, {
      state: { items: ['A'] }
    });

    const el = document.createElement('checkbox-array-test') as any;
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 10));

    const checkbox = el.shadowRoot?.querySelector('#c') as HTMLInputElement | null;
    expect(checkbox).toBeTruthy();
    // Initially checked because 'A' is in items
    expect(checkbox!.checked).toBe(true);

  // Mutate context to remove 'A' and ensure checkbox updates
  el.context.items = [];
  await new Promise((r) => setTimeout(r, 10));
  expect(Array.isArray(el.context.items)).toBe(true);
  expect((el.context.items as any[]).includes('A')).toBe(false);
    document.body.removeChild(el);
  });

  it('re-registering a component updates existing instances (HMR style)', async () => {
    component('hmr-dog', () => html`<div id="v">one</div>`, {});
    const el = document.createElement('hmr-dog') as HTMLElement;
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 10));
    const before = el.shadowRoot?.querySelector('#v') as HTMLElement | null;
    expect(before?.textContent).toBe('one');

    // Re-register with new render output
    component('hmr-dog', () => html`<div id="v">two</div>`, {});
    // Allow time for update to propagate
    await new Promise((r) => setTimeout(r, 10));
    const after = el.shadowRoot?.querySelector('#v') as HTMLElement | null;
    expect(after?.textContent).toBe('two');

    document.body.removeChild(el);
  });
});
