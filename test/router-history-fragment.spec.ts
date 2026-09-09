import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initRouter } from '../src/lib/router';

describe('router history fragment behavior', () => {
  beforeEach(() => {
    // reset DOM/location
    document.body.innerHTML = '';
    window.scrollTo = vi.fn();
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

  it('preserves the entry query and fragment during initial navigation replay', async () => {
    const scrollIntoView = vi.fn();
    const target = document.createElement('section');
    target.id = 'gaming';
    target.scrollIntoView = scrollIntoView;
    document.body.appendChild(target);
    window.history.replaceState({}, '', '/?view=full#gaming');

    const router = initRouter({
      routes: [{ path: '/', component: 'home' }],
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(window.location.pathname).toBe('/');
    expect(window.location.search).toBe('?view=full');
    expect(window.location.hash).toBe('#gaming');
    expect(router.getCurrent()).toMatchObject({
      path: '/',
      query: { view: 'full' },
      fragment: 'gaming',
    });
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it('preserves the query and fragment when synchronizing a popstate URL', async () => {
    const target = document.createElement('section');
    target.id = 'details';
    target.scrollIntoView = vi.fn();
    document.body.appendChild(target);

    const router = initRouter({
      routes: [
        { path: '/', component: 'home' },
        { path: '/guide', component: 'guide' },
      ],
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    window.history.replaceState({}, '', '/guide?tab=api#details');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(window.location.search).toBe('?tab=api');
    expect(window.location.hash).toBe('#details');
    expect(router.getCurrent()).toMatchObject({
      path: '/guide',
      query: { tab: 'api' },
      fragment: 'details',
    });
  });
});
