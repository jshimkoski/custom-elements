import { describe, it, expect } from 'vitest';
import { component, html, ref, useEmit, useProps } from '../src/lib/index';

describe('useProps event propagation diagnostic', () => {
  it('child emits update:model-value (no useProps) should update parent via :model', async () => {
    component('diag-child-a', () => {
      const { modelValue } = useProps({ modelValue: false });
      const emit = useEmit();
      return html`<button
        id="cbtn"
        @click="${() => emit('update:model-value', !modelValue)}"
      >
        T
      </button>`;
    });

    component('diag-parent-a', () => {
      const v = ref(true);
      return html`<diag-child-a :model="${v}" />`;
    });

    const p = document.createElement('diag-parent-a') as HTMLElement;
    document.body.appendChild(p);
    await new Promise((r) => setTimeout(r, 20));

    const child = p.shadowRoot?.querySelector(
      'diag-child-a',
    ) as HTMLElement | null;
    expect(child).not.toBeNull();
    const btn = child!.shadowRoot?.querySelector('#cbtn') as HTMLElement | null;
    btn!.dispatchEvent(
      new MouseEvent('click', { bubbles: true, composed: true }),
    );
    await new Promise((r) => setTimeout(r, 20));

    // Parent's child should reflect the toggled value (original true -> false)
    const childAfter = p.shadowRoot?.querySelector(
      'diag-child-a',
    ) as HTMLElement | null;
    expect(childAfter).not.toBeNull();
    const ctxVal = (childAfter as any).context?.modelValue;
    // diagnostic logging

    console.log(
      '[test-diagnostic] childAfter.context.modelValue ->',
      ctxVal,
      'typeof=',
      typeof ctxVal,
    );
    expect(ctxVal === false || ctxVal === 'false' || ctxVal === '').toBe(true);
  });

  it('child emits update:model-value WITH useProps should update parent via :model', async () => {
    component('diag-child-b', () => {
      const props = useProps({ modelValue: false });
      const emit = useEmit();
      return html`<button
        id="cbtnb"
        @click="${() => emit('update:model-value', !props.modelValue)}"
      >
        T
      </button>`;
    });

    component('diag-parent-b', () => {
      const v = ref(true);
      return html`<diag-child-b :model="${v}" />`;
    });

    const p = document.createElement('diag-parent-b') as HTMLElement;
    document.body.appendChild(p);
    await new Promise((r) => setTimeout(r, 20));

    const child = p.shadowRoot?.querySelector(
      'diag-child-b',
    ) as HTMLElement | null;
    expect(child).not.toBeNull();
    const btn = child!.shadowRoot?.querySelector(
      '#cbtnb',
    ) as HTMLElement | null;
    btn!.dispatchEvent(
      new MouseEvent('click', { bubbles: true, composed: true }),
    );
    await new Promise((r) => setTimeout(r, 20));

    const childAfter = p.shadowRoot?.querySelector(
      'diag-child-b',
    ) as HTMLElement | null;
    expect(childAfter).not.toBeNull();
    const ctxVal = (childAfter as any).context?.modelValue;
    expect(ctxVal === false || ctxVal === 'false' || ctxVal === '').toBe(true);
  });
});
