/**
 * Tests for JIT CSS competitive-gap features added to close the gap with
 * Tailwind CSS:
 *
 * 1.  size-* utility (width + height shorthand)
 * 2.  text-wrap utilities (balance, pretty, nowrap, wrap)
 * 3.  Pseudo-element variants: placeholder:, file:, marker:, selection:, open:
 * 4.  forced-colors: media variant
 * 5.  Static content-* utilities
 * 6.  data-[*]: attribute variant
 * 7.  has-[*]:, not-[*]:, in-[*]: pseudo-class / ancestor variants
 * 8.  starting: (@starting-style) variant
 * 9.  supports-[*]: (@supports) variant
 */

import { describe, it, expect } from 'vitest';
import {
  utilityMap,
  mediaVariants,
  selectorVariants,
  responsiveOrder,
  parseSpacing,
  jitCSS,
} from '../src/lib/runtime/style';

// ── 1. size-* utility ────────────────────────────────────────────────────────

describe('size-* utility (width + height shorthand)', () => {
  it('parseSpacing handles size-4 → width + height', () => {
    const result = parseSpacing('size-4');
    expect(result).toContain('width:calc(0.25rem * 4)');
    expect(result).toContain('height:calc(0.25rem * 4)');
  });

  it('parseSpacing handles size-8', () => {
    const result = parseSpacing('size-8');
    expect(result).toContain('width:calc(0.25rem * 8)');
    expect(result).toContain('height:calc(0.25rem * 8)');
  });

  it('jitCSS generates rule for size-10', () => {
    const css = jitCSS('<div class="size-10"></div>');
    expect(css).toContain('width:calc(0.25rem * 10)');
    expect(css).toContain('height:calc(0.25rem * 10)');
  });
});

// ── 2. text-wrap utilities ───────────────────────────────────────────────────

describe('text-wrap utilities', () => {
  it('text-balance is in utilityMap', () => {
    expect(utilityMap['text-balance']).toBe('text-wrap:balance;');
  });

  it('text-pretty is in utilityMap', () => {
    expect(utilityMap['text-pretty']).toBe('text-wrap:pretty;');
  });

  it('text-nowrap is in utilityMap', () => {
    expect(utilityMap['text-nowrap']).toBe('text-wrap:nowrap;');
  });

  it('text-wrap is in utilityMap', () => {
    expect(utilityMap['text-wrap']).toBe('text-wrap:wrap;');
  });

  it('jitCSS generates rule for text-balance', () => {
    const css = jitCSS('<h1 class="text-balance"></h1>');
    expect(css).toContain('text-wrap:balance');
  });
});

// ── 3. Pseudo-element / state variants ───────────────────────────────────────

describe('pseudo-element and state variants in selectorVariants', () => {
  it('placeholder: generates ::placeholder rule', () => {
    const fn = selectorVariants['placeholder'];
    expect(typeof fn).toBe('function');
    const result = fn('.foo', 'color:red;');
    expect(result).toBe('.foo::placeholder{color:red;}');
  });

  it('file: generates ::file-selector-button rule', () => {
    const fn = selectorVariants['file'];
    expect(typeof fn).toBe('function');
    const result = fn('.foo', 'color:blue;');
    expect(result).toBe('.foo::file-selector-button{color:blue;}');
  });

  it('marker: generates ::marker rule', () => {
    const fn = selectorVariants['marker'];
    expect(typeof fn).toBe('function');
    const result = fn('.foo', 'color:green;');
    expect(result).toBe('.foo::marker{color:green;}');
  });

  it('selection: generates ::selection rule', () => {
    const fn = selectorVariants['selection'];
    expect(typeof fn).toBe('function');
    const result = fn('.foo', 'color:pink;');
    expect(result).toBe('.foo::selection{color:pink;}');
  });

  it('open: generates [open] attribute selector rule', () => {
    const fn = selectorVariants['open'];
    expect(typeof fn).toBe('function');
    const result = fn('.foo', 'display:block;');
    expect(result).toContain('[open]');
    expect(result).toContain('display:block;');
  });

  it('jitCSS generates placeholder: variant rule', () => {
    const css = jitCSS('<input class="placeholder:text-neutral-400">');
    expect(css).toContain('::placeholder');
    expect(css).toContain('color:');
  });

  it('jitCSS generates file: variant rule', () => {
    const css = jitCSS('<input type="file" class="file:text-primary-500">');
    expect(css).toContain('::file-selector-button');
  });
});

// ── 4. forced-colors: media variant ─────────────────────────────────────────

describe('forced-colors media variant', () => {
  it('is in mediaVariants', () => {
    expect(mediaVariants['forced-colors']).toBe('(forced-colors: active)');
  });

  it('is in responsiveOrder', () => {
    expect(responsiveOrder).toContain('forced-colors');
  });

  it('jitCSS wraps forced-colors: rule in @media (forced-colors: active)', () => {
    const css = jitCSS('<button class="forced-colors:border-2">');
    expect(css).toContain('@media (forced-colors: active)');
    expect(css).toContain('border-width:2px');
  });
});

// ── 5. Content utilities ─────────────────────────────────────────────────────

describe('content-* static utilities', () => {
  it('content-none in utilityMap', () => {
    expect(utilityMap['content-none']).toBe('content:none;');
  });

  it('content-normal in utilityMap', () => {
    expect(utilityMap['content-normal']).toBe('content:normal;');
  });

  it("content-empty in utilityMap produces content:''", () => {
    expect(utilityMap['content-empty']).toBe("content:'';");
  });

  it('jitCSS generates rule for content-none', () => {
    const css = jitCSS('<div class="before:content-none"></div>');
    expect(css).toContain('content:none');
  });
});

// ── 6. data-[*]: attribute variant ──────────────────────────────────────────

describe('data-[*]: attribute variant', () => {
  it('data-[selected]: appends [data-selected] to selector', () => {
    const css = jitCSS('<div class="data-[selected]:bg-primary-500">');
    expect(css).toContain('[data-selected]');
    expect(css).toContain('background-color:');
  });

  it('data-[active=true]: appends [data-active="true"] to selector', () => {
    const css = jitCSS('<div class="data-[active=true]:text-success-600">');
    expect(css).toContain('[data-active="true"]');
    expect(css).toContain('color:');
  });

  it('data-[state=open]: appends [data-state="open"] to selector', () => {
    const css = jitCSS('<div class="data-[state=open]:opacity-100">');
    expect(css).toContain('[data-state="open"]');
    expect(css).toContain('opacity:1');
  });

  it('combines data-[*]: with responsive variant', () => {
    const css = jitCSS('<div class="md:data-[active]:flex">');
    expect(css).toContain('@media (min-width:768px)');
    expect(css).toContain('[data-active]');
    expect(css).toContain('display:flex');
  });
});

// ── 7. has-[*]:, not-[*]:, in-[*]: variants ─────────────────────────────────

describe('has-[*]: pseudo-class variant', () => {
  it('has-[input:checked]: appends :has(input:checked)', () => {
    const css = jitCSS('<label class="has-[input:checked]:bg-primary-100">');
    expect(css).toContain(':has(input:checked)');
    expect(css).toContain('background-color:');
  });

  it('has-[.active]: appends :has(.active)', () => {
    const css = jitCSS('<div class="has-[.active]:opacity-100">');
    expect(css).toContain(':has(.active)');
    expect(css).toContain('opacity:1');
  });
});

describe('not-[*]: pseudo-class variant', () => {
  it('not-[.disabled]: appends :not(.disabled)', () => {
    const css = jitCSS('<button class="not-[.disabled]:cursor-pointer">');
    expect(css).toContain(':not(.disabled)');
    expect(css).toContain('cursor:pointer');
  });

  it('not-[:checked]: appends :not(:checked)', () => {
    const css = jitCSS('<input class="not-[:checked]:opacity-50">');
    expect(css).toContain(':not(:checked)');
    expect(css).toContain('opacity:0.5');
  });
});

describe('in-[*]: ancestor variant', () => {
  it('in-[.parent]: wraps selector with :is(.parent) ancestor', () => {
    const css = jitCSS('<div class="in-[.dark-mode]:text-white">');
    expect(css).toContain(':is(.dark-mode)');
    expect(css).toContain('color:');
  });

  it('in-[nav]: scopes rule under :is(nav) ancestor', () => {
    const css = jitCSS('<a class="in-[nav]:underline">');
    expect(css).toContain(':is(nav)');
    expect(css).toContain('text-decoration-line:underline');
  });
});

// ── 8. starting: (@starting-style) variant ──────────────────────────────────

describe('starting: (@starting-style) variant', () => {
  it('wraps rule in @starting-style{}', () => {
    const css = jitCSS('<div class="starting:opacity-0">');
    expect(css).toContain('@starting-style');
    expect(css).toContain('opacity:0');
  });

  it('starting: combines with responsive variant', () => {
    const css = jitCSS('<div class="md:starting:translate-y-2">');
    expect(css).toContain('@starting-style');
    expect(css).toContain('@media (min-width:768px)');
  });

  it('starting: combines with hover:', () => {
    const css = jitCSS('<div class="starting:hover:opacity-0">');
    expect(css).toContain('@starting-style');
    expect(css).toContain(':hover');
    expect(css).toContain('opacity:0');
  });
});

// ── 9. supports-[*]: (@supports) variant ────────────────────────────────────

describe('supports-[*]: (@supports) variant', () => {
  it('supports-[display:flex]: wraps in @supports (display:flex)', () => {
    const css = jitCSS('<div class="supports-[display:flex]:flex">');
    expect(css).toContain('@supports (display:flex)');
    expect(css).toContain('display:flex');
  });

  it('supports-[display:grid]: wraps in @supports (display:grid)', () => {
    const css = jitCSS('<div class="supports-[display:grid]:grid">');
    expect(css).toContain('@supports (display:grid)');
    expect(css).toContain('display:grid');
  });

  it('supports-[not(display:grid)]: uses not() form', () => {
    const css = jitCSS('<div class="supports-[not(display:grid)]:block">');
    expect(css).toContain('@supports not(display:grid)');
    expect(css).toContain('display:block');
  });

  it('supports-[*]: combines with responsive variant', () => {
    const css = jitCSS('<div class="md:supports-[display:flex]:flex">');
    expect(css).toContain('@media (min-width:768px)');
    expect(css).toContain('@supports (display:flex)');
    expect(css).toContain('display:flex');
  });
});
