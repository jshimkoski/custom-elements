import { describe, it, expect } from 'vitest';
import { SecureExpressionEvaluator as SEE } from '../src/lib/runtime/secure-expression-evaluator';

describe('SecureExpressionEvaluator - more cases', () => {
  it('resolves plain identifiers from root context', () => {
    const res = SEE.evaluate('a + b', { a: 2, b: 3 });
    expect(res).toBe(5);
  });

  it('returns undefined when an identifier is missing', () => {
    const res = SEE.evaluate('a + c', { a: 2, b: 3 });
    expect(res).toBeUndefined();
  });

  it('handles nested plain identifiers', () => {
    const res = SEE.evaluate('user.age >= 18 ? "ok" : "no"', {
      user: { age: 21 },
    });
    expect(res).toBe('ok');
  });

  it('does not confuse strings containing identifiers', () => {
    const res = SEE.evaluate('ctx.name + " says: user.name"', {
      name: 'Alice',
    });
    expect(res).toBe('Alice says: user.name');
  });

  it('returns undefined for expressions that reference unknown nested paths', () => {
    const res = SEE.evaluate('user.profile.name', { user: {} });
    expect(res).toBeUndefined();
  });

  it('evaluates arrays containing mixed expressions', () => {
    const res = SEE.evaluate('[1, ctx.x, user.y + 1]', {
      x: 2,
      user: { y: 4 },
    });
    expect(res).toEqual([1, 2, 5]);
  });

  it('blocks well-known dangerous patterns', () => {
    const res = SEE.evaluate('this.constructor', {} as any);
    expect(res).toBeUndefined();
  });

  it('works with boolean negation and unary minus', () => {
    const res = SEE.evaluate('!ctx.enabled || -ctx.n === -5', {
      enabled: false,
      n: 5,
    });
    expect(res).toBe(true);
  });
});
