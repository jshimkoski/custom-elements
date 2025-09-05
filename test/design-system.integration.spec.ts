import { describe, it, expect } from 'vitest';
import { registry } from '../src/lib/runtime/component';

// Import the example so it registers
import '../src/components/examples/DesignSystem';

function mount(tagName: string) {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const el = document.createElement(tagName);
  root.appendChild(el);
  return { root, el };
}

describe('design-system example integration', () => {
  it('cer-baby: emits update:baby-text with input value', async () => {
    const { root, el } = mount('div');
    // register example components
    await import('../src/components/examples/DesignSystem');

    const baby = document.createElement('cer-baby') as HTMLElement & { babyText?: string };
    (root as HTMLElement).appendChild(baby);
    // set initial prop
    (baby as any).babyText = 'hello';
    await Promise.resolve();

    const input = baby.shadowRoot?.querySelector('input') as HTMLInputElement | null;
    expect(input).toBeTruthy();

    const events: any[] = [];
    baby.addEventListener('update:baby-text', (e: any) => events.push(e.detail));

    // simulate user typing
    input!.value = 'world';
    input!.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await Promise.resolve();

    expect(events.length).toBeGreaterThan(0);
    expect(events[0]).toBe('world');

    document.body.removeChild(root);
  });

  it('cer-child: updates local model when cer-baby emits update', async () => {
    const { root, el } = mount('cer-child');
    await Promise.resolve();

    const parent = el as HTMLElement;
    // find baby inside child
    const baby = parent.shadowRoot?.querySelector('cer-baby') as HTMLElement | null;
    expect(baby).toBeTruthy();

    const input = baby!.shadowRoot?.querySelector('input') as HTMLInputElement | null;
    expect(input).toBeTruthy();

    // type into baby input and ensure child state updates (render reflects new text)
    input!.value = 'child typed';
    input!.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await Promise.resolve();

    // the child displays `Baby text is (in child): ${ctx.text}` in its shadowRoot
    const childText = parent.shadowRoot?.textContent || '';
    expect(childText).toContain('child typed');

    document.body.removeChild(root);
  });

  it('design-system: parent model and reset button work end-to-end', async () => {
    const { root, el } = mount('design-system');
    await Promise.resolve();

    const parent = el as HTMLElement;
    // initial value shown
    expect(parent.shadowRoot?.textContent).toContain('Initial Value');

    // find child and click its model-button to update parent model
    const child = parent.shadowRoot?.querySelector('cer-child') as HTMLElement | null;
    expect(child).toBeTruthy();
    const modelButton = child!.shadowRoot?.querySelectorAll('button')[0] as HTMLButtonElement | undefined;
    expect(modelButton).toBeDefined();

    modelButton!.click();
    await Promise.resolve();

    // parent should reflect the updated model value
    expect(parent.shadowRoot?.textContent).toContain('Clicked from child');

    // click reset and ensure value returns
    const reset = parent.shadowRoot?.querySelector('button') as HTMLButtonElement | null;
    expect(reset).toBeTruthy();
    reset!.click();
    await Promise.resolve();
    expect(parent.shadowRoot?.textContent).toContain('Initial Value');

    document.body.removeChild(root);
  });
});
