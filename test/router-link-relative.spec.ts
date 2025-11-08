import { describe, it, expect, beforeEach } from 'vitest';
import { initRouter } from '../src/lib/router';

// Document current behavior: relative `to` values are NOT resolved against current path
// and are treated as absolute-like (normalizePath will add a leading '/').

describe('router-link relative to behavior', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('treats relative `to` literally (not resolved against current path)', async () => {
    const routes = [
      { path: '/', component: 'home' },
      { path: '/guide', component: 'guide' },
      { path: '/api', component: 'api' },
    ] as any;

    const router = initRouter({ routes });

    // create a router-link with relative to
    const link = document.createElement('router-link');
    link.setAttribute('to', 'api');
    document.body.appendChild(link);

    // allow element to connect
    await new Promise((r) => queueMicrotask(r));

    // initial navigate to /guide
    await router.push('/guide');
    await new Promise((r) => queueMicrotask(r));

    const anchor = link.shadowRoot?.querySelector(
      'a',
    ) as HTMLAnchorElement | null;
    expect(anchor).toBeTruthy();

    // Click the link: current implementation will navigate to '/api' (not '/guide/api')
    anchor!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 20));

    expect(router.getCurrent().path).toBe('/api');
  });
});
