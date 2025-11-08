import { describe, it, expect } from 'vitest';
import { normalizePathForRoute } from '../src/lib/router';

describe('router path normalization', () => {
  it('removes duplicate slashes, ensures leading slash and strips trailing slash', () => {
    expect(normalizePathForRoute('')).toBe('/');
    expect(normalizePathForRoute('/about/')).toBe('/about');
    expect(normalizePathForRoute('about')).toBe('/about');
    expect(normalizePathForRoute('/foo//bar///')).toBe('/foo/bar');
  });

  it('exact equality succeeds for equivalent paths', () => {
    expect(normalizePathForRoute('/about')).toBe(
      normalizePathForRoute('/about/'),
    );
  });

  it('startsWith normalized target works for subpaths', () => {
    const cur = normalizePathForRoute('/about/sub');
    const tgt = normalizePathForRoute('/about');
    expect(cur.startsWith(tgt)).toBe(true);
  });
});
