import { describe, it, expect } from 'vitest';
import { jitCSS } from '../src/lib/runtime/style';

describe('JIT CSS important marker variants', () => {
  it('accepts leading ! inside container variant (e.g. @md:!text-xl)', () => {
    const html = '<div class="@md:!text-xl"></div>';
    const css = jitCSS(html);
    // text-xl maps to font-size:1.25rem in the runtime
    expect(css.includes('font-size:1.25rem')).toBe(true);
    expect(css.includes('!important')).toBe(true);
  });

  it('accepts trailing ! inside container variant (e.g. @md:text-xl!)', () => {
    const html = '<div class="@md:text-xl!"></div>';
    const css = jitCSS(html);
    expect(css.includes('font-size:1.25rem')).toBe(true);
    expect(css.includes('!important')).toBe(true);
  });

  it('does not treat missing ! as important', () => {
    const html = '<div class="@md:text-xl"></div>';
    const css = jitCSS(html);
    expect(css.includes('font-size:1.25rem')).toBe(true);
    expect(css.includes('!important')).toBe(false);
  });
});
