import { describe, it, expect, beforeEach } from 'vitest';
import { component, html, ref } from '../src/lib/index';

describe('class and :class together bug', () => {
  beforeEach(() => {
    // Remove any previously mounted test elements
    const els = Array.from(document.querySelectorAll('test-class-both'));
    els.forEach((e) => e.remove());
  });

  it('should properly toggle :class when used with static class attribute', async () => {
    component('test-class-both', () => {
      const showBg = ref(false);

      // Expose helper so test can toggle
      (window as any).__toggleBg = () => {
        showBg.value = !showBg.value;
      };

      return html`
        <div
          data-test="target"
          class="border"
          :class=${{ 'bg-primary-500': showBg.value }}
        >
          ${showBg.value}
        </div>
        <button @click=${() => (showBg.value = !showBg.value)}>
          Toggle BG
        </button>
      `;
    });

    document.body.innerHTML = '<test-class-both></test-class-both>';
    const el = document.querySelector('test-class-both') as HTMLElement;
    await new Promise((r) => setTimeout(r, 20));

    const target = el.shadowRoot?.querySelector(
      '[data-test="target"]',
    ) as HTMLElement;
    expect(target).toBeTruthy();
    if (!target) return;

    // Initial state: showBg is false
    expect(target.classList.contains('border')).toBe(true);
    expect(target.classList.contains('bg-primary-500')).toBe(false);
    expect(target.textContent?.trim()).toBe('false');

    // First toggle: showBg becomes true
    (window as any).__toggleBg();
    await new Promise((r) => setTimeout(r, 20));
    expect(target.classList.contains('border')).toBe(true);
    expect(target.classList.contains('bg-primary-500')).toBe(true);
    expect(target.textContent?.trim()).toBe('true');

    // Second toggle: showBg becomes false - THIS IS WHERE THE BUG OCCURS
    (window as any).__toggleBg();
    await new Promise((r) => setTimeout(r, 20));
    expect(target.classList.contains('border')).toBe(true);
    expect(target.classList.contains('bg-primary-500')).toBe(false); // This should pass but currently fails
    expect(target.textContent?.trim()).toBe('false');

    // Third toggle: back to true
    (window as any).__toggleBg();
    await new Promise((r) => setTimeout(r, 20));
    expect(target.classList.contains('border')).toBe(true);
    expect(target.classList.contains('bg-primary-500')).toBe(true);
    expect(target.textContent?.trim()).toBe('true');
  });
});
