import { afterEach, describe, expect, it, vi } from 'vitest';
import { initRouter } from '../src/lib/router';

describe('router lazy registration', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('does not load the current route during router-view metadata discovery', async () => {
    const load = vi.fn(async () => ({ default: 'test-lazy-route-page' }));

    initRouter({
      initialUrl: '/',
      routes: [{ path: '/', load }],
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(load).not.toHaveBeenCalled();

    document.body.append(document.createElement('router-view'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(load).toHaveBeenCalledOnce();
  });
});
