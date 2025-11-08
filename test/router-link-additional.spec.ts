import { describe, it, expect, beforeEach } from 'vitest';
import { initRouter } from '../src/lib/router';

describe('router-link additional behaviors', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    try {
      window.history.replaceState({}, '', '/');
    } catch {
      /* ignore */
    }
  });

  it('does not duplicate base when `to` already contains base', async () => {
    const routes = [
      { path: '/', component: 'home' },
      { path: '/about', component: 'about' },
    ] as any;

    const base = '/app';
    initRouter({ routes, base });

    const link = document.createElement('router-link');
    link.setAttribute('to', '/app/about');
    document.body.appendChild(link);

    await new Promise((r) => queueMicrotask(r));

    const anchor = link.shadowRoot?.querySelector(
      'a',
    ) as HTMLAnchorElement | null;
    expect(anchor).toBeTruthy();
    expect(anchor!.getAttribute('href')).toBe('/app/about');
  });

  it('preserves absolute URLs (no base prefix)', async () => {
    const routes = [{ path: '/', component: 'home' }] as any;

    initRouter({ routes });

    const link = document.createElement('router-link');
    const url = 'https://example.com/foo?x=1#frag';
    link.setAttribute('to', url);
    document.body.appendChild(link);

    await new Promise((r) => queueMicrotask(r));

    const anchor = link.shadowRoot?.querySelector(
      'a',
    ) as HTMLAnchorElement | null;
    expect(anchor).toBeTruthy();
    expect(anchor!.getAttribute('href')).toBe(url);
  });

  it('omits href on anchor when disabled', async () => {
    const routes = [
      { path: '/', component: 'home' },
      { path: '/about', component: 'about' },
    ] as any;

    initRouter({ routes, base: '/x' });

    const link = document.createElement('router-link');
    link.setAttribute('to', '/about');
    // set boolean attribute
    link.setAttribute('disabled', '');
    document.body.appendChild(link);

    await new Promise((r) => queueMicrotask(r));

    const anchor = link.shadowRoot?.querySelector(
      'a',
    ) as HTMLAnchorElement | null;
    expect(anchor).toBeTruthy();
    // href should be omitted when disabled
    expect(anchor!.hasAttribute('href')).toBe(false);
    expect(anchor!.getAttribute('href')).toBeNull();
  });
});
