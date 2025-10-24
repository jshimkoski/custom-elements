import { describe, it, expect } from 'vitest';
import { SecureExpressionEvaluator } from '../src/lib/runtime/secure-expression-evaluator';

describe('SecureExpressionEvaluator - branches', () => {
  it('blocks dangerous patterns and caches blocked result', () => {
    SecureExpressionEvaluator.clearCache();
    const res = SecureExpressionEvaluator.evaluate('constructor', {} as any);
    expect(res).toBeUndefined();
    // blocked expression should be cached (getCacheSize > 0)
    expect(SecureExpressionEvaluator.getCacheSize()).toBeGreaterThanOrEqual(1);
  });

  it('evaluates ctx property paths and object literals', () => {
    SecureExpressionEvaluator.clearCache();
    const ctx = { user: { name: 'bob', age: 30 }, flag: true } as any;
    const val1 = SecureExpressionEvaluator.evaluate('ctx.user.name', ctx);
    expect(val1).toBe('bob');

    const obj = SecureExpressionEvaluator.evaluate(
      '{ name: ctx.user.name, ok: true, count: 5 }',
      ctx,
    ) as Record<string, unknown>;
    expect(obj.name).toBe('bob');
    expect(obj.ok).toBe(true);
    expect(obj.count).toBe(5);
  });

  it('evaluates simple expressions with operators, ternary and arrays', () => {
    SecureExpressionEvaluator.clearCache();
    const ctx = { a: 2, b: 3 } as any;
    // arithmetic and addition
    const sum = SecureExpressionEvaluator.evaluate('a + b', ctx);
    expect(sum).toBe(5);

    // ternary
    const t = SecureExpressionEvaluator.evaluate('a > b ? a : b', ctx);
    expect(t).toBe(3);

    // array
    const arr = SecureExpressionEvaluator.evaluate('[1, 2, 3]', {});
    expect(Array.isArray(arr)).toBe(true);
  });

  it('returns undefined for unknown identifiers in simple evaluator', () => {
    SecureExpressionEvaluator.clearCache();
    const res = SecureExpressionEvaluator.evaluate('unknownVar + 1', {} as any);
    expect(res).toBeUndefined();
  });
});
