import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getTransitionStyleSheet } from '../src/lib/transitions';

describe('getTransitionStyleSheet browser-path', () => {
  let orig: any;

  beforeEach(() => {
    // save original and install a lightweight mock that mimics constructable stylesheets
    orig = (global as any).CSSStyleSheet;

    // Minimal mock of the browser CSSStyleSheet for test purposes
    // It exposes cssRules and replaceSync which our runtime uses.
    function MockCSSStyleSheet(this: any) {
      this.cssRules = [];
    }
    MockCSSStyleSheet.prototype.replaceSync = function (s: string) {
      // store text for inspection if needed
      this.cssText = String(s);
    };
    (global as any).CSSStyleSheet = MockCSSStyleSheet;
  });

  afterEach(() => {
    (global as any).CSSStyleSheet = orig;
  });

  it('returns a CSSStyleSheet-like instance when CSSStyleSheet is present', () => {
    const sheet = getTransitionStyleSheet();
    expect(sheet).toBeDefined();
    const s = sheet as any;
    expect(typeof s.replaceSync).toBe('function');
    expect(Array.isArray(s.cssRules)).toBe(true);
  });
});
