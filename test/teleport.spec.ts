import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTeleport } from '../src/lib';
import { html } from '../src/lib';

let container: HTMLElement;

beforeEach(() => {
  container = document.createElement('div');
  container.id = 'teleport-test-root';
  document.body.appendChild(container);
});

afterEach(() => {
  if (container) {
    document.body.removeChild(container);
  }
  // Clean up any leftover cer-teleport containers
  document.querySelectorAll('cer-teleport').forEach((el) => el.remove());
});

describe('🚀 useTeleport()', () => {
  it('creates a cer-teleport container in the target element', () => {
    const target = document.createElement('div');
    target.id = 'tp-target-1';
    document.body.appendChild(target);

    const handle = useTeleport('#tp-target-1');
    expect(target.querySelector('cer-teleport')).toBeTruthy();

    handle.destroy();
    document.body.removeChild(target);
  });

  it('portal() renders vdom nodes into the target', async () => {
    const target = document.createElement('div');
    target.id = 'tp-target-2';
    document.body.appendChild(target);

    const handle = useTeleport('#tp-target-2');
    handle.portal(html`<p id="tp-content">teleported!</p>`);

    await new Promise((r) => setTimeout(r, 50));

    const p = target.querySelector('#tp-content');
    expect(p).toBeTruthy();
    expect(p?.textContent).toBe('teleported!');

    handle.destroy();
    document.body.removeChild(target);
  });

  it('destroy() removes the cer-teleport container', async () => {
    const target = document.createElement('div');
    target.id = 'tp-target-3';
    document.body.appendChild(target);

    const handle = useTeleport('#tp-target-3');
    handle.portal(html`<p>content</p>`);

    await new Promise((r) => setTimeout(r, 50));
    expect(target.querySelector('cer-teleport')).toBeTruthy();

    handle.destroy();
    await new Promise((r) => setTimeout(r, 20));
    expect(target.querySelector('cer-teleport')).toBeFalsy();

    document.body.removeChild(target);
  });

  it('portal() can be called multiple times to update content', async () => {
    const target = document.createElement('div');
    target.id = 'tp-target-4';
    document.body.appendChild(target);

    const handle = useTeleport('#tp-target-4');

    handle.portal(html`<p id="tp-update">first</p>`);
    await new Promise((r) => setTimeout(r, 50));

    handle.portal(html`<p id="tp-update">second</p>`);
    await new Promise((r) => setTimeout(r, 50));

    const p = target.querySelector('#tp-update');
    expect(p?.textContent).toBe('second');

    handle.destroy();
    document.body.removeChild(target);
  });

  it('warns and no-ops when target is not found', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const handle = useTeleport('#non-existent-target');
    handle.portal(html`<p>should not render</p>`);
    handle.destroy();

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('returns a TeleportHandle with portal and destroy methods', () => {
    const target = document.createElement('div');
    target.id = 'tp-target-5';
    document.body.appendChild(target);

    const handle = useTeleport('#tp-target-5');
    expect(typeof handle.portal).toBe('function');
    expect(typeof handle.destroy).toBe('function');

    handle.destroy();
    document.body.removeChild(target);
  });
});
