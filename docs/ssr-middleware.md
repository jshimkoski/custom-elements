# 🌐 SSR Middleware

Framework-agnostic SSR handler factories for Express, Fastify, Hono, raw Node.js, and any HTTP framework that uses `(req, res)` handler signatures.

**Package:** `@jasonshimmy/custom-elements-runtime/ssr-middleware`

---

## Quick Start

```ts
import express from 'express';
import { createSSRHandler } from '@jasonshimmy/custom-elements-runtime/ssr-middleware';
import { html } from '@jasonshimmy/custom-elements-runtime';
import './components'; // register all components

const app = express();

app.get(
  '*',
  createSSRHandler((req) => html`<my-app url="${req.url}" />`, {
    render: { dsd: true, jit: { extendedColors: true } },
  }),
);

app.listen(3000);
```

---

## API

### `createSSRHandler(vnodeOrFactory, options?)`

Returns an async `(req, res) => Promise<void>` handler that:

1. Resolves the VNode (calls the factory if provided, otherwise uses the static VNode directly)
2. Renders with `renderToStringWithJITCSS`
3. Wraps in a `<!DOCTYPE html>` document shell (unless `document: false`)
4. Sets `Content-Type: text/html; charset=utf-8`
5. Calls `res.end(body)`

```ts
import { createSSRHandler } from '@jasonshimmy/custom-elements-runtime/ssr-middleware';

// Static VNode
app.get('/', createSSRHandler(html`<my-app />`));

// Per-request factory (sync)
app.get(
  '*',
  createSSRHandler((req) => html`<my-app url="${req.url}" />`),
);

// Per-request factory (async)
app.get(
  '*',
  createSSRHandler(async (req) => {
    const data = await fetchPageData(req.url);
    return html`<my-app data="${JSON.stringify(data)}" />`;
  }),
);
```

### `createStreamingSSRHandler(vnodeOrFactory, options?)`

Returns an async `(req, res) => Promise<void>` handler that streams the rendered HTML. When `res.write` is available, it sets `Transfer-Encoding: chunked` and writes each chunk incrementally. When `res.write` is absent (e.g. some serverless or test environments), it falls back to buffering the full response and sending it via `res.end()`.

```ts
import { createStreamingSSRHandler } from '@jasonshimmy/custom-elements-runtime/ssr-middleware';

app.get(
  '*',
  createStreamingSSRHandler((req) => html`<my-app url="${req.url}" />`, {
    render: { dsd: true },
  }),
);
```

---

## Options (`SSRMiddlewareOptions`)

```ts
interface SSRMiddlewareOptions {
  /**
   * Render options forwarded to renderToStringWithJITCSS.
   * Defaults to { dsd: true }.
   */
  render?: RenderOptions & DSDRenderOptions & { jit?: JITCSSOptions };

  /**
   * Additional HTML inserted at the end of the <head> tag.
   * Use this to add <link>, <script>, <meta>, or <title> tags.
   */
  head?: string;

  /**
   * When true (default), the response is wrapped in a complete
   * <!DOCTYPE html> document shell.
   * Set to false to receive the rendered fragment only.
   */
  document?: boolean;
}
```

### Default render options

The default render options are `{ dsd: true }`, so Declarative Shadow DOM output is enabled out of the box. Override with the `render` key:

```ts
createSSRHandler(vnode, {
  render: {
    dsd: true,
    dsdPolyfill: true, // append the DSD polyfill script (default: true)
    jit: { extendedColors: true },
  },
});
```

---

## Framework Examples

### Express (static VNode)

```ts
import express from 'express';
import { createSSRHandler } from '@jasonshimmy/custom-elements-runtime/ssr-middleware';
import { html } from '@jasonshimmy/custom-elements-runtime';
import './components';

const app = express();

app.get(
  '/',
  createSSRHandler(html`<my-home />`, {
    head: '<link rel="stylesheet" href="/app.css"><title>Home</title>',
    render: { dsd: true, jit: { extendedColors: true } },
  }),
);

app.listen(3000);
```

### Express (per-request factory + streaming)

```ts
import express from 'express';
import {
  createSSRHandler,
  createStreamingSSRHandler,
} from '@jasonshimmy/custom-elements-runtime/ssr-middleware';
import { html } from '@jasonshimmy/custom-elements-runtime';
import './components';

const app = express();

// Non-streaming — good for small pages
app.get(
  '/about',
  createSSRHandler(() => html`<my-about />`),
);

// Streaming — better TTFB for large pages
app.get(
  '*',
  createStreamingSSRHandler((req) => html`<my-app url="${req.url}" />`, {
    render: { dsd: true },
  }),
);

app.listen(3000);
```

### Fastify

```ts
import Fastify from 'fastify';
import { createSSRHandler } from '@jasonshimmy/custom-elements-runtime/ssr-middleware';
import { html } from '@jasonshimmy/custom-elements-runtime';
import './components';

const app = Fastify();

// Fastify's reply object is compatible with MinimalResponse
app.get(
  '*',
  createSSRHandler((req) => html`<my-app url="${req.url}" />`, {
    render: { dsd: true },
  }),
);

app.listen({ port: 3000 });
```

### Hono (Edge / Cloudflare Workers / Bun)

Hono's `Context` doesn't expose a `res`-style response object. Use the render functions directly:

```ts
import { Hono } from 'hono';
import { renderToStringWithJITCSSDSD } from '@jasonshimmy/custom-elements-runtime/ssr';
import { html } from '@jasonshimmy/custom-elements-runtime';
import './components';

const app = new Hono();

app.get('*', (c) => {
  const vnode = html`<my-app url="${c.req.path}" />`;
  const { htmlWithStyles } = renderToStringWithJITCSSDSD(vnode);
  return c.html(
    `<!DOCTYPE html><html><head></head><body>${htmlWithStyles}</body></html>`,
  );
});

export default app;
```

### Raw Node.js `http`

```ts
import http from 'node:http';
import { createSSRHandler } from '@jasonshimmy/custom-elements-runtime/ssr-middleware';
import { html } from '@jasonshimmy/custom-elements-runtime';
import './components';

const handler = createSSRHandler(() => html`<my-app />`, {
  render: { dsd: true },
});

http
  .createServer(async (req, res) => {
    await handler(req, res);
  })
  .listen(3000);
```

---

## Custom Request Type

The generic `Req` parameter lets you type the request object with your framework's type:

```ts
import type { Request } from 'express';
import { createSSRHandler } from '@jasonshimmy/custom-elements-runtime/ssr-middleware';

const handler = createSSRHandler<Request>(
  (req) => html`<my-app user="${req.user?.name ?? 'Guest'}" />`,
);
```

---

## Fragment Rendering (`document: false`)

When `document: false`, the handler sends the raw rendered fragment without a `<!DOCTYPE html>` shell. Useful when you're assembling the document in a layout template:

```ts
app.get(
  '/widgets/card',
  createSSRHandler((req) => html`<my-card id="${req.query.id}" />`, {
    document: false,
  }),
);
```

---

## Head Injection

The `head` option inserts additional HTML before `</head>` in the document shell:

```ts
createSSRHandler(vnode, {
  head: `
    <title>My App</title>
    <meta name="description" content="...">
    <link rel="stylesheet" href="/fonts.css">
    <link rel="icon" href="/favicon.ico">
  `,
});
```

---

## TypeScript Types

```ts
import type {
  MinimalRequest,
  MinimalResponse,
  SSRMiddlewareOptions,
} from '@jasonshimmy/custom-elements-runtime/ssr-middleware';
```

| Type                   | Description                                                    |
| ---------------------- | -------------------------------------------------------------- |
| `MinimalRequest`       | Minimal `{ url?, method?, headers? }` interface                |
| `MinimalResponse`      | Minimal `{ setHeader, write?, end }` interface                 |
| `SSRMiddlewareOptions` | Options for `createSSRHandler` and `createStreamingSSRHandler` |

---

## Router Integration

Combine `createSSRHandler` with `matchRouteSSR` and `initRouter` for full server-side routing.

### Route-Based Handler (Pattern 1)

Use `matchRouteSSR` in the factory to pick the correct component for each request:

```ts
import express from 'express';
import { createSSRHandler } from '@jasonshimmy/custom-elements-runtime/ssr-middleware';
import { matchRouteSSR } from '@jasonshimmy/custom-elements-runtime/router';
import { html } from '@jasonshimmy/custom-elements-runtime';
import './components';

const routes = [
  { path: '/', component: 'home-page' },
  { path: '/about', component: 'about-page' },
  { path: '/blog/:slug', component: 'blog-post' },
];

const app = express();

app.get('*', createSSRHandler(
  (req) => {
    const { route, params } = matchRouteSSR(routes, req.url ?? '/');
    if (!route) return html`<not-found-page />`;
    return html`<${route.component} ...${params} />`;
  },
  { render: { dsd: true, jit: { extendedColors: true } } },
));

app.listen(3000);
```

### Full Router Initialization (Pattern 2)

For apps where components read route state (active links, route params), initialize the router before rendering so `activeRouterProxy` reflects the correct route:

```ts
import express from 'express';
import { createSSRHandler } from '@jasonshimmy/custom-elements-runtime/ssr-middleware';
import { initRouter } from '@jasonshimmy/custom-elements-runtime/router';
import { html } from '@jasonshimmy/custom-elements-runtime';
import { routes } from './routes';
import './components';

const app = express();

app.get('*', createSSRHandler(
  (req) => {
    // Pre-compiles routes and sets active route state for this render.
    initRouter({ routes, initialUrl: req.url });
    return html`<my-app />`;
  },
  { render: { dsd: true } },
));

app.listen(3000);
```

> See [SSR Routing guide](./ssr.md#routing-with-ssr) for a full explanation of both patterns, 404 handling, client hydration handoff, and base-path configuration.

---

## Related

- [SSR guide](./ssr.md) — full DSD SSR documentation, including routing integration
- [Vite Plugin](./vite-plugin.md) — build-time JIT CSS + SSR config
