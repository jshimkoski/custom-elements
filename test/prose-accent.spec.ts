import { afterEach, describe, expect, it } from 'vitest';
import {
  _resetJITCSS,
  enableJITCSS,
  jitCSS,
  parseArbitrary,
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
      '--cer-prose-accent:var(--md-sys-color-primary)',
    );
    expect(css).not.toContain('prose:var(');
  });

  it('reuses the color parser for exact palette steps and variants', () => {
    enableJITCSS({ extendedColors: ['rose'] });
    const css = jitCSS(
      '<article class="hover:prose-rose-600 prose"></article>',
    );

    expect(css).toContain('.hover\\:prose-rose-600:hover');
    expect(css).toContain(
      '--cer-prose-accent:var(--cer-color-rose-600, #e11d48)',
    );
  });

  it('rejects malformed CSS custom-property names', () => {
    expect(parseArbitrary('prose-(--brand;color:red)')).toBeNull();
    expect(parseProseAccent('prose-(--brand;color:red)')).toBeNull();
    expect(
      jitCSS('<article class="prose prose-(--brand;color:red)"></article>'),
    ).not.toContain('--cer-prose-accent');
  });

  it('keeps the low-level parser API as a shared-parser compatibility wrapper', () => {
    expect(parseProseAccent('prose-primary')).toContain('--cer-prose-links:');
    expect(parseProseAccent('prose-(--brand-color)')).toBe(
      '--cer-prose-accent:var(--brand-color);',
    );
  });
});
