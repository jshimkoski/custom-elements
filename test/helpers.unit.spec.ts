import { describe, it, expect } from 'vitest';
import * as helpers from '../src/lib/runtime/helpers';

describe('runtime/helpers', () => {
  it('toKebab and toCamel convert strings and use cache', () => {
    helpers.clearStringCaches();
    expect(helpers.toKebab('fooBar')).toBe('foo-bar');
    expect(helpers.toCamel('foo-bar')).toBe('fooBar');
    // caches populated
    const stats = helpers.getStringCacheStats();
    expect(stats.kebabCacheSize).toBeGreaterThanOrEqual(1);
    expect(stats.camelCacheSize).toBeGreaterThanOrEqual(1);
  });

  it('escapeHTML escapes characters and caches results', () => {
    helpers.clearStringCaches();
    const input = `<&"'>`;
    const escaped = helpers.escapeHTML(input);
    expect(String(escaped)).toContain('&lt;');
    // cached value accessible via stats
    const stats = helpers.getStringCacheStats();
    expect(stats.htmlEscapeCacheSize).toBeGreaterThanOrEqual(1);
  });

  it('decodeEntities uses DOM when available and SSR fallback when document missing', async () => {
    // DOM path (jsdom available in vitest)
    const domDecoded = helpers.decodeEntities('&lt;div&gt;');
    expect(domDecoded).toBe('<div>');

    // simulate SSR by temporarily removing document
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const origDoc = globalThis.document;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    delete globalThis.document;
    try {
      const ssr = helpers.decodeEntities('&lt;span&gt;');
      expect(ssr).toBe('<span>');
    } finally {
      // restore
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      globalThis.document = origDoc;
    }
  });

  it('registerEntityMap affects SSR decoding path', async () => {
    const testMap = { custom: 'X' } as Record<string, string>;
    helpers.registerEntityMap(testMap, { overwrite: true });
    // simulate SSR by removing document
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const origDoc = globalThis.document;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    delete globalThis.document;
    try {
      const r = helpers.decodeEntities('&custom;');
      expect(r).toBe('X');
    } finally {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      globalThis.document = origDoc;
    }
  });

  it('loadEntityMap returns a mapping (fallback path)', async () => {
    const m = await helpers.loadEntityMap();
    expect(m).toHaveProperty('lt');
  });

  it('safe executes function and ignores errors', () => {
    const calls: string[] = [];
    helpers.safe(() => calls.push('ok'));
    expect(calls).toContain('ok');
    // should not throw
    helpers.safe(() => {
      throw new Error('boom');
    });
  });
});
