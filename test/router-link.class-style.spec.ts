import { describe, it, expect, beforeEach } from 'vitest';

import { initRouter } from '../src/lib/router';

// Helper to wait a microtask (scheduler flush runs synchronously in test env but be defensive)
function nextTick() {
  return new Promise((r) => queueMicrotask(() => r(undefined)));
}

describe('router-link class/style migration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('moves host class/style into inner anchor and removes them from host', async () => {
    initRouter({ routes: [] as any });

    const rl = document.createElement('router-link') as HTMLElement;
    rl.setAttribute('to', '/x');
    rl.setAttribute('class', 'migrated-link');
    rl.setAttribute('style', 'color: red;');
    document.body.appendChild(rl);
    await nextTick();

    // Host should have been upgraded and had its class/style migrated
    expect(rl.shadowRoot).toBeTruthy();
    // Host attributes should be removed by the migration logic
    expect(rl.getAttribute('class')).toBeNull();
    expect(rl.getAttribute('style')).toBeNull();

    // Inner anchor should contain the class and inline style
    const anchor = rl.shadowRoot!.querySelector('a') as HTMLElement | null;
    expect(anchor).not.toBeNull();
    expect(anchor!.classList.contains('migrated-link')).toBe(true);
    const styleText =
      anchor!.getAttribute('style') || anchor!.style.cssText || '';
    expect(styleText).toContain('color: red');
  });

  it('moves host class/style into inner button when tag="button"', async () => {
    initRouter({ routes: [] as any });

    const rl = document.createElement('router-link') as HTMLElement;
    rl.setAttribute('to', '/y');
    rl.setAttribute('tag', 'button');
    rl.setAttribute('class', 'btn-link');
    rl.setAttribute('style', 'font-weight: 700;');
    document.body.appendChild(rl);
    await nextTick();

    expect(rl.shadowRoot).toBeTruthy();
    expect(rl.getAttribute('class')).toBeNull();
    expect(rl.getAttribute('style')).toBeNull();

    const btn = rl.shadowRoot!.querySelector('button') as HTMLElement | null;
    expect(btn).not.toBeNull();
    expect(btn!.classList.contains('btn-link')).toBe(true);
    const styleText = btn!.getAttribute('style') || btn!.style.cssText || '';
    expect(styleText).toContain('font-weight: 700');
  });
});
