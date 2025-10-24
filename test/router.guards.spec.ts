import { describe, it, expect } from 'vitest';
import { useRouter } from '../src/lib/router';

describe('router guards (SSR)', () => {
  it('aborts navigation when beforeEnter returns false', async () => {
    const routes = [
      { path: '/', component: 'home' },
      { path: '/private', component: 'private', beforeEnter: () => false },
    ];

    const r = useRouter({ routes, initialUrl: 'http://localhost/' });
    const initial = r.getCurrent().path;
    await r.push('/private');
    // navigation aborted, still initial
    expect(r.getCurrent().path).toBe(initial);
  });

  it('redirects when beforeEnter returns a string', async () => {
    const routes = [
      { path: '/', component: 'home' },
      { path: '/in', component: 'in', beforeEnter: () => '/out' },
      { path: '/out', component: 'out' },
    ];

    const r = useRouter({ routes, initialUrl: 'http://localhost/' });
    await r.push('/in');
    expect(r.getCurrent().path).toBe('/out');
  });

  it('aborts when onEnter returns false', async () => {
    const routes = [
      { path: '/', component: 'home' },
      { path: '/o', component: 'o', onEnter: () => false },
    ];

    const r = useRouter({ routes, initialUrl: 'http://localhost/' });
    const initial = r.getCurrent().path;
    await r.push('/o');
    expect(r.getCurrent().path).toBe(initial);
  });

  it('redirects when onEnter returns a string', async () => {
    const routes = [
      { path: '/', component: 'home' },
      { path: '/a', component: 'a', onEnter: () => '/b' },
      { path: '/b', component: 'b' },
    ];

    const r = useRouter({ routes, initialUrl: 'http://localhost/' });
    await r.push('/a');
    expect(r.getCurrent().path).toBe('/b');
  });
});
