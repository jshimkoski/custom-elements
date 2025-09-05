import { describe, it, expect } from 'vitest';
import { component } from '../src/lib/runtime/component';
import { html } from '../src/lib/runtime/template-compiler';

describe('smoke: update propagation from child to parent', () => {
  it('propagates update:model-value from child to parent state', async () => {
    component('prop-child', (ctx: any) => html`<div id="val">${ctx.modelValue}</div>`, {
      props: { modelValue: { type: String } },
      state: { modelValue: 'child-initial' }
    });

    component('parent-prop', (ctx: any) => html`<prop-child :model="value" />`, {
      state: { value: 'one' }
    });

    const el = document.createElement('parent-prop');
    document.body.appendChild(el);
    // allow lifecycle to complete
    await new Promise((r) => setTimeout(r, 10));

    const child = el.shadowRoot?.querySelector('prop-child') as HTMLElement | null;
    expect(child).toBeTruthy();
    const inner = child?.shadowRoot?.querySelector('#val') as HTMLElement | null;
    expect(inner).toBeTruthy();
    expect(inner?.textContent).toBe('one');

    // Dispatch update event from child
    child?.dispatchEvent(new CustomEvent('update:model-value', { detail: 'two', bubbles: true, composed: true }));
    await new Promise((r) => setTimeout(r, 10));

    // After propagation, child should reflect new value
    const innerAfter = child?.shadowRoot?.querySelector('#val') as HTMLElement | null;
    expect(innerAfter?.textContent).toBe('two');

    document.body.removeChild(el);
  });

  it('propagates update:beta (arg) from child to parent state', async () => {
    component('arg-child', (ctx: any) => html`<div id="v">${ctx.beta}</div>`, {
      props: { beta: { type: Number } },
      state: { beta: 0 }
    });

    component('parent-arg', (ctx: any) => html`<arg-child :model:beta="value" />`, {
      state: { value: 5 }
    });

    const el = document.createElement('parent-arg');
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 10));

    const child = el.shadowRoot?.querySelector('arg-child') as HTMLElement | null;
    expect(child).toBeTruthy();
    const inner = child?.shadowRoot?.querySelector('#v') as HTMLElement | null;
    expect(inner).toBeTruthy();
    expect(inner?.textContent).toBe('5');

    child?.dispatchEvent(new CustomEvent('update:beta', { detail: 9, bubbles: true, composed: true }));
    await new Promise((r) => setTimeout(r, 10));

    const innerAfter = child?.shadowRoot?.querySelector('#v') as HTMLElement | null;
    expect(innerAfter?.textContent).toBe('9');

    document.body.removeChild(el);
  });
});
