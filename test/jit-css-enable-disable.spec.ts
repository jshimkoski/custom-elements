/**
 * Tests for the _jitCSSEnabled flag: enableJITCSS(), disableJITCSS(),
 * isJITCSSEnabled(), and _resetJITCSS() housekeeping.
 */
import { describe, it, expect, afterEach } from 'vitest';
import {
  enableJITCSS,
  disableJITCSS,
  isJITCSSEnabled,
  jitCSS,
  _resetJITCSS,
} from '../src/lib/runtime/style';

afterEach(() => {
  _resetJITCSS();
});

describe('isJITCSSEnabled()', () => {
  it('defaults to false (opt-in by default)', () => {
    expect(isJITCSSEnabled()).toBe(false);
  });

  it('returns true after enableJITCSS()', () => {
    enableJITCSS();
    expect(isJITCSSEnabled()).toBe(true);
  });

  it('returns false after disableJITCSS()', () => {
    disableJITCSS();
    expect(isJITCSSEnabled()).toBe(false);
  });

  it('returns true again after re-enabling', () => {
    disableJITCSS();
    enableJITCSS();
    expect(isJITCSSEnabled()).toBe(true);
  });

  it('_resetJITCSS restores to false', () => {
    enableJITCSS();
    _resetJITCSS();
    expect(isJITCSSEnabled()).toBe(false);
  });
});

describe('disableVariants', () => {
  it('suppresses dark: rules when dark variant is disabled', () => {
    enableJITCSS({ disableVariants: ['dark'] });
    const css = jitCSS('<div class="dark:text-white text-black"></div>');
    expect(css).not.toContain('prefers-color-scheme');
    expect(css).toContain('color');
  });

  it('suppresses responsive rules when responsive variant is disabled', () => {
    enableJITCSS({ disableVariants: ['responsive'] });
    const css = jitCSS('<div class="md:text-xl text-base"></div>');
    expect(css).not.toContain('min-width:768px');
    expect(css).toContain('font-size');
  });

  it('suppresses print rules when print variant is disabled', () => {
    enableJITCSS({ disableVariants: ['print'] });
    const css = jitCSS('<div class="print:hidden block"></div>');
    expect(css).not.toContain('@media print');
    expect(css).toContain('display:block');
  });

  it('suppresses motion rules when motion variant is disabled', () => {
    enableJITCSS({ disableVariants: ['motion'] });
    const css = jitCSS(
      '<div class="motion-reduce:transition-none transition"></div>',
    );
    expect(css).not.toContain('prefers-reduced-motion');
    expect(css).toContain('transition');
  });

  it('suppresses container query rules when container variant is disabled', () => {
    enableJITCSS({ disableVariants: ['container'] });
    const css = jitCSS('<div class="@md:flex block"></div>');
    expect(css).not.toContain('@container');
    expect(css).toContain('display:block');
  });

  it('non-disabled variants still generate rules', () => {
    enableJITCSS({ disableVariants: ['dark'] });
    const css = jitCSS('<div class="md:text-xl hover:text-white"></div>');
    expect(css).toContain('min-width');
    expect(css).toContain(':hover');
  });
});
