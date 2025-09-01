import { describe, it, expect } from 'vitest';
import { parseQuery, matchRoute, resolveRouteComponent, useRouter, matchRouteSSR } from '../src/lib/router';

describe('router.additional', () => {
  it('parseQuery parses search strings and returns empty for empty', () => {
    expect(parseQuery('')).toEqual({});
    expect(parseQuery('?a=1&b=two')).toEqual({ a: '1', b: 'two' });
  });

  it('matchRoute extracts params', () => {
    const routes = [{ path: '/user/:id' }];
    const res = matchRoute(routes as any, '/user/123');
    expect(res.route).not.toBeNull();
    expect(res.params.id).toBe('123');
  });

  it('resolveRouteComponent returns static, resolves async, caches and throws on failure', async () => {
    const staticRoute: any = { path: '/a', component: 'tag-a' };
    expect(await resolveRouteComponent(staticRoute)).toBe('tag-a');

    let loaderCalled = 0;
    const asyncRoute: any = {
      path: '/b',
      load: async () => {
        loaderCalled++;
        return { default: 'lazy-b' };
      }
    };

    const first = await resolveRouteComponent(asyncRoute);
    const second = await resolveRouteComponent(asyncRoute);
    expect(first).toBe('lazy-b');
    expect(second).toBe('lazy-b');
    // loader should only have run once because of caching
    expect(loaderCalled).toBe(1);

    const badRoute: any = { path: '/bad', load: async () => { throw new Error('nope'); } };
    await expect(resolveRouteComponent(badRoute)).rejects.toThrow(/Failed to load component/);
  });

  it('useRouter in SSR mode honors initialUrl, beforeEnter/onEnter/afterEnter behaviors', async () => {
    // Temporarily remove global window/document to force SSR branch
    const savedWin = (globalThis as any).window;
    const savedDoc = (globalThis as any).document;
    try {
      // delete window/document to simulate SSR
      try { delete (globalThis as any).window; } catch {}
      try { delete (globalThis as any).document; } catch {}

      let afterCalled = false;
      const routes = [
        { path: '/', component: 'root' },
        {
          path: '/secret',
          component: 'secret',
          beforeEnter: async () => false
        },
        {
          path: '/to-login',
          component: 'to-login',
          beforeEnter: async () => '/login'
        },
        {
          path: '/login',
          component: 'login'
        },
        {
          path: '/after',
          component: 'after',
          afterEnter: () => { afterCalled = true; }
        }
      ];

      const router = useRouter({ routes: routes as any, initialUrl: 'http://localhost/'});
      expect(router.getCurrent().path).toBe('/');

      // secret should be blocked
      await router.push('/secret');
      expect(router.getCurrent().path).toBe('/');

      // redirect via beforeEnter -> /login
      await router.push('/to-login');
      expect(router.getCurrent().path).toBe('/login');

      // afterEnter should set flag
      await router.push('/after');
      expect(router.getCurrent().path).toBe('/after');
      expect(afterCalled).toBe(true);

    } finally {
      // restore window/document
      (globalThis as any).window = savedWin;
      (globalThis as any).document = savedDoc;
    }
  });

  it('matchRouteSSR is just a thin wrapper', () => {
    const routes = [{ path: '/x' }];
    const m = matchRouteSSR(routes as any, '/x');
    expect(m.route).not.toBeNull();
  });
});
