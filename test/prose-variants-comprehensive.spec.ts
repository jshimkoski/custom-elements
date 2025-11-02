import { describe, it, expect } from 'vitest';
import { jitCSS } from '../src/lib/runtime/style';

describe('Prose Variants - Comprehensive Testing', () => {
  describe('pseudo-class variants', () => {
    it('should support hover variant', () => {
      const html = '<div class="hover:prose-a:text-primary-600">Test</div>';
      const css = jitCSS(html);

      expect(css).toContain('hover\\:prose-a\\:text-primary-600');
      expect(css).toMatch(/a:not\(\.not-prose\):not\(\.not-prose \*\):hover/);
      expect(css).toContain('color:');
    });

    it('should support focus variant', () => {
      const html = '<div class="focus:prose-a:underline">Test</div>';
      const css = jitCSS(html);

      expect(css).toContain('focus\\:prose-a\\:underline');
      expect(css).toMatch(/a:not\(\.not-prose\):not\(\.not-prose \*\):focus/);
    });

    it('should support active variant', () => {
      const html = '<div class="active:prose-a:font-bold">Test</div>';
      const css = jitCSS(html);

      expect(css).toContain('active\\:prose-a\\:font-bold');
      expect(css).toMatch(/a:not\(\.not-prose\):not\(\.not-prose \*\):active/);
    });

    it('should support visited variant', () => {
      const html = '<div class="visited:prose-a:text-secondary-600">Test</div>';
      const css = jitCSS(html);

      expect(css).toContain('visited\\:prose-a\\:text-secondary-600');
      expect(css).toMatch(/a:not\(\.not-prose\):not\(\.not-prose \*\):visited/);
    });

    it('should support first variant', () => {
      const html = '<div class="first:prose-li:font-bold">Test</div>';
      const css = jitCSS(html);

      expect(css).toContain('first\\:prose-li\\:font-bold');
      expect(css).toMatch(
        /li:not\(\.not-prose\):not\(\.not-prose \*\):first-child/,
      );
    });

    it('should support last variant', () => {
      const html = '<div class="last:prose-p:mb-0">Test</div>';
      const css = jitCSS(html);

      expect(css).toContain('last\\:prose-p\\:mb-0');
      expect(css).toMatch(
        /p:not\(\.not-prose\):not\(\.not-prose \*\):last-child/,
      );
    });
  });

  describe('responsive variants', () => {
    it('should support sm variant', () => {
      const html = '<div class="sm:prose-h1:text-4xl">Test</div>';
      const css = jitCSS(html);

      expect(css).toContain('@media (min-width:640px)');
      expect(css).toContain('sm\\:prose-h1\\:text-4xl');
    });

    it('should support md variant', () => {
      const html = '<div class="md:prose-h1:text-5xl">Test</div>';
      const css = jitCSS(html);

      expect(css).toContain('@media (min-width:768px)');
      expect(css).toContain('md\\:prose-h1\\:text-5xl');
    });

    it('should support lg variant', () => {
      const html = '<div class="lg:prose-h1:text-6xl">Test</div>';
      const css = jitCSS(html);

      expect(css).toContain('@media (min-width:1024px)');
      expect(css).toContain('lg\\:prose-h1\\:text-6xl');
    });

    it('should support xl variant', () => {
      const html = '<div class="xl:prose-p:text-lg">Test</div>';
      const css = jitCSS(html);

      expect(css).toContain('@media (min-width:1280px)');
      expect(css).toContain('xl\\:prose-p\\:text-lg');
    });
  });

  describe('dark mode variant', () => {
    it('should support dark variant', () => {
      const html = '<div class="dark:prose-a:text-primary-400">Test</div>';
      const css = jitCSS(html);

      expect(css).toContain('@media (prefers-color-scheme: dark)');
      expect(css).toContain('dark\\:prose-a\\:text-primary-400');
    });
  });

  describe('combined variants', () => {
    it('should support hover + responsive (md:hover)', () => {
      const html = '<div class="md:hover:prose-a:underline">Test</div>';
      const css = jitCSS(html);

      expect(css).toContain('@media (min-width:768px)');
      expect(css).toContain('md\\:hover\\:prose-a\\:underline');
      expect(css).toMatch(/a:not\(\.not-prose\):not\(\.not-prose \*\):hover/);
    });

    it('should support dark + responsive (md:dark)', () => {
      const html = '<div class="md:dark:prose-a:text-primary-400">Test</div>';
      const css = jitCSS(html);

      // Should have both media queries
      expect(css).toContain('@media (prefers-color-scheme: dark)');
      expect(css).toContain('min-width:768px');
      expect(css).toContain('md\\:dark\\:prose-a\\:text-primary-400');
    });

    it('should support hover + focus (hover:focus not typical but should handle)', () => {
      const html =
        '<div class="hover:prose-a:text-error-600 focus:prose-a:text-primary-600">Test</div>';
      const css = jitCSS(html);

      expect(css).toContain('hover\\:prose-a\\:text-error-600');
      expect(css).toContain('focus\\:prose-a\\:text-primary-600');
      expect(css).toMatch(/a:not\(\.not-prose\):not\(\.not-prose \*\):hover/);
      expect(css).toMatch(/a:not\(\.not-prose\):not\(\.not-prose \*\):focus/);
    });

    it('should support triple variants (lg:dark:hover)', () => {
      const html =
        '<div class="lg:dark:hover:prose-a:text-success-400">Test</div>';
      const css = jitCSS(html);

      expect(css).toContain('@media (prefers-color-scheme: dark)');
      expect(css).toContain('@media (min-width:1024px)');
      expect(css).toContain('lg\\:dark\\:hover\\:prose-a\\:text-success-400');
      expect(css).toMatch(/a:not\(\.not-prose\):not\(\.not-prose \*\):hover/);
    });
  });

  describe('structural variants', () => {
    it('should support group-hover variant', () => {
      const html =
        '<div class="group-hover:prose-a:text-primary-600">Test</div>';
      const css = jitCSS(html);

      expect(css).toContain('group-hover\\:prose-a\\:text-primary-600');
      expect(css).toContain('.group:hover');
    });

    it('should support peer-focus variant', () => {
      const html =
        '<div class="peer-focus:prose-p:text-neutral-900">Test</div>';
      const css = jitCSS(html);

      expect(css).toContain('peer-focus\\:prose-p\\:text-neutral-900');
      expect(css).toContain('.peer:focus');
    });
  });

  describe('multiple elements', () => {
    it('should work with different prose elements', () => {
      const html = `
        <div class="hover:prose-a:text-primary-600">Link</div>
        <div class="hover:prose-h1:text-error-600">Heading</div>
        <div class="hover:prose-p:text-success-600">Paragraph</div>
      `;
      const css = jitCSS(html);

      expect(css).toContain('hover\\:prose-a\\:text-primary-600');
      expect(css).toContain('hover\\:prose-h1\\:text-error-600');
      expect(css).toContain('hover\\:prose-p\\:text-success-600');

      expect(css).toMatch(/a:not\(\.not-prose\):not\(\.not-prose \*\):hover/);
      expect(css).toMatch(/h1:not\(\.not-prose\):not\(\.not-prose \*\):hover/);
      expect(css).toMatch(/p:not\(\.not-prose\):not\(\.not-prose \*\):hover/);
    });
  });

  describe('edge cases', () => {
    it('should handle prose modifiers without variants', () => {
      const html = '<div class="prose-a:text-primary-600">Test</div>';
      const css = jitCSS(html);

      expect(css).toContain('prose-a\\:text-primary-600');
      expect(css).toContain('color:');
      // Should NOT have pseudo-classes
      expect(css).not.toMatch(/:\w+\{/);
    });

    it('should generate correct CSS structure for each variant type', () => {
      const testCases = [
        { class: 'hover:prose-a:text-primary-600', expectedPseudo: ':hover' },
        { class: 'focus:prose-a:text-primary-600', expectedPseudo: ':focus' },
        { class: 'active:prose-a:text-primary-600', expectedPseudo: ':active' },
      ];

      testCases.forEach(({ class: className, expectedPseudo }) => {
        const html = `<div class="${className}">Test</div>`;
        const css = jitCSS(html);

        // Verify structure: .escaped-class element:not(...){prop}
        expect(css).toMatch(
          new RegExp(`\\.${className.replace(/:/g, '\\\\:')}`),
        );
        expect(css).toMatch(
          /[a-z0-9]+:not\(\.not-prose\):not\(\.not-prose \*\)/,
        );
        expect(css).toContain(expectedPseudo);
      });
    });
  });
});
