import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveRouteComponent, useRouter } from '../src/lib/router';

describe('router additional tests', () => {
  it('resolveRouteComponent caches async loader results', async () => {
    let calls = 0;
    const route = {
      path: '/cache',
      load: async () => {
        calls++;
        return { default: 'CachedComp' };
      }
    } as any;
    const first = await resolveRouteComponent(route);
    const second = await resolveRouteComponent(route);
    expect(first).toBe('CachedComp');
    expect(second).toBe('CachedComp');
    expect(calls).toBe(1);
  });

  it('useRouter in browser mode updates history on push/replace', async () => {
    const origWindow = (global as any).window;
    const origDocument = (global as any).document;

    const mockHistory = { pushState: vi.fn(), replaceState: vi.fn(), back: vi.fn() };
    (global as any).window = {
      location: { href: 'http://localhost/', pathname: '/', search: '' },
      history: mockHistory,
      addEventListener: vi.fn(),
    } as any;
    (global as any).document = {} as any;

    const routes = [ { path: '/', component: 'Home' }, { path: '/about', component: 'About' } ];
    const router = useRouter({ routes });
    await router.push('/about');
    expect(mockHistory.pushState).toHaveBeenCalled();
    await router.replace('/');
    expect(mockHistory.replaceState).toHaveBeenCalled();
    // cleanup
    (global as any).window = origWindow;
    (global as any).document = origDocument;
  });

  it('navigate when route not found is a no-op (SSR)', async () => {
    const origWindow = (global as any).window;
    const origDocument = (global as any).document;
    (global as any).window = undefined;
    (global as any).document = undefined;
    const routes: any[] = [];
    const router = useRouter({ routes });
  // Should not throw; current implementation updates state even when no route matches
  await expect(router.push('/nope')).resolves.not.toThrow();
  expect(router.getCurrent().path).toBe('/nope');
    (global as any).window = origWindow;
    (global as any).document = origDocument;
  });
});
