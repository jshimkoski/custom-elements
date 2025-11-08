import { describe, it, expect, beforeEach } from 'vitest';
import { initRouter } from '../src/lib/router';

// Verifies router-link produces a normalized href (base + /path + optional #frag)
describe('router-link href normalization', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    try {
      window.history.replaceState({}, '', '/');
    } catch {
      /* ignore */
    }
  });

  it('anchor href is normalized and includes base and fragment', async () => {
    const routes = [
      { path: '/', component: 'home' },
      { path: '/api', component: 'api' },
    ] as any;

    const base = '/base';
    initRouter({ routes, base });

    const link = document.createElement('router-link');
    // relative-style `to` (literal) but href should be normalized by component
    link.setAttribute('to', 'api#top');
    document.body.appendChild(link);

    // allow element to connect
    await new Promise((r) => queueMicrotask(r));

    const anchor = link.shadowRoot?.querySelector(
      'a',
    ) as HTMLAnchorElement | null;
    expect(anchor).toBeTruthy();

    // The component sets href to base + normalized path + (fragment)
    // We check the attribute so we don't depend on absolute URL resolution
    expect(anchor!.getAttribute('href')).toBe('/base/api#top');
  });

  it('anchor href normalizes leading/trailing slashes', async () => {
    const routes = [
      { path: '/', component: 'home' },
      { path: '/about', component: 'about' },
    ] as any;

    const base = '/app';
    initRouter({ routes, base });

    const link = document.createElement('router-link');
    link.setAttribute('to', '/about/'); // with trailing slash
    document.body.appendChild(link);

    await new Promise((r) => queueMicrotask(r));

    const anchor = link.shadowRoot?.querySelector(
      'a',
    ) as HTMLAnchorElement | null;
    expect(anchor).toBeTruthy();
    expect(anchor!.getAttribute('href')).toBe('/app/about');
  });
});
