/**
 * Tests for useJITCSS() and useDesignTokens() hooks.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { useJITCSS, useDesignTokens, type DesignTokens } from '../src/lib';
import {
  setCurrentComponentContext,
  clearCurrentComponentContext,
  beginDiscoveryRender,
  endDiscoveryRender,
} from '../src/lib/runtime/hooks';
import {
  _resetJITCSS,
  isJITCSSEnabled,
  getJITCSSOptions,
  parseColorClass,
} from '../src/lib/runtime/style';

// Helper to call hooks in a component context
function withContext(fn: () => void): Record<string, unknown> {
  const ctx: Record<string, unknown> = {
    _hookCallbacks: {},
  };
  setCurrentComponentContext(ctx);
  try {
    fn();
  } finally {
    clearCurrentComponentContext();
  }
  return ctx;
}

afterEach(() => {
  _resetJITCSS();
});

describe('useJITCSS()', () => {
  it('is exported from the main index', () => {
    expect(typeof useJITCSS).toBe('function');
  });

  it('accepts JITCSSOptions and applies them to the engine', () => {
    expect(getJITCSSOptions().extendedColors).toBeFalsy();
    useJITCSS({ extendedColors: true });
    expect(getJITCSSOptions().extendedColors).toBe(true);
  });

  it('extended colors activate after useJITCSS({ extendedColors: true })', () => {
    useJITCSS({ extendedColors: true });
    const result = parseColorClass('bg-blue-500');
    expect(result).not.toBeNull();
    expect(result).toContain('background-color');
  });

  it('customColors activate after useJITCSS', () => {
    useJITCSS({ customColors: { brand: { '500': '#abcdef' } } });
    const result = parseColorClass('bg-brand-500');
    expect(result).not.toBeNull();
    expect(result).toContain('#abcdef');
  });

  it('can be called without arguments (no-op on options)', () => {
    expect(() => useJITCSS()).not.toThrow();
    expect(() => useJITCSS({})).not.toThrow();
  });

  it('does NOT globally enable JIT CSS when called during a discovery render', () => {
    // This is the regression test for the discovery-render bug:
    // previously, useJITCSS() inside a component render function would run
    // during the component registration discovery render (which has no real
    // shadow root), fall through to enableJITCSS() and set _jitCSSEnabled=true
    // for every component — defeating the entire opt-in architecture.
    const ctx = { _hookCallbacks: {} };
    setCurrentComponentContext(ctx);
    beginDiscoveryRender();
    try {
      useJITCSS({ extendedColors: true });
    } finally {
      endDiscoveryRender();
      clearCurrentComponentContext();
    }
    expect(isJITCSSEnabled()).toBe(false);
    // Options must not have been merged either
    expect(getJITCSSOptions().extendedColors).toBeFalsy();
  });
});

describe('useDesignTokens()', () => {
  it('is exported from the main index', () => {
    expect(typeof useDesignTokens).toBe('function');
  });

  it('sets semantic color token as CSS custom property on :host', () => {
    const ctx = withContext(() => {
      useDesignTokens({ primary: '#6366f1' });
    });
    const style = (ctx as { _computedStyle?: string })._computedStyle ?? '';
    expect(style).toContain('--cer-color-primary-500:#6366f1');
  });

  it('sets font token', () => {
    const ctx = withContext(() => {
      useDesignTokens({ fontSans: '"Inter", sans-serif' });
    });
    const style = (ctx as { _computedStyle?: string })._computedStyle ?? '';
    expect(style).toContain('--cer-font-sans:"Inter", sans-serif');
  });

  it('passes through arbitrary --var tokens', () => {
    const ctx = withContext(() => {
      useDesignTokens({ '--cer-color-neutral-900': '#0a0a0a' });
    });
    const style = (ctx as { _computedStyle?: string })._computedStyle ?? '';
    expect(style).toContain('--cer-color-neutral-900:#0a0a0a');
  });

  it('wraps declarations in :host { }', () => {
    const ctx = withContext(() => {
      useDesignTokens({ primary: '#ff0000' });
    });
    const style = (ctx as { _computedStyle?: string })._computedStyle ?? '';
    expect(style).toMatch(/:host\{[^}]*--cer-color-primary-500/);
  });

  it('appends to existing _computedStyle', () => {
    const ctx: Record<string, unknown> = { _hookCallbacks: {} };
    // Simulate an existing style set by useStyle
    Object.defineProperty(ctx, '_computedStyle', {
      value: ':host { color: red; }',
      writable: true,
      enumerable: false,
      configurable: true,
    });
    setCurrentComponentContext(ctx);
    try {
      useDesignTokens({ primary: '#6366f1' });
    } finally {
      clearCurrentComponentContext();
    }
    const style = (ctx as { _computedStyle?: string })._computedStyle ?? '';
    expect(style).toContain('color: red');
    expect(style).toContain('--cer-color-primary-500');
  });

  it('ignores undefined token values', () => {
    const ctx = withContext(() => {
      const tokens: DesignTokens = { primary: undefined, fontSans: '"Inter"' };
      useDesignTokens(tokens);
    });
    const style = (ctx as { _computedStyle?: string })._computedStyle ?? '';
    expect(style).not.toContain('undefined');
    expect(style).toContain('--cer-font-sans');
  });

  it('ignores keys that are not CSS vars and not known tokens', () => {
    const ctx = withContext(() => {
      useDesignTokens({ unknownKey: 'value' } as DesignTokens);
    });
    const style = (ctx as { _computedStyle?: string })._computedStyle;
    // No style should be produced for unknown keys
    expect(style ?? '').not.toContain('unknownKey');
  });

  it('multiple tokens are combined in a single :host block', () => {
    const ctx = withContext(() => {
      useDesignTokens({
        primary: '#6366f1',
        secondary: '#f59e0b',
        fontSans: '"Inter"',
      });
    });
    const style = (ctx as { _computedStyle?: string })._computedStyle ?? '';
    // All three declarations should be inside the same :host{...}
    const hostMatch = style.match(/:host\{([^}]+)\}/);
    expect(hostMatch).not.toBeNull();
    const inner = hostMatch![1];
    expect(inner).toContain('--cer-color-primary-500');
    expect(inner).toContain('--cer-color-secondary-500');
    expect(inner).toContain('--cer-font-sans');
  });
});
