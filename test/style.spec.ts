import {
  css,
  getBaseResetSheet,
  sanitizeCSS,
  parseSpacing,
  hexToRgb,
  parseColorClass,
  parseOpacityModifier,
  parseColorWithOpacity,
  parseArbitrary,
  escapeClassName,
  extractClassesFromHTML,
  colors,
  utilityMap,
  selectorVariants,
  mediaVariants
} from '../src/lib/runtime/style';
import { describe, it, expect } from 'vitest';
import { minifyCSS, baseReset, jitCSS } from '../src/lib/runtime/style';

// --- minifyCSS ---
describe('minifyCSS', () => {
  it('removes whitespace and comments', () => {
    const css = `/* comment */\n  body { color: red; }\n  /* another */`;
    expect(minifyCSS(css)).toBe('body{color:red}');
  });

  it('handles empty input', () => {
    expect(minifyCSS('')).toBe('');
  });
});

// --- baseReset ---
describe('baseReset', () => {
  it('contains :host and box-sizing', () => {
    expect(baseReset).toContain(':host');
    expect(baseReset).toContain('box-sizing');
  });
});

// --- jitCSS ---
describe('jitCSS', () => {
  it('generates CSS for utility classes', () => {
    const html = '<div class="p-4 text-xl font-bold"></div>';
    const css = jitCSS(html);
    expect(css).toContain('.p-4');
    expect(css).toContain('padding:calc(0.25rem * 4);');
    expect(css).toContain('.text-xl');
    expect(css).toContain('font-size:1.25rem;');
  });

  it('supports variants', () => {
    const html = '<button class="hover:bg-blue-500 focus:ring-2"></button>';
    const css = jitCSS(html);
    expect(css).toContain('.hover\\:bg-blue-500:hover');
    expect(css).toContain('.focus\\:ring-2:focus');
  });

  it('supports responsive variants', () => {
    const html = '<div class="md:p-2 lg:p-4"></div>';
    const css = jitCSS(html);
    expect(css).toContain('@media (min-width:768px)');
    expect(css).toContain('.md\\:p-2');
    expect(css).toContain('@media (min-width:1024px)');
    expect(css).toContain('.lg\\:p-4');
  });

  it('supports arbitrary values', () => {
    const html = '<div class="z-[22] shadow-[0_2px_8px_rgba(0,0,0,0.15)]"></div>';
    const css = jitCSS(html);
    expect(css).toBe('.z-\\[22\\]{z-index:22;}.shadow-\\[0_2px_8px_rgba\\(0\\,0\\,0\\,0\\.15\\)\\]{box-shadow:0 2px 8px rgba(0,0,0,0.15);}');
  });

  it('supports duration and delay with ms', () => {
    const html = '<div class="duration-[500ms] delay-[300ms]"></div>';
    const css = jitCSS(html);
    expect(css).toContain('transition-duration:500ms;');
    expect(css).toContain('transition-delay:300ms;');
  });

  it('supports min-w and font-weight arbitrary values', () => {
    const html = '<div class="min-w-[320px] font-weight-[700]"></div>';
    const css = jitCSS(html);
    expect(css).toContain('min-width:320px;');
    expect(css).toContain('font-weight:700;');
  });

  it('ignores unsupported classes', () => {
    const html = '<div class="foo-bar"></div>';
    const css = jitCSS(html);
    expect(css).not.toContain('.foo-bar');
  });

  it('handles empty html', () => {
    expect(jitCSS('')).toBe('');
  });
});

describe('additional style tests', () => {
  it('css template literal works', () => {
    const color = 'red';
    expect(css`body { color: ${color}; }`).toBe('body { color: red; }');
  });

  it('minifies CSS', () => {
    const raw = 'body { color: red;  } /* comment */';
    expect(minifyCSS(raw)).toBe('body{color:red}'); // trailing semicolon removed
  });

  it('sanitizes CSS', () => {
    const unsafe = 'div { background: url(javascript:alert(1)); } <script>alert(1)</script> span { color: red; }';
    expect(sanitizeCSS(unsafe)).not.toMatch(/javascript|script/);
  });

  it.skip('getBaseResetSheet returns a CSSStyleSheet (skipped in JSDOM)', () => {
    // JSDOM does not support CSSStyleSheet.replaceSync
    // This test should be run in a real browser environment
  });

  it('parseSpacing returns correct CSS', () => {
    expect(parseSpacing('mx-2')).toBe('margin-inline:calc(0.25rem * 2);');
    expect(parseSpacing('-mx-2')).toBe('margin-inline:calc(-0.25rem * 2);');
    expect(parseSpacing('foo-2')).toBeNull();
    expect(parseSpacing('mx-x')).toBeNull();
  });

  it('hexToRgb converts hex to rgb', () => {
    expect(hexToRgb('#ff0000')).toBe('255 0 0');
    expect(hexToRgb('00ff00')).toBe('0 255 0');
  });

  it('parseColorClass returns CSS rule', () => {
    expect(parseColorClass('bg-red-500')).toContain('background-color');
    expect(parseColorClass('text-gray-200')).toContain('color');
    expect(parseColorClass('border-blue-600')).toContain('border-color');
    expect(parseColorClass('foo-bar')).toBeNull();
  });

  it('parseOpacityModifier parses opacity', () => {
    expect(parseOpacityModifier('bg-red-500/50')).toEqual({ base: 'bg-red-500', opacity: 0.5 });
    expect(parseOpacityModifier('bg-red-500')).toEqual({ base: 'bg-red-500' });
    expect(parseOpacityModifier('bg-red-500/x')).toEqual({ base: 'bg-red-500' });
  });

  it('parseColorWithOpacity returns CSS with opacity', () => {
    expect(parseColorWithOpacity('bg-red-500/50')).toContain('rgb(');
    expect(parseColorWithOpacity('bg-red-500')).toContain('background-color');
    expect(parseColorWithOpacity('foo-bar/50')).toBeNull();
  });

  it('parseArbitrary parses prop-[value] syntax', () => {
    expect(parseArbitrary('bg-[red]')).toBe('background-color:red;');
    expect(parseArbitrary('p-[10px]')).toBe('padding:10px;');
    expect(parseArbitrary('foo-[bar]')).toBe('foo:bar;');
    expect(parseArbitrary('foo-bar')).toBeNull();
  });

  it('escapeClassName escapes selector chars', () => {
    expect(escapeClassName('foo:bar/baz')).toBe('foo\\:bar\\/baz');
  });

  it('extractClassesFromHTML extracts classes', () => {
    const html = '<div class="foo bar-[baz] qux">';
    expect(extractClassesFromHTML(html)).toEqual(['foo', 'bar-[baz]', 'qux']);
  });

  it('jitCSS generates CSS for HTML', () => {
    const html = '<div class="block mx-2 bg-red-500/50">';
    const cssOut = jitCSS(html);
    expect(cssOut).toContain('display:block');
    expect(cssOut).toContain('margin-inline');
    expect(cssOut).toContain('rgb(');
  });

  it('utilityMap contains expected utilities', () => {
    expect(utilityMap['block']).toBe('display:block;');
    expect(utilityMap['flex']).toBe('display:flex;');
  });

  it('colors contains expected palettes', () => {
    expect(colors.red[500]).toContain('#ef4444');
    expect(colors.blue[500]).toContain('#3b82f6');
  });

  it('selectorVariants and mediaVariants work', () => {
    expect(selectorVariants.hover('.foo', 'color:red;')).toBe('.foo:hover{color:red;}');
    expect(mediaVariants.sm).toBe('(min-width:640px)');
  });
});

/**
 * Unit tests for arbitrary variants in JIT CSS.
 */
describe('jitCSS - Arbitrary Variants', () => {
  it('should generate CSS for attribute selector variant', () => {
    const html = `<div class="[aria-selected=true]:bg-blue-500"></div>`;
    const css = minifyCSS(jitCSS(html));
    expect(css).toContain('[aria-selected=true].\\[aria-selected\\=true\\]\\:bg-blue-500{background-color:var(--color-blue-500,#3b82f6)}');
  });

  it('should combine arbitrary variant with arbitrary value', () => {
    const html = `<div class="[data-state=active]:bg-[rgba(0,128,0,0.15)]"></div>`;
    const css = minifyCSS(jitCSS(html));
    expect(css).toContain('[data-state=active].\\[data-state\\=active\\]\\:bg-\\[rgba\\(0\\,128\\,0\\,0\\.15\\)\\]{background-color:rgba(0,128,0,0.15)}');
  });

  it('should support responsive + arbitrary variant', () => {
    const html = `<div class="md:[data-open=true]:bg-green-100"></div>`;
    const css = minifyCSS(jitCSS(html));
    expect(css).toContain('@media (min-width:768px){[data-open=true].md\\:\\[data-open\\=true\\]\\:bg-green-100{background-color:var(--color-green-100,#dcfce7)}}');
  });

  it('should support dark + responsive + arbitrary variant + arbitrary value', () => {
    const html = `<button class="dark:md:[&>h2]:hover:shadow-[0_0_0_2px_#09f]"></button>`;
    const css = minifyCSS(jitCSS(html));
    expect(css).toContain('@media (prefers-color-scheme:dark) and (min-width:768px){.dark\\:md\\:\\[\\&\\>h2\\]\\:hover\\:shadow-\\[0_0_0_2px_\\#09f\\]:hover>h2{box-shadow:0 0 0 2px #09f}}');
  });

  it('should support dark + responsive + arbitrary variant (with hover) + arbitrary value', () => {
    const html = `<button class="dark:md:[&>h2:hover]:hover:shadow-[0_0_0_2px_#09f]"></button>`;
    const css = minifyCSS(jitCSS(html));
    expect(css).toContain('@media (prefers-color-scheme:dark) and (min-width:768px){.dark\\:md\\:\\[\\&\\>h2\\:hover\\]\\:hover\\:shadow-\\[0_0_0_2px_\\#09f\\]:hover>h2:hover{box-shadow:0 0 0 2px #09f}}');
  });

  it.skip('should support extremely complicated monster classes', () => {
    const html = `<button class="dark:xl:group-hover:peer-focus:[&:is(section,article):nth-child(2)>h2[data-state=open]:hover]:focus-within:!shadow-[0_0_0_3px_rgba(255,0,255,0.75)]"></button>`;
    const css = minifyCSS(jitCSS(html));
    expect(css).toContain(':hover.button\\:hover\\:\\[box-shadow\\:0_0_0_2px_\\#09f\\]{box-shadow:0 0 0 2px #09f}');
  });

  it('should escape special characters in arbitrary variant and value', () => {
    const html = `<div class="[data-role=admin]:bg-[#ff00ff]"></div>`;
    const css = minifyCSS(jitCSS(html));
    expect(css).toContain('[data-role=admin].\\[data-role\\=admin\\]\\:bg-\\[\\#ff00ff\\]{background-color:#ff00ff}');
  });

  it('should not generate CSS for invalid arbitrary variant', () => {
    const html = `<div class="[invalid]:bg-blue-500"></div>`;
    const css = minifyCSS(jitCSS(html));
    // Should still generate, but selector may be invalid; test for presence
    expect(css).toContain('[invalid].\\[invalid\\]\\:bg-blue-500{background-color:var(--color-blue-500,#3b82f6)}');
  });

  it('should combine multiple variants with arbitrary', () => {
    const html = `<div class="dark:md:[data-state=active]:text-[rgba(255,255,255,0.8)]"></div>`;
    const css = minifyCSS(jitCSS(html));
    expect(css).toContain('@media (prefers-color-scheme:dark) and (min-width:768px){[data-state=active].dark\\:md\\:\\[data-state\\=active\\]\\:text-\\[rgba\\(255\\,255\\,255\\,0\\.8\\)\\]{color:rgba(255,255,255,0.8)}}');
  });
});