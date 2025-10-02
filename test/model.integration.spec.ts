import { describe, it, expect } from 'vitest';
import { component, html, ref, useEmit, useProps } from '../src/lib/index';

describe(':model integration', () => {
  it('native input :model should update reactive ref', async () => {
    component('native-model-test', () => {
      const value = ref('');
      return html`<input :model="${value}" data-testid="inp"> <span data-testid="out">${value.value}</span>`;
    });

    const el = document.createElement('native-model-test') as HTMLElement;
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 10));

    const input = el.shadowRoot?.querySelector('input') as HTMLInputElement;
    const out = el.shadowRoot?.querySelector('[data-testid="out"]') as HTMLElement;
    expect(input).toBeTruthy();

    // simulate user typing
    input.value = 'hello';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await new Promise((r) => setTimeout(r, 10));

    expect(out.textContent).toContain('hello');
  });

  it('custom element :model:prop should update nested object via ReactiveState', async () => {
    component('child-model-prop', () => {
      const props = useProps({ data: { name: '' } });
      const emit = useEmit();
      return html`<button id="toggle" @click="${() => {
        // Log the current nested prop value to diagnose stale reads
        try { console.log('[test-child] click handler sees props.data.name =', props.data.name); } catch (e) {}
        const next = props.data.name === 'a' ? 'b' : 'a';
        try { console.log('[test-child] emitting update:name ->', next); } catch (e) {}
        emit('update:name', next);
      }}">T</button>`;
    });

    component('parent-model-prop', () => {
      const state = ref({ name: 'a' });
      return html`${state.value.name}<child-model-prop :model:data="${state}" />`;
    });

    const p = document.createElement('parent-model-prop') as HTMLElement;
    document.body.appendChild(p);
    await new Promise((r) => setTimeout(r, 20));

    const child = p.shadowRoot?.querySelector('child-model-prop') as HTMLElement | null;
    expect(child).not.toBeNull();
    const btn = child!.shadowRoot?.querySelector('#toggle') as HTMLElement | null;
    expect(btn).not.toBeNull();

  // Log child element own properties for diagnosis
  try { console.log('[test] child own keys=', Object.keys(child as any)); } catch (e) {}
  try { console.log('[test] child.data (prop) =', (child as any).data); } catch (e) {}
  try { console.log('[test] child.context =', (child as any).context); } catch (e) {}
  try { console.log('[test] child.context.data =', (child as any).context && (child as any).context.data); } catch (e) {}
  // click to toggle name from 'a' -> 'b'
  btn!.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    await new Promise((r) => setTimeout(r, 20));

    // parent should have re-rendered and show new name 'b'
    const text = p.shadowRoot?.textContent || '';
    expect(text.includes('b')).toBe(true);
  });
});
