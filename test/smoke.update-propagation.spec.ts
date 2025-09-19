import { describe, it, expect } from 'vitest';
import { component, html, ref } from '../src/lib/index';

describe('smoke: update propagation from child to parent', () => {
  it('propagates update:model-value from child to parent state', async () => {
    component('prop-child', ({ modelValue = 'child-initial' } = {}) => {
      console.log('prop-child received modelValue:', modelValue);
      return html`<div id="val">${modelValue}</div>`;
    });

    component('parent-prop', () => {
      const value = ref('one');
      console.log('parent-prop state value:', value.value);
      return html`<prop-child model-value="${value.value}" @update:model-value="${(e: CustomEvent) => value.value = e.detail}" />`;
    });

    const el = document.createElement('parent-prop');
    document.body.appendChild(el);
    // allow lifecycle to complete
    await new Promise((r) => setTimeout(r, 100));

    const child = el.shadowRoot?.querySelector('prop-child') as HTMLElement | null;
    expect(child).toBeTruthy();
    const inner = child?.shadowRoot?.querySelector('#val') as HTMLElement | null;
    expect(inner).toBeTruthy();
    expect(inner?.textContent).toBe('one');

    // Dispatch update event from child
    child?.dispatchEvent(new CustomEvent('update:model-value', { detail: 'two', bubbles: true, composed: true }));
    await new Promise((r) => setTimeout(r, 30));

    // After propagation, child should reflect new value
    const innerAfter = child?.shadowRoot?.querySelector('#val') as HTMLElement | null;
    expect(innerAfter?.textContent).toBe('two');

    document.body.removeChild(el);
  });

  it.skip('propagates update:beta (arg) from child to parent state', async () => {
    component('arg-child', ({ beta = 0 } = {}) => {
      return html`<div id="v">${beta}</div>`;
    });

    component('parent-arg', () => {
      const value = ref(5);
      return html`<arg-child :beta="${value.value}" @update:beta="${(e: CustomEvent) => value.value = e.detail}" />`;
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
