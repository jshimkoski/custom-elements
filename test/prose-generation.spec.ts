import { describe, it, expect } from 'vitest';
import { jitCSS, getProseSheet } from '../src/lib/runtime/style';

describe('Prose CSS Generation Verification', () => {
  it('should generate complete prose CSS with all element styles', () => {
    const html = `
      <article class="prose">
        <h1>Heading</h1>
        <p class="lead">Lead text</p>
        <p>Paragraph with <strong>bold</strong> and <em>italic</em>.</p>
        <ul>
          <li>List item</li>
        </ul>
        <ol>
          <li>Numbered item</li>
        </ol>
        <pre><code>code block</code></pre>
        <p>Inline <code>code</code> here.</p>
        <blockquote><p>Quote</p></blockquote>
        <hr>
        <table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Data</td></tr></tbody></table>
      </article>
    `;

    jitCSS(html); // Registers prose in singleton sheet
    const proseSheet = getProseSheet();
    const css = proseSheet ? proseSheet.toString() : '';

    // Container and variables
    expect(css).toContain('.prose{');
    expect(css).toContain('--cer-prose-body:');
    expect(css).toContain('--cer-prose-headings:');
    expect(css).toContain('--cer-prose-links:');
    expect(css).toContain('--cer-prose-code:');
    expect(css).toContain('--cer-prose-pre-code:');
    expect(css).toContain('--cer-prose-list-marker:');
    expect(css).toContain('--cer-prose-counters:');
    expect(css).toContain('--cer-prose-bullets:');

    // Typography elements (now with :not(.not-prose) selectors)
    expect(css).toContain('.prose p:not(.not-prose)');
    expect(css).toContain('.prose .lead:not(.not-prose)');
    expect(css).toContain('.prose h1:not(.not-prose)');
    expect(css).toContain('.prose h2:not(.not-prose)');
    expect(css).toContain('.prose h3:not(.not-prose)');
    expect(css).toContain('.prose a:not(.not-prose)');
    expect(css).toContain('.prose strong:not(.not-prose)');
    expect(css).toContain('.prose em:not(.not-prose)');

    // Lists (now with :not(.not-prose) selectors)
    expect(css).toContain('.prose ol:not(.not-prose)');
    expect(css).toContain('.prose ul:not(.not-prose)');
    expect(css).toContain(
      '.prose ol:not(.not-prose):not(.not-prose *)>li:not(.not-prose)',
    );
    expect(css).toContain(
      '.prose ul:not(.not-prose):not(.not-prose *)>li:not(.not-prose)',
    );
    expect(css).toContain('::marker');
    expect(css).toContain('list-style-type:decimal');
    expect(css).toContain('list-style-type:disc');

    // Code (now with :not(.not-prose) selectors)
    expect(css).toContain('.prose code:not(.not-prose)');
    expect(css).toContain('.prose pre:not(.not-prose)');
    expect(css).toContain(
      '.prose pre:not(.not-prose):not(.not-prose *) code:not(.not-prose)',
    );
    expect(css).toContain('background-color:var(--cer-prose-code-bg)');
    expect(css).toContain('background-color:var(--cer-prose-pre-bg)');
    expect(css).toContain('font-family:ui-monospace');

    // Blockquotes (now with :not(.not-prose) selectors)
    expect(css).toContain('.prose blockquote:not(.not-prose)');
    expect(css).toContain('border-left');
    expect(css).toContain('open-quote');
    expect(css).toContain('close-quote');

    // Horizontal rule (now with :not(.not-prose) selectors)
    expect(css).toContain('.prose hr:not(.not-prose)');

    // Tables (now with :not(.not-prose) selectors)
    expect(css).toContain('.prose table:not(.not-prose)');
    expect(css).toContain('.prose thead:not(.not-prose)');
    expect(css).toContain(
      '.prose tbody:not(.not-prose):not(.not-prose *) tr:not(.not-prose)',
    );
    expect(css).toContain(
      '.prose tbody:not(.not-prose):not(.not-prose *) td:not(.not-prose)',
    );

    console.log('\n✓ Generated CSS length:', css.length, 'characters');
    console.log('✓ All essential prose elements are styled');
  });

  it('should only generate CSS when prose class is used (treeshakable)', () => {
    const htmlWithoutProse =
      '<div><p>No prose class</p><ul><li>List</li></ul></div>';
    const cssWithoutProse = jitCSS(htmlWithoutProse);

    // Should not contain prose CSS
    expect(cssWithoutProse).not.toContain('.prose{');
    expect(cssWithoutProse).not.toContain('--cer-prose-body');

    console.log(
      '✓ CSS without prose:',
      cssWithoutProse.length,
      'characters (minimal)',
    );
  });

  it('should generate prose with element modifiers', () => {
    const html = `
      <article class="prose prose-a:text-primary-600 prose-code:text-sm">
        <p><a href="#">Link</a></p>
        <code>code</code>
      </article>
    `;

    const css = jitCSS(html);

    // Base prose
    expect(css).toContain('.prose{');

    // Element modifiers with proper scoping
    expect(css).toContain('.prose-a\\:text-primary-600');
    expect(css).toContain('a:not(.not-prose)');
    expect(css).toContain('.prose-code\\:text-sm');

    console.log('✓ Element modifiers working correctly');
  });

  it('should generate different font sizes for size variants', () => {
    const html = `
      <div class="prose">Base</div>
      <div class="prose-sm">Small</div>
      <div class="prose-lg">Large</div>
      <div class="prose-xl">Extra Large</div>
      <div class="prose-2xl">2XL</div>
    `;

    jitCSS(html); // Registers all prose sizes
    const proseSheet = getProseSheet();
    const css = proseSheet ? proseSheet.toString() : '';

    // Verify all classes are present
    expect(css).toContain('.prose{');
    expect(css).toContain('.prose-sm{');
    expect(css).toContain('.prose-lg{');
    expect(css).toContain('.prose-xl{');
    expect(css).toContain('.prose-2xl{');

    // Verify each has correct font size
    expect(css).toContain('font-size:1rem');
    expect(css).toContain('font-size:0.875rem');
    expect(css).toContain('font-size:1.125rem');
    expect(css).toContain('font-size:1.25rem');
    expect(css).toContain('font-size:1.5rem');

    console.log(
      '✓ Size variants: base=1rem, sm=0.875rem, lg=1.125rem, xl=1.25rem, 2xl=1.5rem',
    );
  });

  it('should generate semantic color variants', () => {
    const html = `
      <div class="prose prose-primary">Primary prose</div>
      <div class="prose prose-secondary">Secondary prose</div>
      <div class="prose prose-success">Success prose</div>
      <div class="prose prose-warning">Warning prose</div>
      <div class="prose prose-error">Error prose</div>
      <div class="prose prose-info">Info prose</div>
    `;

    const css = jitCSS(html);

    // Verify semantic color classes are present
    expect(css).toContain('.prose-primary{');
    expect(css).toContain('.prose-secondary{');
    expect(css).toContain('.prose-success{');
    expect(css).toContain('.prose-warning{');
    expect(css).toContain('.prose-error{');
    expect(css).toContain('.prose-info{');

    // Verify they set the appropriate CSS variables (700 for base, lighter 500 on hover)
    expect(css).toContain('--cer-prose-links:var(--cer-color-success-700)');
    expect(css).toContain('--cer-prose-links:var(--cer-color-error-700)');

    console.log(
      '✓ Semantic color variants: primary, secondary, success, warning, error, info',
    );
  });

  it('should work with prose-invert and semantic colors using CSS variable fallback', () => {
    const html = `
      <div class="prose prose-error dark:prose-invert">
        <p>Error prose with dark mode</p>
      </div>
    `;

    const css = jitCSS(html);

    // Verify base prose and prose-error are present
    expect(css).toContain('.prose{');
    expect(css).toContain('.prose-error{');

    // Verify prose-error sets both light and invert variables (300 for dark mode, lighter 100 on hover)
    expect(css).toContain(
      '--cer-prose-invert-links:var(--cer-color-error-300)',
    );

    // Verify dark:prose-invert uses the invert variables with fallback
    expect(css).toContain('.dark\\:prose-invert{');
    expect(css).toContain('--cer-prose-links:var(--cer-prose-invert-links');

    console.log(
      '✓ Semantic colors work with dark:prose-invert via CSS variable fallback',
    );
  });
});
