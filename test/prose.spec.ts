import { describe, it, expect } from 'vitest';
import {
  jitCSS,
  parseProseClass,
  parseProseElementModifier,
  getProseSheet,
  utilityMap,
} from '../src/lib/runtime/style';
import { generateProseCSS } from '../src/lib/runtime/prose';

describe('Prose Typography Integration', () => {
  describe('prose base classes', () => {
    it('should generate prose class with full CSS', () => {
      const html = '<article class="prose"><h1>Title</h1></article>';
      jitCSS(html); // Registers prose
      const proseSheet = getProseSheet();
      const css = proseSheet ? proseSheet.toString() : '';

      expect(css).toContain('.prose');
      expect(css).toContain('--cer-prose-body');
      expect(css).toContain('--cer-prose-headings');
      expect(css).toContain('.prose p');
      expect(css).toContain('.prose h1');
    });

    it('should generate prose-sm class', () => {
      const html = '<article class="prose-sm">Content</article>';
      jitCSS(html); // Registers prose-sm
      const proseSheet = getProseSheet();
      const css = proseSheet ? proseSheet.toString() : '';

      expect(css).toContain('.prose-sm');
      expect(css).toContain('font-size:0.875rem'); // Verify prose-sm uses small font size
    });

    it('should generate prose-lg class', () => {
      const html = '<article class="prose-lg">Content</article>';
      const css = jitCSS(html);

      expect(css).toContain('.prose-lg');
    });

    it('should generate prose-xl class', () => {
      const html = '<article class="prose-xl">Content</article>';
      const css = jitCSS(html);

      expect(css).toContain('.prose-xl');
    });
  });

  describe('prose-invert utility', () => {
    it('should be available in utilityMap', () => {
      expect(utilityMap['prose-invert']).toBeDefined();
      expect(utilityMap['prose-invert']).toContain('--cer-prose-body');
      expect(utilityMap['prose-invert']).toContain('neutral-200');
    });

    it('should generate prose-invert class from HTML', () => {
      const html = '<article class="prose prose-invert">Content</article>';
      const css = jitCSS(html);

      expect(css).toContain('.prose-invert');
      expect(css).toContain('--cer-prose-body');
    });

    it('should work with dark: variant', () => {
      const html = '<article class="prose dark:prose-invert">Content</article>';
      const css = jitCSS(html);

      expect(css).toContain('dark\\:prose-invert');
      expect(css).toContain('@media (prefers-color-scheme: dark)');
    });
  });

  describe('not-prose class', () => {
    it('should not generate a separate not-prose utility', () => {
      // not-prose works via :not() selectors in prose rules, not as a separate utility
      expect(utilityMap['not-prose']).toBeUndefined();
    });

    it('should exclude not-prose elements via :not() selectors in prose CSS', () => {
      // Generate prose CSS directly
      const proseCSS = generateProseCSS('prose');

      // Prose styles should use :not(.not-prose):not(.not-prose *) selectors
      expect(proseCSS).toBeTruthy();
      expect(proseCSS).toContain('.prose');
      expect(proseCSS).toContain(':not(.not-prose)');
      expect(proseCSS).toContain(':not(.not-prose *)');

      // Check that multiple elements use the selector
      expect(proseCSS).toContain('p:not(.not-prose):not(.not-prose *)');
      expect(proseCSS).toContain('a:not(.not-prose):not(.not-prose *)');
      expect(proseCSS).toContain('h1:not(.not-prose):not(.not-prose *)');
    });
  });

  describe('prose element modifiers', () => {
    it('should parse prose-a element modifier', () => {
      const result = parseProseElementModifier('prose-a:text-primary-600');

      expect(result).toBeTruthy();
      expect(result).toContain('.prose-a\\:text-primary-600');
      expect(result).toContain('a:not(.not-prose)');
      expect(result).toContain('color');
    });

    it('should parse prose-headings element modifier', () => {
      const result = parseProseElementModifier('prose-headings:font-bold');

      expect(result).toBeTruthy();
      expect(result).toContain('.prose-headings\\:font-bold');
      // Check for element selectors with :not() for proper scoping
      expect(result).toMatch(/h1:not\(.not-prose\)/);
      expect(result).toMatch(/h2:not\(.not-prose\)/);
      expect(result).toMatch(/th:not\(.not-prose\)/);
      expect(result).toContain('font-weight:700');
    });

    it('should parse prose-code element modifier', () => {
      const result = parseProseElementModifier('prose-code:text-sm');

      expect(result).toBeTruthy();
      expect(result).toContain('.prose-code\\:text-sm');
      expect(result).toContain('code:not(.not-prose)');
    });

    it('should return null for invalid element', () => {
      const result = parseProseElementModifier('prose-invalid:text-red');

      expect(result).toBeNull();
    });

    it('should return null for invalid utility', () => {
      const result = parseProseElementModifier('prose-a:invalid-utility');

      expect(result).toBeNull();
    });

    it('should generate prose-a:text-primary-600 from HTML', () => {
      const html =
        '<article class="prose prose-a:text-primary-600">Content</article>';
      const css = jitCSS(html);

      expect(css).toContain('.prose-a\\:text-primary-600');
      expect(css).toContain('a:not(.not-prose)');
      expect(css).toContain('not-prose');
    });

    it('should generate prose-img:rounded-lg from HTML', () => {
      const html =
        '<article class="prose prose-img:rounded-lg">Content</article>';
      const css = jitCSS(html);

      expect(css).toContain('.prose-img\\:rounded-lg');
      expect(css).toContain('img:not(.not-prose)');
      expect(css).toContain('border-radius');
    });

    it('should generate prose-blockquote:italic from HTML', () => {
      const html =
        '<article class="prose prose-blockquote:italic">Content</article>';
      const css = jitCSS(html);

      // CSS.escape() properly escapes colons and leading digits
      expect(css).toMatch(/prose-blockquote\\:italic/);
      expect(css).toContain('font-style:italic');
    });
  });

  describe('prose element modifiers with variants', () => {
    it('should work with hover variant', () => {
      const html =
        '<article class="prose hover:prose-a:underline">Content</article>';
      const css = jitCSS(html);

      // CSS.escape() handles colons properly
      expect(css).toMatch(/hover\\:prose-a\\:underline/);
      // The hover variant should be applied to the element selector
      expect(css).toMatch(/a:not\(.not-prose\):not\(.not-prose \*\):hover/);
    });

    it('should work with responsive variants', () => {
      const html =
        '<article class="prose md:prose-h1:text-4xl">Content</article>';
      const css = jitCSS(html);

      expect(css).toMatch(/md\\:prose-h1\\:text-4xl/);
      expect(css).toContain('@media (min-width:768px)');
    });

    it('should work with dark variant', () => {
      const html =
        '<article class="prose dark:prose-a:text-primary-400">Content</article>';
      const css = jitCSS(html);

      expect(css).toMatch(/dark\\:prose-a\\:text-primary-400/);
      expect(css).toContain('@media (prefers-color-scheme: dark)');
    });

    it('should work with multiple variants', () => {
      const html =
        '<article class="prose md:hover:prose-a:underline">Content</article>';
      const css = jitCSS(html);

      expect(css).toMatch(/md\\:hover\\:prose-a\\:underline/);
      expect(css).toContain('@media (min-width:768px)');
    });
  });

  describe('prose integration with other utilities', () => {
    it('should generate prose alongside regular utilities', () => {
      const html = `
        <article class="prose max-w-3xl mx-auto p-4">
          <h1>Title</h1>
        </article>
      `;
      const css = jitCSS(html);

      expect(css).toContain('.prose');
      expect(css).toContain('.max-w-3xl');
      expect(css).toContain('.mx-auto');
      expect(css).toContain('.p-4');
    });

    it('should handle prose with responsive utilities', () => {
      const html = `
        <article class="prose md:prose-lg lg:prose-xl">
          Content
        </article>
      `;
      const css = jitCSS(html);

      expect(css).toContain('.prose');
      expect(css).toContain('md\\:prose-lg');
      expect(css).toContain('lg\\:prose-xl');
      expect(css).toContain('@media (min-width:768px)');
      expect(css).toContain('@media (min-width:1024px)');
    });
  });

  describe('parseProseClass', () => {
    it('should register prose and return empty string', () => {
      const result = parseProseClass('prose');
      expect(result).toBe('');

      // Prose CSS is now in singleton sheet
      const sheet = getProseSheet();
      expect(sheet).toBeTruthy();
      const css = sheet?.toString();
      expect(css).toContain('.prose');
    });

    it('should register prose-sm and return empty string', () => {
      const result = parseProseClass('prose-sm');
      expect(result).toBe('');
    });

    it('should register prose-lg and return empty string', () => {
      const result = parseProseClass('prose-lg');
      expect(result).toBe('');
    });

    it('should register prose-xl and return empty string', () => {
      const result = parseProseClass('prose-xl');
      expect(result).toBe('');
    });

    it('should return null for non-prose classes', () => {
      expect(parseProseClass('text-blue-500')).toBeNull();
      expect(parseProseClass('prose-invalid')).toBeNull();
      expect(parseProseClass('prose-a:text-red')).toBeNull();
    });
  });

  describe('comprehensive element modifier coverage', () => {
    const elementModifiers = [
      ['prose-h1', 'h1'],
      ['prose-h2', 'h2'],
      ['prose-h3', 'h3'],
      ['prose-h4', 'h4'],
      ['prose-h5', 'h5'],
      ['prose-h6', 'h6'],
      ['prose-p', 'p'],
      ['prose-a', 'a'],
      ['prose-blockquote', 'blockquote'],
      ['prose-figure', 'figure'],
      ['prose-figcaption', 'figcaption'],
      ['prose-strong', 'strong'],
      ['prose-em', 'em'],
      ['prose-kbd', 'kbd'],
      ['prose-code', 'code'],
      ['prose-pre', 'pre'],
      ['prose-ol', 'ol'],
      ['prose-ul', 'ul'],
      ['prose-li', 'li'],
      ['prose-table', 'table'],
      ['prose-thead', 'thead'],
      ['prose-tbody', 'tbody'],
      ['prose-tr', 'tr'],
      ['prose-th', 'th'],
      ['prose-td', 'td'],
      ['prose-img', 'img'],
      ['prose-video', 'video'],
      ['prose-hr', 'hr'],
    ];

    elementModifiers.forEach(([modifier, element]) => {
      it(`should support ${modifier} element modifier`, () => {
        const result = parseProseElementModifier(`${modifier}:text-sm`);
        expect(result).toBeTruthy();
        expect(result).toContain(element);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty HTML', () => {
      const css = jitCSS('');
      expect(css).toBe('');
    });

    it('should handle HTML with no prose classes', () => {
      const html = '<div class="flex items-center">No prose</div>';
      const css = jitCSS(html);
      expect(css).not.toContain('prose');
    });

    it('should not break with malformed prose modifiers', () => {
      const html = '<div class="prose-">Invalid</div>';
      const css = jitCSS(html);
      // Should not throw and should not generate prose CSS
      expect(css).not.toContain('--cer-prose-body');
    });

    it('should handle prose with arbitrary values', () => {
      const html =
        '<article class="prose prose-p:[margin:2rem]">Content</article>';
      const css = jitCSS(html);

      // Should generate the prose class
      expect(css).toContain('.prose');
      // The arbitrary modifier should be attempted (may or may not succeed)
    });
  });
});
