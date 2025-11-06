import { describe, it, expect } from 'vitest';
import { matchRoute } from '../src/lib/router';

describe('router splat and param matching', () => {
  it('/:slug* matches /about/test => slug === "about/test"', () => {
    const routes = [{ path: '/:slug*' }];
    const res = matchRoute(routes, '/about/test');
    expect(res.route).not.toBeNull();
    expect(res.params.slug).toBe('about/test');
  });

  it('/:slug matches /about but not /about/test', () => {
    const routes = [{ path: '/:slug' }];
    const res1 = matchRoute(routes, '/about');
    expect(res1.route).not.toBeNull();
    expect(res1.params.slug).toBe('about');

    const res2 = matchRoute(routes, '/about/test');
    expect(res2.route).toBeNull();
  });

  it('/docs/:rest* matches /docs and /docs/a/b', () => {
    const routes = [{ path: '/docs/:rest*' }];
    const r1 = matchRoute(routes, '/docs');
    expect(r1.route).not.toBeNull();
    // with (.*) semantics rest may be empty string
    expect(r1.params.rest).toBe('');

    const r2 = matchRoute(routes, '/docs/a/b');
    expect(r2.route).not.toBeNull();
    expect(r2.params.rest).toBe('a/b');
  });

  it("root '/' matches", () => {
    const routes = [{ path: '/' }];
    const r = matchRoute(routes, '/');
    expect(r.route).not.toBeNull();
  });

  it('trailing slash is tolerated', () => {
    const routes = [{ path: '/about' }];
    const r1 = matchRoute(routes, '/about');
    const r2 = matchRoute(routes, '/about/');
    expect(r1.route).not.toBeNull();
    expect(r2.route).not.toBeNull();
  });

  it('decoded param values', () => {
    const routes = [{ path: '/user/:id' }];
    const r = matchRoute(routes, '/user/a%20b');
    expect(r.route).not.toBeNull();
    expect(r.params.id).toBe('a b');
  });

  it('rejects non-terminal splats', () => {
    const routes = [{ path: '/a/*/b' as unknown as string }];
    const r = matchRoute(routes, '/a/x/y/b');
    expect(r.route).toBeNull();
  });
});
