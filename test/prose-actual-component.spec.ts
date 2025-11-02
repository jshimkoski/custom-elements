import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '../src/components/examples/Prose';

describe('Prose.ts Component - Actual CSS Generation', () => {
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

  it('should render prose-example component and check actual CSS', async () => {
    const el = document.createElement('prose-example');
    container.appendChild(el);

    // Wait for component to render
    await new Promise((resolve) => setTimeout(resolve, 100));

    const css = getComponentCSS(el);

    console.log('\n=== ACTUAL PROSE.TS COMPONENT CSS (first 5000 chars) ===');
    console.log(css.substring(0, 5000));
    console.log('\n=== Checking for 2xl:prose-2xl in CSS ===');
    console.log('Contains "2xl\\:prose-2xl":', css.includes('2xl\\:prose-2xl'));
    console.log(
      'Contains "@media (min-width:1536px)":',
      css.includes('@media (min-width:1536px)'),
    );
    console.log('Contains ".prose-2xl":', css.includes('.prose-2xl'));

    // Check if the component exists
    expect(el).toBeDefined();
    expect(el.shadowRoot).toBeDefined();

    // The component uses: class="prose prose-error 2xl:prose-2xl dark:prose-invert text-left"

    // Check for base prose class (should be in singleton sheet or inline)
    expect(css).toContain('.prose');

    // Check for prose-error utility
    expect(css).toContain('prose-error');

    // Check for 2xl:prose-2xl variant - THIS IS THE KEY TEST
    console.log('\n=== SEARCHING FOR 2xl:prose-2xl VARIANT ===');
    const has2xlClass = css.includes('2xl\\:prose-2xl');
    const has2xlMedia = css.includes('@media (min-width:1536px)');
    const hasProse2xlContent =
      css.includes('.prose-2xl') || css.includes('2xl\\:prose-2xl');

    console.log('Has escaped 2xl class:', has2xlClass);
    console.log('Has 2xl media query:', has2xlMedia);
    console.log('Has prose-2xl content:', hasProse2xlContent);

    if (has2xlMedia && hasProse2xlContent) {
      // Extract the 2xl media query section
      const mediaStart = css.indexOf('@media (min-width:1536px)');
      const mediaSection = css.substring(mediaStart, mediaStart + 1000);
      console.log('\n=== 2XL MEDIA QUERY SECTION ===');
      console.log(mediaSection);
    }

    // THESE SHOULD PASS IF VARIANTS ARE WORKING
    expect(css).toContain('@media (min-width:1536px)');
    expect(css.includes('2xl\\:prose-2xl') || css.includes('.prose-2xl')).toBe(
      true,
    );

    // Check for dark:prose-invert
    console.log('\n=== SEARCHING FOR dark:prose-invert ===');
    const hasDarkMedia =
      css.includes('@media (prefers-color-scheme:dark)') ||
      css.includes('@media (prefers-color-scheme: dark)');
    const hasProseInvert =
      css.includes('prose-invert') || css.includes('dark\\:prose-invert');

    console.log('Has dark media query:', hasDarkMedia);
    console.log('Has prose-invert:', hasProseInvert);

    expect(hasDarkMedia).toBe(true);
    expect(hasProseInvert).toBe(true);

    // Check for text-left utility
    expect(css).toContain('text-align:left');
  });

  it('should have proper CSS structure for all classes in Prose.ts', async () => {
    const el = document.createElement('prose-example');
    container.appendChild(el);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const css = getComponentCSS(el);

    // The component div has: class="prose prose-error 2xl:prose-2xl dark:prose-invert text-left"

    const checks = {
      'prose base class': css.includes('.prose'),
      'prose-error utility': css.includes('prose-error'),
      'text-left utility': css.includes('text-align:left'),
      '2xl media query': css.includes('@media (min-width:1536px)'),
      'dark media query': css.includes('prefers-color-scheme'),
      'prose-2xl or 2xl:prose-2xl': css.includes('prose-2xl'),
      'prose-invert': css.includes('prose-invert'),
    };

    console.log('\n=== CSS CHECKS ===');
    for (const [check, result] of Object.entries(checks)) {
      console.log(`${check}: ${result ? '✅' : '❌'}`);
    }

    // All checks should pass
    for (const result of Object.values(checks)) {
      expect(result).toBe(true);
    }
  });

  it('should show the actual inline CSS vs adopted stylesheets breakdown', async () => {
    const el = document.createElement('prose-example');
    container.appendChild(el);

    await new Promise((resolve) => setTimeout(resolve, 100));

    if (!el.shadowRoot) {
      throw new Error('No shadow root');
    }

    let adoptedCSS = '';
    let inlineCSS = '';

    // Get adopted stylesheet CSS
    if (el.shadowRoot.adoptedStyleSheets) {
      el.shadowRoot.adoptedStyleSheets.forEach((sheet) => {
        try {
          const rules = Array.from(sheet.cssRules);
          rules.forEach((rule) => {
            adoptedCSS += rule.cssText + '\n';
          });
        } catch {
          // Ignore
        }

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
              adoptedCSS += sheetText + '\n';
            }
          }
        } catch {
          // Ignore
        }
      });
    }

    // Get inline style element CSS
    const styleElements = el.shadowRoot.querySelectorAll('style');
    styleElements.forEach((style) => {
      inlineCSS += style.textContent + '\n';
    });

    console.log('\n=== ADOPTED STYLESHEETS CSS (first 2000 chars) ===');
    console.log(adoptedCSS.substring(0, 2000));
    console.log('\n=== INLINE STYLE ELEMENT CSS (first 2000 chars) ===');
    console.log(inlineCSS.substring(0, 2000));

    console.log('\n=== WHERE IS 2xl:prose-2xl? ===');
    console.log(
      'In adopted sheets:',
      adoptedCSS.includes('2xl') || adoptedCSS.includes('prose-2xl'),
    );
    console.log(
      'In inline styles:',
      inlineCSS.includes('2xl') || inlineCSS.includes('prose-2xl'),
    );

    console.log('\n=== WHERE IS @media (min-width:1536px)? ===');
    console.log(
      'In adopted sheets:',
      adoptedCSS.includes('@media (min-width:1536px)'),
    );
    console.log(
      'In inline styles:',
      inlineCSS.includes('@media (min-width:1536px)'),
    );

    // The variant classes should be in inline styles, not adopted sheets
    const has2xlVariant =
      adoptedCSS.includes('2xl') || inlineCSS.includes('2xl');
    expect(has2xlVariant).toBe(true);
  });
});
