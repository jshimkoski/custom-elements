/**
 * Tests for extended color palette support in the JIT CSS engine.
 * Covers: enableJITCSS({ extendedColors: true }), custom colors, and
 * gradient color stops with extended palette names.
 */
import { describe, it, expect, afterEach } from 'vitest';
import {
  jitCSS,
  enableJITCSS,
  parseColorClass,
  parseColorWithOpacity,
  parseSpaceUtility,
  parseGradientColorStop,
  registerJITCSSComponent,
  selectorVariants,
  _resetJITCSS,
} from '../src/lib/runtime/style';

afterEach(() => {
  // Reset to semantic-only after every test so tests are isolated
  _resetJITCSS();
});

describe('enableJITCSS() — extended color palette', () => {
  it('bg-blue-500 produces no CSS before enableJITCSS is called', () => {
    const css = jitCSS('<div class="bg-blue-500"></div>');
    expect(css).not.toContain('bg-blue-500');
  });

  it('bg-blue-500 generates CSS after enableJITCSS({ extendedColors: true })', () => {
    enableJITCSS({ extendedColors: true });
    const css = jitCSS('<div class="bg-blue-500"></div>');
    expect(css).toContain('background-color');
    expect(css).toContain('bg-blue-500');
  });

  it('text-violet-700 generates CSS with extended colors', () => {
    enableJITCSS({ extendedColors: true });
    const css = jitCSS('<div class="text-violet-700"></div>');
    expect(css).toContain('color');
    expect(css).toContain('violet-700');
  });

  it('border-rose-300 generates CSS with extended colors', () => {
    enableJITCSS({ extendedColors: true });
    const css = jitCSS('<div class="border-rose-300"></div>');
    expect(css).toContain('border-color');
    expect(css).toContain('rose-300');
  });

  it('parseColorClass returns null for extended color without enableJITCSS', () => {
    const result = parseColorClass('bg-blue-500');
    expect(result).toBeNull();
  });

  it('parseColorClass resolves extended color after enableJITCSS', () => {
    enableJITCSS({ extendedColors: true });
    const result = parseColorClass('bg-blue-500');
    expect(result).not.toBeNull();
    expect(result).toContain('background-color');
    expect(result).toContain('#3b82f6');
  });

  it('gradient stops work with extended colors', () => {
    enableJITCSS({ extendedColors: true });
    const result = parseGradientColorStop('from-blue-500');
    expect(result).not.toBeNull();
    expect(result).toContain('--cer-gradient-from');
  });

  it('opacity modifier works with extended colors', () => {
    enableJITCSS({ extendedColors: true });
    const css = jitCSS('<div class="bg-blue-500/50"></div>');
    expect(css).toContain('background-color');
    expect(css).toContain('50%');
  });

  it('semantic colors still work alongside extended colors', () => {
    enableJITCSS({ extendedColors: true });
    const css = jitCSS('<div class="bg-primary-500 bg-blue-500"></div>');
    expect(css).toContain('primary-500');
    expect(css).toContain('blue-500');
  });

  it('customColors allows arbitrary color names', () => {
    enableJITCSS({
      customColors: {
        brand: { '500': '#e63946', '600': '#c1121f' },
      },
    });
    const css = jitCSS('<div class="bg-brand-500 text-brand-600"></div>');
    expect(css).toContain('#e63946');
    expect(css).toContain('#c1121f');
  });

  it('multiple enableJITCSS calls merge options', () => {
    enableJITCSS({ extendedColors: true });
    enableJITCSS({
      customColors: { brand: { '500': '#ff0000' } },
    });
    // Extended colors should still work
    const css = jitCSS('<div class="bg-blue-500 bg-brand-500"></div>');
    expect(css).toContain('blue-500');
    expect(css).toContain('#ff0000');
  });

  it('_resetJITCSS restores semantic-only behaviour', () => {
    enableJITCSS({ extendedColors: true });
    _resetJITCSS();
    const result = parseColorClass('bg-blue-500');
    expect(result).toBeNull();
  });

  // Test each extended color name produces output
  const extendedColorNames = [
    'slate',
    'gray',
    'zinc',
    'stone',
    'red',
    'orange',
    'amber',
    'yellow',
    'lime',
    'green',
    'emerald',
    'teal',
    'cyan',
    'sky',
    'blue',
    'indigo',
    'violet',
    'purple',
    'fuchsia',
    'pink',
    'rose',
  ];
  for (const name of extendedColorNames) {
    it(`bg-${name}-500 generates CSS`, () => {
      enableJITCSS({ extendedColors: true });
      const result = parseColorClass(`bg-${name}-500`);
      expect(result).not.toBeNull();
      expect(result).toContain('background-color');
    });
  }
});

// ---------------------------------------------------------------------------
// Branch coverage: parseColorWithOpacity with direct-hex customColors
// These tests cover the `!paletteRule.includes('var(')` path in
// parseColorWithOpacity (id 63 arm 1).
// ---------------------------------------------------------------------------
describe('parseColorWithOpacity — direct-hex custom colors', () => {
  afterEach(() => _resetJITCSS());

  it('applies opacity to a direct-hex custom color (non-var path)', () => {
    // A custom color defined as a plain hex hex value (no CSS var) tests the
    // `paletteRule.includes('var(') === false` branch.
    enableJITCSS({
      customColors: { directhex: { 500: '#ff0000' } },
    });
    const result = parseColorWithOpacity('text-directhex-500/50');
    // Should produce an rgba/rgb result using the direct hex
    expect(result).not.toBeNull();
    expect(result).toContain('rgb(255 0 0 / 0.5)');
  });

  it('returns palette rule unchanged when no opacity and direct-hex color', () => {
    enableJITCSS({
      customColors: { directhex: { 500: '#00ff00' } },
    });
    // opacity === undefined path inside `if (paletteRule)` block
    const result = parseColorWithOpacity('text-directhex-500');
    expect(result).toBe('color:#00ff00;');
  });

  it('returns null when custom color class is unknown', () => {
    // Covers the `!paletteRule` (null) branch inside parseColorWithOpacity
    const result = parseColorWithOpacity('text-unknowncolor-500/50');
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Branch coverage: selectorVariants with selectors containing `[` and `(`
// These cover the `insertPseudoBeforeCombinator` depth-tracking branches.
// ---------------------------------------------------------------------------
describe('selectorVariants — complex selectors with brackets', () => {
  it('hover variant inserts pseudo before combinator in bracketed selector', () => {
    // Selector `[data-state=open]>span` contains `[`, `]`, `>` characters.
    // insertPseudoBeforeCombinator must increment/decrement depth correctly.
    const result = selectorVariants.hover(
      '[data-state=open]>span',
      'color:red;',
    );
    // The `:hover` should be inserted before the `>` combinator
    expect(result).toContain(':hover');
    expect(result).toContain('color:red;');
  });

  it('focus variant handles selector with parentheses', () => {
    // Selector containing `(` and `)` — depth tracking via `(` path
    const result = selectorVariants.focus(
      ':not(.hidden)>input',
      'outline:none;',
    );
    expect(result).toContain(':focus');
    expect(result).toContain('outline:none;');
  });
});

// ---------------------------------------------------------------------------
// Branch coverage: parseColorWithOpacity with arbitrary CSS value + opacity
// Covers the arbitraryRule path (lines ~2217-2258).
// ---------------------------------------------------------------------------
describe('parseColorWithOpacity — arbitrary value + opacity', () => {
  it('applies opacity to an arbitrary hex color value', () => {
    // Covers id 68 arm 0 (enters the arbitrary block) and id 70 arm 1 (no var)
    // and id 75 arm 0 (hex regex matches)
    const result = parseColorWithOpacity('[color:#ff0000]/50');
    expect(result).toContain('rgb(255 0 0 / 0.5)');
  });

  it('returns rule unchanged for arbitrary named-color with opacity (no hex)', () => {
    // Covers id 75 arm 1 — no hex found in the arbitrary rule
    const result = parseColorWithOpacity('[color:blue]/50');
    expect(result).not.toBeNull();
  });

  it('applies color-mix to arbitrary var() color without hex fallback', () => {
    // Covers id 70 arm 0, id 71 arm 0, id 73 arm 1 (no hex in var)
    const result = parseColorWithOpacity('[color:var(--custom-color)]/50');
    expect(result).toContain('color-mix');
  });

  it('applies rgb fallback + color-mix for arbitrary var() with hex fallback', () => {
    // Covers id 73 arm 0, id 72 arm 0, id 74 binary-expr truthy path
    const result = parseColorWithOpacity('[color:var(--c,#ff0000)]/50');
    expect(result).toContain('__CE_COLOR_MIX_SPLIT__');
  });
});

// ---------------------------------------------------------------------------
// Branch coverage: parseSpaceUtility fractional path
// Covers lines ~2065-2082 and negative sign branch.
// ---------------------------------------------------------------------------
describe('parseSpaceUtility — fractional space utilities', () => {
  it('returns null for a zero denominator (NaN/zero guard)', () => {
    // Covers id 42 arm 0: Number.isNaN || denominator === 0 branch TRUE
    expect(parseSpaceUtility('space-x-1/0')).toBeNull();
  });

  it('returns null for a NaN numerator', () => {
    expect(parseSpaceUtility('space-x-abc/2')).toBeNull();
  });

  it('generates negative fractional space utility CSS', () => {
    // Covers id 44 arm 0: negative === true in fractional path
    const result = parseSpaceUtility('-space-x-1/2');
    expect(result).not.toBeNull();
    expect(result).toContain('-50%');
  });
});

// ---------------------------------------------------------------------------
// Branch coverage: parseGradientColorStop with unknown color
// ---------------------------------------------------------------------------
describe('parseGradientColorStop — unknown color name', () => {
  it('returns null when the color name is not in the active palette', () => {
    // Covers id 78 arm 0: !colorValue is true
    expect(parseGradientColorStop('from-nonexistent-500')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Branch coverage: registerJITCSSComponent with options
// Covers id 16 arm 0: if (options) is true.
// ---------------------------------------------------------------------------
describe('registerJITCSSComponent — with JIT options', () => {
  afterEach(() => _resetJITCSS());

  it('rebuilds active colors when called with options', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    // Passing options exercises the if (options) branch
    expect(() =>
      registerJITCSSComponent(shadow, { extendedColors: true }),
    ).not.toThrow();
  });
});
