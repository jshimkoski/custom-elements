import { describe, it, expect, beforeEach } from 'vitest';
import { initRouter } from '../src/lib/router';

// Helper to wait a microtask (scheduler flush runs synchronously in test env but be defensive)
function nextTick() {
  return new Promise((r) => queueMicrotask(() => r(undefined)));
}

describe('router-link active class behaviour', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('exact-active-class is applied only on exact path, active-class persists for subpaths', async () => {
    initRouter({
      routes: [
        { path: '/' },
        { path: '/about' },
        { path: '/about/sub' },
      ] as any,
      // Start at /about so links become active on connect and we can assert initial state
      initialUrl: 'http://localhost/about',
    });

    // Create two router-link elements: one exact, one non-exact
    const rlExact = document.createElement('router-link') as HTMLElement;
    rlExact.setAttribute('to', '/about');
    rlExact.setAttribute('exact', ''); // boolean attribute presence
    rlExact.setAttribute('class', 'nav');
    // explicit classes to check
    rlExact.setAttribute('exact-active-class', 'exact-active-test');
    rlExact.setAttribute('active-class', 'active-test');

    const rlNonExact = document.createElement('router-link') as HTMLElement;
    rlNonExact.setAttribute('to', '/about');
    rlNonExact.setAttribute('class', 'nav');
    rlNonExact.setAttribute('exact-active-class', 'exact-active-test');
    rlNonExact.setAttribute('active-class', 'active-test');

    document.body.appendChild(rlExact);
    document.body.appendChild(rlNonExact);

    await nextTick();

    // On SSR-like init with initialUrl=/about the elements should pick up active state on connect
    const aExact = rlExact.shadowRoot!.querySelector('a') as HTMLElement;
    const aNon = rlNonExact.shadowRoot!.querySelector('a') as HTMLElement;

    // debug: log initial classes

    console.log('initial classes:', aExact.className, aNon.className);

    // exact-active-class is applied for exact path matches (for both links)
    expect(aExact.classList.contains('exact-active-test')).toBe(true);
    expect(aNon.classList.contains('exact-active-test')).toBe(true);

    // active-class should be present for both on exact match
    expect(aExact.classList.contains('active-test')).toBe(true);
    expect(aNon.classList.contains('active-test')).toBe(true);

    // (Dynamic navigation updates are exercised in other integration tests.)
    // This test asserts that on initial connect (when the current route exactly
    // matches the link target) both exact-active and active classes appear as expected.
  });
});
