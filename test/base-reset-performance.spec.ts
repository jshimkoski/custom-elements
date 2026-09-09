import { describe, expect, it } from 'vitest';
import { baseResetRules, minifyCSS } from '../src/lib/runtime/css-utils';
import { jitCSS } from '../src/lib/runtime/style';

describe('shadow reset performance', () => {
  it('keeps invalid and utility-specific declarations out of every element', () => {
    const reset = minifyCSS(baseResetRules);

    expect(reset).not.toContain('all:isolate');
    expect(reset).not.toContain('--cer-translate-x');
    expect(reset).not.toContain('--cer-blur');
    expect(reset).not.toContain('--cer-backdrop-blur');
    expect(reset).not.toContain('--cer-ring-color');
    expect(reset).not.toContain('--cer-gradient-stops');
  });

  it('initializes composition variables only on elements using those utilities', () => {
    const css = minifyCSS(
      jitCSS(`
        <div class="translate-x-4 rotate-45 blur grayscale"></div>
        <div class="backdrop-blur ring bg-linear-to-r from-primary-500"></div>
      `),
    );

    expect(css).toContain(':where(.translate-x-4,.rotate-45)');
    expect(css).toContain('--cer-translate-x:0px');
    expect(css).toContain(':where(.blur,.grayscale)');
    expect(css).toContain('--cer-blur:');
    expect(css).toContain(':where(.backdrop-blur)');
    expect(css).toContain('--cer-backdrop-blur:');
    expect(css).toContain(':where(.ring)');
    expect(css).toContain('--cer-ring-color:rgb(59 130 246/0.5)');
    expect(css).toContain(
      ':where(.bg-linear-to-r,.from-primary-500)',
    );
    expect(css).toContain('--cer-gradient-from-position:0%');
  });

  it('initializes variant utilities on the class-bearing element', () => {
    const css = minifyCSS(
      jitCSS('<button class="hover:scale-105 before:blur"></button>'),
    );

    expect(css).toContain(
      ':where(.hover\\:scale-105){--cer-translate-x:0px',
    );
    expect(css).toContain(':where(.before\\:blur){--cer-blur:');
  });
});
