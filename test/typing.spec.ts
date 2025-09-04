import { describe, it, expect } from 'vitest';
import { component } from '../src/lib/runtime/component';
import { html } from '../src/lib/runtime/template-compiler';
import type { ComponentContext } from '../src/lib/runtime/types';

interface SwitchProps { label?: string; checked?: boolean }

type SwitchMethods = {
  onChange: (e: Event, ctx: ComponentContext<{}, {}, SwitchProps, SwitchMethods>) => void;
};

describe('typing: runtime integration', () => {
  it('updates state and emits event when typed handler runs', () => {
    component<{}, {}, SwitchProps, SwitchMethods>('test-switch', {
      props: {
        label: { type: String, default: '' },
        checked: { type: Boolean, default: false }
      },
      render: (ctx) => html`
        <input ref="input" type="checkbox" :checked="${!!ctx.checked}" @change="${ctx.onChange}" />
      `,
      onChange: (e, ctx) => {
        const input = (ctx.refs.input as HTMLInputElement | undefined) ?? (e.target as HTMLInputElement | null);
        ctx.checked = !!(input && input.checked);
        (ctx as any).emit('change', { checked: ctx.checked });
      }
    });

    const el = document.createElement('test-switch') as any;
    document.body.appendChild(el);

    const input = el.shadowRoot.querySelector('input');
    // simulate user toggle
    (input as HTMLInputElement).checked = true;
    const events: any[] = [];
    el.addEventListener('change', (ev: any) => events.push(ev.detail));
    (input as HTMLInputElement).dispatchEvent(new Event('change', { bubbles: true }));

  // reactive state lives on the component context
  expect(el.context.checked).toBe(true);
    expect(events.length).toBe(1);
    expect(events[0]).toEqual({ checked: true });
  });
});
