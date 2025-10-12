import { describe, it, expect, beforeEach, vi } from 'vitest';

import { decodeEntities, clearRegisteredEntityMap } from '../src/lib/runtime/helpers';
import * as logger from '../src/lib/runtime/logger';

describe('decodeEntities background loader', () => {
  beforeEach(() => {
    // Ensure SSR path by removing document if present
    // @ts-ignore
    if (typeof globalThis.document !== 'undefined') delete (globalThis as any).document;

    clearRegisteredEntityMap();
    (decodeEntities as any)._namedMap = undefined;
    (decodeEntities as any)._usedFallback = undefined;
    (decodeEntities as any)._warnedFallback = undefined;
  });

  it('should not warn after background loader fills the map', async () => {
    const warnSpy = vi.spyOn(logger, 'devWarn').mockImplementation(() => {});

    // Provide a fake loader that resolves to a map containing 'foo' entity
    const fakeMap = { foo: 'ƒ' };
    (decodeEntities as any)._namedMapLoader = () => Promise.resolve(fakeMap);

    // First call triggers fallback and should schedule the loader; it may warn once
    decodeEntities('&lt; &foo;');

    // Wait for loader to resolve and populate internal _namedMap
    await (decodeEntities as any)._namedMapLoader();
    (decodeEntities as any)._namedMap = fakeMap;

    // Reset the spy call count after loader populated to assert no new warns
    warnSpy.mockClear();

    // Now call decodeEntities again; it should use the loaded map and not warn
    const decoded = decodeEntities('&foo; &lt;');
    expect(decoded).toContain('ƒ');
    expect(warnSpy).toHaveBeenCalledTimes(0);

    warnSpy.mockRestore();
  });
});
