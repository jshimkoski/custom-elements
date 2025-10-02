import { describe, it, expect, beforeEach } from 'vitest';
import { toKebab, toCamel, escapeHTML, getNestedValue, setNestedValue, clearStringCaches, getStringCacheStats } from '../src/lib/runtime/helpers';

describe('helpers string utilities', () => {
  beforeEach(() => {
    clearStringCaches();
  });

  it('toKebab converts camelCase to kebab-case and caches result', () => {
    const res = toKebab('helloWorldTest');
    expect(res).toBe('hello-world-test');
    const stats = getStringCacheStats();
    expect(stats.kebabCacheSize).toBeGreaterThan(0);
  });

  it('toCamel converts kebab-case to camelCase and caches result', () => {
    const res = toCamel('my-long-name');
    expect(res).toBe('myLongName');
    const stats = getStringCacheStats();
    expect(stats.camelCacheSize).toBeGreaterThan(0);
  });

  it('escapeHTML replaces entities and caches escaped strings', () => {
    const input = '<div class="x">&"\'';
    const out = escapeHTML(input);
    expect(typeof out).toBe('string');
    expect((out as string)).toContain('&amp;');
    expect((out as string)).toContain('&quot;');
  });
});

describe('helpers nested value utilities', () => {
  beforeEach(() => {
    clearStringCaches();
  });

  it('getNestedValue reads deep values and reactive wrappers', () => {
    const o: any = { a: { b: 2 } };
    expect(getNestedValue(o, 'a.b')).toBe(2);

    // simulate ReactiveState-like wrapper with Symbol
    const reactive = { value: 5, [Symbol.for('@cer/ReactiveState')]: true } as any;
    const x: any = { r: reactive };
    expect(getNestedValue(x, 'r')).toBe(5);
  });

  it('setNestedValue sets deep values and handles reactive wrappers', () => {
    const o: any = {};
    setNestedValue(o, 'foo.bar', 3);
    expect(o.foo.bar).toBe(3);

    const reactive = { value: 1, [Symbol.for('@cer/ReactiveState')]: true } as any;
    const y: any = { inner: { r: reactive } };
    setNestedValue(y, 'inner.r', 9);
    expect(y.inner.r.value).toBe(9);
  });
});
