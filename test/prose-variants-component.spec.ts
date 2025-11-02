import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { component } from '../src/lib/runtime/component';
import { html } from '../src/lib/runtime/template-compiler';

describe('Prose Variants - Component Context Integration', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    container.innerHTML = '';
  });

  const getComponentCSS = (element: HTMLElement): string => {
    if (!element.shadowRoot) return '';

    let css = '';

    // Get CSS from adoptedStyleSheets
    if (element.shadowRoot.adoptedStyleSheets) {
      element.shadowRoot.adoptedStyleSheets.forEach((sheet) => {
        try {
          const rules = Array.from(sheet.cssRules);
          rules.forEach((rule) => {
            css += rule.cssText + '\n';
          });
        } catch {
          // Ignore CORS errors
        }

        // Also try toString for test environments (jsdom doesn't populate cssRules)
        try {
          if (
            typeof (sheet as unknown as { toString?: () => string })
              .toString === 'function'
          ) {
            const sheetText = (
              sheet as unknown as { toString?: () => string }
            ).toString?.();
            if (
              sheetText &&
              sheetText.trim() &&
              !sheetText.includes('[object')
            ) {
              css += sheetText + '\n';
            }
          }
        } catch {
          // Ignore
        }
      });
    }

    // Get CSS from style elements
    const styleElements = element.shadowRoot.querySelectorAll('style');
    styleElements.forEach((style) => {
      css += style.textContent + '\n';
    });

    return css;
  };

  describe('prose base class variants in components', () => {
    it('should apply 2xl:prose-2xl with media query', async () => {
      const tagName = 'test-prose-2xl-variant';

      component(tagName, () => {
        return html`<div class="2xl:prose-2xl">Content</div>`;
      });

      const el = document.createElement(tagName);
      container.appendChild(el);

      // Wait for component to render
      await new Promise((resolve) => setTimeout(resolve, 50));

      const css = getComponentCSS(el);

      console.log('=== 2xl:prose-2xl CSS ===');
      console.log(css);

      // Should contain media query
      expect(css).toContain('@media (min-width:1536px)');

      // Should contain the escaped class (hex-escaped leading digit)
      expect(css).toMatch(/\\32 xl\\:prose-2xl/);

      // Should contain prose font size for 2xl
      expect(css).toContain('font-size:1.5rem');

      // Should contain prose-specific rules with :not(.not-prose) selectors
      expect(css).toMatch(/\\32 xl\\:prose-2xl.*?p:not\(\.not-prose\)/);
      expect(css).toMatch(/\\32 xl\\:prose-2xl.*?h1:not\(\.not-prose\)/);
    });

    it('should apply md:prose-lg with media query', async () => {
      const tagName = 'test-prose-md-lg';

      component(tagName, () => {
        return html`<div class="md:prose-lg">Content</div>`;
      });

      const el = document.createElement(tagName);
      container.appendChild(el);

      await new Promise((resolve) => setTimeout(resolve, 50));

      const css = getComponentCSS(el);

      console.log('=== md:prose-lg CSS ===');
      console.log(css);

      expect(css).toContain('@media (min-width:768px)');
      expect(css).toContain('md\\:prose-lg');
      expect(css).toContain('font-size:1.125rem');
    });

    it('should apply dark:prose with dark mode media query', async () => {
      const tagName = 'test-prose-dark';

      component(tagName, () => {
        return html`<div class="dark:prose">Content</div>`;
      });

      const el = document.createElement(tagName);
      container.appendChild(el);

      await new Promise((resolve) => setTimeout(resolve, 50));

      const css = getComponentCSS(el);

      console.log('=== dark:prose CSS ===');
      console.log(css);

      // Note: CSS is minified, so media query has no space after colon
      expect(css).toContain('@media (prefers-color-scheme:dark)');
      expect(css).toContain('dark\\:prose');
      expect(css).toContain('font-size:1rem');
    });

    it('should apply md:dark:prose-lg with combined queries', async () => {
      const tagName = 'test-prose-md-dark-lg';

      component(tagName, () => {
        return html`<div class="md:dark:prose-lg">Content</div>`;
      });

      const el = document.createElement(tagName);
      container.appendChild(el);

      await new Promise((resolve) => setTimeout(resolve, 50));

      const css = getComponentCSS(el);

      console.log('=== md:dark:prose-lg CSS ===');
      console.log(css);

      // Note: CSS is minified
      expect(css).toContain('@media (prefers-color-scheme:dark)');
      expect(css).toContain('@media (min-width:768px)');
      expect(css).toContain('md\\:dark\\:prose-lg');
      expect(css).toContain('font-size:1.125rem');
    });
  });

  describe('prose without variants (baseline)', () => {
    it('should use singleton sheet for prose without variants', async () => {
      const tagName = 'test-prose-no-variant';

      component(tagName, () => {
        return html`<div class="prose">Content</div>`;
      });

      const el = document.createElement(tagName);
      container.appendChild(el);

      await new Promise((resolve) => setTimeout(resolve, 50));

      const css = getComponentCSS(el);

      console.log('=== prose (no variant) CSS ===');
      console.log(css);

      // Should contain prose styles from singleton sheet
      expect(css).toContain('.prose');
      expect(css).toContain('font-size:1rem');

      // Should NOT be wrapped in media queries (singleton sheet doesn't do that)
      const proseRules = css.match(/\.prose\{[^}]+\}/g);
      if (proseRules) {
        const proseMainRule = proseRules.find((r) => r.includes('font-size'));
        if (proseMainRule) {
          // Check that this rule is not inside a media query by looking at surrounding context
          const proseIndex = css.indexOf(proseMainRule);
          const beforeRule = css.substring(
            Math.max(0, proseIndex - 200),
            proseIndex,
          );
          expect(beforeRule).not.toContain('@media');
        }
      }
    });
  });

  describe('real-world example from Prose.ts', () => {
    it('should apply prose prose-error 2xl:prose-2xl dark:prose-invert', async () => {
      const tagName = 'test-prose-real-world';

      component(tagName, () => {
        return html`
          <div class="prose prose-error 2xl:prose-2xl dark:prose-invert">
            <h1>Test</h1>
            <p>Content</p>
          </div>
        `;
      });

      const el = document.createElement(tagName);
      container.appendChild(el);

      await new Promise((resolve) => setTimeout(resolve, 50));

      const css = getComponentCSS(el);

      console.log('=== Real-world prose example CSS ===');
      console.log(css.substring(0, 2000)); // First 2000 chars

      // Should have base prose (from singleton)
      expect(css).toContain('.prose');

      // Should have 2xl:prose-2xl with media query (hex-escaped leading digit)
      expect(css).toMatch(/\\32 xl\\:prose-2xl/);
      expect(css).toContain('@media (min-width:1536px)');

      // Should have dark:prose-invert (note: CSS is minified)
      expect(css).toContain('dark\\:prose-invert');
      expect(css).toContain('@media (prefers-color-scheme:dark)');

      // Should have prose-error utility
      expect(css).toContain('prose-error');
    });
  });

  describe('prose element modifiers with variants', () => {
    it('should apply hover:prose-a:text-primary-600', async () => {
      const tagName = 'test-prose-element-variant';

      component(tagName, () => {
        return html`<div class="hover:prose-a:text-primary-600">Content</div>`;
      });

      const el = document.createElement(tagName);
      container.appendChild(el);

      await new Promise((resolve) => setTimeout(resolve, 50));

      const css = getComponentCSS(el);

      console.log('=== hover:prose-a:text-primary-600 CSS ===');
      console.log(css);

      expect(css).toContain('hover\\:prose-a\\:text-primary-600');
      expect(css).toMatch(/a:not\(\.not-prose\):not\(\.not-prose \*\):hover/);
      expect(css).toContain(':hover');
      expect(css).toContain('color:');
    });
  });
});
