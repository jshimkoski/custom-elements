import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initRouter } from '../src/lib/router';

function nextTick() {
  return new Promise((r) => queueMicrotask(() => r(undefined)));
}

describe('router fragment async component scrolling', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('scrolls to fragment when element is rendered asynchronously by route component using offset', async () => {
    // Mock getBoundingClientRect to simulate DOM position
    const origGetBounding = HTMLElement.prototype.getBoundingClientRect;
    (HTMLElement.prototype as any).getBoundingClientRect = function () {
      return {
        top: 200,
        left: 0,
        bottom: 0,
        right: 0,
        width: 0,
        height: 0,
      } as DOMRect;
    };

    // Spy on window.scrollTo
    const origScrollTo = (window as any).scrollTo;
    (window as any).scrollTo = () => {};
    const spy = vi
      .spyOn(window as any, 'scrollTo')
      .mockImplementation(() => {});

    // Route that renders the element asynchronously
    const routes = [
      {
        path: '/about',
        component: async () => {
          // Simulate async render (component creates element in document after delay)
          await new Promise((r) => setTimeout(r, 10));
          const el = document.createElement('div');
          el.id = 'team';
          // append to body so document.getElementById can find it (tests run outside shadow DOM)
          document.body.appendChild(el);
          return '';
        },
      },
    ] as any;

    const router = initRouter({
      routes,
      scrollToFragment: { enabled: true, offset: 50 },
    });

    // Mount a <router-view> so the route component actually executes and
    // appends the async element during render. Without attaching the
    // router-view, the component() hook won't run and the element won't be
    // created.
    const rv = document.createElement('router-view');
    document.body.appendChild(rv);

    await router.push('/about#team');

    // Wait for render + rAF and retry attempts (allow time for async
    // component to append the element and for the router's retry loop).
    await nextTick();
    await new Promise((r) => setTimeout(r, 400));

    const cur = router.getCurrent();
    expect(cur.path).toBe('/about');
    expect(cur.fragment).toBe('team');

    // Expect scrollTo called with top ~= 200 - offset
    expect(spy).toHaveBeenCalled();
    const calledWith = spy.mock.calls[0][0];
    expect(calledWith).toHaveProperty('top');
    expect(Math.abs(calledWith.top - 150)).toBeLessThanOrEqual(1);

    // restore
    spy.mockRestore();
    (window as any).scrollTo = origScrollTo;
    (HTMLElement.prototype as any).getBoundingClientRect = origGetBounding;
  });
});
