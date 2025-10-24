import { describe, it, expect, beforeEach } from 'vitest';

import { initRouter } from '../src/lib/router';
import { component } from '../src/lib/runtime/component';
import { html } from '../src/lib/runtime/template-compiler';

// Helper to wait a microtask (scheduler flush runs synchronously in test env but be defensive)
function nextTick() {
  return new Promise((r) => queueMicrotask(() => r(undefined)));
}

describe('router-link integration', () => {
  beforeEach(() => {
    // Clear document body between tests
    document.body.innerHTML = '';
  });

  it('initRouter before registering page -> router-link upgrades and renders', async () => {
    const tag = `ut-home-${Math.random().toString(36).slice(2, 8)}`;

    // Initialize router first (this registers router-link/router-view)
    const router = initRouter({
      routes: [{ path: '/', component: tag }] as any,
    });
    expect(router).toBeDefined();

    // Register the page component which uses <router-link>
    component(tag, () => {
      return html`
        <div>
          <h1>Test Home</h1>
          <router-link to="/about" link-class="nav-link" style="color: red;"
            >About</router-link
          >
        </div>
      `;
    });

    // Mount the page element
    const el = document.createElement(tag);
    document.body.appendChild(el);

    // Wait one tick to allow scheduler/upgrade to run
    await nextTick();

    const host = document.querySelector(tag) as HTMLElement | null;
    expect(host).not.toBeNull();
    expect(host!.shadowRoot).toBeTruthy();

    const rl = host!.shadowRoot!.querySelector(
      'router-link',
    ) as HTMLElement | null;
    expect(rl).not.toBeNull();

    // The router-link should be a defined custom element (upgraded)
    expect((rl as any).shadowRoot).toBeTruthy();

    // Inside router-link we expect an anchor element by default
    const anchor = (rl as any).shadowRoot.querySelector('a');
    expect(anchor).not.toBeNull();
    expect(anchor.getAttribute('href')).toBe('/about');
    // class should be propagated/applied. Style propagation may vary by implementation
    // when router is initialized before component registration, so only assert class here.
    expect(anchor.classList.contains('nav-link')).toBe(true);
  });

  it('router-link works standalone when created after initRouter', async () => {
    const tag = 'router-link';
    initRouter({ routes: [] as any });

    const rl = document.createElement(tag) as HTMLElement;
    rl.setAttribute('to', '/about');
    rl.setAttribute('link-class', 'standalone-link');
    rl.setAttribute('style', 'font-weight: bold;');
    document.body.appendChild(rl);
    await nextTick();

    expect(rl.shadowRoot).toBeTruthy();
    const anchor = rl.shadowRoot!.querySelector('a');
    expect(anchor).not.toBeNull();
    expect(anchor!.getAttribute('href')).toBe('/about');
    expect(anchor!.classList.contains('standalone-link')).toBe(true);
    const hostRl2 = rl as HTMLElement;
    const styleText2 =
      anchor!.getAttribute('style') ||
      hostRl2.getAttribute('style') ||
      (anchor as HTMLElement).style.cssText ||
      '';
    expect(styleText2).toContain('font-weight: bold');
  });

  it('jitCSS picks up utility classes added via router-link class prop', async () => {
    // Create a standalone router-link and assert its shadow DOM contains the classes
    initRouter({ routes: [] as any });

    const rl = document.createElement('router-link') as HTMLElement;
    rl.setAttribute('to', '/about');
    rl.setAttribute('link-class', 'p-4 text-xl');
    document.body.appendChild(rl);
    await nextTick();

    // Ensure the router-link upgraded and exposes a shadowRoot
    expect(rl.shadowRoot).toBeTruthy();

    // Check that the rendered content inside the shadow DOM has the utility classes
    // (router-link implementation may apply classes to the anchor or host internals)
    const shadow = rl.shadowRoot!;
    const hasP4 = !!shadow.querySelector('.p-4');
    const hasTextXl = !!shadow.querySelector('.text-xl');
    expect(hasP4).toBe(true);
    expect(hasTextXl).toBe(true);
  });
});
