/**
 * Tests for Tailwind CSS 4 parity utilities added to the JIT CSS engine.
 * Covers: logical properties, text-shadow, mask, field-sizing, color-scheme,
 * font-stretch, flow-root, extended cursors, grid subgrid, logical borders.
 */
import { describe, it, expect } from 'vitest';
import { jitCSS, utilityMap } from '../src/lib/runtime/style';

describe('Tailwind CSS 4 parity utilities', () => {
  describe('flow-root display', () => {
    it('generates flow-root', () => {
      const css = jitCSS('<div class="flow-root"></div>');
      expect(css).toContain('display:flow-root');
    });
  });

  describe('logical text alignment', () => {
    it('generates text-start', () => {
      const css = jitCSS('<div class="text-start"></div>');
      expect(css).toContain('text-align:start');
    });
    it('generates text-end', () => {
      const css = jitCSS('<div class="text-end"></div>');
      expect(css).toContain('text-align:end');
    });
  });

  describe('grid subgrid', () => {
    it('generates grid-cols-subgrid', () => {
      const css = jitCSS('<div class="grid-cols-subgrid"></div>');
      expect(css).toContain('grid-template-columns:subgrid');
    });
    it('generates grid-rows-subgrid', () => {
      const css = jitCSS('<div class="grid-rows-subgrid"></div>');
      expect(css).toContain('grid-template-rows:subgrid');
    });
  });

  describe('text-shadow utilities', () => {
    it('generates text-shadow-xs', () => {
      const css = jitCSS('<div class="text-shadow-xs"></div>');
      expect(css).toContain('text-shadow');
      expect(css).toContain('0.05');
    });
    it('generates text-shadow (base)', () => {
      const css = jitCSS('<div class="text-shadow"></div>');
      expect(css).toContain('text-shadow');
    });
    it('generates text-shadow-2xl', () => {
      const css = jitCSS('<div class="text-shadow-2xl"></div>');
      expect(css).toContain('text-shadow');
      expect(css).toContain('24px');
    });
    it('generates text-shadow-none', () => {
      const css = jitCSS('<div class="text-shadow-none"></div>');
      expect(css).toContain('text-shadow:none');
    });
    const shadows = [
      'text-shadow-xs',
      'text-shadow-sm',
      'text-shadow',
      'text-shadow-md',
      'text-shadow-lg',
      'text-shadow-xl',
      'text-shadow-2xl',
      'text-shadow-none',
    ];
    for (const s of shadows) {
      it(`utility map contains ${s}`, () => {
        expect(utilityMap[s]).toBeDefined();
      });
    }
  });

  describe('mask utilities', () => {
    it('generates mask-none', () => {
      const css = jitCSS('<div class="mask-none"></div>');
      expect(css).toContain('mask-image:none');
    });
    it('generates mask-linear-to-b', () => {
      const css = jitCSS('<div class="mask-linear-to-b"></div>');
      expect(css).toContain('mask-image');
      expect(css).toContain('bottom');
    });
    it('generates mask-radial', () => {
      const css = jitCSS('<div class="mask-radial"></div>');
      expect(css).toContain('radial-gradient');
    });
    it('generates mask-alpha', () => {
      const css = jitCSS('<div class="mask-alpha"></div>');
      expect(css).toContain('mask-mode:alpha');
    });
    it('generates mask-size-cover', () => {
      const css = jitCSS('<div class="mask-size-cover"></div>');
      expect(css).toContain('mask-size:cover');
    });
  });

  describe('field-sizing utilities', () => {
    it('generates field-sizing-content', () => {
      const css = jitCSS('<div class="field-sizing-content"></div>');
      expect(css).toContain('field-sizing:content');
    });
    it('generates field-sizing-fixed', () => {
      const css = jitCSS('<div class="field-sizing-fixed"></div>');
      expect(css).toContain('field-sizing:fixed');
    });
  });

  describe('color-scheme utilities', () => {
    it('generates scheme-light', () => {
      const css = jitCSS('<div class="scheme-light"></div>');
      expect(css).toContain('color-scheme:light');
    });
    it('generates scheme-dark', () => {
      const css = jitCSS('<div class="scheme-dark"></div>');
      expect(css).toContain('color-scheme:dark');
    });
    it('generates scheme-both', () => {
      const css = jitCSS('<div class="scheme-both"></div>');
      expect(css).toContain('color-scheme:light dark');
    });
    it('generates scheme-only-light', () => {
      const css = jitCSS('<div class="scheme-only-light"></div>');
      expect(css).toContain('color-scheme:only light');
    });
    it('generates scheme-only-dark', () => {
      const css = jitCSS('<div class="scheme-only-dark"></div>');
      expect(css).toContain('color-scheme:only dark');
    });
  });

  describe('font-stretch utilities', () => {
    it('generates font-stretch-condensed', () => {
      const css = jitCSS('<div class="font-stretch-condensed"></div>');
      expect(css).toContain('font-stretch:condensed');
    });
    it('generates font-stretch-normal', () => {
      const css = jitCSS('<div class="font-stretch-normal"></div>');
      expect(css).toContain('font-stretch:normal');
    });
    it('generates font-stretch-expanded', () => {
      const css = jitCSS('<div class="font-stretch-expanded"></div>');
      expect(css).toContain('font-stretch:expanded');
    });
    const stretches = [
      'font-stretch-ultra-condensed',
      'font-stretch-extra-condensed',
      'font-stretch-condensed',
      'font-stretch-semi-condensed',
      'font-stretch-normal',
      'font-stretch-semi-expanded',
      'font-stretch-expanded',
      'font-stretch-extra-expanded',
      'font-stretch-ultra-expanded',
    ];
    for (const s of stretches) {
      it(`utility map contains ${s}`, () => {
        expect(utilityMap[s]).toBeDefined();
      });
    }
  });

  describe('extended cursor utilities', () => {
    it('generates cursor-zoom-in', () => {
      const css = jitCSS('<div class="cursor-zoom-in"></div>');
      expect(css).toContain('cursor:zoom-in');
    });
    it('generates cursor-grab', () => {
      const css = jitCSS('<div class="cursor-grab"></div>');
      expect(css).toContain('cursor:grab');
    });
    it('generates cursor-crosshair', () => {
      const css = jitCSS('<div class="cursor-crosshair"></div>');
      expect(css).toContain('cursor:crosshair');
    });
    it('generates cursor-ew-resize', () => {
      const css = jitCSS('<div class="cursor-ew-resize"></div>');
      expect(css).toContain('cursor:ew-resize');
    });
  });

  describe('logical spacing utilities', () => {
    it('ms-4 generates margin-inline-start', () => {
      const css = jitCSS('<div class="ms-4"></div>');
      expect(css).toContain('margin-inline-start');
    });
    it('me-4 generates margin-inline-end', () => {
      const css = jitCSS('<div class="me-4"></div>');
      expect(css).toContain('margin-inline-end');
    });
    it('ps-4 generates padding-inline-start', () => {
      const css = jitCSS('<div class="ps-4"></div>');
      expect(css).toContain('padding-inline-start');
    });
    it('pe-4 generates padding-inline-end', () => {
      const css = jitCSS('<div class="pe-4"></div>');
      expect(css).toContain('padding-inline-end');
    });
    it('start-4 generates inset-inline-start', () => {
      const css = jitCSS('<div class="start-4"></div>');
      expect(css).toContain('inset-inline-start');
    });
    it('end-4 generates inset-inline-end', () => {
      const css = jitCSS('<div class="end-4"></div>');
      expect(css).toContain('inset-inline-end');
    });
  });

  describe('logical border utilities', () => {
    it('border-s generates border-inline-start-width', () => {
      const css = jitCSS('<div class="border-s"></div>');
      expect(css).toContain('border-inline-start-width');
    });
    it('border-e generates border-inline-end-width', () => {
      const css = jitCSS('<div class="border-e"></div>');
      expect(css).toContain('border-inline-end-width');
    });
    it('border-s-4 generates 4px border-inline-start-width', () => {
      const css = jitCSS('<div class="border-s-4"></div>');
      expect(css).toContain('4px');
      expect(css).toContain('border-inline-start-width');
    });
  });

  describe('logical border-radius utilities', () => {
    it('rounded-s generates border-start-start-radius', () => {
      const css = jitCSS('<div class="rounded-s"></div>');
      expect(css).toContain('border-start-start-radius');
    });
    it('rounded-e-lg generates border-start-end-radius', () => {
      const css = jitCSS('<div class="rounded-e-lg"></div>');
      expect(css).toContain('border-start-end-radius');
    });
    it('rounded-s-full generates 9999px radius', () => {
      const css = jitCSS('<div class="rounded-s-full"></div>');
      expect(css).toContain('9999px');
    });
  });

  describe('inert: variant', () => {
    it('inert:opacity-50 generates selector with [inert]', () => {
      const css = jitCSS('<div class="inert:opacity-50"></div>');
      expect(css).toContain('[inert]');
      expect(css).toContain('opacity');
    });
  });

  describe('CSS variable shorthand syntax — prop-(--custom-property)', () => {
    it('bg-(--my-color) generates background-color:var(--my-color)', () => {
      const css = jitCSS('<div class="bg-(--my-color)"></div>');
      expect(css).toContain('background-color:var(--my-color)');
    });

    it('text-(--my-color) generates color:var(--my-color)', () => {
      const css = jitCSS('<div class="text-(--my-color)"></div>');
      expect(css).toContain('color:var(--my-color)');
    });

    it('w-(--my-width) generates width:var(--my-width)', () => {
      const css = jitCSS('<div class="w-(--my-width)"></div>');
      expect(css).toContain('width:var(--my-width)');
    });

    it('h-(--my-height) generates height:var(--my-height)', () => {
      const css = jitCSS('<div class="h-(--my-height)"></div>');
      expect(css).toContain('height:var(--my-height)');
    });

    it('p-(--my-spacing) generates padding:var(--my-spacing)', () => {
      const css = jitCSS('<div class="p-(--my-spacing)"></div>');
      expect(css).toContain('padding:var(--my-spacing)');
    });

    it('works with multi-word custom property names', () => {
      const css = jitCSS('<div class="bg-(--md-sys-color-primary)"></div>');
      expect(css).toContain('background-color:var(--md-sys-color-primary)');
    });

    it('works inside a variant — hover:bg-(--my-color)', () => {
      const css = jitCSS('<div class="hover:bg-(--my-color)"></div>');
      expect(css).toContain('background-color:var(--my-color)');
      expect(css).toContain(':hover');
    });

    it('works inside focus variant — focus:text-(--my-color)', () => {
      const css = jitCSS('<div class="focus:text-(--my-color)"></div>');
      expect(css).toContain('color:var(--my-color)');
      expect(css).toContain(':focus');
    });
  });

  describe('text-shadow color utilities', () => {
    it('text-shadow-primary-500 sets --cer-text-shadow-color', () => {
      const css = jitCSS('<div class="text-shadow-primary-500"></div>');
      expect(css).toContain('--cer-text-shadow-color');
      expect(css).toContain('--cer-color-primary-500');
    });

    it('text-shadow-error-500 sets --cer-text-shadow-color to error color', () => {
      const css = jitCSS('<div class="text-shadow-error-500"></div>');
      expect(css).toContain('--cer-text-shadow-color');
      expect(css).toContain('--cer-color-error-500');
    });

    it('text-shadow size utilities use --cer-text-shadow-color variable', () => {
      const css = jitCSS('<div class="text-shadow-md"></div>');
      expect(css).toContain('var(--cer-text-shadow-color');
    });

    it('combining text-shadow size and color sets both the size and color variable', () => {
      const css = jitCSS(
        '<div class="text-shadow-lg text-shadow-primary-500"></div>',
      );
      expect(css).toContain(
        'text-shadow:0 4px 8px var(--cer-text-shadow-color',
      );
      expect(css).toContain('--cer-color-primary-500');
    });

    it('text-shadow-primary-500/30 applies opacity via color-mix to --cer-text-shadow-color', () => {
      const css = jitCSS('<div class="text-shadow-primary-500/30"></div>');
      expect(css).toContain('--cer-text-shadow-color');
      // Opacity modifier should produce a color-mix or rgb fallback
      expect(css.includes('color-mix') || css.includes('rgb(')).toBe(true);
    });
  });
});
