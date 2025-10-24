import { describe, it, expect } from 'vitest';
import { SecureExpressionEvaluator } from '../src/lib/runtime/secure-expression-evaluator';

describe('SecureExpressionEvaluator - extra cases', () => {
  beforeEach(() => {
    SecureExpressionEvaluator.clearCache();
  });

  it('handles logical && and || and comparisons', () => {
    const ctx = { a: true, b: false, n: 5, m: 2 } as any;
    expect(SecureExpressionEvaluator.evaluate('a && b', ctx)).toBe(false);
    expect(SecureExpressionEvaluator.evaluate('a || b', ctx)).toBe(true);
    expect(SecureExpressionEvaluator.evaluate('n > m', ctx)).toBe(true);
    expect(SecureExpressionEvaluator.evaluate('n % m', ctx)).toBe(1);
    expect(SecureExpressionEvaluator.evaluate('-(n - m)', ctx)).toBe(-3);
  });

  it('evaluates arrays, parentheses and ternary correctly', () => {
    const ctx = { x: 1, y: 0 } as any;
    expect(SecureExpressionEvaluator.evaluate('[x, 2, "s"]', ctx)).toEqual([
      1,
      2,
      's',
    ]);
    expect(SecureExpressionEvaluator.evaluate('(x + 2) * 2', ctx)).toBe(6);
    expect(SecureExpressionEvaluator.evaluate('x ? "yes" : "no"', ctx)).toBe(
      'yes',
    );
    expect(SecureExpressionEvaluator.evaluate('y ? "yes" : "no"', ctx)).toBe(
      'no',
    );
  });
});
