import { describe, it, expect, beforeEach } from 'vitest';
import { initRouter } from '../src/lib/router';

// Focused tests for router-link edge cases added during review
describe('router-link extra behaviors', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    try {
      window.history.replaceState({}, '', '/');
    } catch {
      /* ignore */
    }
  });

  it('preserves protocol-relative URLs (//example.com)', async () => {
    const routes = [{ path: '/', component: 'home' }] as any;
    initRouter({ routes, base: '/base' });

    const link = document.createElement('router-link');
    link.setAttribute('to', '//example.com');
    document.body.appendChild(link);
    await new Promise((r) => queueMicrotask(r));

    const anchor = link.shadowRoot?.querySelector(
      'a',
    ) as HTMLAnchorElement | null;
    expect(anchor).toBeTruthy();
    expect(anchor!.getAttribute('href')).toBe('//example.com');
  });

  it('does not intercept ctrl/meta/shift/alt clicks (modifier keys)', async () => {
    const routes = [
      { path: '/', component: 'home' },
      { path: '/about', component: 'about' },
    ] as any;

    const router = initRouter({ routes, base: '' });

    const link = document.createElement('router-link');
    link.setAttribute('to', '/about');
    document.body.appendChild(link);
    await new Promise((r) => queueMicrotask(r));

    const anchor = link.shadowRoot?.querySelector(
      'a',
    ) as HTMLAnchorElement | null;
    expect(anchor).toBeTruthy();

    // Simulate ctrl-click (should not cause navigation)
    anchor!.dispatchEvent(
      new MouseEvent('click', { bubbles: true, ctrlKey: true, button: 0 }),
    );
    // allow microtask
    await new Promise((r) => queueMicrotask(r));

    expect(router.getCurrent().path).toBe('/');
  });

  it('does not intercept middle-click (button === 1)', async () => {
    const routes = [
      { path: '/', component: 'home' },
      { path: '/contact', component: 'contact' },
    ] as any;

    const router = initRouter({ routes, base: '' });

    const link = document.createElement('router-link');
    link.setAttribute('to', '/contact');
    document.body.appendChild(link);
    await new Promise((r) => queueMicrotask(r));

    const anchor = link.shadowRoot?.querySelector(
      'a',
    ) as HTMLAnchorElement | null;
    expect(anchor).toBeTruthy();

    // Simulate middle-click
    anchor!.dispatchEvent(
      new MouseEvent('click', { bubbles: true, button: 1 }),
    );
    await new Promise((r) => queueMicrotask(r));

    expect(router.getCurrent().path).toBe('/');
  });

  it('dedupes base when provided and preserves query+fragment', async () => {
    const routes = [
      { path: '/', component: 'home' },
      { path: '/page', component: 'page' },
    ] as any;

    const base = '/app/';
    initRouter({ routes, base });

    const linkA = document.createElement('router-link');
    linkA.setAttribute('to', '/app/page');
    document.body.appendChild(linkA);

    const linkB = document.createElement('router-link');
    linkB.setAttribute('to', '/page?x=1#frag');
    document.body.appendChild(linkB);

    await new Promise((r) => queueMicrotask(r));

    const a1 = linkA.shadowRoot?.querySelector('a') as HTMLAnchorElement | null;
    const a2 = linkB.shadowRoot?.querySelector('a') as HTMLAnchorElement | null;
    expect(a1).toBeTruthy();
    expect(a2).toBeTruthy();

    expect(a1!.getAttribute('href')).toBe('/app/page');
    expect(a2!.getAttribute('href')).toBe('/app/page?x=1#frag');
  });
});
