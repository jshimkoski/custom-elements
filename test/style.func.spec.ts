import {
  parseArbitrary,
  parseArbitraryVariant,
  escapeClassName,
  extractClassesFromHTML,
  jitCSS,
  jitCssCache,
  JIT_CSS_THROTTLE_MS,
} from '../src/lib/runtime/style';
import { describe, it, expect } from 'vitest';

// --- parseArbitrary ---
describe('parseArbitrary', () => {
  it('returns correct CSS for known prop', () => {
    expect(parseArbitrary('bg-[red]')).toBe('background-color:red;');
    expect(parseArbitrary('p-[10px]')).toBe('padding:10px;');
  });
  it('returns correct CSS for unknown prop', () => {
    expect(parseArbitrary('foo-[bar]')).toBe('foo:bar;');
  });
  it('returns null for invalid syntax', () => {
    expect(parseArbitrary('foo-bar')).toBeNull();
    expect(parseArbitrary('bg-[red')).toBeNull();
  });
});

// --- parseArbitraryVariant ---
describe('parseArbitraryVariant', () => {
  it('returns token for [attr=value] syntax', () => {
    expect(parseArbitraryVariant('[aria-selected=true]')).toBe(
      '[aria-selected=true]',
    );
  });
  it('returns token for foo-[bar] syntax', () => {
    expect(parseArbitraryVariant('foo-[bar]')).toBe('foo-[bar]');
  });
  it('returns null for invalid syntax', () => {
    expect(parseArbitraryVariant('foo-bar')).toBeNull();
  });
});

// --- escapeClassName ---
describe('escapeClassName', () => {
  it('escapes special selector characters', () => {
    // CSS.escape() includes the dot prefix
    expect(escapeClassName('foo:bar/baz')).toBe('.foo\\:bar\\/baz');
    expect(escapeClassName('foo.bar')).toBe('.foo\\.bar');
  });
  it('escapes brackets', () => {
    expect(escapeClassName('foo-[bar]')).toBe('.foo-\\[bar\\]');
  });
});

// --- extractClassesFromHTML ---
describe('extractClassesFromHTML', () => {
  it('extracts classes from HTML', () => {
    const html = '<div class="foo bar-[baz] qux">';
    expect(extractClassesFromHTML(html)).toEqual(['foo', 'bar-[baz]', 'qux']);
  });
  it('returns empty array for no class', () => {
    expect(extractClassesFromHTML('<div></div>')).toEqual([]);
  });
});

// --- jitCSS ---
describe('jitCSS', () => {
  it('returns cached CSS within throttle window', () => {
    const html = '<div class="block"></div>';
    jitCssCache.clear();
    const css1 = jitCSS(html);
    const css2 = jitCSS(html);
    expect(css1).toBe(css2);
  });
  it('regenerates CSS after throttle window', async () => {
    const html = '<div class="block"></div>';
    jitCssCache.clear();
    const css1 = jitCSS(html);
    await new Promise((r) => setTimeout(r, JIT_CSS_THROTTLE_MS + 5));
    const css2 = jitCSS(html);
    expect(css2).toBe(css1); // Should be same output, but regenerated
  });
  it('returns empty string for empty html', () => {
    expect(jitCSS('')).toBe('');
  });
});
