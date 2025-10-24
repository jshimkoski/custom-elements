import { describe, it, expect } from 'vitest';
import { SecureExpressionEvaluator } from '../src/lib/runtime/secure-expression-evaluator';

describe('SecureExpressionEvaluator - additional expressions', () => {
  afterEach(() => {
    SecureExpressionEvaluator.clearCache();
  });

  it('evaluates simple arithmetic and precedence', () => {
    expect(SecureExpressionEvaluator.evaluate('1+2*3', {})).toBe(7);
    expect(SecureExpressionEvaluator.evaluate(' (1+2) * 3 ', {})).toBe(9);
  });

  it('evaluates unary minus and numbers', () => {
    expect(SecureExpressionEvaluator.evaluate('-5', {})).toBe(-5);
    expect(SecureExpressionEvaluator.evaluate('10 - 3', {})).toBe(7);
  });

  it('concatenates strings with + and handles quoted literals', () => {
    expect(SecureExpressionEvaluator.evaluate('"a" + "b"', {})).toBe('ab');
    expect(SecureExpressionEvaluator.evaluate("'x' + 'y'", {})).toBe('xy');
  });

  it('evaluates arrays and nested expressions', () => {
    const out = SecureExpressionEvaluator.evaluate('[1, 2+1, 4]', {});
    expect(out).toEqual([1, 3, 4]);
  });

  it('evaluates ternary expressions using ctx', () => {
    // The evaluator expects the context to contain the referenced properties
    expect(
      SecureExpressionEvaluator.evaluate('ctx.a ? ctx.b : ctx.c', {
        a: true,
        b: 'yes',
        c: 'no',
      }),
    ).toBe('yes');
    expect(
      SecureExpressionEvaluator.evaluate('ctx.a ? ctx.b : ctx.c', {
        a: false,
        b: 'yes',
        c: 'no',
      }),
    ).toBe('no');
  });

  it('returns undefined when encountering unknown identifiers', () => {
    expect(SecureExpressionEvaluator.evaluate('foo + 1', {})).toBeUndefined();
  });
});
