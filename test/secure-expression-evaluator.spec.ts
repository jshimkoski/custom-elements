import { describe, it, expect } from 'vitest';
import { SecureExpressionEvaluator } from '../src/lib/runtime/secure-expression-evaluator';

describe('SecureExpressionEvaluator', () => {
  it('evaluates simple numeric expressions', () => {
    const res = SecureExpressionEvaluator.evaluate('1 + 2 * 3', {});
    expect(res).toBe(7);
  });

  it('evaluates boolean and comparison expressions', () => {
    const res = SecureExpressionEvaluator.evaluate('ctx.value > 5 && ctx.enabled', { value: 10, enabled: true });
    expect(res).toBe(true);
  });

  it('evaluates ternary expressions', () => {
    const res = SecureExpressionEvaluator.evaluate('ctx.count > 0 ? "yes" : "no"', { count: 1 });
    expect(res).toBe('yes');
  });

  it('evaluates arrays and nested expressions', () => {
    const res = SecureExpressionEvaluator.evaluate('[ctx.a, ctx.b + 1, true]', { a: 1, b: 2 });
    expect(Array.isArray(res)).toBe(true);
    expect(res).toEqual([1, 3, true]);
  });

  it('evaluates object literals with ctx references', () => {
    const res = SecureExpressionEvaluator.evaluate('{a: ctx.a, b: ctx.b}', { a: 5, b: 6 });
    expect(res).toEqual({ a: 5, b: 6 });
  });

  it('returns undefined for dangerous expressions', () => {
    const res = SecureExpressionEvaluator.evaluate('this.constructor.constructor("return process")()', {} as any);
    expect(res).toBeUndefined();
  });
});
