import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initRouter } from '../src/lib/router';

describe('router navigation concurrency', () => {
  beforeEach(() => {
    vi.stubGlobal('scrollTo', vi.fn());
    window.scrollTo = vi.fn();
    window.history.replaceState({}, '', '/initial');
  });

  it('queues navigation requested while the initial guard pipeline is in flight', async () => {
    let releaseInitial!: () => void;
    const initialGuard = new Promise<void>((resolve) => {
      releaseInitial = resolve;
    });
    const router = initRouter({
      routes: [
        {
          path: '/initial',
          component: 'page-initial',
          beforeEnter: async () => {
            await initialGuard;
            return true;
          },
        },
        { path: '/destination', component: 'page-destination' },
      ],
    });

    // Let initRouter's queued initial navigation acquire the lock, then request
    // a real navigation before its asynchronous guard resolves.
    await Promise.resolve();
    const destination = router.replace('/destination');
    releaseInitial();
    await destination;

    expect(router.getCurrent().path).toBe('/destination');
    expect(window.location.pathname).toBe('/destination');
  });

  it('does not replay the entry route over an immediate explicit navigation', async () => {
    let initialGuardCalls = 0;
    const router = initRouter({
      routes: [
        {
          path: '/initial',
          component: 'page-initial',
          beforeEnter: () => {
            initialGuardCalls += 1;
            return true;
          },
        },
        { path: '/destination', component: 'page-destination' },
      ],
    });

    await router.push('/destination');
    await Promise.resolve();

    expect(initialGuardCalls).toBe(0);
    expect(router.getCurrent().path).toBe('/destination');
    expect(window.location.pathname).toBe('/destination');
  });
});
