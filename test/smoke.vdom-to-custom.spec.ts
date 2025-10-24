import { describe, it, expect } from 'vitest';
import { component, html, ref, useProps } from '../src/lib/index';

describe('smoke: VDOM -> custom element mounting', () => {
  it('mounts a canonicalized hyphenated tag and applies props', async () => {
    // Register a simple child component that accepts modelValue prop and renders it
    component('smoke-child', () => {
      const { modelValue } = useProps({ modelValue: 'initial' });
      console.log('smoke-child received modelValue:', modelValue);
      return html`<div id="val">${modelValue}</div>`;
    });

    // Register parent component that uses the child with prop binding
    component('smoke-parent', () => {
      const foo = ref('parent-value');
      console.log('smoke-parent state value:', foo.value);
      return html`<smoke-child model-value="${foo.value}" />`;
    });

    // Create the parent element and wait for it to render
    const parent = document.createElement('smoke-parent');
    document.body.appendChild(parent);

    // Wait briefly to allow custom element lifecycle to run
    await new Promise((r) => setTimeout(r, 100));

    const child = parent.shadowRoot?.querySelector(
      'smoke-child',
    ) as HTMLElement | null;
    expect(child).toBeTruthy();

    // Its shadowRoot should contain the div with the parent's state value
    const inner = child?.shadowRoot?.querySelector('#val');
    expect(inner).toBeTruthy();
    expect((inner as HTMLElement).textContent).toBe('parent-value');

    // Cleanup
    document.body.removeChild(parent);
  });
});
