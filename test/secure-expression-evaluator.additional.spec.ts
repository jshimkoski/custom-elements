import { describe, it, expect } from 'vitest';
import { SecureExpressionEvaluator as _SEE } from '../src/lib/runtime/secure-expression-evaluator';
// We import via direct path in tests by referencing the static class name used in file

describe('SecureExpressionEvaluator - additional edge cases', () => {
  it('handles simple ctx property lookup', () => {
    const res =
      (global as any).SecureExpressionEvaluator?.evaluate?.('ctx.foo', {
        foo: 42,
      }) ?? undefined;
    // If the module doesn't expose global, fall back to importing via require (ts-node test env)
    if (typeof res === 'undefined' && typeof _SEE !== 'undefined') {
      const r = (_SEE as any).evaluate('ctx.foo', { foo: 42 });
      expect(r).toBe(42);
    } else {
      expect(res).toBe(42);
    }
  });

  it('returns undefined for unknown identifiers', () => {
    const r = (_SEE as any).evaluate('unknownVar + 1', {});
    expect(r).toBeUndefined();
  });

  it('blocks dangerous patterns like constructor', () => {
    // Should not throw, but return undefined
    const r = (_SEE as any).evaluate('this.constructor', {});
    expect(r).toBeUndefined();
  });

  it('evaluates simple ternary and logical expressions', () => {
    const r = (_SEE as any).evaluate('ctx.a ? ctx.b : ctx.c', {
      a: true,
      b: 1,
      c: 2,
    });
    expect(r).toBe(1);
    const r2 = (_SEE as any).evaluate('ctx.x && ctx.y', { x: false, y: 123 });
    expect(r2).toBe(false);
  });
});
