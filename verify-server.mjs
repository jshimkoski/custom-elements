/* eslint-disable */
/**
 * Manual SSR dev server for visual browser verification.
 *
 * Run with:  node verify-server.mjs
 * Then open: http://localhost:3000
 *
 * Routes:
 *   /           — standard SSR (DSD + JIT CSS)
 *   /streaming  — streaming SSR (Transfer-Encoding: chunked)
 *   /suspense   — cer-suspense in SSR
 *   /error-boundary — cer-error-boundary in SSR
 *   /keep-alive — cer-keep-alive in SSR (opaque shell)
 *   /router     — matchRouteSSR with query strings
 *
 * To verify: open each route and use View Source (⌘U) to inspect the raw HTML.
 * Check DevTools → Network → Response Headers for Transfer-Encoding on /streaming.
 */

import { createServer } from 'http';
import {
  component,
  html,
  registerBuiltinComponents,
} from './dist/custom-elements-runtime.es.js';
import { renderToStringWithJITCSSDSD } from './dist/custom-elements-runtime.ssr.es.js';
import {
  createSSRHandler,
  createStreamingSSRHandler,
} from './dist/custom-elements-runtime.ssr-middleware.es.js';
import { matchRouteSSR } from './dist/custom-elements-runtime.router.es.js';

// ─────────────────────────────────────────────────────────────
// Component registrations
// ─────────────────────────────────────────────────────────────

registerBuiltinComponents();

component(
  'demo-card',
  () => html`
    <div class="p-6 rounded bg-white shadow flex flex-col gap-3">
      <slot></slot>
    </div>
  `,
);

component(
  'demo-header',
  () => html`
    <header class="p-4 bg-primary-600 text-white flex items-center gap-4">
      <h1 class="text-xl font-bold">Custom Elements Runtime — SSR Demo</h1>
    </header>
  `,
);

component(
  'demo-nav',
  () => html`
    <nav class="p-4 bg-neutral-100 flex gap-4 text-sm flex-wrap">
      <a href="/" class="text-primary-600 underline">/</a>
      <a href="/streaming" class="text-primary-600 underline">/streaming</a>
      <a href="/streaming-async" class="text-primary-600 underline"
        >/streaming-async</a
      >
      <a href="/suspense" class="text-primary-600 underline">/suspense</a>
      <a href="/error-boundary" class="text-primary-600 underline"
        >/error-boundary</a
      >
      <a href="/keep-alive" class="text-primary-600 underline">/keep-alive</a>
      <a href="/router?ref=email#section" class="text-primary-600 underline"
        >/router?ref=email#section</a
      >
      <a href="/missing" class="text-primary-600 underline">/missing (404)</a>
    </nav>
  `,
);

// Async component — render function returns a Promise.
// The sync shell is flushed immediately; this card arrives as a <script> swap chunk.
component('async-data-card', async () => {
  await new Promise((resolve) => setTimeout(resolve, 800));
  return html`
    <div
      class="p-6 rounded bg-green-50 border border-green-200 flex flex-col gap-2"
    >
      <p class="text-green-700 font-semibold">✅ Async data loaded</p>
      <p class="text-sm text-green-600">
        This card resolved 800 ms after the sync shell was already flushed to
        the browser. View Source won't show this — it's injected by the streamed
        swap script.
      </p>
    </div>
  `;
});

// ─────────────────────────────────────────────────────────────
// Middleware handlers
// ─────────────────────────────────────────────────────────────

const sharedHead = `
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SSR Demo</title>
`;

const homeHandler = createSSRHandler(
  html`<div>
    <demo-header></demo-header>
    <demo-nav></demo-nav>
    <main class="p-8 flex flex-col gap-6">
      <demo-card>
        <h2 class="text-lg font-semibold">Standard SSR</h2>
        <p>
          View Source (⌘U) to see
          <code>&lt;template shadowrootmode="open"&gt;</code> with injected CSS.
        </p>
        <p class="text-sm text-neutral-500">
          Each custom element wraps its shadow DOM in a DSD template before any
          JS runs.
        </p>
      </demo-card>
    </main>
  </div>`,
  { render: { dsd: true, jit: { extendedColors: true } }, head: sharedHead },
);

const streamingHandler = createStreamingSSRHandler(
  html`<div>
    <demo-header></demo-header>
    <demo-nav></demo-nav>
    <main class="p-8 flex flex-col gap-6">
      <demo-card>
        <h2 class="text-lg font-semibold">Streaming SSR (sync components)</h2>
        <p>
          Check DevTools → Network → Response Headers for
          <code>Transfer-Encoding: chunked</code>.
        </p>
        <p class="text-sm text-neutral-500">
          All components are synchronous so the full page arrives in one chunk.
          Go to
          <a href="/streaming-async" class="text-primary-600 underline"
            >/streaming-async</a
          >
          to see multi-chunk incremental streaming.
        </p>
      </demo-card>
    </main>
  </div>`,
  { render: { dsd: true, jit: { extendedColors: true } }, head: sharedHead },
);

// Incremental streaming: sync shell flushed immediately, async card arrives as a swap script.
// In DevTools → Network → /streaming-async → Response, you can see two separate data events.
const streamingAsyncHandler = createStreamingSSRHandler(
  html`<div>
    <demo-header></demo-header>
    <demo-nav></demo-nav>
    <main class="p-8 flex flex-col gap-6">
      <demo-card>
        <h2 class="text-lg font-semibold">Incremental Streaming SSR</h2>
        <p>
          The shell above was flushed to the browser immediately. The card below
          has an async render function that resolves after 800 ms. It arrives as
          a separate streamed chunk — a <code>&lt;script&gt;</code> swap block
          that replaces its placeholder with the resolved DSD HTML.
        </p>
        <p class="text-sm text-neutral-500">
          Watch DevTools → Network → /streaming-async → EventStream (or
          Response) to see the two separate data chunks arrive over time.
        </p>
      </demo-card>
      <async-data-card></async-data-card>
    </main>
  </div>`,
  { render: { dsd: true, jit: { extendedColors: true } }, head: sharedHead },
);

const suspenseHandler = createSSRHandler(
  html`<div>
    <demo-header></demo-header>
    <demo-nav></demo-nav>
    <main class="p-8 flex flex-col gap-6">
      <demo-card>
        <h2 class="text-lg font-semibold">cer-suspense in SSR</h2>
        <p>Both instances below emit DSD. View Source to confirm.</p>
        <p class="text-sm font-mono">
          pending=false → &lt;slot&gt;&lt;/slot&gt; in shadow
        </p>
        <cer-suspense>
          <span class="text-green-600">Default content (pending=false)</span>
        </cer-suspense>
        <p class="text-sm font-mono">
          pending=true → &lt;slot name="fallback"&gt; in shadow
        </p>
        <cer-suspense pending="true">
          <span slot="fallback" class="text-yellow-600"
            >Fallback content (pending=true)</span
          >
        </cer-suspense>
      </demo-card>
    </main>
  </div>`,
  { render: { dsd: true, jit: { extendedColors: true } }, head: sharedHead },
);

const errorBoundaryHandler = createSSRHandler(
  html`<div>
    <demo-header></demo-header>
    <demo-nav></demo-nav>
    <main class="p-8 flex flex-col gap-6">
      <demo-card>
        <h2 class="text-lg font-semibold">cer-error-boundary in SSR</h2>
        <p>
          Always emits DSD with <code>&lt;slot&gt;</code>. No error state
          server-side.
        </p>
        <cer-error-boundary>
          <span class="text-blue-600">Protected content</span>
        </cer-error-boundary>
      </demo-card>
    </main>
  </div>`,
  { render: { dsd: true, jit: { extendedColors: true } }, head: sharedHead },
);

const keepAliveHandler = createSSRHandler(
  html`<div>
    <demo-header></demo-header>
    <demo-nav></demo-nav>
    <main class="p-8 flex flex-col gap-6">
      <demo-card>
        <h2 class="text-lg font-semibold">
          cer-keep-alive in SSR (opaque shell)
        </h2>
        <p>
          View Source: <code>&lt;cer-keep-alive&gt;</code> has NO
          <code>&lt;template shadowrootmode&gt;</code>.
        </p>
        <p>
          Its children (<code>&lt;demo-card&gt;</code>) still get DSD output
          because they are in the registry.
        </p>
        <cer-keep-alive>
          <demo-card>
            <span
              >Child inside keep-alive — this card has DSD, keep-alive does
              not</span
            >
          </demo-card>
        </cer-keep-alive>
      </demo-card>
    </main>
  </div>`,
  { render: { dsd: true, jit: { extendedColors: true } }, head: sharedHead },
);

// ─────────────────────────────────────────────────────────────
// Router demo (inline, not using middleware)
// ─────────────────────────────────────────────────────────────

const appRoutes = [
  { path: '/', component: 'home-page' },
  { path: '/streaming', component: 'streaming-page' },
  { path: '/suspense', component: 'suspense-page' },
  { path: '/error-boundary', component: 'error-boundary-page' },
  { path: '/keep-alive', component: 'keep-alive-page' },
  { path: '/router', component: 'router-demo-page' },
];

function routerDemoHandler(req, res) {
  const url = req.url ?? '/';
  const { route, params } = matchRouteSSR(appRoutes, url);

  const urlObj = new URL(url, 'http://localhost');
  const result = JSON.stringify(
    { route: route?.component ?? null, params },
    null,
    2,
  );
  const queryString = urlObj.search;
  const fragment = urlObj.hash;

  const { htmlWithStyles } = renderToStringWithJITCSSDSD(
    html`<div>
      <demo-header></demo-header>
      <demo-nav></demo-nav>
      <main class="p-8 flex flex-col gap-6">
        <demo-card>
          <h2 class="text-lg font-semibold">matchRouteSSR demo</h2>
          <p>
            Full URL passed to matchRouteSSR:
            <code class="bg-neutral-100 px-1">${url}</code>
          </p>
          <p>
            Query string:
            <code class="bg-neutral-100 px-1">${queryString || '(none)'}</code>
          </p>
          <p>
            Fragment:
            <code class="bg-neutral-100 px-1">${fragment || '(none)'}</code>
          </p>
          <pre class="bg-neutral-100 p-3 rounded text-sm overflow-auto">
${result}</pre
          >
          <p class="text-sm text-neutral-500">
            The query string and fragment are stripped before matching — the
            route still resolves correctly.
          </p>
        </demo-card>
      </main>
    </div>`,
    { jit: { extendedColors: true } },
  );

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(
    `<!DOCTYPE html><html><head>${sharedHead}</head><body>${htmlWithStyles}</body></html>`,
  );
}

// ─────────────────────────────────────────────────────────────
// 404 handler
// ─────────────────────────────────────────────────────────────

const notFoundHandler = createSSRHandler(
  html`<div>
    <demo-header></demo-header>
    <demo-nav></demo-nav>
    <main class="p-8">
      <demo-card>
        <h2 class="text-lg font-semibold text-error-600">404 — Not Found</h2>
        <p>This route does not exist.</p>
      </demo-card>
    </main>
  </div>`,
  { render: { dsd: true, jit: { extendedColors: true } }, head: sharedHead },
);

// ─────────────────────────────────────────────────────────────
// Server routing
// ─────────────────────────────────────────────────────────────

createServer(async (req, res) => {
  const path = (req.url ?? '/').split('?')[0];

  if (path === '/') return homeHandler(req, res);
  if (path === '/streaming') return streamingHandler(req, res);
  if (path === '/streaming-async') return streamingAsyncHandler(req, res);
  if (path === '/suspense') return suspenseHandler(req, res);
  if (path === '/error-boundary') return errorBoundaryHandler(req, res);
  if (path === '/keep-alive') return keepAliveHandler(req, res);
  if (path === '/router') return routerDemoHandler(req, res);

  res.statusCode = 404;
  return notFoundHandler(req, res);
}).listen(3000, () => {
  console.log('SSR dev server running at http://localhost:3000');
  console.log('');
  console.log('Routes:');
  console.log(
    '  /               standard SSR — View Source to inspect DSD output',
  );
  console.log(
    '  /streaming      streaming SSR (sync) — check Transfer-Encoding: chunked in DevTools',
  );
  console.log(
    '  /streaming-async  incremental streaming — async card arrives as a swap-script chunk after 800ms',
  );
  console.log('  /suspense       cer-suspense in SSR');
  console.log('  /error-boundary cer-error-boundary in SSR');
  console.log('  /keep-alive     cer-keep-alive opaque shell (no DSD)');
  console.log(
    '  /router?ref=email#section  matchRouteSSR query string stripping',
  );
  console.log('  /missing        404 handler');
});
