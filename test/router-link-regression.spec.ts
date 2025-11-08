import { describe, it, expect, beforeEach } from 'vitest';
import { initRouter } from '../src/lib/router';

describe('router-link active class regression', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('parent /guide link loses active when child /guide/api-reference is clicked', async () => {
    // Prepare router and register two routes
    const routes = [
      { path: '/guide', component: 'guide-page' },
      { path: '/guide/api-reference', component: 'api-page' },
    ] as any;

    const router = initRouter({ routes });

    // Create two router-link elements. router-link renders an inner <a>.
    const parent = document.createElement('router-link');
    parent.setAttribute('to', '/guide');
    parent.setAttribute('active-class', 'is-active');
    parent.setAttribute('exact-active-class', 'is-exact');

    const child = document.createElement('router-link');
    child.setAttribute('to', '/guide/api-reference');
    child.setAttribute('active-class', 'is-active');
    child.setAttribute('exact-active-class', 'is-exact');

    // Insert into DOM so component lifecycle hooks run
    document.body.appendChild(parent);
    document.body.appendChild(child);

    // allow the custom elements to connect and render their inner anchors
    await new Promise((r) => queueMicrotask(r));

    // initial navigation to /guide
    await router.push('/guide');

    // allow microtasks and render after navigation
    await new Promise((r) => queueMicrotask(r));

    // parent link should be active and exact-active
    const parentAnchor = parent.shadowRoot?.querySelector(
      'a',
    ) as HTMLAnchorElement | null;
    const childAnchor = child.shadowRoot?.querySelector(
      'a',
    ) as HTMLAnchorElement | null;

    expect(parentAnchor).toBeTruthy();
    expect(childAnchor).toBeTruthy();

    // wait a short time for subscriptions/reactive updates to propagate
    await new Promise((r) => setTimeout(r, 20));

    expect(parentAnchor!.classList.contains('is-active')).toBe(true);
    expect(parentAnchor!.classList.contains('is-exact')).toBe(true);

    // Click the child link
    childAnchor!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Wait for navigation to complete
    await new Promise((r) => setTimeout(r, 20));

    // Ensure router state updated
    const cur = router.getCurrent();
    expect(cur.path).toBe('/guide/api-reference');

    // Re-query anchors (class updates are applied to inner anchors)
    expect(parentAnchor!.classList.contains('is-active')).toBe(true);
    // Parent should no longer be exact active
    expect(parentAnchor!.classList.contains('is-exact')).toBe(false);

    // Child should be active and exact-active
    expect(childAnchor!.classList.contains('is-active')).toBe(true);
    expect(childAnchor!.classList.contains('is-exact')).toBe(true);
  });
});
