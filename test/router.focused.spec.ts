import { describe, it, expect, vi } from 'vitest';
import {
  parseQuery,
  matchRoute,
  matchRouteSSR,
  resolveRouteComponent,
  useRouter,
  initRouter,
} from '../src/lib/router';
import * as componentModule from '../src/lib/runtime/component';

describe('router - focused test suite', () => {
  it('parseQuery: empty and simple query', () => {
    expect(parseQuery('')).toEqual({});
    expect(parseQuery('?a=1&b=two')).toEqual({ a: '1', b: 'two' });
  });

  it('matchRoute: dynamic and static routes', () => {
    const routes = [{ path: '/users/:id' } as any, { path: '/about' } as any];
    const r1 = matchRoute(routes, '/users/42');
    expect(r1.route).toBeDefined();
    expect(r1.params).toEqual({ id: '42' });
    const r2 = matchRoute(routes, '/about');
    expect(r2.route).toBeDefined();
    const r3 = matchRoute(routes, '/nope');
    expect(r3.route).toBeNull();
  });

  it('matchRouteSSR: multiple params', () => {
    const r = matchRouteSSR([{ path: '/p/:id/:slug' } as any], '/p/1/sluggy');
    expect(r.params).toEqual({ id: '1', slug: 'sluggy' });
  });

  it('resolveRouteComponent: static, async, and errors', async () => {
    expect(
      await resolveRouteComponent({ path: '/s', component: 'S' } as any),
    ).toBe('S');
    expect(
      await resolveRouteComponent({
        path: '/a',
        load: async () => ({ default: 'A' }),
      } as any),
    ).toBe('A');
    await expect(
      resolveRouteComponent({ path: '/none' } as any),
    ).rejects.toThrow();
    const bad = {
      path: '/bad',
      load: async () => {
        throw new Error('fail');
      },
    } as any;
    await expect(resolveRouteComponent(bad)).rejects.toThrow(
      'Failed to load component for route: /bad',
    );
  });

  it('useRouter SSR: initialUrl and navigation', async () => {
    const routes = [
      { path: '/', component: 'Home' },
      { path: '/a', component: 'A' },
    ];
    const router = useRouter({ routes, initialUrl: '/a' } as any);
    expect(router.getCurrent().path).toBe('/a');
    await router.push('/');
    expect(router.getCurrent().path).toBe('/');
  });

  it('useRouter SSR: beforeEnter can cancel or redirect', async () => {
    const routes = [
      { path: '/', component: 'Home' },
      { path: '/protected', component: 'P', beforeEnter: () => false },
      { path: '/redir', component: 'R', beforeEnter: () => '/' },
    ];
    const router = useRouter({ routes } as any);
    await router.push('/protected');
    expect(router.getCurrent().path).not.toBe('/protected');
    await router.push('/redir');
    expect(router.getCurrent().path).toBe('/');
  });

  it('initRouter registers router-view and router-link', () => {
    const spy = vi.spyOn(componentModule, 'component');
    const routes = [{ path: '/', component: 'Home' }];
    const r = initRouter({ routes } as any);
    void r;
    expect(spy).toHaveBeenCalledWith('router-view', expect.any(Function));
    expect(spy).toHaveBeenCalledWith('router-link', expect.any(Function));
    spy.mockRestore();
  });
});
