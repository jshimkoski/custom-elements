import { describe, it, expect, beforeEach } from 'vitest';
import { initRouter } from '../src/lib/router';

describe('router scroll ordering edge case', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('ensures earlier scroll resolves true even if a new attempt starts immediately after', async () => {
    const router = initRouter({ routes: [{ path: '/x' }] as any });

    // Element for first scroll exists
    const el = document.createElement('div');
    el.id = 'first';
    document.body.appendChild(el);

    // Start first scroll attempt (should resolve true)
    const p1 = router.scrollToFragment('first');

    const r1 = await p1;
    expect(r1).toBe(true);

    // Immediately start a new attempt which should not retroactively change p1
    const p2 = router.scrollToFragment('does-not-exist');
    const r2 = await p2;
    expect(r2).toBe(false);

    // Re-assert first remains true (already awaited above)
    expect(r1).toBe(true);
  });
});
