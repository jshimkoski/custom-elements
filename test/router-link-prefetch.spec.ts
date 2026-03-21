import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initRouter } from '../src/lib/router';
import { clearComponentCache } from '../src/lib/router/component-loader';

function nextTick() {
  return new Promise<void>((r) => queueMicrotask(() => r()));
}

/** Fire a mouseenter event on an element. */
function hoverOver(el: HTMLElement) {
  el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
}

describe('router-link prefetch', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    clearComponentCache();
    try {
      window.history.replaceState({}, '', '/');
    } catch {
      /* ignore */
    }
  });

  it('calls route.load() when the user hovers over the link', async () => {
    const load = vi.fn().mockResolvedValue({ default: 'about-component' });
    initRouter({
      routes: [
        { path: '/', component: 'home-comp' },
        { path: '/about', load },
      ] as any,
    });

    const link = document.createElement('router-link');
    link.setAttribute('to', '/about');
    document.body.appendChild(link);
    await nextTick();

    hoverOver(link);
    await nextTick();

    expect(load).toHaveBeenCalledOnce();
  });

  it('does not call load() for external/absolute URLs', async () => {
    const load = vi.fn().mockResolvedValue({ default: 'nope' });
    initRouter({
      routes: [
        { path: '/', component: 'home-comp' },
        { path: '/internal', load },
      ] as any,
    });

    const link = document.createElement('router-link');
    link.setAttribute('to', 'https://example.com/page');
    document.body.appendChild(link);
    await nextTick();

    hoverOver(link);
    await nextTick();

    expect(load).not.toHaveBeenCalled();
  });

  it('only prefetches once even when the user hovers multiple times', async () => {
    const load = vi.fn().mockResolvedValue({ default: 'about-component' });
    initRouter({
      routes: [
        { path: '/', component: 'home-comp' },
        { path: '/about', load },
      ] as any,
    });

    const link = document.createElement('router-link');
    link.setAttribute('to', '/about');
    document.body.appendChild(link);
    await nextTick();

    hoverOver(link);
    await nextTick();
    hoverOver(link); // second hover — listener was removed via once: true
    await nextTick();

    expect(load).toHaveBeenCalledOnce();
  });

  it('adds the mouseenter listener on the host element itself', async () => {
    const addSpy = vi.spyOn(HTMLElement.prototype, 'addEventListener');

    initRouter({
      routes: [
        { path: '/about', load: () => Promise.resolve({ default: 'about' }) },
      ] as any,
    });

    const link = document.createElement('router-link');
    link.setAttribute('to', '/about');
    document.body.appendChild(link);
    await nextTick();

    const calls = addSpy.mock.calls.filter(
      ([event, , opts]) =>
        event === 'mouseenter' &&
        (opts as AddEventListenerOptions | undefined)?.once === true,
    );
    expect(calls.length).toBeGreaterThan(0);
    // The listener must have been added to the router-link host element.
    expect(calls.some(([, , ,]) => addSpy.mock.instances.includes(link))).toBe(
      true,
    );

    addSpy.mockRestore();
  });

  it('removes the mouseenter listener when the component disconnects', async () => {
    const removeSpy = vi.spyOn(HTMLElement.prototype, 'removeEventListener');

    const load = vi.fn().mockResolvedValue({ default: 'about-component' });
    initRouter({
      routes: [
        { path: '/', component: 'home-comp' },
        { path: '/about', load },
      ] as any,
    });

    const link = document.createElement('router-link');
    link.setAttribute('to', '/about');
    document.body.appendChild(link);
    await nextTick();

    document.body.removeChild(link);
    await nextTick();

    const calls = removeSpy.mock.calls.filter(
      ([event]) => event === 'mouseenter',
    );
    expect(calls.length).toBeGreaterThan(0);
    expect(load).not.toHaveBeenCalled();

    removeSpy.mockRestore();
  });

  it('does not throw when the matched route has no load function', async () => {
    initRouter({
      routes: [
        { path: '/', component: 'home-comp' },
        { path: '/about', component: 'about-comp' },
      ] as any,
    });

    const link = document.createElement('router-link');
    link.setAttribute('to', '/about');
    document.body.appendChild(link);
    await nextTick();

    expect(() => hoverOver(link)).not.toThrow();
  });

  it('does not throw when the `to` path matches no route', async () => {
    initRouter({
      routes: [{ path: '/', component: 'home-comp' }] as any,
    });

    const link = document.createElement('router-link');
    link.setAttribute('to', '/no-such-route');
    document.body.appendChild(link);
    await nextTick();

    expect(() => hoverOver(link)).not.toThrow();
  });
});
