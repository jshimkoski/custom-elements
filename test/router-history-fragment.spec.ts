import { describe, it, expect, beforeEach } from 'vitest';
import { initRouter } from '../src/lib/router';

describe('router history fragment behavior', () => {
  beforeEach(() => {
    // reset DOM/location
    document.body.innerHTML = '';
    try {
      window.history.replaceState({}, '', '/');
    } catch {
      /* ignore */
    }
  });

  it('push updates history URL with fragment and sets RouteState.fragment', async () => {
    const routes = [
      { path: '/', component: 'home' },
      { path: '/api', component: 'api' },
    ] as any;

    const router = initRouter({ routes });

    await router.push('/api#section1');

    // window.location.hash should include the fragment
    expect(window.location.hash).toBe('#section1');
    expect(router.getCurrent().fragment).toBe('section1');
  });

  it('replace updates history URL with fragment and sets RouteState.fragment', async () => {
    const routes = [
      { path: '/', component: 'home' },
      { path: '/api', component: 'api' },
    ] as any;

    const router = initRouter({ routes });

    await router.replace('/api#replaced');

    expect(window.location.hash).toBe('#replaced');
    expect(router.getCurrent().fragment).toBe('replaced');
  });
});
