import { describe, it, expect, beforeEach } from 'vitest';

import { initRouter } from '../src/lib/router';

// Helper to wait a microtask
function nextTick() {
  return new Promise((r) => queueMicrotask(() => r(undefined)));
}

describe('router re-init proxy', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('existing router-link receives updates after initRouter is called again', async () => {
    // Initialize first router with root path
    initRouter({ routes: [{ path: '/' } as any], initialUrl: '/' });

    // Create a router-link that targets '/new'
    const rl = document.createElement('router-link') as HTMLElement;
    rl.setAttribute('to', '/new');
    document.body.appendChild(rl);

    await nextTick();

    // Anchor should exist but not be active yet
    const anchor = rl.shadowRoot?.querySelector('a') as HTMLElement | null;
    expect(anchor).not.toBeNull();
    expect(anchor!.classList.contains('active')).toBe(false);

    // Re-init router with a route that makes '/new' the current path
    initRouter({ routes: [{ path: '/new' } as any], initialUrl: '/new' });

    // Wait microtasks so reactive updates and scheduled renders settle
    await nextTick();

    const anchorAfter = rl.shadowRoot?.querySelector('a') as HTMLElement | null;
    expect(anchorAfter).not.toBeNull();
    // Now the existing router-link should observe the new router state and mark active
    expect(anchorAfter!.classList.contains('active')).toBe(true);
  });
});
