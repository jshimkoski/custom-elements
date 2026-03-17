/**
 * Tests for per-request router instance threading in SSR.
 *
 * The long-term fix (analogous to Vue Router's per-app DI pattern) threads a
 * router instance through the DSD render options and into each component's SSR
 * context via `_router`. `router-view` reads `context._router` instead of the
 * module-level `activeRouterProxy` singleton, making concurrent renders safe.
 *
 * Test suites:
 *
 * 1. **Per-request router threading** — `renderToStream` accepts a `router`
 *    option; `router-view` renders the URL from that instance regardless of
 *    what `activeRouterProxy` points to.
 *
 * 2. **Simulated concurrency** — two `renderToStream` calls for different URLs
 *    are started concurrently (Promise.all). Without the fix, both would render
 *    whichever URL was last passed to `initRouter`. With the fix each renders
 *    its own URL.
 *
 * 3. **SSR middleware** — `createStreamingSSRHandler` with a factory returning
 *    `{ vnode, router }` renders each mock request's URL correctly, including
 *    when multiple requests are handled concurrently.
 *
 * 4. **Backward compat** — factories returning a plain VNode (no router) still
 *    work via the `activeRouterProxy` fallback.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { registry } from '../src/lib/runtime/component/registry';
import { renderToStream } from '../src/lib/ssr';
import {
  initRouter,
  useRouter,
  type Route,
} from '../src/lib/router';
import {
  createStreamingSSRHandler,
  type MinimalRequest,
  type MinimalResponse,
} from '../src/lib/ssr-middleware';
import { html } from '../src/lib/runtime/template-compiler';

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

function routerViewVNode() {
  return {
    tag: 'router-view',
    props: { attrs: {}, isCustomElement: true },
    children: [],
  } as never;
}

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const HOME_TAG  = 'concurrent-home';
const ABOUT_TAG = 'concurrent-about';
const BLOG_TAG  = 'concurrent-blog';

const ROUTES: Route[] = [
  { path: '/',      component: HOME_TAG },
  { path: '/about', component: ABOUT_TAG },
  { path: '/blog/:slug', component: BLOG_TAG },
] as Route[];

beforeEach(() => {
  registry.set(HOME_TAG, {
    props: {},
    render: () => ({
      tag: 'main',
      props: { attrs: { id: 'page-home' } },
      children: ['Home page'],
    }) as never,
  });
  registry.set(ABOUT_TAG, {
    props: {},
    render: () => ({
      tag: 'main',
      props: { attrs: { id: 'page-about' } },
      children: ['About page'],
    }) as never,
  });
  registry.set(BLOG_TAG, {
    props: { slug: '' },
    render: (ctx: { slug?: string }) => ({
      tag: 'main',
      props: { attrs: { id: 'page-blog', 'data-slug': ctx.slug ?? '' } },
      children: [`Blog: ${ctx.slug ?? ''}`],
    }) as never,
  });
});

// ---------------------------------------------------------------------------
// 1. Per-request router threading via render option
// ---------------------------------------------------------------------------

describe('renderToStream: router option threads correct route into router-view', () => {
  it('renders home when router is initialised with /', async () => {
    const router = initRouter({ routes: ROUTES, initialUrl: '/' });
    const html = await readStream(renderToStream(routerViewVNode(), { dsd: true, router }));
    expect(html).toContain(HOME_TAG);
    expect(html).toContain('Home page');
    expect(html).not.toContain('About page');
  });

  it('renders about when router is initialised with /about', async () => {
    const router = initRouter({ routes: ROUTES, initialUrl: '/about' });
    const html = await readStream(renderToStream(routerViewVNode(), { dsd: true, router }));
    expect(html).toContain(ABOUT_TAG);
    expect(html).toContain('About page');
    expect(html).not.toContain('Home page');
  });

  it('renders blog with slug param when router is initialised with /blog/hello', async () => {
    const router = initRouter({ routes: ROUTES, initialUrl: '/blog/hello' });
    const html = await readStream(renderToStream(routerViewVNode(), { dsd: true, router }));
    expect(html).toContain(BLOG_TAG);
    expect(html).toContain('hello');
  });

  it('renders correct route for each URL in a 5-step sequence', async () => {
    const cases: Array<[string, string, string]> = [
      ['/',      HOME_TAG,  'Home page'],
      ['/about', ABOUT_TAG, 'About page'],
      ['/',      HOME_TAG,  'Home page'],
      ['/about', ABOUT_TAG, 'About page'],
      ['/',      HOME_TAG,  'Home page'],
    ];
    for (const [url, expectedTag, expectedText] of cases) {
      const router = initRouter({ routes: ROUTES, initialUrl: url });
      const h = await readStream(renderToStream(routerViewVNode(), { dsd: true, router }));
      expect(h).toContain(expectedTag);
      expect(h).toContain(expectedText);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Simulated concurrency — two renders started at the same time
// ---------------------------------------------------------------------------

describe('Concurrent renderToStream: each render gets its own router', () => {
  it('two concurrent renders for different URLs produce correct independent output', async () => {
    // Create two independent router instances BEFORE starting either render.
    // useRouter creates an instance without overwriting the global activeRouter,
    // which lets us test the per-render threading in isolation.
    const routerHome  = useRouter({ routes: ROUTES, initialUrl: '/' });
    const routerAbout = useRouter({ routes: ROUTES, initialUrl: '/about' });

    // Start both renders simultaneously.
    const [htmlHome, htmlAbout] = await Promise.all([
      readStream(renderToStream(routerViewVNode(), { dsd: true, router: routerHome })),
      readStream(renderToStream(routerViewVNode(), { dsd: true, router: routerAbout })),
    ]);

    expect(htmlHome).toContain(HOME_TAG);
    expect(htmlHome).toContain('Home page');
    expect(htmlHome).not.toContain('About page');

    expect(htmlAbout).toContain(ABOUT_TAG);
    expect(htmlAbout).toContain('About page');
    expect(htmlAbout).not.toContain('Home page');
  });

  it('five concurrent renders all produce the correct page', async () => {
    const cases: Array<[string, string, string]> = [
      ['/',      HOME_TAG,  'Home page'],
      ['/about', ABOUT_TAG, 'About page'],
      ['/',      HOME_TAG,  'Home page'],
      ['/about', ABOUT_TAG, 'About page'],
      ['/blog/world', BLOG_TAG, 'world'],
    ];

    const results = await Promise.all(
      cases.map(([url]) => {
        const router = useRouter({ routes: ROUTES, initialUrl: url });
        return readStream(renderToStream(routerViewVNode(), { dsd: true, router }));
      }),
    );

    for (let i = 0; i < cases.length; i++) {
      const [, expectedTag, expectedText] = cases[i];
      expect(results[i]).toContain(expectedTag);
      expect(results[i]).toContain(expectedText);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. SSR middleware: factory returning { vnode, router }
// ---------------------------------------------------------------------------

describe('createStreamingSSRHandler: { vnode, router } factory', () => {
  function makeHandler() {
    return createStreamingSSRHandler(
      (req: MinimalRequest) => {
        const router = initRouter({ routes: ROUTES, initialUrl: req.url ?? '/' });
        return { vnode: html`<router-view></router-view>` as never, router };
      },
      { render: { dsd: true }, document: false },
    );
  }

  async function invokeHandler(url: string, handler: ReturnType<typeof createStreamingSSRHandler>): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const chunks: string[] = [];
      const mockReq: MinimalRequest = { url };
      const mockRes: MinimalResponse = {
        setHeader: () => {},
        write: (chunk: string) => { chunks.push(chunk); return true; },
        end: (body?: string) => {
          if (body) chunks.push(body);
          resolve(chunks.join(''));
        },
      };
      handler(mockReq, mockRes).catch(reject);
    });
  }

  it('renders home for /', async () => {
    const handler = makeHandler();
    const result = await invokeHandler('/', handler);
    expect(result).toContain(HOME_TAG);
    expect(result).toContain('Home page');
  });

  it('renders about for /about', async () => {
    const handler = makeHandler();
    const result = await invokeHandler('/about', handler);
    expect(result).toContain(ABOUT_TAG);
    expect(result).toContain('About page');
  });

  it('sequential requests render correct pages', async () => {
    const handler = makeHandler();
    const home  = await invokeHandler('/',      handler);
    const about = await invokeHandler('/about', handler);
    const home2 = await invokeHandler('/',      handler);

    expect(home).toContain('Home page');
    expect(about).toContain('About page');
    expect(home2).toContain('Home page');
  });

  it('concurrent requests render correct pages independently', async () => {
    const handler = makeHandler();
    const [home, about] = await Promise.all([
      invokeHandler('/',      handler),
      invokeHandler('/about', handler),
    ]);
    expect(home).toContain(HOME_TAG);
    expect(home).toContain('Home page');
    expect(about).toContain(ABOUT_TAG);
    expect(about).toContain('About page');
    expect(home).not.toContain('About page');
    expect(about).not.toContain('Home page');
  });
});

// ---------------------------------------------------------------------------
// 4. Backward compat: factory returning plain VNode falls back to global proxy
// ---------------------------------------------------------------------------

describe('createStreamingSSRHandler: plain VNode factory (backward compat)', () => {
  it('still renders via activeRouterProxy fallback when no router is returned', async () => {
    // Set up the global router pointing at home.
    initRouter({ routes: ROUTES, initialUrl: '/' });

    const handler = createStreamingSSRHandler(
      () => html`<router-view></router-view>` as never,
      { render: { dsd: true }, document: false },
    );

    const result = await new Promise<string>((resolve, reject) => {
      const chunks: string[] = [];
      const mockRes: MinimalResponse = {
        setHeader: () => {},
        write: (c: string) => { chunks.push(c); return true; },
        end: (b?: string) => { if (b) chunks.push(b); resolve(chunks.join('')); },
      };
      handler({ url: '/' }, mockRes).catch(reject);
    });

    expect(result).toContain(HOME_TAG);
    expect(result).toContain('Home page');
  });
});
