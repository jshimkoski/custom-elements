import { describe, it, expect, beforeEach } from 'vitest';
import { initRouter } from '../src/lib/router';

describe('router query parsing', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    try {
      window.history.replaceState({}, '', '/');
    } catch {
      /* ignore */
    }
  });

  it('router.push parses query and fragment into RouteState', async () => {
    const routes = [
      { path: '/', component: 'home' },
      { path: '/page', component: 'page' },
    ] as any;

    const r = initRouter({ routes, base: '' });

    await r.push('/page?x=1#frag');

    const current = r.getCurrent();
    expect(current.path).toBe('/page');
    expect(current.query).toBeTruthy();
    expect(current.query.x).toBe('1');
    expect(current.fragment).toBe('frag');
  });

  it('clicking a router-link with query+fragment navigates and parses query', async () => {
    const routes = [
      { path: '/', component: 'home' },
      { path: '/page', component: 'page' },
    ] as any;

    const router = initRouter({ routes, base: '' });

    const link = document.createElement('router-link');
    link.setAttribute('to', '/page?y=2#section');
    document.body.appendChild(link);
    // setTimeout (macrotask) ensures both the router-link shadow DOM render and
    // the async initial navigation (triggered via queueMicrotask in initRouter)
    // have fully settled before we simulate a click.
    await new Promise((r) => setTimeout(r, 0));

    const anchor = link.shadowRoot?.querySelector(
      'a',
    ) as HTMLAnchorElement | null;
    expect(anchor).toBeTruthy();

    // Simulate left-click
    anchor!.dispatchEvent(
      new MouseEvent('click', { bubbles: true, button: 0 }),
    );
    // allow microtask + navigation
    await new Promise((r) => setTimeout(r, 0));

    const cur = router.getCurrent();
    expect(cur.path).toBe('/page');
    expect(cur.query.y).toBe('2');
    expect(cur.fragment).toBe('section');
  });
});
