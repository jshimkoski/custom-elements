import { describe, it, expect, vi } from 'vitest';
import { htmlImpl, html } from '../src/lib/runtime/template-compiler';
import { component } from '../src/lib/runtime/component';

/**
 * Mocks a minimal VNode structure for testing event and prop binding.
 */
describe('template-compiler event and prop binding', () => {
  it('calls the component method when the shadow DOM button is clicked', async () => {
    // Define a test component with a spyable method
    const handleFn = vi.fn();
    component('test-click', (ctx) => html`<button id="btn" @click="handleFn">Click</button>`, {
      handleFn
    });
    // Create and attach the custom element
    const el = document.createElement('test-click');
    document.body.appendChild(el);
    // Wait for the shadow DOM to render
    await new Promise((resolve) => setTimeout(resolve, 10));
    const btn = el.shadowRoot?.querySelector('#btn');
    expect(btn).toBeDefined();
    (btn as HTMLElement)?.click();
    expect(handleFn).toHaveBeenCalled();
    document.body.removeChild(el);
  });

  it('binds :disabled="disabled" to context.disabled', () => {
    const context = { disabled: true };
    // Simulate template: <button :disabled="disabled">Click</button>
    const strings = [
      '<button :disabled="disabled">Click</button>'
    ];
    const values: unknown[] = [];
    const vnode = htmlImpl(strings as any, values, context);
    expect(vnode).toBeDefined();
    const btn = Array.isArray(vnode) ? vnode[0] : vnode;
    expect(btn).toBeDefined();
    expect(btn.props).toBeDefined();
    const props = btn.props as Record<string, any>;
    expect(props.props.disabled).toBe(true);
  });
});
