import { describe, it, expect, beforeEach } from 'vitest';
import { component, html, ref } from '../src/lib/index';

describe('style and :style together bug', () => {
  beforeEach(() => {
    // Remove any previously mounted test elements
    const els = Array.from(document.querySelectorAll('test-style-both'));
    els.forEach((e) => e.remove());
  });

  it('should properly toggle :style when used with static style attribute', async () => {
    component('test-style-both', () => {
      const showColor = ref(false);

      // Expose helper so test can toggle
      (window as any).__toggleColor = () => {
        showColor.value = !showColor.value;
      };

      return html`
        <div
          data-test="target"
          style="border: 1px solid black;"
          :style=${{ color: showColor.value ? 'red' : '' }}
        >
          ${showColor.value}
        </div>
        <button @click=${() => (showColor.value = !showColor.value)}>
          Toggle Color
        </button>
      `;
    });

    document.body.innerHTML = '<test-style-both></test-style-both>';
    const el = document.querySelector('test-style-both') as HTMLElement;
    await new Promise((r) => setTimeout(r, 20));

    const target = el.shadowRoot?.querySelector(
      '[data-test="target"]',
    ) as HTMLElement;
    expect(target).toBeTruthy();
    if (!target) return;

    // Initial state: showColor is false
    expect(target.style.border).toBe('1px solid black');
    expect(target.style.color).toBe('');
    expect(target.textContent?.trim()).toBe('false');

    // First toggle: showColor becomes true
    (window as any).__toggleColor();
    await new Promise((r) => setTimeout(r, 20));
    expect(target.style.border).toBe('1px solid black');
    expect(target.style.color).toBe('red');
    expect(target.textContent?.trim()).toBe('true');

    // Second toggle: showColor becomes false - verify style is removed
    (window as any).__toggleColor();
    await new Promise((r) => setTimeout(r, 20));
    expect(target.style.border).toBe('1px solid black');
    expect(target.style.color).toBe('');
    expect(target.textContent?.trim()).toBe('false');

    // Third toggle: back to true
    (window as any).__toggleColor();
    await new Promise((r) => setTimeout(r, 20));
    expect(target.style.border).toBe('1px solid black');
    expect(target.style.color).toBe('red');
    expect(target.textContent?.trim()).toBe('true');
  });
});
