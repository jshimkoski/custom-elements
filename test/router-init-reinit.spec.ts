import { describe, it, expect } from 'vitest';
import { initRouter } from '../src/lib/router';
import { component } from '../src/lib/runtime/component';
import { html } from '../src/lib/runtime/template-compiler';

// Minimal routes used for the test
const routesA = [
  { path: '/', component: 'div' },
  { path: '/guide', component: 'div' },
  { path: '/guide/api-reference', component: 'div' },
];

const routesB = [
  { path: '/', component: 'div' },
  { path: '/about', component: 'div' },
  { path: '/contact', component: 'div' },
];

describe('router re-init regression', () => {
  it('router-link keeps correct active state after multiple initRouter calls', async () => {
    // First init
    initRouter({ routes: routesA, initialUrl: '/guide' });

    // Define a simple test component that contains router-links
    component('test-nav-reinit', () => {
      return html`
        <nav id="nav">
          <router-link to="/">Home</router-link>
          <router-link to="/guide">Guide</router-link>
          <router-link to="/guide/api-reference">API</router-link>
        </nav>
      `;
    });

    const el = document.createElement('test-nav-reinit');
    document.body.appendChild(el);
    // Give the runtime a tick to process subscriptions/renders
    await new Promise((r) => setTimeout(r, 30));

    const links = Array.from(
      el.shadowRoot!.querySelectorAll('router-link'),
    ) as HTMLElement[];
    const anchorFor = (rl: HTMLElement) =>
      rl.shadowRoot?.querySelector('a') || rl.querySelector('a') || rl;

    // After first init, /guide should be active
    const guideAnchor = anchorFor(links[1]) as HTMLElement;
    expect(
      guideAnchor.classList.contains('is-active') ||
        guideAnchor.classList.contains('active'),
    ).toBe(true);

    // Re-init router with a different set and initial url
    initRouter({ routes: routesB, initialUrl: '/' });

    // Home should now be active
    const homeAnchor = anchorFor(links[0]) as HTMLElement;
    // Allow a short tick for rebind/render to propagate
    await new Promise((r) => setTimeout(r, 30));
    expect(
      homeAnchor.classList.contains('is-active') ||
        homeAnchor.classList.contains('active'),
    ).toBe(true);

    // Re-init back to original routes and target the child path
    initRouter({ routes: routesA, initialUrl: '/guide/api-reference' });

    // Now the API link should be active and exact
    const apiAnchor = anchorFor(links[2]) as HTMLElement;
    await new Promise((r) => setTimeout(r, 30));
    expect(
      apiAnchor.classList.contains('is-active') ||
        apiAnchor.classList.contains('active'),
    ).toBe(true);
    expect(
      apiAnchor.classList.contains('is-exact') ||
        apiAnchor.classList.contains('exact-active'),
    ).toBe(true);

    document.body.removeChild(el);
  });
});
