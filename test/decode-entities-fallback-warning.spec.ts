import { describe, it, expect, beforeEach, vi } from 'vitest';

import { decodeEntities, clearRegisteredEntityMap } from '../src/lib/runtime/helpers';
import * as logger from '../src/lib/runtime/logger';

describe('decodeEntities SSR fallback warning', () => {
  beforeEach(() => {
    // Ensure no DOM global is present (simulate SSR) and clear any registered map
    // Some environments may have document; tests in this repo run under jsdom by default
    // so temporarily delete it if present to force SSR code path.
    // @ts-ignore
    if (typeof globalThis.document !== 'undefined') delete (globalThis as any).document;

    // Clear any registered map and internal flags on decodeEntities
    clearRegisteredEntityMap();
    // Reset internal flags used by the implementation
    (decodeEntities as any)._namedMap = undefined;
    (decodeEntities as any)._namedMapLoader = undefined;
    (decodeEntities as any)._usedFallback = undefined;
    (decodeEntities as any)._warnedFallback = undefined;
  });

  it('should call devWarn once when using tiny SSR fallback', () => {
    const warnSpy = vi.spyOn(logger, 'devWarn').mockImplementation(() => {});

    // Call decodeEntities twice; first call should trigger the fallback and warn,
    // second call should not warn again because the implementation tracks it.
    const a = decodeEntities('&lt; &amp; &unknown;');
    const b = decodeEntities('&lt; &amp;');

    expect(a).toContain('<');
    expect(b).toContain('<');

    // devWarn should have been called exactly once
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });
});
