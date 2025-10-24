import { describe, it, expect } from 'vitest';
import { minifyCSS, jitCSS } from '../src/lib/runtime/style';

describe('Gradient Utilities', () => {
  describe('Linear Gradients', () => {
    it('generates linear gradient utilities', () => {
      const html = `
        <div class="bg-linear-to-r from-primary-500 to-secondary-500"></div>
        <div class="bg-linear-to-b from-error-400 via-warning-500 to-success-600"></div>
        <div class="bg-linear-to-tr from-neutral-900 to-white"></div>
      `;

      const css = minifyCSS(jitCSS(html));

      // Linear gradient directions
      expect(css).toContain('.bg-linear-to-r');
      expect(css).toContain('linear-gradient(to right');
      expect(css).toContain('.bg-linear-to-b');
      expect(css).toContain('linear-gradient(to bottom');
      expect(css).toContain('.bg-linear-to-tr');
      expect(css).toContain('linear-gradient(to top right');

      // Gradient stops
      expect(css).toContain('.from-primary-500');
      expect(css).toContain('--ce-gradient-from');
      expect(css).toContain('.to-secondary-500');
      expect(css).toContain('--ce-gradient-to');
      expect(css).toContain('.via-warning-500');
      expect(css).toContain('--ce-gradient-stops');
    });

    it('generates all linear gradient directions', () => {
      const html = `
        <div class="bg-linear-to-t"></div>
        <div class="bg-linear-to-tr"></div>
        <div class="bg-linear-to-r"></div>
        <div class="bg-linear-to-br"></div>
        <div class="bg-linear-to-b"></div>
        <div class="bg-linear-to-bl"></div>
        <div class="bg-linear-to-l"></div>
        <div class="bg-linear-to-tl"></div>
      `;

      const css = minifyCSS(jitCSS(html));

      expect(css).toContain('.bg-linear-to-t');
      expect(css).toContain('to top');
      expect(css).toContain('.bg-linear-to-tr');
      expect(css).toContain('to top right');
      expect(css).toContain('.bg-linear-to-r');
      expect(css).toContain('to right');
      expect(css).toContain('.bg-linear-to-br');
      expect(css).toContain('to bottom right');
      expect(css).toContain('.bg-linear-to-b');
      expect(css).toContain('to bottom');
      expect(css).toContain('.bg-linear-to-bl');
      expect(css).toContain('to bottom left');
      expect(css).toContain('.bg-linear-to-l');
      expect(css).toContain('to left');
      expect(css).toContain('.bg-linear-to-tl');
      expect(css).toContain('to top left');
    });
  });

  describe('Radial Gradients (Ellipse)', () => {
    it('generates radial ellipse gradient utilities', () => {
      const html = `
        <div class="bg-radial from-primary-500 to-black"></div>
        <div class="bg-radial-at-tr from-success-400 to-error-600"></div>
      `;

      const css = minifyCSS(jitCSS(html));

      expect(css).toContain('.bg-radial');
      expect(css).toContain('radial-gradient(ellipse at center');
      expect(css).toContain('.bg-radial-at-tr');
      expect(css).toContain('radial-gradient(ellipse at top right');
    });

    it('generates all radial ellipse positions', () => {
      const html = `
        <div class="bg-radial-at-t"></div>
        <div class="bg-radial-at-tr"></div>
        <div class="bg-radial-at-r"></div>
        <div class="bg-radial-at-br"></div>
        <div class="bg-radial-at-b"></div>
        <div class="bg-radial-at-bl"></div>
        <div class="bg-radial-at-l"></div>
        <div class="bg-radial-at-tl"></div>
      `;

      const css = minifyCSS(jitCSS(html));

      expect(css).toContain('ellipse at top');
      expect(css).toContain('ellipse at top right');
      expect(css).toContain('ellipse at right');
      expect(css).toContain('ellipse at bottom right');
      expect(css).toContain('ellipse at bottom');
      expect(css).toContain('ellipse at bottom left');
      expect(css).toContain('ellipse at left');
      expect(css).toContain('ellipse at top left');
    });
  });

  describe('Radial Gradients (Circle)', () => {
    it('generates radial circle gradient utilities', () => {
      const html = `
        <div class="bg-radial-circle from-warning-500 to-transparent"></div>
        <div class="bg-radial-circle-at-br from-info-400 to-neutral-900"></div>
      `;

      const css = minifyCSS(jitCSS(html));

      expect(css).toContain('.bg-radial-circle');
      expect(css).toContain('radial-gradient(circle at center');
      expect(css).toContain('.bg-radial-circle-at-br');
      expect(css).toContain('radial-gradient(circle at bottom right');
    });

    it('generates all radial circle positions', () => {
      const html = `
        <div class="bg-radial-circle-at-t"></div>
        <div class="bg-radial-circle-at-tr"></div>
        <div class="bg-radial-circle-at-r"></div>
        <div class="bg-radial-circle-at-br"></div>
        <div class="bg-radial-circle-at-b"></div>
        <div class="bg-radial-circle-at-bl"></div>
        <div class="bg-radial-circle-at-l"></div>
        <div class="bg-radial-circle-at-tl"></div>
      `;

      const css = minifyCSS(jitCSS(html));

      expect(css).toContain('circle at top');
      expect(css).toContain('circle at top right');
      expect(css).toContain('circle at right');
      expect(css).toContain('circle at bottom right');
      expect(css).toContain('circle at bottom');
      expect(css).toContain('circle at bottom left');
      expect(css).toContain('circle at left');
      expect(css).toContain('circle at top left');
    });
  });

  describe('Conic Gradients', () => {
    it('generates conic gradient utilities', () => {
      const html = `
        <div class="bg-conic from-primary-500 to-secondary-500"></div>
        <div class="bg-conic-at-bl from-error-400 via-warning-500 to-success-600"></div>
      `;

      const css = minifyCSS(jitCSS(html));

      expect(css).toContain('.bg-conic');
      expect(css).toContain('conic-gradient(from 0deg at center');
      expect(css).toContain('.bg-conic-at-bl');
      expect(css).toContain('conic-gradient(from 0deg at bottom left');
    });

    it('generates all conic gradient positions', () => {
      const html = `
        <div class="bg-conic-at-t"></div>
        <div class="bg-conic-at-tr"></div>
        <div class="bg-conic-at-r"></div>
        <div class="bg-conic-at-br"></div>
        <div class="bg-conic-at-b"></div>
        <div class="bg-conic-at-bl"></div>
        <div class="bg-conic-at-l"></div>
        <div class="bg-conic-at-tl"></div>
      `;

      const css = minifyCSS(jitCSS(html));

      expect(css).toContain('from 0deg at top');
      expect(css).toContain('from 0deg at top right');
      expect(css).toContain('from 0deg at right');
      expect(css).toContain('from 0deg at bottom right');
      expect(css).toContain('from 0deg at bottom');
      expect(css).toContain('from 0deg at bottom left');
      expect(css).toContain('from 0deg at left');
      expect(css).toContain('from 0deg at top left');
    });
  });

  describe('Gradient Color Stops', () => {
    it('works with all color palettes', () => {
      const html = `
        <div class="from-neutral-500 via-primary-400 to-secondary-600"></div>
        <div class="from-success-300 via-info-500 to-warning-700"></div>
        <div class="from-error-500 to-black"></div>
        <div class="from-white to-transparent"></div>
      `;

      const css = minifyCSS(jitCSS(html));

      // Check all color stops are generated
      expect(css).toContain('.from-neutral-500');
      expect(css).toContain('.via-primary-400');
      expect(css).toContain('.to-secondary-600');
      expect(css).toContain('.from-success-300');
      expect(css).toContain('.from-error-500');
      expect(css).toContain('.to-black');
      expect(css).toContain('.from-white');
      expect(css).toContain('.to-transparent');

      // Check gradient variables
      expect(css).toContain('--ce-gradient-from');
      expect(css).toContain('--ce-gradient-to');
      expect(css).toContain('--ce-gradient-stops');
    });

    // Note: Opacity modifiers on gradient stops are not currently supported
    // This would require parseGradientColorStop to handle the opacity modifier syntax
    it.todo('supports opacity modifiers on gradient stops', () => {
      const html = `
        <div class="bg-linear-to-r from-primary-500/90 via-secondary-400/80 to-success-500/70"></div>
      `;

      const css = minifyCSS(jitCSS(html));

      // Check that gradient stop classes with opacity are generated
      expect(css).toContain('.from-primary-500\\/90');
      expect(css).toContain('.via-secondary-400\\/80');
      expect(css).toContain('.to-success-500\\/70');

      // Check that gradient variables are present
      expect(css).toContain('--ce-gradient-from');
      expect(css).toContain('--ce-gradient-to');
      expect(css).toContain('--ce-gradient-stops');
    });
  });

  describe('Gradient Variants', () => {
    it('works with hover state', () => {
      const html = `
        <button class="bg-linear-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600"></button>
      `;

      const css = minifyCSS(jitCSS(html));

      expect(css).toContain('.hover\\:from-primary-600:hover');
      expect(css).toContain('.hover\\:to-secondary-600:hover');
    });

    it('works with responsive variants', () => {
      const html = `
        <div class="bg-linear-to-r md:bg-radial lg:bg-conic"></div>
      `;

      const css = minifyCSS(jitCSS(html));

      expect(css).toContain('@media (min-width:768px)');
      expect(css).toContain('.md\\:bg-radial');
      expect(css).toContain('@media (min-width:1024px)');
      expect(css).toContain('.lg\\:bg-conic');
    });

    it('works with dark mode', () => {
      const html = `
        <div class="bg-linear-to-r from-primary-500 to-secondary-500 dark:from-primary-900 dark:to-secondary-900"></div>
      `;

      const css = minifyCSS(jitCSS(html));

      // Check for dark mode media query (minified version without space after colon)
      expect(css).toMatch(/@media \(prefers-color-scheme:\s?dark\)/);
      expect(css).toContain('.dark\\:from-primary-900');
      expect(css).toContain('.dark\\:to-secondary-900');
    });
  });

  describe('Complex Gradient Scenarios', () => {
    it('generates CSS for multiple gradient types in same document', () => {
      const html = `
        <div class="bg-linear-to-r from-primary-500 to-secondary-500"></div>
        <div class="bg-radial from-success-400 to-info-600"></div>
        <div class="bg-conic from-warning-500 to-error-500"></div>
      `;

      const css = minifyCSS(jitCSS(html));

      expect(css).toContain('linear-gradient');
      expect(css).toContain('radial-gradient');
      expect(css).toContain('conic-gradient');
    });

    it('handles gradients with utility classes', () => {
      const html = `
        <div class="p-8 rounded-xl shadow-lg bg-linear-to-br from-primary-500 to-secondary-900 text-white font-bold"></div>
      `;

      const css = minifyCSS(jitCSS(html));

      expect(css).toContain('.p-8');
      expect(css).toContain('.rounded-xl');
      expect(css).toContain('.shadow-lg');
      expect(css).toContain('.bg-linear-to-br');
      expect(css).toContain('.text-white');
      expect(css).toContain('.font-bold');
    });
  });
});
