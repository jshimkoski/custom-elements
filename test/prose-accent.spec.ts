import { afterEach, describe, expect, it } from 'vitest';
import {
  _resetJITCSS,
  enableJITCSS,
  jitCSS,
  parseProseAccent,
} from '../src/lib/runtime/style';

afterEach(() => _resetJITCSS());

describe('prose accent utilities', () => {
  it('uses a CSS custom property without emitting a bogus prose property', () => {
    const css = jitCSS(
      '<article class="prose prose-(--md-sys-color-primary)"></article>',
    );

    expect(css).toContain('.prose-\\(--md-sys-color-primary\\)');
    expect(css).toContain(
      '--cer-prose-links:var(--md-sys-color-primary)',
    );
    expect(css).toContain(
      '--cer-prose-invert-links:var(--md-sys-color-primary)',
    );
    expect(css).not.toContain('prose:var(');
  });

  it('uses the active extended family steps for light and inverted prose', () => {
    enableJITCSS({ extendedColors: ['violet'] });
    const css = jitCSS('<article class="prose prose-violet"></article>');

    expect(css).toContain(
      '--cer-prose-links:var(--cer-color-violet-700, #6d28d9)',
    );
    expect(css).toContain(
      '--cer-prose-invert-links:var(--cer-color-violet-300, #c4b5fd)',
    );
  });

  it('supports an exact palette step and variants', () => {
    enableJITCSS({ extendedColors: ['rose'] });
    const css = jitCSS(
      '<article class="hover:prose-rose-600 prose"></article>',
    );

    expect(css).toContain('.hover\\:prose-rose-600:hover');
    expect(css).toContain(
      '--cer-prose-links:var(--cer-color-rose-600, #e11d48)',
    );
  });

  it('rejects malformed CSS custom-property names', () => {
    expect(parseProseAccent('prose-(--brand;color:red)')).toBeNull();
  });
});
