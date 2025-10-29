import { describe, it, expect } from 'vitest';
import { getTransitionStyleSheet } from '../src/lib/transitions';

describe('getTransitionStyleSheet SSR-safety', () => {
  it('does not throw in SSR and returns a safe stub', () => {
    const sheet = getTransitionStyleSheet();
    // basic contract: defined, has replaceSync (no-op) and cssRules array
    expect(sheet).toBeDefined();
    // runtime may return a CSSStyleSheet or a stub object; check characteristics
    const s = sheet as any;
    expect(typeof s.replaceSync).toBe('function');
    expect(Array.isArray(s.cssRules)).toBe(true);
  });
});
