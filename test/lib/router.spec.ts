import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRouter, matchRouteSSR } from '../../src/lib/router';
import { RouteState } from '../../src/lib/router';

describe('Router', () => {
  const routes = [
    { path: '/', component: 'home-page' },
    { path: '/about', component: 'about-page' },
    { path: '/user/:id', component: 'user-page' }
  ];

  let router: ReturnType<typeof useRouter>;

  beforeEach(() => {
    // Simulate browser environment
    window.history.replaceState({}, '', '/');
    router = useRouter({ routes });
    (window as any).__routerInstance = router;
  });

  it('matches root route', () => {
    const match = router.matchRoute('/');
    expect(match.route?.component).toBe('home-page');
    expect(match.params).toEqual({});
  });

  it('matches param route', () => {
    const match = router.matchRoute('/user/42');
    expect(match.route?.component).toBe('user-page');
    expect(match.params).toEqual({ id: '42' });
  });

  it('matches unknown route', () => {
    const match = router.matchRoute('/not-found');
    expect(match.route).toBeNull();
    expect(match.params).toEqual({});
  });

  it('parses query params', () => {
    window.history.replaceState({}, '', '/user/42?tab=info');
    router = useRouter({ routes });
    const state = router.getCurrent();
    expect((state as RouteState).query.tab).toBe('info');
  });

  it('pushes and replaces routes', () => {
    router.push('/about');
    expect((router.getCurrent() as RouteState).path).toBe('/about');
    router.replace('/user/99');
    expect((router.getCurrent() as RouteState).path).toBe('/user/99');
  });

  it('subscribes to route changes', async () => {
    const fn = vi.fn();
    router.subscribe(fn);
    router.push('/about');
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(fn).toHaveBeenCalled();
  });

  it('supports SSR route matching', () => {
    const match = matchRouteSSR(routes, '/user/123');
    expect(match.route?.component).toBe('user-page');
    expect(match.params).toEqual({ id: '123' });
  });
});
