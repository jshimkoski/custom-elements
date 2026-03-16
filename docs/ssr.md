# 🖥️ Server-Side Rendering (SSR)

A complete guide to SSR in the custom elements runtime. Covers Declarative Shadow DOM output, hydration, streaming, partial hydration (island architecture), and framework integration.

## Overview

The runtime provides first-class SSR that goes beyond what Vue, React, or Svelte offer: **Declarative Shadow DOM (DSD) serialization**. Where those frameworks can't serialize shadow DOM at all, this runtime captures every CSS layer — `baseReset`, `useStyle()` output, and JIT utility classes — and injects them directly inside each `<template shadowrootmode="open">` element. The result is a complete, styled, hydration-ready HTML document at first byte.

| Feature                 | This library              | Vue 3             | React 18               | Svelte 5       |
| ----------------------- | ------------------------- | ----------------- | ---------------------- | -------------- |
| `renderToString`        | ✅                        | ✅                | ✅                     | ✅             |
| Shadow DOM SSR (DSD)    | ✅ **Unique**             | ❌ N/A            | ❌ N/A                 | ❌ N/A         |
| `useStyle` CSS in SSR   | ✅                        | N/A               | N/A                    | N/A            |
| `useGlobalStyle` in SSR | ✅                        | ✅ (scoped CSS)   | ✅ (styled-components) | ✅ (`<style>`) |
| JIT CSS pre-generation  | ✅                        | ❌                | ❌                     | ❌             |
| Hydration               | ✅                        | ✅                | ✅                     | ✅             |
| Partial hydration       | ✅ `hydrate:` option      | ✅ (Nuxt islands) | ✅ (Server Components) | ✅ (SvelteKit) |
| Streaming SSR           | ✅                        | ✅                | ✅                     | ✅             |
| Framework middleware    | ✅ (Express/Fastify/Hono) | ✅ (Nuxt)         | ✅ (Next.js)           | ✅ (SvelteKit) |

---

## Rendering Modes

### 1. `renderToString` — Basic SSR (backwards-compatible)

Serializes a VNode tree to HTML. Shadow DOM content is not serialized — custom elements render as opaque shells. Use this for simple pages that don't use custom elements or where DSD output is not required.

```ts
import { renderToString } from '@jasonshimmy/custom-elements-runtime/ssr';

const html = renderToString(vnode);
```

### 2. `renderToStringWithJITCSS` — SSR + JIT CSS

Same as `renderToString` but also pre-generates JIT CSS from the rendered HTML. The `htmlWithStyles` result has the CSS injected before `</head>`.

```ts
import { renderToStringWithJITCSS } from '@jasonshimmy/custom-elements-runtime/ssr';

const { htmlWithStyles } = renderToStringWithJITCSS(appVNode, {
  jit: { extendedColors: true },
});
res.send(
  `<!DOCTYPE html><html><head>${head}</head><body>${htmlWithStyles}</body></html>`,
);
```

### 3. `renderToStringWithJITCSSDSD` — Recommended for all new apps

Full Declarative Shadow DOM output with per-shadow-root CSS (baseReset + useStyle + JIT CSS), DSD polyfill for Firefox < 123, and JIT CSS pre-generation. This is the recommended rendering mode.

```ts
import { renderToStringWithJITCSSDSD } from '@jasonshimmy/custom-elements-runtime/ssr';

const { htmlWithStyles } = renderToStringWithJITCSSDSD(appVNode, {
  jit: { extendedColors: true },
});
res.send(
  `<!DOCTYPE html><html><head>${head}</head><body>${htmlWithStyles}</body></html>`,
);
```

### 4. `renderToStringDSD` — DSD only (no JIT CSS)

Emits DSD HTML and the browser polyfill, without running the JIT CSS pipeline. Useful when you don't use utility classes.

```ts
import { renderToStringDSD } from '@jasonshimmy/custom-elements-runtime/ssr';

const html = renderToStringDSD(appVNode);
```

### 5. `renderToStream` — Streaming SSR

Returns a `ReadableStream<string>` for chunked transfer encoding. Integrates with any framework that can consume a `ReadableStream` or `res.write()`.

```ts
import { renderToStream } from '@jasonshimmy/custom-elements-runtime/ssr';

const stream = renderToStream(appVNode, { dsd: true });
```

---

## Declarative Shadow DOM (DSD) SSR

### What is DSD?

[Declarative Shadow DOM](https://developer.chrome.com/docs/css-ui/declarative-shadow-dom) is a W3C standard that lets browsers create shadow roots from HTML before any JavaScript runs:

```html
<my-card>
  <template shadowrootmode="open">
    <style>
      /* all CSS layers */
    </style>
    <div class="card"><slot></slot></div>
  </template>
  <!-- light DOM / slotted children here -->
</my-card>
```

The browser parses `<template shadowrootmode="open">` and attaches a real shadow root during HTML parsing. Before any JavaScript, the component is:

- Fully rendered with its shadow DOM content
- Completely styled (no FOUC, no layout shift)
- Visible to screen readers and search crawlers
- Ready for hydration when JS loads

**Browser support:** Chrome 90+, Safari 16.4+, Firefox 123+. The runtime automatically appends a polyfill for older browsers.

### CSS Layer Stack in DSD Output

The runtime injects all CSS layers into a single `<style>` block inside each `<template shadowrootmode="open">`:

```html
<my-card>
  <template shadowrootmode="open">
    <style>
      /* 1. Base reset + CSS custom properties (static) */
      :host,
      *,
      ::before,
      ::after {
        box-sizing: border-box;
      }
      :host {
        --cer-spacing-1: 0.25rem; /* … */
      }

      /* 2. useStyle() output (props-driven, from SSR render pass) */
      :host {
        background: white;
        padding: 1rem;
      }
      :host([theme='dark']) {
        background: #111;
      }

      /* 3. JIT utility CSS (extracted from shadow HTML) */
      .flex {
        display: flex;
      }
      .gap-4 {
        gap: 1rem;
      }
    </style>
    <!-- shadow DOM rendered by the component's render function -->
    <div class="flex gap-4"><slot></slot></div>
  </template>
  <!-- slotted light DOM children -->
</my-card>
```

This means every shadow root has its complete, scoped stylesheet present at parse time — eliminating both FOUC and layout shift entirely.

### `useStyle` in SSR

`useStyle()` callbacks are **executed on the server** during the DSD SSR render pass. The SSR context:

- Populates props from the element's serialized attributes
- Runs `useStyle` callbacks synchronously
- Captures the CSS output into the shadow root's `<style>` block
- Catches and ignores render errors (component renders as empty shell, not a crash)

```ts
component('themed-card', () => {
  const props = useProps({ theme: 'light' });
  useStyle(
    () => css`
      :host {
        background: ${props.theme === 'dark' ? '#111' : '#fff'};
        color: ${props.theme === 'dark' ? '#fff' : '#111'};
      }
    `,
  );
  return html`<div class="p-4"><slot></slot></div>`;
});
```

When rendered server-side with `theme="dark"`:

```html
<themed-card theme="dark">
  <template shadowrootmode="open">
    <style>
      :host {
        background: #111;
        color: #fff;
      }
      .p-4 {
        padding: 1rem;
      }
    </style>
    <div class="p-4"><slot></slot></div>
  </template>
</themed-card>
```

The initial paint is correct and fully styled, with no JavaScript required.

### `useGlobalStyle` in SSR

`useGlobalStyle()` factories are captured during the SSR render pass and returned in `SSRJITResult.globalStyles`. Inject them in a `<style id="cer-ssr-global">` in `<head>`:

```ts
const { htmlWithStyles, globalStyles } = renderToStringWithJITCSSDSD(appVNode);

// htmlWithStyles already injects globalStyles before </head>
res.send(
  `<!DOCTYPE html><html><head>${head}</head><body>${htmlWithStyles}</body></html>`,
);

// Or inject manually:
const html = `
  <!DOCTYPE html><html>
  <head>
    <style id="cer-ssr-global">${globalStyles}</style>
    <style id="cer-ssr-jit">${css}</style>
  </head>
  <body>${html}</body>
  </html>
`;
```

---

## `SSRJITResult`

```ts
interface SSRJITResult {
  /** Rendered HTML (no styles injected) */
  html: string;
  /** Global JIT CSS for light-DOM utility classes */
  css: string;
  /** CSS from useGlobalStyle() calls — inject in <head> */
  globalStyles: string;
  /** html with <style> tags injected before </head> (or prepended) */
  htmlWithStyles: string;
}
```

---

## Hydration

When a page is served with DSD output, the browser parses the `<template shadowrootmode="open">` elements and creates shadow roots before JavaScript loads. When the JS bundle loads and custom element definitions are registered, the runtime detects the existing shadow root and hydrates it (attaches reactivity) instead of rebuilding the DOM.

### How hydration works

1. **HTML parsing:** The browser parses `<template shadowrootmode="open">` and attaches shadow roots with all CSS layers already present.
2. **First paint:** The component is rendered and styled with zero JavaScript.
3. **JS loads:** Custom element definitions are registered.
4. **Element upgrade:** The constructor detects `this.shadowRoot !== null` (already set by DSD) and skips `attachShadow()`.
5. **`connectedCallback`:** The runtime reads `data-cer-hydrate` (if present) and applies the hydration strategy.
6. **Reactivity attached:** Reactive state, watchers, and event listeners are initialized. The component is fully interactive.

### `hydrateApp()`

Import and call `hydrateApp()` after registering all components to trigger activation:

```ts
import { component, hydrateApp } from '@jasonshimmy/custom-elements-runtime';
import './components'; // registers all components via component()

hydrateApp(); // activate all DSD-rendered components on the page
```

```ts
// Optionally scope to a specific root element
hydrateApp(document.getElementById('app')!);
```

---

## Partial Hydration (Island Architecture)

Control when each component hydrates using the `hydrate` option in `component()`. The strategy is serialized as a `data-cer-hydrate` attribute during DSD SSR and read by the client runtime on `connectedCallback`.

### Hydration strategies

| Strategy           | Behavior                                                              | Use case                                           |
| ------------------ | --------------------------------------------------------------------- | -------------------------------------------------- |
| `'load'` (default) | Hydrate immediately when the element connects                         | Interactive components visible on load             |
| `'idle'`           | Defer to `requestIdleCallback` (or `setTimeout(cb, 200)`)             | Below-fold or low-priority components              |
| `'visible'`        | Hydrate when the element enters the viewport (`IntersectionObserver`) | Lazy sections, infinite scroll, below-fold content |
| `'none'`           | Never hydrate — keep DSD content as static HTML                       | Pure display components, server-only content       |

```ts
component(
  'hero-banner',
  () => {
    // Large hero section — hydrate immediately
    return html`<div class="hero">...</div>`;
  },
  { hydrate: 'load' },
);

component(
  'product-grid',
  () => {
    // Hydrate when scrolled into view
    return html`<div class="grid">...</div>`;
  },
  { hydrate: 'visible' },
);

component(
  'footer-links',
  () => {
    // Hydrate during browser idle time
    return html`<nav>...</nav>`;
  },
  { hydrate: 'idle' },
);

component(
  'static-badge',
  () => {
    // Never hydrate — pure display, no JS needed
    return html`<span class="badge">New</span>`;
  },
  { hydrate: 'none' },
);
```

### SSR output with partial hydration

```html
<!-- hydrate: 'load' — no attribute emitted (default) -->
<hero-banner>
  <template shadowrootmode="open">...</template>
</hero-banner>

<!-- hydrate: 'visible' -->
<product-grid data-cer-hydrate="visible">
  <template shadowrootmode="open">...</template>
</product-grid>

<!-- hydrate: 'none' -->
<static-badge data-cer-hydrate="none">
  <template shadowrootmode="open">...</template>
</static-badge>
```

---

## Streaming SSR

`renderToStream` returns a `ReadableStream<string>`. Currently the entire HTML is flushed as a single chunk; true incremental streaming (shell-first, async component placeholders) is planned for a future release.

### Node.js example

```ts
import { renderToStream } from '@jasonshimmy/custom-elements-runtime/ssr';

app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');

  const stream = renderToStream(appVNode, { dsd: true });
  const reader = stream.getReader();

  const pump = () =>
    reader.read().then(({ value, done }) => {
      if (done) {
        res.end();
        return;
      }
      res.write(value);
      pump();
    });
  pump();
});
```

### Web Streams API (Deno / Cloudflare Workers / Bun)

```ts
import { renderToStream } from '@jasonshimmy/custom-elements-runtime/ssr';

export default {
  fetch(req: Request) {
    const stream = renderToStream(appVNode, { dsd: true });
    return new Response(stream, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  },
};
```

---

## Framework Integration

### Express

```ts
import express from 'express';
import { html } from '@jasonshimmy/custom-elements-runtime';
import { renderToStringWithJITCSSDSD } from '@jasonshimmy/custom-elements-runtime/ssr';
import './components'; // register all components

const app = express();

app.get('*', (req, res) => {
  const vnode = html`<my-app url="${req.path}" />`;

  const { htmlWithStyles } = renderToStringWithJITCSSDSD(vnode, {
    jit: { extendedColors: true },
  });

  res.send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>My App</title>
  </head>
  <body>${htmlWithStyles}</body>
</html>`);
});

app.listen(3000);
```

### Fastify

```ts
import Fastify from 'fastify';
import { renderToStringWithJITCSSDSD } from '@jasonshimmy/custom-elements-runtime/ssr';
import './components';

const app = Fastify();

app.get('*', async (req, reply) => {
  const vnode = html`<my-app url="${req.url}" />`;
  const { htmlWithStyles } = renderToStringWithJITCSSDSD(vnode);
  reply
    .type('text/html')
    .send(
      `<!DOCTYPE html><html><head></head><body>${htmlWithStyles}</body></html>`,
    );
});

app.listen({ port: 3000 });
```

### Hono (Edge / Cloudflare Workers)

```ts
import { Hono } from 'hono';
import { renderToStringWithJITCSSDSD } from '@jasonshimmy/custom-elements-runtime/ssr';
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

### Using the Middleware Helpers

For even less boilerplate, use `createSSRHandler` from the dedicated middleware package:

```ts
import { createSSRHandler } from '@jasonshimmy/custom-elements-runtime/ssr-middleware';
import './components';

app.get(
  '*',
  createSSRHandler((req) => html`<my-app url="${req.url}" />`, {
    render: { dsd: true, jit: { extendedColors: true } },
  }),
);
```

See the [SSR Middleware guide](./ssr-middleware.md) for full details.

---

## DSD Polyfill

The `DSD_POLYFILL_SCRIPT` constant is a minified inline `<script>` that implements DSD for browsers without native support (Firefox < 123). It is automatically appended when using `renderToStringDSD`, `renderToStringWithJITCSSDSD`, or `renderToStringWithJITCSS` with `dsd: true`.

```ts
import { DSD_POLYFILL_SCRIPT } from '@jasonshimmy/custom-elements-runtime/ssr';

// The polyfill processes all <template shadowrootmode> elements synchronously.
// It is a no-op on browsers with native DSD support.
console.log(DSD_POLYFILL_SCRIPT);
// <script>(function(){if(HTMLTemplateElement.prototype.hasOwnProperty('shadowRootMode'))return;...})()</script>
```

To suppress the polyfill (e.g., you target modern browsers only):

```ts
renderToStringDSD(vnode, { dsdPolyfill: false });
```

---

## SVG Namespace Injection

By default, `renderToString` and all DSD render functions inject `xmlns="http://www.w3.org/2000/svg"` onto `<svg>` elements to match the client's namespace-aware DOM. Opt out with `injectSvgNamespace: false`.

```ts
renderToStringDSD(vnodeWithSVG, { injectSvgNamespace: false });
```

---

## Entity Map

For full HTML5 named-entity decoding in SSR (e.g. `&rsquo;`, `&hellip;`):

```ts
import {
  registerEntityMap,
  loadEntityMap,
} from '@jasonshimmy/custom-elements-runtime/ssr';
import entities from '@jasonshimmy/custom-elements-runtime/entities.json' assert { type: 'json' };

// Register at server startup — do this before handling any requests
registerEntityMap(entities);
```

---

## API Reference

### `renderToString(vnode, options?)`

| Option                  | Type      | Default                      | Description                             |
| ----------------------- | --------- | ---------------------------- | --------------------------------------- |
| `injectSvgNamespace`    | `boolean` | `true`                       | Inject `xmlns` on `<svg>` elements      |
| `injectKnownNamespaces` | `boolean` | follows `injectSvgNamespace` | Inject known namespaces for MathML etc. |

### `renderToStringWithJITCSS(vnode, options?)`

All `renderToString` options, plus:

| Option        | Type            | Default                   | Description                                                           |
| ------------- | --------------- | ------------------------- | --------------------------------------------------------------------- |
| `dsd`         | `boolean`       | `false`                   | Enable Declarative Shadow DOM output                                  |
| `dsdPolyfill` | `boolean`       | `true` (when `dsd: true`) | Append DSD polyfill script                                            |
| `jit`         | `JITCSSOptions` | —                         | JIT CSS options (`extendedColors`, `customColors`, `disableVariants`) |

Returns `SSRJITResult`.

### `renderToStringWithJITCSSDSD(vnode, options?)`

Convenience alias: `renderToStringWithJITCSS(vnode, { ...options, dsd: true })`.

### `renderToStringDSD(vnode, options?)`

All `DSDRenderOptions` (same as `renderToStringWithJITCSS` options minus `jit`). Returns a plain HTML string.

### `renderToStream(vnode, options?)`

All `DSDRenderOptions` + `jit`. Returns `ReadableStream<string>`.

### `hydrateApp(root?)`

| Param  | Type                  | Default    | Description             |
| ------ | --------------------- | ---------- | ----------------------- |
| `root` | `Element \| Document` | `document` | Root element to hydrate |

---

## Routing with SSR

The runtime's router has two integration points for SSR: a lightweight route-matching utility for framework-level decisions, and a full router initialization path so route-aware components produce correct output during the SSR pass.

### Pattern 1 — Route-Based Component Selection (recommended)

Use `matchRouteSSR` to decide which component to render for a given URL, then pass extracted params as props:

```ts
import { matchRouteSSR } from '@jasonshimmy/custom-elements-runtime/router';
import { renderToStringWithJITCSSDSD } from '@jasonshimmy/custom-elements-runtime/ssr';
import { html } from '@jasonshimmy/custom-elements-runtime';
import './components'; // register components

const routes = [
  { path: '/', component: 'home-page' },
  { path: '/about', component: 'about-page' },
  { path: '/blog/:slug', component: 'blog-post' },
];

app.get('*', (req, res) => {
  const { route, params } = matchRouteSSR(routes, req.path);

  if (!route) {
    res.status(404).send('Not Found');
    return;
  }

  const vnode = html`<${route.component} ...${params} />`;
  const { htmlWithStyles } = renderToStringWithJITCSSDSD(vnode);

  res.send(
    `<!DOCTYPE html><html><head></head><body>${htmlWithStyles}</body></html>`,
  );
});
```

### Pattern 2 — Full Router Initialization

For apps that use route-aware components (components that read `activeRouterProxy` or call `useRouter`), initialize the router with `initialUrl` before rendering. This pre-compiles all routes and sets the active route state so components produce correct output:

```ts
import { initRouter } from '@jasonshimmy/custom-elements-runtime/router';
import { renderToStringWithJITCSSDSD } from '@jasonshimmy/custom-elements-runtime/ssr';
import { html } from '@jasonshimmy/custom-elements-runtime';

const routes = [
  { path: '/', component: 'home-page' },
  { path: '/about', component: 'about-page' },
];

app.get('*', (req, res) => {
  // Initialize the router with the request URL. Triggers SSR mode:
  // no window/history access, push/replace call navigateSSR().
  initRouter({ routes, initialUrl: req.url });

  const { htmlWithStyles } = renderToStringWithJITCSSDSD(html`<my-app />`);

  res.send(
    `<!DOCTYPE html><html><head></head><body>${htmlWithStyles}</body></html>`,
  );
});
```

> **Note:** `<router-view>` has an async render function and emits an empty shadow-root during SSR (content is hydrated on the client). Use Pattern 1 to render route-matched content directly in the SSR output.

### Client-Side Hydration Handoff

Re-initialize the router in your client entry **without** `initialUrl` so it switches to browser mode (reads `window.location`, listens for navigation events):

```ts
// entry-client.ts
import { initRouter } from '@jasonshimmy/custom-elements-runtime/router';
import { hydrateApp } from '@jasonshimmy/custom-elements-runtime/ssr';
import { routes } from './routes';

initRouter({ routes }); // no initialUrl → browser mode
hydrateApp();
```

### 404 Handling

`matchRouteSSR` returns `{ route: null, params: {} }` when no route matches. Use this to set an HTTP 404 status or render a not-found component:

```ts
const { route, params } = matchRouteSSR(routes, req.path);

if (!route) {
  res.status(404);
  const { htmlWithStyles } = renderToStringWithJITCSSDSD(
    html`<not-found-page />`,
  );
  res.send(`<!DOCTYPE html>...<body>${htmlWithStyles}</body></html>`);
  return;
}
```

### URL Normalization

`matchRouteSSR` automatically strips query strings and URL fragments before matching, so you can pass `req.url` directly:

```ts
// ✅ Both of these match '/blog/:slug'
const { route } = matchRouteSSR(routes, req.path); // '/blog/hello-world'
const { route } = matchRouteSSR(routes, req.url); // '/blog/hello-world?ref=email#section'
```

> **Note:** The lower-level `matchRoute` function does NOT strip query strings. Always use `matchRouteSSR` in server-side code.

### Sub-Path Base

If your application is served from a sub-path (e.g. `/app`), pass `base` to `initRouter`. Route definitions still use root-relative paths — the base is stripped automatically during matching:

```ts
initRouter({ routes, base: '/app', initialUrl: req.url });
```

---

## Built-in Components in SSR

The runtime ships three built-in components. Their SSR behavior differs based on how they are registered.

### Registration overview

| Component            | Registration method       | In SSR registry | DSD output in SSR  |
| -------------------- | ------------------------- | --------------- | ------------------ |
| `cer-suspense`       | `component()` (runtime)   | ✅ Yes          | ✅ Yes             |
| `cer-error-boundary` | `component()` (runtime)   | ✅ Yes          | ✅ Yes             |
| `cer-keep-alive`     | `customElements.define()` | ❌ No           | ❌ No (shell only) |

Call the register helpers at server startup before rendering:

```ts
import {
  registerSuspense,
  registerErrorBoundary,
  registerBuiltinComponents, // registers all three in one call
} from '@jasonshimmy/custom-elements-runtime';

// register once at startup (choose one approach)
registerBuiltinComponents(); // convenience helper — registers all three

// or register individually:
// registerSuspense();
// registerErrorBoundary();
```

---

### `cer-suspense`

`cer-suspense` is registered via `component()` and appears in the SSR registry. The SSR renderer emits a full `<template shadowrootmode="open">` block whose shadow content depends on the `pending` attribute.

| `pending` value | Shadow content rendered                          |
| --------------- | ------------------------------------------------ |
| `false` / unset | `<slot></slot>` — shows default content          |
| `true`          | `<slot name="fallback"></slot>` — shows fallback |

**SSR output (pending not set / false):**

```html
<cer-suspense>
  <template shadowrootmode="open">
    <slot></slot>
  </template>
  <!-- light DOM (slotted children) rendered here -->
  <my-async-widget></my-async-widget>
</cer-suspense>
```

**SSR output (pending="true"):**

```html
<cer-suspense pending="true">
  <template shadowrootmode="open">
    <slot name="fallback"></slot>
  </template>
  <span slot="fallback">Loading…</span>
</cer-suspense>
```

> **Why this matters:** Server-side, all async work should be resolved before rendering. Set `pending` to `true` only when you deliberately want to show a loading placeholder in the initial HTML (rare).

---

### `cer-error-boundary`

`cer-error-boundary` is registered via `component()` and emits a DSD `<template>` during SSR. There is no error state server-side — errors are a runtime concept that requires JavaScript. The shadow content is always a `<slot>` that projects the default children.

**SSR output:**

```html
<cer-error-boundary>
  <template shadowrootmode="open">
    <slot></slot>
  </template>
  <!-- light DOM children projected into the default slot -->
  <my-widget></my-widget>
</cer-error-boundary>
```

On the client, if a child throws during hydration, the error boundary renders its `fallback` slot instead. The SSR output itself is always the happy path.

---

### `cer-keep-alive`

`cer-keep-alive` uses `customElements.define()` with a `typeof window === 'undefined'` guard rather than `component()`. This means it is **not** in the SSR component registry.

**SSR output (opaque shell — no DSD wrapping):**

```html
<cer-keep-alive>
  <!-- light DOM children rendered as-is -->
  <my-widget></my-widget>
</cer-keep-alive>
```

No `<template shadowrootmode="open">` is emitted because the renderer does not know the element's shadow structure. This is intentional — `cer-keep-alive` is a purely client-side mechanism for preserving component state across route changes. It has no meaningful server-side representation.

---

## SSR Best Practices

- **Use `renderToStringWithJITCSSDSD`** for all new applications — it is the zero-FOUC, DSD-enabled, hydration-ready path.
- **Register components before rendering** — the DSD renderer consults the registry to know which tags need shadow DOM wrapping.
- **Pass a single root VNode to all render functions** — `html` produces a fragment (undefined tag) when given multiple root elements, which the SSR renderer cannot process. Wrap multi-element output in a single container:

  ```ts
  // ❌ Multiple roots — produces an unrenderable fragment
  renderToStringWithJITCSSDSD(
    html`<my-header></my-header>
      <main>…</main>`,
  );

  // ✅ Single root
  renderToStringWithJITCSSDSD(
    html`<div>
      <my-header></my-header>
      <main>…</main>
    </div>`,
  );

  // ✅ Or use a top-level custom element as the root
  renderToStringWithJITCSSDSD(html`<my-app url="${req.url}" />`);
  ```

- **`component()` is safe to call in bare Node.js** — it registers the component in the SSR registry without touching browser APIs. No DOM polyfill (`jsdom`, `happy-dom`) is required on your server.
- **Keep render functions synchronous** — async render functions return a Promise; the SSR pass cannot await them and renders an empty shell instead.
- **Match prop values between server and client** — `useStyle` callbacks are executed with the same prop values on both server and client, producing identical CSS.
- **Use `hydrate: 'none'` for static content** — display-only components that never need interactivity can opt out of JS entirely.
- **Avoid DOM APIs in render** — render functions must be pure and safe to call in a Node.js environment without a DOM.

---

## FAQ

**Q: Does DSD work with slots?**
A: Yes. Slotted children in `vnode.children` are rendered outside the `<template>` element as light DOM siblings, exactly where the browser expects them.

**Q: Does the runtime preserve server-rendered DOM during hydration?**
A: The existing shadow DOM from DSD parsing is preserved at first paint and styled by the SSR-injected `<style>` block. When the component's first reactive render runs, it replaces the shadow DOM content. To avoid a visible transition, ensure `useStyle` output and class names are identical between server and client renders (they are, given the same props).

**Q: What happens if a component isn't in the registry during SSR?**
A: An empty `<template shadowrootmode="open"></template>` shell is emitted, and the client hydrates normally when JS loads.

**Q: Can I use `watch`, `useOnConnected`, etc. during SSR?**
A: These hooks register harmlessly to arrays that are never invoked in the SSR pass. They fire normally on the client after hydration.

**Q: Is the DSD polyfill safe to include on modern browsers?**
A: Yes. The polyfill's first line is a feature detection check that returns immediately on browsers with native DSD support.

**Q: Can I pass a VNode with multiple root elements to `renderToStringWithJITCSSDSD`?**
A: No. The renderer requires a single root VNode. The `html` tag produces a fragment with an undefined tag when a template has multiple top-level elements, and the renderer cannot process an undefined tag. Always wrap in a single root — a `<div>`, a `<body>`, or a top-level custom element like `<my-app />`.

**Q: Do I need `jsdom` or `happy-dom` on my Node.js SSR server?**
A: No. `component()`, `registerBuiltinComponents()`, and all SSR render functions are safe to call in bare Node.js — they do not require browser globals. Only avoid calling DOM APIs (`document`, `window`, etc.) inside component render functions themselves.
