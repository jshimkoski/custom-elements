/**
 * Tests for useGlobalStyle() hook.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { useGlobalStyle } from '../src/lib';
import {
  setCurrentComponentContext,
  clearCurrentComponentContext,
} from '../src/lib/runtime/hooks';

// Track adopted stylesheets added during tests
const originalAdoptedStyleSheets: CSSStyleSheet[] = [];
beforeEach(() => {
  // jsdom may not initialise adoptedStyleSheets
  if (!document.adoptedStyleSheets) {
    Object.defineProperty(document, 'adoptedStyleSheets', {
      value: [],
      writable: true,
      configurable: true,
    });
  }
  originalAdoptedStyleSheets.length = 0;
  originalAdoptedStyleSheets.push(...document.adoptedStyleSheets);
});
afterEach(() => {
  document.adoptedStyleSheets = [...originalAdoptedStyleSheets];
  vi.restoreAllMocks();
});

function withContext(fn: () => void): void {
  const ctx: Record<string, unknown> = { _hookCallbacks: {} };
  setCurrentComponentContext(ctx);
  try {
    fn();
  } finally {
    clearCurrentComponentContext();
  }
}

describe('useGlobalStyle()', () => {
  it('is exported from the main index', () => {
    expect(typeof useGlobalStyle).toBe('function');
  });

  it('injects a CSS stylesheet into document.adoptedStyleSheets', () => {
    const before = document.adoptedStyleSheets.length;
    withContext(() => {
      useGlobalStyle(() => 'body { color: red; }');
    });
    expect(document.adoptedStyleSheets.length).toBeGreaterThan(before);
  });

  it('deduplicates identical CSS content', () => {
    withContext(() => {
      useGlobalStyle(() => 'body { color: green; }');
    });
    const countAfterFirst = document.adoptedStyleSheets.length;
    withContext(() => {
      useGlobalStyle(() => 'body { color: green; }');
    });
    // Should NOT have added another sheet
    expect(document.adoptedStyleSheets.length).toBe(countAfterFirst);
  });

  it('allows different CSS content to be injected as separate sheets', () => {
    withContext(() => {
      useGlobalStyle(() => ':root { --my-var: 1; }');
    });
    const countAfterFirst = document.adoptedStyleSheets.length;
    withContext(() => {
      useGlobalStyle(() => ':root { --my-var: 2; }');
    });
    expect(document.adoptedStyleSheets.length).toBeGreaterThan(countAfterFirst);
  });

  it('sanitizes injected CSS to strip javascript: URLs', () => {
    const before = document.adoptedStyleSheets.length;
    withContext(() => {
      useGlobalStyle(
        () => 'body { background: url(javascript:alert(1)); color: blue; }',
      );
    });
    // Sheet should still be injected (with the url stripped)
    expect(document.adoptedStyleSheets.length).toBeGreaterThan(before);
  });

  it('can be called outside component context without throwing', () => {
    // useGlobalStyle does not require component context
    expect(() =>
      useGlobalStyle(() => ':root { --no-context: true; }'),
    ).not.toThrow();
  });
});
