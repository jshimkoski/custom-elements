import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initRouter } from '../src/lib/router';

describe('router scrollToFragment promise semantics', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('resolves true when element is present (immediate)', async () => {
    const el = document.createElement('div');
    el.id = 'team';
    document.body.appendChild(el);

    const router = initRouter({ routes: [{ path: '/about' }] as any });

    // Ensure scrollIntoView exists in this JSDOM environment
    const orig = (HTMLElement.prototype as any).scrollIntoView;
    if (typeof orig !== 'function')
      (HTMLElement.prototype as any).scrollIntoView = () => {};

    const spy = vi
      .spyOn(HTMLElement.prototype, 'scrollIntoView')
      .mockImplementation(() => {});

    const res = await router.scrollToFragment('team');
    expect(res).toBe(true);
    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
    if (typeof orig !== 'function')
      (HTMLElement.prototype as any).scrollIntoView = orig;
  });

  it('resolves false when element does not appear within timeout', async () => {
    const router = initRouter({
      routes: [{ path: '/about' }] as any,
      scrollToFragment: { enabled: true, timeoutMs: 100 },
    });

    const start = Date.now();
    const res = await router.scrollToFragment('no-such-id');
    const elapsed = Date.now() - start;

    expect(res).toBe(false);
    // Should take at least close to timeout (allow some slop)
    expect(elapsed).toBeGreaterThanOrEqual(50);
  });

  it('previous pending scroll promise is resolved false when a new attempt starts (cancellation)', async () => {
    const router = initRouter({
      routes: [{ path: '/about' }] as any,
      scrollToFragment: { enabled: true, timeoutMs: 2000 },
    });

    const p1 = router.scrollToFragment('will-never-appear');
    // Immediately start a second attempt which should cancel the first
    const p2 = router.scrollToFragment('also-not-present');

    const r1 = await p1;
    const r2 = await p2;

    expect(r1).toBe(false);
    expect(r2).toBe(false);
  });
});
