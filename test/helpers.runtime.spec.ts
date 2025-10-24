import { describe, it, expect } from 'vitest';
import { safeSerializeAttr, isClassLikeAttr } from '../src/lib/runtime/helpers';
import { ReactiveState } from '../src/lib/runtime/reactive';

describe('helpers: safeSerializeAttr', () => {
  it('serializes primitives', () => {
    expect(safeSerializeAttr('hello')).toBe('hello');
    expect(safeSerializeAttr(123)).toBe('123');
    expect(safeSerializeAttr(true)).toBe('true');
    expect(safeSerializeAttr(false)).toBe('false');
  });

  it('serializes ReactiveState wrapping a primitive', () => {
    const s = new (ReactiveState as any)('x');
    expect(safeSerializeAttr(s)).toBe('x');
  });

  it('does not serialize ReactiveState wrapping non-primitives', () => {
    const sObj = new (ReactiveState as any)({ a: 1 });
    const sArr = new (ReactiveState as any)([1, 2]);
    expect(safeSerializeAttr(sObj)).toBeNull();
    expect(safeSerializeAttr(sArr)).toBeNull();
  });

  it('returns null for functions and DOM nodes', () => {
    expect(safeSerializeAttr(() => {})).toBeNull();
    expect(safeSerializeAttr(document.createElement('div'))).toBeNull();
  });

  it('returns null for objects and arrays', () => {
    expect(safeSerializeAttr({ a: 1 })).toBeNull();
    expect(safeSerializeAttr([1, 2, 3])).toBeNull();
  });

  it('handles null/undefined gracefully', () => {
    expect(safeSerializeAttr(null)).toBeNull();
    expect(safeSerializeAttr(undefined)).toBeNull();
  });
});

describe('helpers: isClassLikeAttr', () => {
  it('matches `class`', () => expect(isClassLikeAttr('class')).toBe(true));
  it('matches camelCase *Class', () =>
    expect(isClassLikeAttr('activeClass')).toBe(true));
  it('matches kebab-case *-class', () =>
    expect(isClassLikeAttr('active-class')).toBe(true));
  it('does not match other attributes', () =>
    expect(isClassLikeAttr('data-foo')).toBe(false));
  it('handles edge-case variants', () => {
    expect(isClassLikeAttr('fooClassBar')).toBe(false);
    expect(isClassLikeAttr('-class')).toBe(true);
    expect(isClassLikeAttr('my-class-name')).toBe(true);
  });
});
