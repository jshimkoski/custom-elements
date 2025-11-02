import { describe, it, expect } from 'vitest';
import { jitCSS, getProseSheet } from '../src/lib/runtime/style';

describe('Prose Treeshaking Verification', () => {
  it('should not generate any prose CSS when no prose classes are used', () => {
    const html = `
      <div class="text-primary-500 p-4 bg-white">
        <h1 class="text-2xl font-bold">Not prose</h1>
        <p class="text-gray-600">Regular paragraph</p>
        <ul class="list-disc">
          <li>List item</li>
        </ul>
      </div>
    `;

    const css = jitCSS(html);

    // Should not contain any prose-related CSS
    expect(css).not.toContain('.prose');
    expect(css).not.toContain('--cer-prose');

    // Should still contain the regular utility classes
    expect(css).toContain('.text-primary-500');
    expect(css).toContain('.p-4');
    expect(css).toContain('.bg-white');

    console.log('✓ No prose CSS generated when prose classes not used');
  });

  it('should generate prose CSS only when prose classes are detected', () => {
    const htmlWithoutProse = '<div class="text-primary-500">No prose</div>';
    const cssWithoutProse = jitCSS(htmlWithoutProse);

    const htmlWithProse = '<div class="prose">With prose</div>';
    jitCSS(htmlWithProse);

    // Get prose CSS from singleton sheet
    const proseSheet = getProseSheet();
    const proseCSS = proseSheet ? proseSheet.toString() : '';

    // Without prose should be minimal
    expect(cssWithoutProse).not.toContain('.prose{');
    expect(cssWithoutProse.length).toBeLessThan(200);

    // With prose should include all prose styles in singleton sheet
    expect(proseCSS).toContain('.prose{');
    expect(proseCSS).toContain('--cer-prose-body');
    expect(proseCSS.length).toBeGreaterThan(4000);

    console.log(
      `✓ Prose is treeshakable: ${cssWithoutProse.length} bytes without, ${proseCSS.length} bytes with`,
    );
  });

  it('should support all size variants', () => {
    const sizes = ['prose', 'prose-sm', 'prose-lg', 'prose-xl', 'prose-2xl'];

    for (const size of sizes) {
      const html = `<div class="${size}">Content</div>`;
      jitCSS(html);

      // Get prose CSS from singleton sheet
      const proseSheet = getProseSheet();
      const css = proseSheet ? proseSheet.toString() : '';

      expect(css).toContain(`.${size}{`);
      expect(css).toContain('--cer-prose-body');
    }

    console.log('✓ All size variants work: base, sm, lg, xl, 2xl');
  });

  it('should support element modifiers for all elements', () => {
    const elements = [
      'headings',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'p',
      'a',
      'blockquote',
      'figure',
      'figcaption',
      'strong',
      'em',
      'code',
      'pre',
      'ol',
      'ul',
      'li',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'img',
      'video',
      'hr',
    ];

    for (const element of elements) {
      const html = `<div class="prose-${element}:font-bold">Content</div>`;
      const css = jitCSS(html);

      expect(css).toContain(`prose-${element}\\:font-bold`);
      expect(css).toContain(':not(.not-prose)');
      expect(css).toContain('font-weight:700');
    }

    console.log('✓ All element modifiers work correctly');
  });

  it('should support semantic color variants with invert', () => {
    const colors = [
      'primary',
      'secondary',
      'success',
      'warning',
      'error',
      'info',
    ];

    for (const color of colors) {
      const html = `<div class="prose-${color} dark:prose-invert">Content</div>`;
      const css = jitCSS(html);

      // Should have the semantic color class
      expect(css).toContain(`.prose-${color}{`);

      // Should set both light and dark mode variables
      expect(css).toContain(
        `--cer-prose-invert-links:var(--cer-color-${color}-`,
      );
    }

    console.log('✓ All semantic color variants work with prose-invert');
  });

  it('should be performant for large HTML documents', () => {
    // Generate a large HTML document
    const largeHtml = Array.from(
      { length: 100 },
      (_, i) => `
      <article class="prose">
        <h1>Heading ${i}</h1>
        <p>Paragraph ${i}</p>
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
        </ul>
      </article>
    `,
    ).join('');

    const start = performance.now();
    const css = jitCSS(largeHtml);
    const duration = performance.now() - start;

    // Should generate CSS quickly (under 50ms for 100 prose blocks)
    expect(duration).toBeLessThan(50);

    // Should generate prose CSS once (not duplicated)
    const proseMatches = css.match(/\.prose\{/g);
    expect(proseMatches?.length).toBe(1);

    console.log(`✓ Performance: Generated CSS in ${duration.toFixed(2)}ms`);
  });
});
