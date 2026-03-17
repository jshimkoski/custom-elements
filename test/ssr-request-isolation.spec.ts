/**
 * Tests for SSR request-isolation fixes.
 *
 * Covers two distinct bugs fixed in this area:
 *
 * 1. **Stale ref() state across renders** (`_ssrRenderCounter` fix in ssr-context.ts)
 *    `runComponentSSRRender` reused the same componentId (`cer-ssr-root`) for every
 *    render of the same component, causing `ref(value)` to return a cached
 *    `ReactiveState` from a previous render instead of creating a fresh one.
 *    Adding a monotonic counter to the componentId ensures each SSR render gets
 *    its own stateStorage slot.
 *
 * 2. **Sequential renderToStream + initRouter** (integration)
 *    When `initRouter` is called per-request and `router-view` is the root
 *    component, each `renderToStream` call must resolve the correct page for
 *    its URL. The stale ref() bug caused every call after the first to render
 *    the first request's route instead of its own.
 *
 * 3. **Browser-global guards in SSR** (typeof guards)
 *    `makeReactive()` and several hooks used bare `instanceof Node` / `instanceof
 *    HTMLElement` checks that throw `ReferenceError` in Node.js where these
 *    globals are not defined. The guards are now conditional on the globals
 *    being available.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ref } from '../src/lib/runtime/reactive';
import { registry } from '../src/lib/runtime/component/registry';
import { renderToStringWithJITCSSDSD, renderToStream } from '../src/lib/ssr';
import { initRouter, activeRouterProxy, type Route } from '../src/lib/router';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function readStream(stream: ReadableStream<string>): Promise<string> {
  const reader = stream.getReader();
  const chunks: string[] = [];
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return chunks.join('');
}

// ---------------------------------------------------------------------------
// 1. Stale ref() state across SSR renders
// ---------------------------------------------------------------------------

describe('SSR render isolation: ref() state is fresh per render', () => {
  const TAG = 'ssr-isolation-ref-test';

  beforeEach(() => {
    // Each render reads `renderInput` and wraps it in ref().
    // Without the _ssrRenderCounter fix the second render would return
    // the ReactiveState from stateStorage keyed by the old componentId
    // ('cer-ssr-root:0') instead of creating a new one.
    let renderInput = 'initial';

    registry.set(TAG, {
      props: {},
      render: () => {
        const state = ref(renderInput);
        return {
          tag: 'span',
          props: { attrs: { id: String(state.value) } },
          children: [String(state.value)],
        } as never;
      },
    });

    // Expose the setter so individual tests can change it
    (globalThis as Record<string, unknown>).__ssr_isolation_input__ = (
      v: string,
    ) => {
      renderInput = v;
    };
  });

  function setInput(v: string) {
    (globalThis as Record<string, unknown>).__ssr_isolation_input__?.(v);
  }

  it('first render returns the initial value', () => {
    setInput('alpha');
    const vnode = {
      tag: TAG,
      props: { attrs: {}, isCustomElement: true },
      children: [],
    };
    const { html } = renderToStringWithJITCSSDSD(vnode as never);
    expect(html).toContain('id="alpha"');
  });

  it('second render returns the updated value, not the cached first value', () => {
    const vnode = {
      tag: TAG,
      props: { attrs: {}, isCustomElement: true },
      children: [],
    };

    setInput('first');
    const { html: html1 } = renderToStringWithJITCSSDSD(vnode as never);
    expect(html1).toContain('id="first"');

    // Without the fix, this returns 'first' from stale stateStorage.
    setInput('second');
    const { html: html2 } = renderToStringWithJITCSSDSD(vnode as never);
    expect(html2).toContain('id="second"');
  });

  it('handles many sequential renders each with unique input', () => {
    const vnode = {
      tag: TAG,
      props: { attrs: {}, isCustomElement: true },
      children: [],
    };
    const inputs = ['a', 'b', 'c', 'd', 'e'];
    for (const input of inputs) {
      setInput(input);
      const { html } = renderToStringWithJITCSSDSD(vnode as never);
      expect(html).toContain(`id="${input}"`);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Sequential renderToStream + initRouter renders the correct route per URL
// ---------------------------------------------------------------------------

describe('Sequential initRouter + renderToStream: correct page per URL', () => {
  const HOME = 'stream-iso-home';
  const ABOUT = 'stream-iso-about';
  const BLOG = 'stream-iso-blog';

  const routes: Route[] = [
    { path: '/', component: HOME },
    { path: '/about', component: ABOUT },
    { path: '/blog/:slug', component: BLOG },
  ] as Route[];

  beforeEach(() => {
    registry.set(HOME, {
      props: {},
      render: () =>
        ({
          tag: 'main',
          props: { attrs: { id: 'page-home' } },
          children: ['Home page'],
        }) as never,
    });
    registry.set(ABOUT, {
      props: {},
      render: () =>
        ({
          tag: 'main',
          props: { attrs: { id: 'page-about' } },
          children: ['About page'],
        }) as never,
    });
    registry.set(BLOG, {
      props: { slug: '' },
      render: (ctx: { slug?: string }) =>
        ({
          tag: 'main',
          props: { attrs: { id: 'page-blog', 'data-slug': ctx.slug ?? '' } },
          children: [`Blog: ${ctx.slug ?? ''}`],
        }) as never,
    });
  });

  function routerViewVNode() {
    return {
      tag: 'router-view',
      props: { attrs: {}, isCustomElement: true },
      children: [],
    } as never;
  }

  it('renders home component for /', async () => {
    initRouter({ routes, initialUrl: '/' });
    expect(activeRouterProxy.getCurrent().path).toBe('/');
    const html = await readStream(
      renderToStream(routerViewVNode(), { dsd: true }),
    );
    expect(html).toContain(HOME);
    expect(html).toContain('Home page');
  });

  it('renders about component for /about (second sequential call)', async () => {
    // First render — establishes stateStorage entries for the 'cer-ssr-root' key.
    initRouter({ routes, initialUrl: '/' });
    await readStream(renderToStream(routerViewVNode(), { dsd: true }));

    // Second render — without the _ssrRenderCounter fix this returns HOME
    // because ref(getCurrent()) finds the cached '/' state in stateStorage.
    initRouter({ routes, initialUrl: '/about' });
    const html = await readStream(
      renderToStream(routerViewVNode(), { dsd: true }),
    );
    expect(html).toContain(ABOUT);
    expect(html).toContain('About page');
    expect(html).not.toContain('Home page');
  });

  it('renders the correct page for each URL in a sequence of 5 calls', async () => {
    const cases: Array<[string, string, string]> = [
      ['/', HOME, 'Home page'],
      ['/about', ABOUT, 'About page'],
      ['/', HOME, 'Home page'],
      ['/about', ABOUT, 'About page'],
      ['/', HOME, 'Home page'],
    ];

    for (const [url, expectedTag, expectedText] of cases) {
      initRouter({ routes, initialUrl: url });
      const html = await readStream(
        renderToStream(routerViewVNode(), { dsd: true }),
      );
      expect(html).toContain(expectedTag);
      expect(html).toContain(expectedText);
    }
  });

  it('passes route params correctly for dynamic routes in sequence', async () => {
    // Establish a previous render to populate stateStorage
    initRouter({ routes, initialUrl: '/' });
    await readStream(
      renderToStream(
        {
          tag: 'router-view',
          props: { attrs: {}, isCustomElement: true },
          children: [],
        } as never,
        { dsd: true },
      ),
    );

    initRouter({ routes, initialUrl: '/blog/hello-world' });
    const html = await readStream(
      renderToStream(
        {
          tag: 'router-view',
          props: { attrs: {}, isCustomElement: true },
          children: [],
        } as never,
        { dsd: true },
      ),
    );
    expect(html).toContain(BLOG);
    expect(html).toContain('hello-world');
  });
});

// ---------------------------------------------------------------------------
// 3. Browser-global guards: SSR rendering does not throw on DOM-like objects
// ---------------------------------------------------------------------------

describe('Browser-global guards: SSR rendering is safe without DOM globals', () => {
  it('ref() on a plain route-state object does not throw', () => {
    const routeState = { path: '/test', params: { id: '1' }, query: {} };
    expect(() => ref(routeState)).not.toThrow();
  });

  it('ref() on null does not throw', () => {
    expect(() => ref(null)).not.toThrow();
  });

  it('renderToStringWithJITCSSDSD does not throw when rendering with reactive state', () => {
    const TAG = 'ssr-globals-test';
    registry.set(TAG, {
      props: {},
      render: () => {
        // Exercise the reactive system's makeReactive path, which contains
        // the typeof Node/Element/HTMLElement guards
        const state = ref({ path: '/', nested: { value: 42 } });
        return {
          tag: 'div',
          props: { attrs: { 'data-path': state.value.path } },
          children: [],
        } as never;
      },
    });

    const vnode = {
      tag: TAG,
      props: { attrs: {}, isCustomElement: true },
      children: [],
    };
    expect(() => renderToStringWithJITCSSDSD(vnode as never)).not.toThrow();
  });

  it('SSR rendering tolerates objects with a Node-like shape without error', () => {
    // An object with properties that resemble DOM nodes (childNodes, nodeType)
    // should not cause instanceof checks to malfunction
    const TAG = 'ssr-node-like-test';
    registry.set(TAG, {
      props: {},
      render: () => {
        const state = ref({
          nodeType: 1,
          childNodes: [],
          tagName: 'DIV',
        });
        return {
          tag: 'div',
          props: { attrs: { 'data-type': String(state.value.nodeType) } },
          children: [],
        } as never;
      },
    });

    const vnode = {
      tag: TAG,
      props: { attrs: {}, isCustomElement: true },
      children: [],
    };
    expect(() => renderToStringWithJITCSSDSD(vnode as never)).not.toThrow();
  });

  it('typeof guards allow SSR to work even when Node global is deleted', () => {
    // Temporarily remove Node from globalThis to simulate a pure Node.js
    // environment (or an environment where the DOM polyfill is absent)
    const savedNode = (globalThis as Record<string, unknown>).Node;
    const savedElement = (globalThis as Record<string, unknown>).Element;
    const savedHTMLElement = (globalThis as Record<string, unknown>)
      .HTMLElement;
    const savedShadowRoot = (globalThis as Record<string, unknown>).ShadowRoot;

    try {
      delete (globalThis as Record<string, unknown>).Node;
      delete (globalThis as Record<string, unknown>).Element;
      delete (globalThis as Record<string, unknown>).HTMLElement;
      delete (globalThis as Record<string, unknown>).ShadowRoot;

      // ref() and makeReactive() must not throw ReferenceError
      expect(() =>
        ref({ path: '/about', params: {}, query: {} }),
      ).not.toThrow();
      expect(() => ref([1, 2, 3])).not.toThrow();
      expect(() => ref('a string')).not.toThrow();
    } finally {
      // Restore globals so other tests are unaffected
      if (savedNode !== undefined)
        (globalThis as Record<string, unknown>).Node = savedNode;
      if (savedElement !== undefined)
        (globalThis as Record<string, unknown>).Element = savedElement;
      if (savedHTMLElement !== undefined)
        (globalThis as Record<string, unknown>).HTMLElement = savedHTMLElement;
      if (savedShadowRoot !== undefined)
        (globalThis as Record<string, unknown>).ShadowRoot = savedShadowRoot;
    }
  });
});
