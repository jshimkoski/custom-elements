import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initRouter } from '../src/lib/router';

function nextTick() {
  return new Promise((r) => queueMicrotask(() => r(undefined)));
}

describe('router fragment behavior', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('preserves fragment in RouteState and scrolls to element on client navigation', async () => {
    // Ensure element that will be scrolled exists
    const anchor = document.createElement('div');
    anchor.id = 'team';
    document.body.appendChild(anchor);

    const router = initRouter({ routes: [{ path: '/about' }] as any });

    // Ensure scrollIntoView exists in this environment (JSDOM may not implement it)
    const originalScroll = (HTMLElement.prototype as any).scrollIntoView;
    if (typeof originalScroll !== 'function') {
      (HTMLElement.prototype as any).scrollIntoView = function () {};
    }
    // Spy on scrollIntoView
    const spy = vi
      .spyOn(HTMLElement.prototype, 'scrollIntoView')
      .mockImplementation(() => {});

    // Navigate to path with fragment
    await router.push('/about#team');

    // Wait to allow navigation + rAF/timeout scheduled scroll
    await nextTick();
    await new Promise((r) => setTimeout(r, 50));

    // RouteState fragment should be preserved
    const cur = router.getCurrent();
    expect(cur.path).toBe('/about');
    expect(cur.fragment).toBe('team');

    // scrollIntoView should have been called on the element
    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
    // Restore original if it didn't exist
    if (typeof originalScroll !== 'function') {
      (HTMLElement.prototype as any).scrollIntoView = originalScroll;
    }
  });
});
