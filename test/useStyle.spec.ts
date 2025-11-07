import { describe, it, expect, beforeEach } from 'vitest';

// Import runtime helpers
import { component, html, css, useStyle } from '../src/lib/index';

// Define a small test component that uses useStyle via the public API
component('test-style-component', () => {
  useStyle(
    () => css`
      :host {
        --cer-test: 12345;
      }
    `,
  );
  return html`<div>styled</div>`;
});

describe('useStyle hook', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('applies computed style to the component shadow', async () => {
    const el = document.createElement('test-style-component');
    document.body.appendChild(el);

    // wait for microtask to allow initial render
    await Promise.resolve();
    // allow any scheduled DOM updates
    await Promise.resolve();

    const shadow = el.shadowRoot;
    expect(shadow).toBeTruthy();

    // Check for style element inserted by the runtime (fallback path)
    const styleEl = shadow!.querySelector('style[data-cer-runtime]');
    if (styleEl) {
      const txt = styleEl.textContent || '';
      expect(txt).toContain('--cer-test');
    } else {
      // Fallback: inspect adoptedStyleSheets stub or stringified content
      // Some environments may set adoptedStyleSheets; ensure it contains our variable
      // Convert to strings and check
      const sheets: unknown[] =
        (shadow as unknown as { adoptedStyleSheets?: unknown[] })
          .adoptedStyleSheets || [];
      const found = sheets.some((s: unknown) => {
        try {
          return String(s).includes('--cer-test');
        } catch {
          return false;
        }
      });
      expect(found).toBe(true);
    }
  });
});
