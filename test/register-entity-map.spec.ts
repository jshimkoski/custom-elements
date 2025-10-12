import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { decodeEntities, registerEntityMap, clearRegisteredEntityMap } from '../src/lib/runtime/helpers';

describe('registerEntityMap', () => {
  beforeEach(() => {
    // Ensure no document is present to force SSR path
    (globalThis as any).document = undefined;
    clearRegisteredEntityMap();
  });

  afterEach(() => {
    clearRegisteredEntityMap();
  });

  it('uses registered map when provided', () => {
    const fakeMap = { hellip: '…', copy: '©', nbsp: '\u00A0' } as Record<string, string>;
    registerEntityMap(fakeMap, { overwrite: true });
    expect(decodeEntities('&hellip;&copy;&nbsp;')).toBe('…©\u00A0');
  });

  it('first registration wins by default', () => {
    const mapA = { foo: 'A' } as any;
    const mapB = { foo: 'B' } as any;
    registerEntityMap(mapA);
    registerEntityMap(mapB);
    expect(decodeEntities('&foo;')).toBe('A');
  });

  it('overwrite option replaces existing map', () => {
    const mapA = { bar: 'A' } as any;
    const mapB = { bar: 'B' } as any;
    registerEntityMap(mapA);
    registerEntityMap(mapB, { overwrite: true });
    expect(decodeEntities('&bar;')).toBe('B');
  });
});
