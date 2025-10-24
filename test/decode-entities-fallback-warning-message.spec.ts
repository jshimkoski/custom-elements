import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  decodeEntities,
  clearRegisteredEntityMap,
} from '../src/lib/runtime/helpers';
import * as logger from '../src/lib/runtime/logger';

describe('decodeEntities SSR fallback warning message', () => {
  beforeEach(() => {
    // Ensure SSR path by removing document if present
    if (typeof globalThis.document !== 'undefined')
      delete (globalThis as any).document;

    clearRegisteredEntityMap();
    (decodeEntities as any)._namedMap = undefined;
    (decodeEntities as any)._namedMapLoader = undefined;
    (decodeEntities as any)._usedFallback = undefined;
    (decodeEntities as any)._warnedFallback = undefined;
  });

  it('should emit the expected devWarn message when using fallback', () => {
    const warnSpy = vi.spyOn(logger, 'devWarn').mockImplementation(() => {});

    decodeEntities('&lt; &amp; &foo;');

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const calledWith = warnSpy.mock.calls[0][0] as string;
    expect(calledWith).toContain(
      'decodeEntities: using small SSR fallback entity map',
    );
    expect(calledWith).toContain('registerEntityMap');

    warnSpy.mockRestore();
  });
});
