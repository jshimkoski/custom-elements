# SSR Roadmap: Competitive Server-Side Rendering for Custom Elements Runtime

## Executive Summary

This document audits the current SSR capabilities of `@jasonshimmy/custom-elements-runtime` and outlines a phased plan to achieve SSR parity with Vue 3, React 18, and Svelte 5 — while fully embracing the unique requirements of Web Components and shadow DOM.

The central challenge this library faces that Vue/React/Svelte do not: **shadow DOM content is not serialized by standard HTML**. Solving this cleanly — using Declarative Shadow DOM + JIT CSS injection — is the architectural keystone of this entire plan.

`npm run all:ci` must succeed with no errors or warnings throughout the implementation of these features. New tests will be added for each phase, and existing tests will be updated to cover new SSR behavior.

---

## Current State Audit

### What Exists Today

| Capability                           | Status         | Notes                                                                                                                                                                                                                                  |
| ------------------------------------ | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `renderToString(vnode)`              | ✅ Exists      | Renders VNode tree to HTML string                                                                                                                                                                                                      |
| `renderToStringWithJITCSS(vnode)`    | ✅ Exists      | SSR + pre-generates JIT CSS to prevent FOUC                                                                                                                                                                                            |
| SVG namespace injection              | ✅ Exists      | Injects `xmlns` on `<svg>` nodes                                                                                                                                                                                                       |
| HTML entity escaping                 | ✅ Exists      | `escapeHTML` utility                                                                                                                                                                                                                   |
| Void element handling                | ✅ Exists      | Self-closing tags serialized correctly                                                                                                                                                                                                 |
| Entity map utilities                 | ✅ Exists      | Full HTML5 named entity support                                                                                                                                                                                                        |
| Anchor/fragment blocks               | ✅ Exists      | `#anchor` VNode type preserved in SSR                                                                                                                                                                                                  |
| **Declarative Shadow DOM output**    | ✅ Implemented | `renderToStringDSD`, `renderToStringWithJITCSSDSD` (Phase 1)                                                                                                                                                                           |
| **`useStyle` CSS in SSR**            | ✅ Implemented | Captured via `ssr-context.ts` SSR render pass (Phase 1.2)                                                                                                                                                                              |
| **`baseReset` / transitions in SSR** | ✅ Implemented | Injected inside every `<template shadowrootmode="open">` (Phase 1.2)                                                                                                                                                                   |
| **`useGlobalStyle` CSS in SSR**      | ✅ Implemented | Captured in `SSRJITResult.globalStyles`, emitted in `<head>` (Phase 1.2)                                                                                                                                                               |
| **Hydration**                        | ✅ Implemented | DSD detection in constructor; `hydrateApp()` helper (Phase 2)                                                                                                                                                                          |
| **Streaming SSR**                    | ✅ Implemented | `renderToStream` → `ReadableStream<string>` (Phase 3)                                                                                                                                                                                  |
| **Partial hydration / Islands**      | ✅ Implemented | `load`/`idle`/`visible`/`none` strategies via `component()` option (Phase 4)                                                                                                                                                           |
| **SSR-safe async components**        | ⚠️ Partial     | Sync render only; async render functions yield empty shell for hydration                                                                                                                                                               |
| **Framework adapter middleware**     | ✅ Implemented | `createSSRHandler`, `createStreamingSSRHandler` in `ssr-middleware` (Phase 5.2)                                                                                                                                                        |
| **Routing with SSR**                 | ✅ Implemented | `matchRouteSSR` (strips `?query#fragment` automatically) + `initRouter({ initialUrl })` patterns; route guards, base path, 404 handling; documented in `docs/ssr.md` and `docs/ssr-middleware.md`; tested in `test/ssr-router.spec.ts` |
| **Built-in components in SSR**       | ✅ Implemented | `cer-suspense` and `cer-error-boundary` emit DSD output; `cer-keep-alive` renders as opaque shell; documented in `docs/ssr.md`; tested in `test/ssr-dsd.spec.ts`                                                                       |
| **Middleware error handling**        | ✅ Implemented | Both `createSSRHandler` and `createStreamingSSRHandler` catch factory/render errors, close the response, re-throw for framework error handlers                                                                                         |

### The Shadow DOM Problem

The most critical gap. Today, when a custom element like `<my-card>` is SSR-rendered, the output is:

```html
<my-card title="Hello">
  <!-- shadow DOM content: invisible to the serializer -->
</my-card>
```

The shadow root (and all its content) is **silently dropped**. The client receives a shell with no interior HTML, then JavaScript recreates the shadow DOM entirely from scratch. This means:

1. **No semantic HTML** is sent for screen readers, crawlers, or previews
2. **Layout shift** as shadow DOM pops in after JS loads
3. **The JIT CSS injected in `<head>`** targets class names that don't exist in light DOM yet — so even though styles are pre-generated, there is nothing to style until hydration completes
4. **No true hydration** is possible because there is nothing on the server HTML to reconcile against

### The JIT CSS FOUC Problem

`renderToStringWithJITCSS` correctly pre-generates and injects the global JIT styles into `<head>`. However, since shadow DOM is opaque, styles scoped to shadow roots (applied via `adoptedStyleSheets`) are **completely absent** on the initial HTML. Even with the `<style id="cer-ssr-jit">` tag in `<head>`, the shadow DOM content is missing, so there is nothing for those styles to apply to. The first visible paint is either:

- Unstyled custom element shells, or
- A flash of content appearing abruptly after JS runs

### The `useStyle` Gap — The Forgotten CSS Layer

Every component that calls `useStyle(() => css`...``)` registers a callback that is executed during each client-side render. The output is stored in `context._computedStyle` and merged with JIT CSS by `applyStyle()` before being injected into the shadow root via `adoptedStyleSheets`.

The server-side `renderToString` path **never executes render functions** — it only walks the VNode tree and serializes `props.attrs`. This means `useStyle` callbacks are never called, and all component-defined CSS is silently absent from SSR output.

The full set of CSS layers applied to a shadow root at runtime is:

| Layer                      | Source                                              | SSR Today                                 |
| -------------------------- | --------------------------------------------------- | ----------------------------------------- |
| Base reset + CSS variables | `baseReset` (static)                                | ❌ Not emitted                            |
| Transition animations      | `getTransitionStyleSheet()` (static)                | ❌ Not emitted                            |
| JIT utility classes        | `processJITCSS(html)` (dynamic, class-driven)       | ⚠️ Partially (global `<head>` only)       |
| Component styles           | `useStyle(() => css`...``)` (dynamic, props-driven) | ❌ Not emitted                            |
| Prose typography           | `getProseStyleSheet()` (dynamic, size-driven)       | ❌ Not emitted                            |
| Global styles              | `useGlobalStyle(() => css`...``)`                   | ❌ Silently skipped (has SSR no-op guard) |

This means a typical styled component — one that uses `useStyle` for `:host` layout rules alongside JIT utility classes for inner element spacing — loses **all of its styles** during SSR. The component renders visually broken until JavaScript hydrates and `adoptedStyleSheets` are applied.

**`useStyle` is particularly important for:**

- `:host` display, layout, and positioning rules (can't be expressed as JIT utility classes because JIT targets elements inside the shadow root, not the host)
- Dynamic theme switching (e.g., `background: ${theme === 'dark' ? '#111' : '#fff'}`)
- CSS custom property definitions scoped to the component
- Complex selectors that JIT utilities can't express (`:host(:focus-visible)`, `::slotted(*)`, etc.)

The consequence: even if Declarative Shadow DOM is implemented (Phase 1), without resolving `useStyle` serialization, the DSD output contains unstyled content until JS runs. True zero-FOUC requires capturing all CSS layers.

---

## Gap Analysis vs. Vue, React, and Svelte

| Feature                | React 18                    | Vue 3                         | Svelte 5               | This Library            |
| ---------------------- | --------------------------- | ----------------------------- | ---------------------- | ----------------------- |
| `renderToString`       | ✅                          | ✅                            | ✅                     | ✅                      |
| Streaming SSR          | ✅ `renderToPipeableStream` | ✅ `renderToNodeStream`       | ✅                     | ✅ `renderToStream`     |
| Hydration              | ✅ `hydrateRoot`            | ✅ `hydrateApp`               | ✅ `hydrate: true`     | ✅ `hydrateApp()`       |
| Partial hydration      | ✅ (Server Components)      | ✅ (via Nuxt islands)         | ✅ (via SvelteKit)     | ✅ `hydrate:` option    |
| Static rendering       | ✅ `renderToStaticMarkup`   | ✅                            | ✅                     | ✅                      |
| CSS-in-JS SSR          | ✅ (styled-components etc.) | ✅ `<style>` blocks extracted | ✅ `<style>` extracted | ✅ JIT + useStyle SSR   |
| Shadow DOM SSR         | ❌ N/A                      | ❌ N/A                        | ❌ N/A                 | ✅ **Unique feature**   |
| Declarative Shadow DOM | ❌ N/A                      | ❌ N/A                        | ❌ N/A                 | ✅ Implemented          |
| Framework adapters     | ✅ Many                     | ✅ Nuxt, Vite                 | ✅ SvelteKit           | ✅ Express/Fastify/Hono |

Notably, **no major framework has solved the shadow DOM SSR problem** because none of them are built on Web Components. This is an area where this library can become the definitive reference implementation.

---

## The Architectural Solution

### Core Insight: Declarative Shadow DOM (DSD)

The W3C standard solution for serializing shadow DOM into HTML is [Declarative Shadow DOM](https://developer.chrome.com/docs/css-ui/declarative-shadow-dom), shipping in all modern browsers since 2023:

```html
<my-card>
  <template shadowrootmode="open">
    <style>
      /* shadow-scoped styles */
    </style>
    <div class="card">
      <slot></slot>
    </div>
  </template>
  Slotted light DOM content here
</my-card>
```

When the browser parses this HTML, it **automatically creates the shadow root** from the `<template shadowrootmode="open">` before any JavaScript runs. This means:

- Shadow DOM content exists and is styled from byte one
- Screen readers and crawlers see the full semantic structure
- No layout shift — the shadow DOM is already there
- Hydration becomes possible: JS attaches reactivity to existing DOM rather than rebuilding it

**All CSS layers fit into this model**: inject the complete compiled stylesheet — `baseReset`, transitions, JIT CSS, and `useStyle` output — directly inside each `<template shadowrootmode="open">` during SSR as a single `<style>` block. Every layer is present at parse time, inside the correct shadow root scope, before any JavaScript.

---

## Implementation Plan

### Phase 1: Declarative Shadow DOM SSR Output ✅ COMPLETE

**Goal:** `renderToString` emits proper DSD HTML so shadow DOM content is serialized.

**Implementation:** `src/lib/runtime/vdom-ssr-dsd.ts` · `src/lib/runtime/ssr-context.ts` · `src/lib/ssr.ts`

#### 1.1 — New SSR Render Mode: `renderToDSD`

Extend `vdom-ssr.ts` to support a `dsd: true` render option that, when rendering a custom element VNode, wraps its children in a `<template shadowrootmode="open">` block:

```ts
// src/lib/runtime/vdom-ssr.ts

export type RenderOptions = {
  injectSvgNamespace?: boolean;
  injectKnownNamespaces?: boolean;
  /**
   * When true, custom element VNodes emit Declarative Shadow DOM output:
   *   <my-el><template shadowrootmode="open">...</template></my-el>
   * This enables hydration and eliminates shadow DOM content loss during SSR.
   * Default: false (backwards-compatible).
   */
  dsd?: boolean;
};
```

The renderer checks `vnode.props?.isCustomElement === true` (already tracked in the VNode type) and wraps children accordingly. The component registry is consulted to determine which tags are custom elements.

**Output shape:**

```html
<my-card class="featured">
  <template shadowrootmode="open">
    <style>
      .flex {
        display: flex;
      }
      .gap-4 {
        gap: 1rem;
      }
    </style>
    <div class="flex gap-4">
      <slot></slot>
    </div>
  </template>
</my-card>
```

#### 1.2 — Full CSS Layer Extraction for DSD Templates

When `dsd: true` is set, the SSR pipeline must capture **all four CSS layers** for each component and inject them as a single `<style>` block inside the `<template shadowrootmode="open">`. This requires two new mechanisms:

**Static layers (no render pass needed):**

- `baseReset` and CSS variable declarations are static strings — serialize them directly
- Transition animation CSS is also static — serialize it directly

These are included unconditionally in every component's DSD `<style>` block since they are present in every runtime shadow root.

**`useStyle` extraction — SSR render pass:**

`useStyle` callbacks must be executed on the server to capture their CSS output. Since the server has no running reactive system, a lightweight "SSR props context" is created:

```ts
// Conceptual SSR execution model for useStyle extraction
function extractComponentSSRStyles(
  tag: string,
  propsFromAttrs: Record<string, unknown>,
): string {
  const config = registry.get(tag);
  if (!config?.render) return '';

  let capturedStyle = '';

  // Set up a minimal SSR execution context
  const ssrContext = createSSRContext(propsFromAttrs);

  // Shim useStyle to capture output instead of storing on context
  withSSRStyleCapture(
    ssrContext,
    (captured) => {
      capturedStyle = captured;
    },
    () => {
      // Run the render function — only useStyle/useGlobalStyle are live;
      // reactive hooks (useOnConnected, watch, etc.) are no-ops in SSR context
      try {
        config.render(ssrContext);
      } catch {
        /* ignore render errors */
      }
    },
  );

  return capturedStyle;
}
```

The SSR execution context applies these rules for each hook called during the render pass:

| Hook                   | SSR Behavior                                                      |
| ---------------------- | ----------------------------------------------------------------- |
| `useStyle(cb)`         | Execute `cb()` immediately, capture the CSS string                |
| `useGlobalStyle(cb)`   | Execute `cb()`, collect CSS for global `<head>` injection         |
| `useProps(defaults)`   | Merge defaults with `propsFromAttrs` (serialize prop values)      |
| `useOnConnected`       | No-op                                                             |
| `useOnDisconnected`    | No-op                                                             |
| `watch`                | No-op                                                             |
| `useJITCSS`            | No-op (JIT CSS is extracted separately from rendered HTML)        |
| `html` template tag    | Return VNode tree normally (already called by DSD serializer)     |
| `ref()` / `computed()` | Return initial value (reactive reads are safe, writes are no-ops) |

**Important:** The render function is already called once by the DSD serializer to get the VNode tree. The `useStyle` SSR pass can be **combined with that render call** — there is no second render pass. The SSR execution context simply intercepts `useStyle` calls that happen during the existing render function invocation.

**JIT CSS from rendered HTML:**

After the VNode tree is obtained and serialized to HTML, the shadow content HTML is scanned by `jitCSS(shadowHtml)` to generate utility class CSS. This is scoped to the component's own HTML — not the full page — so there is no cross-component class pollution.

**Prose typography CSS:**

If the rendered HTML contains `prose-sm`, `prose-md`, or other prose size markers, the corresponding prose CSS is extracted and included in the same `<style>` block.

**The final DSD `<style>` block content (in order):**

```css
/* 1. Base reset + CSS custom properties (static) */
:host, *, ::before, ::after { box-sizing: border-box; ... }
:host { --cer-spacing-1: 0.25rem; ... }

/* 2. Transition animations (static) */
[data-cer-transition-enter] { ... }

/* 3. useStyle output (props-driven, from SSR render pass) */
:host { background: white; color: black; padding: 1rem; }

/* 4. JIT CSS (class-driven, from rendered shadow HTML) */
.flex { display: flex }
.gap-4 { gap: 1rem }

/* 5. Prose CSS (if detected) */
.prose-md { line-height: 1.7; ... }
```

**Updated SSR JIT result type:**

```ts
export interface SSRJITResult {
  html: string;
  css: string; // Global light-DOM JIT CSS (for non-shadow content)
  globalStyles: string; // Collected useGlobalStyle() output for <head>
  htmlWithStyles: string; // html with global <style> injected before </head>
  shadowCSS: Map<string, string>; // Per-component full CSS map (for diagnostics)
}
```

**`useGlobalStyle` in SSR:**

`useGlobalStyle` already has a no-op guard when `document` is undefined. The SSR render pass replaces this guard with a collector: instead of injecting into `document.adoptedStyleSheets`, the factory output is captured and returned in `SSRJITResult.globalStyles`. The caller injects this into `<head>` alongside the JIT CSS style tag:

```html
<head>
  <style id="cer-ssr-jit">
    /* global JIT CSS */
  </style>
  <style id="cer-ssr-global">
    /* useGlobalStyle output: @font-face, :root vars, etc. */
  </style>
</head>
```

#### 1.3 — DSD Polyfill Injection

For browsers that don't support DSD (Firefox < 123), inject the [DSD polyfill script](https://developer.chrome.com/docs/css-ui/declarative-shadow-dom#polyfill) automatically when `dsd: true` is used. Add a `renderOptions.dsdPolyfill` flag (default `true` when `dsd: true`) that appends:

```html
<script>
  (function () {
    if (HTMLTemplateElement.prototype.hasOwnProperty('shadowRootMode')) return;
    document.querySelectorAll('template[shadowrootmode]').forEach((t) => {
      const m = t.getAttribute('shadowrootmode');
      const s = t.parentElement.attachShadow({ mode: m });
      s.appendChild(t.content);
      t.remove();
    });
  })();
</script>
```

This script is inlined (not external) and runs synchronously before the body is parsed, ensuring DSD content is available even on unsupported browsers.

---

### Phase 2: Hydration ✅ COMPLETE

**Goal:** The client-side runtime detects DSD-rendered elements and attaches reactivity to existing DOM instead of rebuilding from scratch.

**Implementation:** `src/lib/runtime/component/element-class.ts` · `src/lib/runtime/hydration.ts`

#### 2.1 — Hydration Detection in `element-class.ts`

In `createElementClass`, modify the `constructor` and `connectedCallback` to detect if the element already has a shadow root (from DSD parsing):

```ts
// element-class.ts - constructor
constructor() {
  super();
  // Detect Declarative Shadow DOM: if a shadow root was already attached
  // by the browser during HTML parsing, reuse it instead of creating new.
  const existingRoot = this.shadowRoot;
  if (!existingRoot) {
    this.attachShadow({ mode: 'open' });
  }
  this._isHydrating = existingRoot !== null;
  // ... rest of constructor
}
```

#### 2.2 — Hydration Render Mode

Introduce a `_hydrateRender` path in the render pipeline. Instead of `patch(newVNode, null, shadowRoot)` (which creates all DOM fresh), it calls `patch(newVNode, existingVNodeFromDOM, shadowRoot)` which reconciles against the existing DSD-rendered DOM:

```ts
// render.ts
function renderComponent(shadowRoot, cfg, context, refs, ...) {
  const isHydrating = (shadowRoot.host as HydratableElement)._isHydrating;

  if (isHydrating) {
    // First render: attach event listeners and reactive bindings to existing DOM
    // Do NOT create new elements — reconcile against existing DSD content
    hydrateVNodeTree(vnode, shadowRoot);
    (shadowRoot.host as HydratableElement)._isHydrating = false;
    return;
  }

  // Normal client-side render path
  vdomRenderer(shadowRoot, [vnode], refs);
}
```

The `hydrateVNodeTree` function walks the VNode tree and existing DOM in parallel, attaching:

- Event listeners from directives
- Reactive bindings from `:model`, `:bind` etc.
- Ref assignments
- Without touching the actual DOM node structure

#### 2.3 — `hydrateApp` Helper

Expose a top-level `hydrateApp(root)` helper (mirroring `Vue.hydrateApp` / React's `hydrateRoot`) that triggers hydration of all custom elements within a root:

```ts
// src/lib/index.ts (new export)
export function hydrateApp(root: Element | Document = document): void;
```

Internally this dispatches a `cer:hydrate` custom event that each registered element listens for, triggering their hydration pass in document order.

#### 2.4 — Hydration Style Handoff

After the DSD template is parsed by the browser, the `<style>` block that was injected during SSR exists as a child `<style>` element inside the shadow root. After hydration completes on a component, the runtime:

1. Reads and discards the SSR `<style>` child node from the shadow root (it contained the serialized static + `useStyle` + JIT CSS)
2. Runs `applyStyle()` normally via the first client-side render — this re-executes `useStyle` callbacks with live reactive state and applies all CSS layers via `adoptedStyleSheets`
3. The reactive JIT CSS and `useStyle` engines take over and continue updating styles as state changes

The window between initial paint and hydration completion is bridged by the SSR-injected `<style>` block, which holds the initial-state CSS for all layers. Because the initial-state CSS on the server exactly matches what the first client render would produce (given the same props), the visual transition is imperceptible.

---

### Phase 3: Streaming SSR ✅ COMPLETE

**Goal:** Enable `renderToStream` for faster Time-to-First-Byte on large pages.

**Implementation:** `src/lib/ssr.ts` — `renderToStream()` returns a `ReadableStream<string>` with true incremental streaming. Synchronous components are flushed immediately as chunk 1. Components whose `render` function returns a `Promise` emit a placeholder in chunk 1; as each promise resolves, an inline `<script>` swap block is streamed to replace the placeholder with the full DSD HTML. `createStreamingSSRHandler` pipes chunks directly to `res.write()` as they arrive.

#### 3.1 — `renderToStream(vnode, options)`

Add a new export to `src/lib/ssr.ts`:

```ts
export function renderToStream(
  vnode: VNode,
  options?: RenderOptions & { jit?: JITCSSOptions },
): ReadableStream<string>;
```

The implementation uses a `ReadableStream` with a custom controller. Synchronous subtrees are flushed immediately; async component boundaries (components whose render function returns a `Promise<VNode>`) are `await`-ed and their output is enqueued as it resolves.

This mirrors React 18's `renderToPipeableStream` behavior: the shell (synchronous content) is sent first for fast TTFB, then async "holes" are filled in as they resolve with inline `<script>` blocks that swap content.

#### 3.2 — Async Component Boundaries

Async component holes emit a placeholder element with a unique `id` and an empty `<template shadowrootmode="open">`:

```html
<my-async-card id="cer-stream-0">
  <template shadowrootmode="open"></template>
</my-async-card>
```

The DSD polyfill (or native browser support) attaches an empty shadow root during HTML parse. When the component's async render resolves, a swap `<script>` fills the existing shadow root via `shadowRoot.innerHTML`:

```html
<script>
  (function () {
    var e = document.getElementById('cer-stream-0');
    if (!e) return;
    var s = e.shadowRoot;
    if (!s && e.attachShadow)
      try {
        s = e.attachShadow({ mode: 'open' });
      } catch (_) {}
    if (s)
      s.innerHTML =
        '<style>/* CSS layers */</style><div>Resolved content</div>';
    e.removeAttribute('id');
  })();
</script>
```

> **Why `shadowRoot.innerHTML` and not `outerHTML`:** The shadow root is already attached at parse time (native DSD or polyfill). Replacing via `outerHTML` would require the browser to re-process `<template shadowrootmode>` in script-injected HTML — which renders at zero height in Chrome. Filling the existing shadow root directly via `innerHTML` is reliable across all browsers.

---

### Phase 4: Partial Hydration (Island Architecture) ✅ COMPLETE

**Goal:** Allow marking components as "static" (no JS), "lazy" (hydrate on visibility), or "deferred" (hydrate on idle) — reducing JS sent to the client and improving TTI.

**Implementation:** `src/lib/runtime/component/element-class.ts` · `src/lib/runtime/component/factory.ts` · `src/lib/runtime/types.ts`

#### 4.1 — Hydration Directives

Extend the `component()` API with an optional `hydrate` option:

```ts
component(
  'my-card',
  () => {
    /* ... */
  },
  {
    hydrate: 'load', // Hydrate immediately (default for DSD elements)
    // hydrate: 'idle'    // Hydrate on requestIdleCallback
    // hydrate: 'visible' // Hydrate on IntersectionObserver
    // hydrate: 'none'    // Never hydrate (static, server-rendered only)
  },
);
```

#### 4.2 — SSR Hydration Annotations

The DSD serializer emits the hydration strategy as a data attribute on the host element:

```html
<my-card data-cer-hydrate="visible">
  <template shadowrootmode="open">...</template>
</my-card>
```

The client-side runtime reads `data-cer-hydrate` before scheduling hydration:

| Value     | Behavior                                                          |
| --------- | ----------------------------------------------------------------- |
| `load`    | Hydrate synchronously when the element connects                   |
| `idle`    | `requestIdleCallback(() => hydrate())`                            |
| `visible` | `new IntersectionObserver(...)` triggers hydration                |
| `none`    | Element is registered as a custom element stub that never renders |

#### 4.3 — `hydrate: 'none'` — Fully Static Components

For `hydrate: 'none'` elements, the client registers a minimal no-op custom element that preserves the DSD shadow root and never initializes the component runtime. Zero JavaScript overhead for these components after registration.

---

### Phase 5: Framework Adapters and Developer Experience ✅ COMPLETE (5.1 + 5.2; 5.3 future)

**Goal:** Make SSR as easy to adopt as Vue/Nuxt, React/Next, or Svelte/SvelteKit.

#### 5.1 — Vite SSR Plugin Enhancement ✅ COMPLETE

**Implementation:** `src/lib/vite-plugin.ts` — `cerPlugin()` (combined JIT CSS + SSR config). Exposes `virtual:cer-ssr-config` so server entry files can import the resolved render options.

Extend the existing `vite-plugin` entry to support SSR builds:

```ts
// vite.config.ts
import { cerPlugin } from '@jasonshimmy/custom-elements-runtime/vite-plugin';

export default defineConfig({
  plugins: [
    cerPlugin({
      ssr: {
        dsd: true, // Enable Declarative Shadow DOM output
        streaming: true, // Enable streaming SSR
        jit: {
          extendedColors: true,
        },
      },
    }),
  ],
});
```

The plugin automatically:

- Separates client and server bundles
- Tree-shakes SSR-only code from the client bundle
- Injects the DSD polyfill script in the correct location
- Handles `import.meta.ssr` guards

#### 5.2 — Node.js Middleware Helpers ✅ COMPLETE

**Implementation:** `src/lib/ssr-middleware.ts` — `createSSRHandler()` and `createStreamingSSRHandler()`, importable from `@jasonshimmy/custom-elements-runtime/ssr-middleware`.

```ts
// src/lib/ssr-middleware.ts (new)
import type { Request, Response } from 'express';

export function createSSRHandler(appVNode: VNode, options?: SSROptions) {
  return async (req: Request, res: Response) => {
    const { htmlWithStyles } = renderToStringWithJITCSS(appVNode, {
      dsd: true,
      jit: { extendedColors: true },
    });

    res.setHeader('Content-Type', 'text/html');
    res.send(
      `<!DOCTYPE html><html><head>${headTags}</head><body>${htmlWithStyles}</body></html>`,
    );
  };
}

// Streaming variant
export function createStreamingSSRHandler(
  appVNode: VNode,
  options?: SSROptions,
) {
  return async (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Transfer-Encoding', 'chunked');
    const stream = renderToStream(appVNode, options);
    for await (const chunk of stream) {
      res.write(chunk);
    }
    res.end();
  };
}
```

#### 5.3 — Astro Integration ⏳ FUTURE

Publish a separate `@jasonshimmy/custom-elements-runtime-astro` adapter that:

- Treats `component()` registrations as Astro components
- Outputs DSD-compatible HTML from Astro's SSR pipeline
- Respects Astro's `client:*` directives (mapping to the hydration strategy system)

#### 5.4 — Developer-Facing API Summary ✅ COMPLETE

The complete SSR surface area:

```ts
// Server rendering
import {
  renderToString, // Basic SSR (backwards-compatible)
  renderToStringWithJITCSS, // SSR + JIT CSS extraction; supports dsd: true
  renderToStringWithJITCSSDSD, // Convenience alias: DSD mode on by default
  renderToStream, // Streaming SSR → ReadableStream<string>
  DSD_POLYFILL_SCRIPT, // Inline polyfill for Firefox < 123
  type SSRJITResult,
} from '@jasonshimmy/custom-elements-runtime/ssr';

// Client hydration
import { hydrateApp } from '@jasonshimmy/custom-elements-runtime';

// Framework middleware (Express / Fastify / Hono / raw Node.js)
import {
  createSSRHandler,
  createStreamingSSRHandler,
} from '@jasonshimmy/custom-elements-runtime/ssr-middleware';

// Vite plugin (vite.config.ts)
import {
  cerPlugin,
  cerJITCSS,
} from '@jasonshimmy/custom-elements-runtime/vite-plugin';

// Partial hydration — component() third parameter
component(
  'my-widget',
  () => {
    /* ... */
  },
  { hydrate: 'visible' },
);
```

Usage is intentionally minimal — one import, one option, done.

---

### Phase 6: Testing and Validation Infrastructure ✅ COMPLETE

**Goal:** Prevent regressions and validate hydration correctness.

**Implementation:** `test/ssr-dsd.spec.ts` · `test/ssr-middleware.spec.ts` · `test/vite-plugin-cer.spec.ts` · `test/ssr-router.spec.ts` (119 tests across 4 files covering all implemented features including SSR + routing integration, built-in components in SSR, middleware error handling, and query-string-safe route matching)

#### 6.1 — Hydration Mismatch Detection (Dev Mode)

In development builds, after each hydration pass, compare the server-rendered DOM (read from the DSD template content) against the first client-rendered VNode tree. Log actionable mismatches:

```
[CER hydration mismatch] <my-card>
  Server:  <div class="card featured">
  Client:  <div class="card">
  Cause:   Prop "featured" was truthy on server but falsy on client.
  Hint:    Ensure prop values are identical between server and client renders.
```

#### 6.2 — SSR Test Utilities

Add test helpers to the existing Vitest suite:

```ts
import {
  ssrRender,
  hydrateAndVerify,
} from '@jasonshimmy/custom-elements-runtime/test-utils';

it('hydrates without mismatch', async () => {
  const { html, mismatches } = await hydrateAndVerify(
    html`<my-card title="Hello" />`,
    { dsd: true },
  );
  expect(mismatches).toHaveLength(0);
});
```

---

## Migration Path

The plan is **100% backwards-compatible**. All new behavior is opt-in:

| Change            | Opt-In Mechanism                                 | Default       |
| ----------------- | ------------------------------------------------ | ------------- |
| DSD output        | `renderToString(vnode, { dsd: true })`           | `false`       |
| Hydration         | Presence of DSD in HTML                          | Off if no DSD |
| Streaming         | Use `renderToStream` instead of `renderToString` | N/A           |
| Partial hydration | `{ hydrate: 'visible' }` in `component()`        | `'load'`      |

Existing users calling `renderToString` without `dsd: true` get identical output to today.

---

## Technical Constraints and Considerations

### Declarative Shadow DOM Browser Support

DSD is supported in Chrome 90+, Safari 16.4+, Firefox 123+. The polyfill covers older Firefox versions. For IE11 / legacy environments, the polyfill path falls back gracefully to client-side shadow root creation (existing behavior).

### `attachShadow` on Elements That Already Have a Shadow Root

The Web Components spec throws a `DOMException` if `attachShadow` is called on an element that already has a shadow root. The hydration detection in Phase 2.1 must check `this.shadowRoot !== null` before calling `attachShadow`. This is a single-line guard but must be present in every code path.

### `useStyle` with Reactive State on the Server

`useStyle` callbacks frequently interpolate reactive values: `background: ${isDark.value ? '#111' : '#fff'}`. On the server, `ref()` and `computed()` return their initial values — there is no signal system running. This means:

- **Props-driven styles are accurate**: if `useStyle` reads from `useProps()`, the SSR context populates props from `vnode.props.attrs`, so the CSS matches what the client would produce for those prop values
- **`ref()`/`computed()` styles use initial values**: the server serializes the initial state, which is the correct value for a first render before any user interaction
- **No side effects fire**: `watch()`, `useOnConnected()`, and other lifecycle hooks are no-ops in the SSR render pass, so state mutations that happen in `onConnected` are not reflected in SSR styles — this is intentional and matches React/Vue SSR behavior

This is the same constraint that React has with `useState` initial values during SSR. The developer contract is: the initial render (both server and client) must be deterministic given only the component's props.

If a `useStyle` callback throws during the SSR render pass (e.g., because it accesses a DOM API), the error is caught and the layer is omitted gracefully — the static layers (`baseReset`, JIT CSS) are still present and the component is not broken.

### `useStyle` with Third-Party `css` Tagged Templates

The `css` template tag is a tagged template literal that returns a CSS string. On the server it behaves identically to a regular template string — no DOM access, no special processing. The SSR render pass can call it safely.

### Slot Passthrough in DSD

Slotted light DOM content is **outside** the `<template shadowrootmode="open">` block. The SSR serializer must correctly place slotted children in the light DOM portion of the custom element's output, not inside the template:

```html
<my-card>
  <template shadowrootmode="open">
    <div class="card-inner"><slot></slot></div>
  </template>
  <!-- Slotted children go here, in light DOM -->
  <p>This content fills the slot</p>
</my-card>
```

The VNode for a custom element must distinguish between shadow-DOM children (rendered inside the template) and slot-projected children (rendered as light DOM siblings).

### JIT CSS Scope During Hydration

Between HTML parse-complete and JS hydration, styles live in:

- **Shadow DOM**: Inside the `<style>` child of the parsed `<template>` content (now embedded in the shadow root as a child node)
- **Light DOM**: In the `<style id="cer-ssr-jit">` tag in `<head>`

After hydration, the runtime replaces both with `adoptedStyleSheets`. During the transition, both are simultaneously valid — no gap in styling.

### SSR and the Component Registry

The SSR renderer needs to know which VNode tags are registered custom elements (to decide whether to emit DSD wrapping). The component registry (`registry.ts`) must be importable in Node.js SSR contexts. Today's `createElementClass` already returns a minimal no-op class when `window === undefined` — the registry itself is already SSR-safe.

### Reactive State on the Server

The SSR renderer is intentionally stateless — it only serializes `props.attrs` and does not run reactive state, watchers, or lifecycle hooks. This matches the behavior of React's `renderToString` (no `useEffect`) and Vue's `renderToString` (no `onMounted`). Server-side async data fetching must be resolved before calling `renderToString`, with the resulting data passed as props.

---

## Implementation Status

| Phase | Feature                                                                          | Status      |
| ----- | -------------------------------------------------------------------------------- | ----------- |
| 1     | DSD SSR Output (`renderToStringDSD`, `renderToStringWithJITCSSDSD`)              | ✅ Complete |
| 1.2   | Full CSS extraction (`baseReset` + `useStyle` + JIT CSS per shadow root)         | ✅ Complete |
| 1.3   | DSD polyfill injection (`DSD_POLYFILL_SCRIPT`)                                   | ✅ Complete |
| 2     | Hydration detection in constructor (skip `attachShadow` for DSD elements)        | ✅ Complete |
| 2.3   | `hydrateApp()` helper                                                            | ✅ Complete |
| 3     | `renderToStream()` — `ReadableStream<string>` API                                | ✅ Complete |
| 3     | True incremental streaming (shell-first, async component placeholders)           | ✅ Complete |
| 4     | Partial hydration — `load`/`idle`/`visible`/`none` strategies                    | ✅ Complete |
| 4.2   | `data-cer-hydrate` attribute emitted during DSD SSR                              | ✅ Complete |
| 5.1   | Vite plugin SSR — `cerPlugin()` with `virtual:cer-ssr-config`                    | ✅ Complete |
| 5.2   | Node.js middleware — `createSSRHandler`, `createStreamingSSRHandler`             | ✅ Complete |
| 5.2.1 | Middleware error handling — factory/render errors close response, re-throw       | ✅ Complete |
| 5.3   | Astro integration adapter                                                        | ⏳ Future   |
| 5.4   | Routing with SSR — `matchRouteSSR` (query-string-safe), `initRouter`             | ✅ Complete |
| 5.5   | Built-in components SSR — `cer-suspense`, `cer-error-boundary`, `cer-keep-alive` | ✅ Complete |
| 6     | SSR test suite (DSD, middleware, vite-plugin, routing) — 119 tests               | ✅ Complete |
| 6.1   | Hydration mismatch detection (dev mode warnings)                                 | ⏳ Future   |

---

## Conclusion

The path to competitive SSR for this library is clear and technically sound. The key insight — **Declarative Shadow DOM as the serialization primitive, with JIT CSS co-located inside each `<template shadowrootmode="open">`** — solves the shadow DOM SSR problem in a way that no other framework has needed to address. Done well, this becomes a genuine differentiator: the only component framework that delivers true shadow DOM SSR with hydration, zero-FOUC, and island architecture support.

The implementation is incremental (Phase 1 alone is a major improvement over the current state), backwards-compatible (all opt-in), and aligns with existing Web Platform standards rather than working around them.
