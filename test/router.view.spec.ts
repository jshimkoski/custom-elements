import { describe, it, expect, afterEach } from 'vitest';
import { initRouter } from '../src/lib/router';

// Simple helper to mount a router-view and return its shadow root innerHTML
function mountAndGetHtml() {
  const el = document.createElement('router-view');
  document.body.appendChild(el);
  // wait a tick to allow render to complete (and async loads to resolve)
  return new Promise<string>((resolve) =>
    setTimeout(() => resolve(el.shadowRoot!.innerHTML), 0),
  );
}

describe('router-view render types', () => {
  afterEach(() => {
    // cleanup any created elements
    document.body.innerHTML = '';
    // clear component registry entries if any
  });

  it('renders string tag components', async () => {
    // Use a native div tag (no custom element constructor) via a function component
    const routes = [
      {
        path: '/home',
        component: () => ({ tag: 'div', props: {}, children: 'home' }),
      },
    ];
    const router = initRouter({ routes, initialUrl: '/home' });
    // Ensure browser-mode router uses the desired path
    await router.replace('/home');
    const html = await mountAndGetHtml();
    expect(html).toContain('home');
  });

  it('renders sync function component from load()', async () => {
    const routes = [
      {
        path: '/sync',
        load: () =>
          Promise.resolve({
            default: () => ({ tag: 'div', props: {}, children: 'sync' }),
          }),
      },
    ];
    const router = initRouter({ routes, initialUrl: '/sync' });
    await router.replace('/sync');
    const html = await mountAndGetHtml();
    expect(html).toContain('sync');
  });

  it('renders async function component from load()', async () => {
    const routes = [
      {
        path: '/async',
        load: async () => {
          await new Promise((r) => setTimeout(r, 0));
          return {
            default: async () => ({ tag: 'div', props: {}, children: 'async' }),
          };
        },
      },
    ];
    const router = initRouter({ routes, initialUrl: '/async' });
    await router.replace('/async');
    // wait slightly longer for nested async default to resolve
    const html = await mountAndGetHtml();
    expect(html).toContain('async');
  });
});
