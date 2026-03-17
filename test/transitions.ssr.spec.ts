import { describe, it, expect } from 'vitest';
import { getTransitionStyleSheet } from '../src/lib/transitions';

describe('getTransitionStyleSheet SSR-safety', () => {
  it('does not throw in SSR and returns a safe stub', () => {
    const sheet = getTransitionStyleSheet();
    // basic contract: defined, has replaceSync (no-op) and cssRules collection
    expect(sheet).toBeDefined();

    // runtime may return a CSSStyleSheet or a stub object; check characteristics
    const s = sheet as any;
    expect(typeof s.replaceSync).toBe('function');

    // In a browser-like environment `cssRules` is a CSSRuleList (not an Array);
    // in SSR we return a plain array so this test should accept both.
    expect(s.cssRules).toBeDefined();
    expect(
      Array.isArray(s.cssRules) ||
        (typeof s.cssRules === 'object' &&
          typeof (s.cssRules as any).length === 'number'),
    ).toBe(true);
  });
});
