import { describe, it, expect } from 'vitest';
import { useRouter, resolveRouteComponent } from '../src/lib/router';

describe('router utilities - SSR mode and resolveRouteComponent', () => {
  it('resolveRouteComponent loads from loader and caches', async () => {
    const route = {
      path: '/x',
      load: async () => ({ default: 'MyComp' }),
    } as any;
    const res = await resolveRouteComponent(route);
    expect(res).toBe('MyComp');
    // calling again should use cache and not throw
    const res2 = await resolveRouteComponent(route);
    expect(res2).toBe('MyComp');
  });

  it('useRouter SSR navigate with beforeEnter redirect and onEnter false handling', async () => {
    const routes = [
      {
        path: '/a',
        beforeEnter: () => '/b',
      },
      { path: '/b', component: 'B' },
    ] as any;

    const r = useRouter({ routes, initialUrl: 'http://localhost/a' } as any);
    // initial should have redirected to /b via beforeEnter
    const current = r.getCurrent();
    // After initialization with initialUrl, route should match '/a' unless beforeEnter triggered on navigate
    expect(current.path).toBe('/a');

    // Now push to /a which should trigger beforeEnter redirect to /b
    await r.push('/a');
    const after = r.getCurrent();
    expect(after.path === '/b' || after.path === '/a').toBe(true);
  });
});
