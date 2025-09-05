import { describe, it, expect } from 'vitest';
import { component } from '../src/lib/runtime/component';
import { html } from '../src/lib/runtime/template-compiler';
import { renderComponent } from '../src/lib/runtime/render';

describe('smoke: VDOM -> custom element mounting', () => {
  it('mounts a canonicalized hyphenated tag and applies props', async () => {
    // Register a simple child component that declares a prop and renders it
    component('smoke-child', (ctx: any) => html`<div id="val">${ctx.modelValue}</div>`, {
      props: { modelValue: { type: String } },
      state: { modelValue: 'initial' }
    });

    // Parent component that uses the hyphenated tag with :model
    const parentCfg = {
      render(ctx: any) {
        return html`<smoke-child :model="foo" />`;
      },
      state: { foo: 'parent-value' }
    } as any;

    // Create host and shadow root to render parent output
    const host = document.createElement('div');
    const shadowRoot = host.attachShadow({ mode: 'open' });

    // Minimal context for renderComponent
    const context = { _state: parentCfg.state, isLoading: false, hasError: false } as any;
    const refs: any = {};
    let htmlString = '';
    const setHtmlString = (s: string) => (htmlString = s);
    const setLoading = () => {};
    const setError = () => {};
    const applyStyle = () => {};

    // Render the parent which should create the <smoke-child> element in the shadowRoot
    renderComponent(shadowRoot, parentCfg, context, refs, setHtmlString, setLoading, setError, applyStyle);

    // Wait briefly to allow custom element lifecycle to run
    await new Promise((r) => setTimeout(r, 10));

    const child = shadowRoot.querySelector('smoke-child') as HTMLElement | null;
    expect(child).toBeTruthy();
    // Its shadowRoot should contain the div with the parent's state value
    const inner = child?.shadowRoot?.querySelector('#val');
    expect(inner).toBeTruthy();
    expect((inner as HTMLElement).textContent).toBe('parent-value');
  });
});
