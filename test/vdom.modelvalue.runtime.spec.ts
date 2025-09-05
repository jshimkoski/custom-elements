import { h } from '../src/lib/runtime/template-compiler';
import { createElement, patch } from '../src/lib/runtime/vdom';
import { describe, it, expect } from 'vitest';

// This runtime test ensures the runtime wiring listens for update:model-value and writes back to state
describe('runtime :model (plain) -> modelValue fallback', () => {
  it('updates host state when custom element emits update:model-value', () => {
    // Create a fake host context with state and request render stub
    const state: any = { value: 'initial' };
    const ctx: any = { _state: state, _requestRender: () => {} };

    // Create a VNode for custom element with directive handled at runtime
    const vnode = h('my-custom', { props: {}, attrs: {}, directives: { model: { value: 'value', modifiers: [], arg: undefined } } }, undefined);

  // Mount element into DOM and patch
  const container = document.createElement('div');
  document.body.appendChild(container);
  const node = createElement(vnode as any, ctx);
  container.appendChild(node);
  const customEl = container.querySelector('my-custom') as HTMLElement;
    expect(customEl).toBeTruthy();

  // Simulate custom element emitting update:model-value
  const ev = new CustomEvent('update:model-value', { detail: 'updated' });
    customEl.dispatchEvent(ev);

    // State should be updated
    expect(state.value).toBe('updated');
  });
});
