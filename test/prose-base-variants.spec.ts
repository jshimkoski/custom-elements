import { describe, it, expect } from 'vitest';
import { jitCSS } from '../src/lib/runtime/style';

describe('Prose Base Class Variants', () => {
  describe('responsive variants on prose base classes', () => {
    it('should generate CSS for 2xl:prose-2xl', () => {
      const html = '<div class="2xl:prose-2xl">Content</div>';
      const css = jitCSS(html);

      // Should contain media query
      expect(css).toContain('@media (min-width:1536px)');

      // CSS.escape() escapes leading digits as hex, so "2xl:prose-2xl" becomes "\32 xl\:prose-2xl"
      expect(css).toMatch(/\\32 xl\\:prose-2xl/);

      // Should contain prose-specific styles with correct font size for 2xl variant
      expect(css).toContain('font-size:1.5rem'); // 2xl prose font size

      // Should contain prose typography rules
      expect(css).toContain('line-height:');
      expect(css).toContain('max-width:65ch');
    });

    it('should generate CSS for md:prose-lg', () => {
      const html = '<div class="md:prose-lg">Content</div>';
      const css = jitCSS(html);

      expect(css).toContain('@media (min-width:768px)');
      expect(css).toContain('md\\:prose-lg');
      expect(css).toContain('font-size:1.125rem'); // lg prose font size
    });

    it('should generate CSS for sm:prose', () => {
      const html = '<div class="sm:prose">Content</div>';
      const css = jitCSS(html);

      expect(css).toContain('@media (min-width:640px)');
      expect(css).toContain('sm\\:prose');
      expect(css).toContain('font-size:1rem'); // base prose font size
    });

    it('should generate CSS for xl:prose-xl', () => {
      const html = '<div class="xl:prose-xl">Content</div>';
      const css = jitCSS(html);

      expect(css).toContain('@media (min-width:1280px)');
      expect(css).toContain('xl\\:prose-xl');
      expect(css).toContain('font-size:1.25rem'); // xl prose font size
    });

    it('should generate CSS for lg:prose-sm', () => {
      const html = '<div class="lg:prose-sm">Content</div>';
      const css = jitCSS(html);

      expect(css).toContain('@media (min-width:1024px)');
      expect(css).toContain('lg\\:prose-sm');
      expect(css).toContain('font-size:0.875rem'); // sm prose font size
    });
  });

  describe('dark mode with prose base classes', () => {
    it('should generate CSS for dark:prose', () => {
      const html = '<div class="dark:prose">Content</div>';
      const css = jitCSS(html);

      expect(css).toContain('@media (prefers-color-scheme: dark)');
      expect(css).toContain('dark\\:prose');
      expect(css).toContain('font-size:1rem');
    });

    it('should generate CSS for dark:prose-lg', () => {
      const html = '<div class="dark:prose-lg">Content</div>';
      const css = jitCSS(html);

      expect(css).toContain('@media (prefers-color-scheme: dark)');
      expect(css).toContain('dark\\:prose-lg');
      expect(css).toContain('font-size:1.125rem');
    });
  });

  describe('combined variants on prose base classes', () => {
    it('should generate CSS for md:dark:prose-lg', () => {
      const html = '<div class="md:dark:prose-lg">Content</div>';
      const css = jitCSS(html);

      // Should have both media queries
      expect(css).toContain('@media (prefers-color-scheme: dark)');
      expect(css).toContain('@media (min-width:768px)');
      expect(css).toContain('md\\:dark\\:prose-lg');
      expect(css).toContain('font-size:1.125rem');
    });

    it('should generate CSS for 2xl:dark:prose-2xl', () => {
      const html = '<div class="2xl:dark:prose-2xl">Content</div>';
      const css = jitCSS(html);

      expect(css).toContain('@media (prefers-color-scheme: dark)');
      expect(css).toContain('@media (min-width:1536px)');
      // CSS.escape() hex-escapes leading digit
      expect(css).toMatch(/\\32 xl\\:dark\\:prose-2xl/);
      expect(css).toContain('font-size:1.5rem');
    });
  });

  describe('prose base class without variants', () => {
    it('should use singleton sheet for prose without variants', () => {
      const html = '<div class="prose">Content</div>';
      const css = jitCSS(html);

      // Should only contain placeholder (empty rule)
      // Actual prose styles come from singleton prose sheet
      expect(css).toContain('.prose{}');

      // Should NOT contain the full prose CSS inline
      expect(css).not.toMatch(/\.prose\{[^}]+font-size:/);
    });

    it('should use singleton sheet for prose-lg without variants', () => {
      const html = '<div class="prose-lg">Content</div>';
      const css = jitCSS(html);

      expect(css).toContain('.prose-lg{}');
      expect(css).not.toMatch(/\.prose-lg\{[^}]+font-size:/);
    });
  });

  describe('mixed prose classes', () => {
    it('should handle both variant and non-variant prose classes', () => {
      const html = `
        <div class="prose">Base prose</div>
        <div class="2xl:prose-2xl">Responsive prose</div>
      `;
      const css = jitCSS(html);

      // Non-variant prose: placeholder only
      expect(css).toContain('.prose{}');

      // Variant prose: full CSS with media query (hex-escaped leading digit)
      expect(css).toContain('@media (min-width:1536px)');
      expect(css).toMatch(/\\32 xl\\:prose-2xl/);
      expect(css).toContain('font-size:1.5rem');
    });

    it('should handle multiple responsive variants', () => {
      const html = `
        <div class="sm:prose md:prose-lg lg:prose-xl">Content</div>
      `;
      const css = jitCSS(html);

      expect(css).toContain('@media (min-width:640px)');
      expect(css).toContain('sm\\:prose');

      expect(css).toContain('@media (min-width:768px)');
      expect(css).toContain('md\\:prose-lg');

      expect(css).toContain('@media (min-width:1024px)');
      expect(css).toContain('lg\\:prose-xl');
    });
  });

  describe('prose element selectors', () => {
    it('should include all prose element selectors in variant CSS', () => {
      const html = '<div class="2xl:prose-2xl">Content</div>';
      const css = jitCSS(html);

      // Check that prose element selectors are present (with hex-escaped leading digit and :not() selectors)
      expect(css).toMatch(/\\32 xl\\:prose-2xl\s+p:not\(\.not-prose\)/); // paragraphs
      expect(css).toMatch(/\\32 xl\\:prose-2xl\s+h1:not\(\.not-prose\)/); // headings
      expect(css).toMatch(/\\32 xl\\:prose-2xl\s+a:not\(\.not-prose\)/); // links
      expect(css).toMatch(/\\32 xl\\:prose-2xl\s+code:not\(\.not-prose\)/); // code
      expect(css).toMatch(/\\32 xl\\:prose-2xl\s+pre:not\(\.not-prose\)/); // pre blocks
    });

    it('should apply variant class to all prose rules', () => {
      const html = '<div class="md:prose">Content</div>';
      const css = jitCSS(html);

      // All rules should use the variant class, not the base class
      expect(css).not.toContain('.prose '); // Should NOT have base class
      expect(css).toMatch(/\.md\\:prose\s/); // Should have variant class

      // Check multiple element types with :not() selectors
      expect(css).toMatch(/\.md\\:prose\s+p:not\(\.not-prose\)/);
      expect(css).toMatch(/\.md\\:prose\s+ul:not\(\.not-prose\)/);
      expect(css).toMatch(/\.md\\:prose\s+ol:not\(\.not-prose\)/);
    });
  });
});
