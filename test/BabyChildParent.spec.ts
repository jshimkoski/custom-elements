import { describe, it, expect, beforeEach } from 'vitest';

// Helper to wait a microtask (scheduler flush runs synchronously in test env but be defensive)
function nextTick() {
  return new Promise((r) => queueMicrotask(() => r(undefined)));
}

describe('Baby/Child/Parent example interactions', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('cer-baby: emits update:babyText on input', async () => {
    await import('../src/components/examples/BabyChildParent');

    const el = document.createElement('cer-baby') as HTMLElement;
    document.body.appendChild(el);
    await nextTick();

    const shadow = (el as any).shadowRoot || el;
    const input = shadow.querySelector(
      'input[type="text"]',
    ) as HTMLInputElement | null;
    expect(input).not.toBeNull();

    let captured: unknown = undefined;
    el.addEventListener('update:babyText', (e: Event) => {
      captured = (e as CustomEvent).detail;
    });

    // Simulate user typing
    input!.value = 'hello baby';
    input!.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();

    expect(captured).toBe('hello baby');
  });

  it('cer-child: buttons emit update:modelValue and update:test and shows baby text', async () => {
    await import('../src/components/examples/BabyChildParent');

    const el = document.createElement('cer-child') as HTMLElement;
    document.body.appendChild(el);
    await nextTick();

    const shadow = (el as any).shadowRoot || el;

    const buttons = shadow.querySelectorAll('button');
    // Expect at least two buttons from the template
    expect(buttons.length).toBeGreaterThanOrEqual(2);

    let modelCaptured: unknown = undefined;
    let propCaptured: unknown = undefined;
    el.addEventListener('update:modelValue', (e: Event) => {
      modelCaptured = (e as CustomEvent).detail;
    });
    el.addEventListener('update:test', (e: Event) => {
      propCaptured = (e as CustomEvent).detail;
    });

    // Click model update button (first)
    (buttons[0] as HTMLButtonElement).click();
    await nextTick();
    expect(modelCaptured).toBe('Clicked from child');

    // Click prop update button (second)
    (buttons[1] as HTMLButtonElement).click();
    await nextTick();
    expect(propCaptured).toBe('Clicked from child prop');

    // The child also renders a nested cer-baby and a text showing the ref value
    const textNode = Array.from(shadow.querySelectorAll('div,span,p')).find(
      (n) => (n.textContent || '').includes('Baby text is (in child):'),
    );
    expect(textNode).toBeTruthy();
    if (textNode) {
      expect(textNode!.textContent).toContain('baby text');
    }
  });

  it('cer-parent: child update modifies parent model binding', async () => {
    await import('../src/components/examples/BabyChildParent');

    const el = document.createElement('cer-parent') as HTMLElement;
    document.body.appendChild(el);
    await nextTick();

    const shadow = (el as any).shadowRoot || el;

    // Find the cer-child inside the parent
    const child = shadow.querySelector('cer-child') as HTMLElement | null;
    expect(child).not.toBeNull();

    // Listen for emitted update from child and trigger it by clicking inside the child
    const childShadow = (child as any).shadowRoot || child;
    const childButtons = childShadow.querySelectorAll('button');
    expect(childButtons.length).toBeGreaterThanOrEqual(1);

    // Click the child's model update button to change parent's bound value
    (childButtons[0] as HTMLButtonElement).click();
    // Allow scheduler to flush and render
    await new Promise((r) => setTimeout(r, 20));

    // Parent displays Value: ${value.value}
    const valueEl = Array.from(shadow.querySelectorAll('p')).find((p) =>
      (p.textContent || '').trim().startsWith('Value:'),
    );
    expect(valueEl).not.toBeNull();
    if (valueEl) {
      expect(valueEl.textContent).toContain('Clicked from child');
    }

    // Now click the parent's reset button and ensure value resets to initial
    const resetBtn = Array.from(shadow.querySelectorAll('button')).find((b) =>
      (b.textContent || '').includes('Reset Value'),
    ) as HTMLButtonElement | null;
    expect(resetBtn).not.toBeNull();
    resetBtn!.click();
    // allow scheduler to flush
    await new Promise((r) => setTimeout(r, 20));

    const valueElAfter = Array.from(shadow.querySelectorAll('p')).find((p) =>
      (p.textContent || '').trim().startsWith('Value:'),
    );
    expect(valueElAfter).not.toBeNull();
    if (valueElAfter) {
      expect(valueElAfter.textContent).toContain('Initial Value');
    }
  });
});
