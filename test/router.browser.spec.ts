import { describe, it, expect } from 'vitest';
import { useRouter } from '../src/lib/router';

describe('router.browser', () => {
  it('browser mode: push and replace manipulate history and change state', async () => {
    const history: any = {
      pushState: () => {},
      replaceState: () => {},
      back: () => {},
    };
    (global as any).window = {
      location: { href: 'http://localhost/', pathname: '/', search: '' },
      history,
      addEventListener: () => {},
    };
    (global as any).document = {};

    const routes = [
      { path: '/', component: 'root' },
      { path: '/b', component: 'b' },
    ];
    const router = useRouter({ routes, base: '/base' as any });
    expect(router.getCurrent().path).toBe('/');
    await router.push('/b');
    expect(router.getCurrent().path).toBe('/b');
    await router.replace('/');
    expect(router.getCurrent().path).toBe('/');
    // Back should be callable
    expect(() => router.back()).not.toThrow();
  });

  it('base path is stripped from incoming URLs', () => {
    const history: any = {
      pushState: () => {},
      replaceState: () => {},
      back: () => {},
    };
    (global as any).window = {
      location: {
        href: 'http://localhost/base/x',
        pathname: '/base/x',
        search: '',
      },
      history,
      addEventListener: () => {},
    };
    (global as any).document = {};
    const routes = [{ path: '/x', component: 'x' }];
    const router = useRouter({ routes, base: '/base' as any });
    expect(router.getCurrent().path).toBe('/x');
  });
});
