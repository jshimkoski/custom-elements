import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  useTeleport,
  component,
  html,
  ref,
  useOnDisconnected,
} from '../src/lib';

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

  it('useTeleport inside a component creates only one container across re-renders', async () => {
    // Regression test: previously each re-render created a fresh <cer-teleport>
    // container, leaking all previous ones. The fix stores the handle in a
    // stable reactive slot so re-renders return the same handle.
    const target = document.createElement('div');
    target.id = 'tp-stability-target';
    document.body.appendChild(target);

    component('tp-stable-test', () => {
      const count = ref(0);
      const { portal, destroy } = useTeleport('#tp-stability-target');
      useOnDisconnected(destroy);
      portal(html`<span id="tp-portal-count">${count.value}</span>`);
      return html`<button id="tp-inc" @click="${() => count.value++}">
        +
      </button>`;
    });

    container.innerHTML = '<tp-stable-test></tp-stable-test>';
    await new Promise((r) => setTimeout(r, 80));

    // Trigger two re-renders via reactive state changes
    const btn = container.querySelector<HTMLElement>('#tp-inc');
    btn?.click();
    await new Promise((r) => setTimeout(r, 80));

    btn?.click();
    await new Promise((r) => setTimeout(r, 80));

    // There must be exactly ONE cer-teleport container in the target, not one per render.
    const containers = target.querySelectorAll('cer-teleport');
    expect(containers.length).toBe(1);

    document.body.removeChild(target);
  });

  it('useTeleport recreates container after destroy() and reconnect', async () => {
    // After destroy() is called (e.g. useOnDisconnected) and the component
    // reconnects, useTeleport() must create a fresh container rather than
    // reusing the dead one removed from the DOM.
    const target = document.createElement('div');
    target.id = 'tp-reconnect-target';
    document.body.appendChild(target);

    component('tp-reconnect-test', () => {
      const { portal, destroy } = useTeleport('#tp-reconnect-target');
      useOnDisconnected(destroy);
      portal(html`<span class="tp-rc-content">hello</span>`);
      return html`<div></div>`;
    });

    // First mount
    container.innerHTML = '<tp-reconnect-test></tp-reconnect-test>';
    await new Promise((r) => setTimeout(r, 80));
    expect(target.querySelector('.tp-rc-content')).toBeTruthy();

    // Disconnect — destroy() clears the container AND the cached slot
    container.innerHTML = '';
    await new Promise((r) => setTimeout(r, 80));
    expect(target.querySelector('cer-teleport')).toBeFalsy();

    // Reconnect — must create a new container
    container.innerHTML = '<tp-reconnect-test></tp-reconnect-test>';
    await new Promise((r) => setTimeout(r, 80));
    const containers = target.querySelectorAll('cer-teleport');
    expect(containers.length).toBe(1);
    expect(target.querySelector('.tp-rc-content')).toBeTruthy();

    document.body.removeChild(target);
  });
});
