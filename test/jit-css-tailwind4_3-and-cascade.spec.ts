import { beforeEach, describe, expect, it } from 'vitest';
import {
  _resetJITCSS,
  enableJITCSS,
  jitCSS,
  parseArbitrary,
} from '../src/lib/runtime/style';

const compileFresh = (classes: string): string => {
  _resetJITCSS();
  return jitCSS(`<div class="${classes}"></div>`);
};

describe('deterministic JIT cascade ordering', () => {
  beforeEach(() => _resetJITCSS());

  it.each([
    ['m-0', 'mt-4'],
    ['p-0', 'pr-4'],
    ['mx-0', 'me-4'],
    ['inset-0', 'inset-bs-4'],
    ['scroll-m-0', 'scroll-mb-4'],
    ['scroll-p-0', 'scroll-pbe-4'],
    ['border-0', 'border-bs-4'],
    ['rounded-none', 'rounded-tl-lg'],
  ])('%s is emitted before the more specific %s', (broad, side) => {
    const forward = compileFresh(`${broad} ${side}`);
    const reverse = compileFresh(`${side} ${broad}`);

    expect(reverse).toBe(forward);
    expect(forward.indexOf(`.${broad}`)).toBeLessThan(
      forward.indexOf(`.${side}`),
    );
  });

  it('uses the same ordering within a variant context', () => {
    const forward = compileFresh('hover:m-0 hover:mt-4');
    const reverse = compileFresh('hover:mt-4 hover:m-0');

    expect(reverse).toBe(forward);
    expect(forward.indexOf('.hover\\:m-0')).toBeLessThan(
      forward.indexOf('.hover\\:mt-4'),
    );
  });

  it('cannot be contaminated by whichever class permutation warms the cache', () => {
    const first = jitCSS('<div class="mt-4 m-0"></div>');
    const cachedPermutation = jitCSS('<div class="m-0 mt-4"></div>');
    expect(cachedPermutation).toBe(first);
    expect(first.indexOf('.m-0')).toBeLessThan(first.indexOf('.mt-4'));
  });
});

describe('Tailwind 4.2 and 4.3 compatibility additions', () => {
  beforeEach(() => _resetJITCSS());

  it('supports logical spacing, sizing, inset, border, and scrolling', () => {
    const css = jitCSS(
      '<div class="mbs-6 pbe-8 inline-64 max-inline-lg inset-be-2 border-bs-4 scroll-mbs-4 scroll-pbe-[3rem]"></div>',
    );

    expect(css).toContain('margin-block-start:calc(0.25rem * 6)');
    expect(css).toContain('padding-block-end:calc(0.25rem * 8)');
    expect(css).toContain('inline-size:calc(0.25rem * 64)');
    expect(css).toContain('max-inline-size:calc(0.25rem * 128)');
    expect(css).toContain('inset-block-end:calc(0.25rem * 2)');
    expect(css).toContain('border-block-start-width:4px');
    expect(css).toContain('scroll-margin-block-start:calc(0.25rem * 4)');
    expect(css).toContain('scroll-padding-block-end:3rem');
  });

  it('supports font features, scrollbars, size containers, zoom, and tabs', () => {
    const css = jitCSS(
      `<div class='font-features-["tnum"] scrollbar-thin scrollbar-gutter-both @container-size @container-size/card zoom-125 zoom-[1.1] tab tab-8 tab-[12px]'></div>`,
    );

    expect(css).toContain('font-feature-settings:"tnum"');
    expect(css).toContain('scrollbar-width:thin');
    expect(css).toContain('scrollbar-gutter:stable both-edges');
    expect(css).toContain('container-type:size');
    expect(css).toContain('container-name:card');
    expect(css).toContain('zoom:125%');
    expect(css).toContain('zoom:1.1');
    expect(css).toContain('tab-size:4');
    expect(css).toContain('tab-size:8');
    expect(css).toContain('tab-size:12px');
  });

  it('supports scrollbar and drop-shadow palette colors with opacity', () => {
    const css = jitCSS(
      '<div class="scrollbar-thumb-primary-500/60 scrollbar-track-neutral-100 drop-shadow-primary-500/50 drop-shadow-lg"></div>',
    );

    expect(css).toContain('--cer-scrollbar-thumb');
    expect(css).toContain('--cer-scrollbar-track');
    expect(css).toContain('scrollbar-color:');
    expect(css).toContain('--cer-drop-shadow-color');
    expect(css).toContain('var(--cer-drop-shadow-color');
  });

  it('includes the four Tailwind 4.2 palettes as opt-in colors', () => {
    enableJITCSS({ extendedColors: ['mauve', 'olive', 'mist', 'taupe'] });
    const css = jitCSS(
      '<div class="bg-mauve-500 text-olive-700 border-mist-300 shadow-taupe-950"></div>',
    );

    expect(css).toContain('--cer-color-mauve-500');
    expect(css).toContain('--cer-color-olive-700');
    expect(css).toContain('--cer-color-mist-300');
    expect(css).toContain('--cer-color-taupe-950');
  });

  it('supports current state, pointer, range, child, ARIA, and data variants', () => {
    const css = jitCSS(
      '<div class="required:block user-invalid:hidden pointer-fine:flex max-md:grid *:p-2 aria-checked:opacity-50 aria-[sort=ascending]:font-bold data-active:underline nth-[2n+1]:italic"></div>',
    );

    expect(css).toContain(':required');
    expect(css).toContain(':user-invalid');
    expect(css).toContain('@media (pointer: fine)');
    expect(css).toContain('@media (width < 48rem)');
    expect(css).toContain('>*');
    expect(css).toContain('[aria-checked="true"]');
    expect(css).toContain('[aria-sort="ascending"]');
    expect(css).toContain('[data-active]');
    expect(css).toContain(':nth-child(2n+1)');
  });

  it('fails closed for unknown variants instead of emitting unconditional CSS', () => {
    expect(jitCSS('<div class="totally-unknown:block"></div>')).toBe('');
  });

  it('maps arbitrary values for every logical spacing side', () => {
    expect(parseArbitrary('mbs-[2cqb]')).toBe('margin-block-start:2cqb;');
    expect(parseArbitrary('scroll-pbe-[3rem]')).toBe(
      'scroll-padding-block-end:3rem;',
    );
  });
});
