import { describe, it, expect, beforeEach } from 'vitest';

import {
  toKebab,
  toCamel,
  clearStringCaches,
  getStringCacheStats,
  escapeHTML,
  decodeEntities,
  registerEntityMap,
  clearRegisteredEntityMap,
  unsafeHTML,
  isUnsafeHTML,
  unwrapIfPrimitive,
  safeSerializeAttr,
  isClassLikeAttr,
  getNestedValue,
  setNestedValue,
} from '../src/lib/runtime/helpers';

describe('helpers.ts combined tests', () => {
  beforeEach(() => {
    clearStringCaches();
    clearRegisteredEntityMap();
  });

  it('toKebab and toCamel roundtrip and cache', () => {
    const s = 'someTestString';
    const kebab = toKebab(s);
    expect(kebab).toBe('some-test-string');
    const camel = toCamel(kebab);
    expect(camel).toBe('someTestString');
    const stats = getStringCacheStats();
    expect(stats.kebabCacheSize).toBeGreaterThanOrEqual(1);
    expect(stats.camelCacheSize).toBeGreaterThanOrEqual(1);
  });

  it('escapeHTML escapes entities and uses cache', () => {
    const raw = 'a & b < c > d " \'';
    const escaped = escapeHTML(raw) as string;
    expect(escaped).toContain('&amp;');
    expect(escaped).toContain('&lt;');
    expect(escaped).toContain('&gt;');
    expect(escaped).toContain('&quot;');
    expect(escaped).toContain('&#39;');
    const stats = getStringCacheStats();
    expect(stats.htmlEscapeCacheSize).toBeGreaterThanOrEqual(1);
  });

  it('decodeEntities handles numeric and named refs and loader fallback', async () => {
    expect(decodeEntities('&#65;')).toBe('A');
    expect(decodeEntities('&#x41;')).toBe('A');
    expect(decodeEntities('&lt;&gt;&amp;&quot;&apos;')).toBe('<>&"\'');

    registerEntityMap({ heyo: '😺' });
    // Simulate SSR/non-DOM so decodeEntities uses the registered map instead of DOM decoding
    const origDoc = (globalThis as any).document;
    try {
      try {
        delete (globalThis as any).document;
      } catch {}
      expect(decodeEntities('&heyo;')).toBe('😺');
    } finally {
      (globalThis as any).document = origDoc;
    }
  });

  it('unsafeHTML and isUnsafeHTML detect wrappers', () => {
    const wrapped = unsafeHTML('<div></div>');
    expect(isUnsafeHTML(wrapped)).toBe(true);
    expect(isUnsafeHTML({})).toBe(false);
  });

  it('unwrapIfPrimitive unwraps Reactive-like wrappers safely', () => {
    const reactiveLike = { value: 123 };
    expect(unwrapIfPrimitive(reactiveLike)).toBe(123);
    const obj = { value: { a: 1 } };
    expect(unwrapIfPrimitive(obj)).toBe(obj);
    expect(unwrapIfPrimitive(null)).toBeNull();
    expect(unwrapIfPrimitive(undefined)).toBeUndefined();
  });

  it('safeSerializeAttr returns strings or null for complex values', () => {
    expect(safeSerializeAttr('ok')).toBe('ok');
    expect(safeSerializeAttr(5)).toBe('5');
    expect(safeSerializeAttr(true)).toBe('true');
    expect(safeSerializeAttr({})).toBeNull();
    expect(safeSerializeAttr({ value: 1 })).toBe('1');
  });

  it('isClassLikeAttr recognizes class tokens', () => {
    expect(isClassLikeAttr('class')).toBe(true);
    expect(isClassLikeAttr('activeClass')).toBe(true);
    expect(isClassLikeAttr('foo-class-bar')).toBe(true);
    expect(isClassLikeAttr('some-thing')).toBe(false);
  });

  it('getNestedValue and setNestedValue operate on nested paths and Reactive-like objects', () => {
    const obj: any = { a: { b: { c: 1 } } };
    expect(getNestedValue(obj, 'a.b.c')).toBe(1);
    setNestedValue(obj, 'a.b.c', 5);
    expect(getNestedValue(obj, 'a.b.c')).toBe(5);

    const reactive = { value: 5, [Symbol.for('@cer/ReactiveState')]: true } as any;
    const obj2: any = { x: { y: { z: reactive } } };
    expect(getNestedValue(obj2, 'x.y.z')).toBe(5);
    setNestedValue(obj2, 'x.y.z', 12);
    expect(getNestedValue(obj2, 'x.y.z')).toBe(12);
  });
});
