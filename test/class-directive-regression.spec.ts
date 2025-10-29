import { describe, it, expect, beforeEach } from 'vitest';
import { component, html, ref } from '../src/lib/index';

function mount(tag: string, config: any) {
  component(tag, config);
  const el = document.createElement(tag);
  document.body.appendChild(el);
  return el;
}

describe('class/style directive regression', () => {
  beforeEach(() => {
    // Remove any previously mounted test elements
    const els = Array.from(document.querySelectorAll('[data-test]'));
    els.forEach((e) => e.remove());
  });

  it('toggles object-based :class and updates :style correctly', async () => {
    mount('test-class-toggle', () => {
      const test = ref('hello');

      // Expose helpers so the test can mutate reactive state
      (window as any).__setTestVal = (v: string) => {
        test.value = v;
      };

      return html`
        <div>
          <span
            data-test="target"
            :class="${{ 'border-primary-500': test.value === 'cool' }}"
            :style="${{ color: test.value === 'cool' ? 'green' : 'red' }}"
            >hello</span
          >
        </div>
      `;
    });

    document.body.innerHTML = '<test-class-toggle></test-class-toggle>';
    const el = document.querySelector('test-class-toggle') as HTMLElement;
    // allow mount
    await new Promise((r) => setTimeout(r, 20));

    const target = el.shadowRoot?.querySelector('[data-test="target"]') as
      | HTMLElement
      | undefined;
    expect(target).toBeTruthy();
    if (!target) return;

    // Initially not 'cool' -> class absent, style red
    expect(target.classList.contains('border-primary-500')).toBe(false);
    expect(target.getAttribute('style') || '').toContain('red');

    // Set to 'cool' -> class should appear and style should be green
    (window as any).__setTestVal('cool');
    await new Promise((r) => setTimeout(r, 20));
    expect(target.classList.contains('border-primary-500')).toBe(true);
    expect(target.getAttribute('style') || '').toContain('green');

    // Set away from 'cool' -> class should be removed and style back to red
    (window as any).__setTestVal('not-cool');
    await new Promise((r) => setTimeout(r, 20));
    expect(target.classList.contains('border-primary-500')).toBe(false);
    expect(target.getAttribute('style') || '').toContain('red');
  });
});
