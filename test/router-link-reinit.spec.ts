import { describe, it, expect, beforeEach } from 'vitest';

import { initRouter } from '../src/lib/router';

// Helper to wait a microtask
function nextTick() {
  return new Promise((r) => queueMicrotask(() => r(undefined)));
}

describe('router-link reinitialization regression', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('router-link instances created before initRouter update active state after router reinit', async () => {
    const routes = [
      { path: '/', component: 'home-page' },
      { path: '/about', component: 'about-page' },
    ] as any;

    // Create two router-link elements BEFORE initializing the router
    const linkHome = document.createElement('router-link') as HTMLElement;
    linkHome.setAttribute('to', '/');
    linkHome.setAttribute('active-class', 'is-active');
    linkHome.setAttribute('exact-active-class', 'is-exact');

    const linkAbout = document.createElement('router-link') as HTMLElement;
    linkAbout.setAttribute('to', '/about');
    linkAbout.setAttribute('active-class', 'is-active');
    linkAbout.setAttribute('exact-active-class', 'is-exact');

    document.body.appendChild(linkHome);
    document.body.appendChild(linkAbout);

    // Allow elements to be upgraded when router is initialized
    await nextTick();

    // Initialize router in browser mode
    const router1 = initRouter({ routes } as any);
    expect(router1).toBeDefined();

    // Navigate to '/' explicitly so links update
    await router1.push('/');
    await nextTick();
    // Allow a tiny delay for reactive subscriptions to propagate
    await new Promise((r) => setTimeout(r, 10));

    const homeAnchor = linkHome.shadowRoot?.querySelector(
      'a',
    ) as HTMLAnchorElement | null;
    const aboutAnchor = linkAbout.shadowRoot?.querySelector(
      'a',
    ) as HTMLAnchorElement | null;

    expect(homeAnchor).toBeTruthy();
    expect(aboutAnchor).toBeTruthy();

    // Home should be active and exact-active, About not active
    expect(homeAnchor!.classList.contains('is-active')).toBe(true);
    expect(homeAnchor!.classList.contains('is-exact')).toBe(true);
    expect(aboutAnchor!.classList.contains('is-active')).toBe(false);

    // Reinitialize the router to a different current path. Use initialUrl
    // to ensure the new router's initial state reflects '/about'. This also
    // exercises the proxy rebind path.
    const router2 = initRouter({ routes, initialUrl: '/about' } as any);
    expect(router2).toBeDefined();

    // Wait for rebind to propagate synchronously/async as implemented
    await nextTick();
    await new Promise((r) => setTimeout(r, 10));

    // Re-query anchors (shadow roots remain attached to same elements)
    const homeAnchor2 = linkHome.shadowRoot?.querySelector(
      'a',
    ) as HTMLAnchorElement | null;
    const aboutAnchor2 = linkAbout.shadowRoot?.querySelector(
      'a',
    ) as HTMLAnchorElement | null;

    expect(homeAnchor2).toBeTruthy();
    expect(aboutAnchor2).toBeTruthy();

    // After reinit the About link should be active/exact, Home should not be exact
    expect(aboutAnchor2!.classList.contains('is-active')).toBe(true);
    expect(aboutAnchor2!.classList.contains('is-exact')).toBe(true);
    expect(homeAnchor2!.classList.contains('is-exact')).toBe(false);
  });
});
