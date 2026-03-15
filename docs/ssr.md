# 🖥️ Server-Side Rendering (SSR) Deep Dive

A comprehensive guide to SSR support in the custom elements runtime. Learn how SSR works, how to use it, and best practices for building universal web components.

## 🌐 What is SSR?

Server-Side Rendering (SSR) is the process of generating HTML on the server and sending it to the client, where the runtime performs a fresh client render to attach event listeners, bindings, and styles. SSR improves performance, SEO, and user experience by delivering ready-to-display content.

- **Purpose:** Faster initial load, better SEO, improved accessibility.
- **Benefits:** Universal rendering, progressive enhancement, reduced time-to-interactive.

## 🏗️ SSR Architecture in the Runtime

- **Functional API:** Components are defined as pure functions/configs, making them easy to render on the server.
- **No DOM Dependency:** SSR mode avoids direct DOM APIs, using VNode trees for output.
- **Client render:** The client runtime performs a fresh render that replaces server-generated markup and attaches event listeners, bindings, and styles.
- **Error Boundaries:** SSR gracefully handles errors and fallback rendering.

## ⚡ How SSR Works

1. **Component registration:** Components are registered as usual.
2. **SSR detection:** If `window` is undefined, the runtime switches to SSR mode.
3. **VNode rendering:** The `render` function returns VNode trees, which are serialized to HTML.
4. **No DOM/lifecycle:** In SSR, no DOM APIs or lifecycle hooks are called.
5. **Client render:** On the client, the runtime performs a fresh render that replaces the server-rendered markup and attaches event listeners, bindings, and styles. There is no incremental DOM-preserving hydration — the client render starts fresh inside the shadow root.

## 🧩 SSR-Friendly Component Example

```typescript
import {
  component,
  ref,
  html,
  useProps,
} from '@jasonshimmy/custom-elements-runtime';

component('ssr-demo', () => {
  const props = useProps({ message: 'Hello SSR!' });
  const msg = ref(props.message);
  return html`<div>${msg.value}</div>`;
});
```

- On the server: `render` returns a VNode, which is converted to HTML.
- On the client: The runtime performs a fresh render, replacing the server markup and enabling interactivity.

Rendering to string with `renderToString`

The runtime provides `renderToString` for SSR. Import it from the dedicated SSR entry (`@jasonshimmy/custom-elements-runtime/ssr`) so bundlers don't pull server-only code into the client bundle. Use `html` to build VNodes on the server and `renderToString` to produce markup.

Basic usage

```typescript
import { html } from '@jasonshimmy/custom-elements-runtime';
import { renderToString } from '@jasonshimmy/custom-elements-runtime/ssr';

const vnode = html`<div>Hello ${'world'}</div>`;
const htmlString = renderToString(vnode);
// -> '<div>Hello world</div>'
```

Rendering a component render function

```typescript
// components/hello.ts
export function renderHello(ctx: { name: string }) {
  return html`<div>Hello ${ctx.name}</div>`;
}

// server.js
import { renderToString } from '@jasonshimmy/custom-elements-runtime/ssr';
import { renderHello } from './components/hello';

const vnode = renderHello({ name: 'Alice' });
const renderedHtml = renderToString(vnode);
```

Async renders

If `render` returns a Promise, await it before stringifying:

```ts
const vnode = await maybeAsyncRender(ctx);
const renderedHtml = renderToString(vnode);
```

Minimal server example

```js
import http from 'node:http';
import { renderToString } from '@jasonshimmy/custom-elements-runtime/ssr';
import { renderHello } from './components/hello';

http
  .createServer((req, res) => {
    const vnode = renderHello({ name: 'Server' });
    const body = renderToString(vnode);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html><html><head></head><body>${body}</body></html>`);
  })
  .listen(3000);
```

Client-side render example

Register the same component on the client. When the custom element upgrades, the runtime performs a fresh client-side render inside the shadow root — it does not preserve the server-rendered markup. Keep server and client render output identical to avoid a visible content shift on upgrade.

```html
<!doctype html>
<html>
  <head></head>
  <body>
    <!-- server rendered -->
    <ssr-demo><div>Hello SSR!</div></ssr-demo>
    <script type="module">
      import {
        component,
        ref,
        html,
        useProps,
      } from '@jasonshimmy/custom-elements-runtime';

      component('ssr-demo', () => {
        const props = useProps({ message: 'Hello SSR!' });
        const msg = ref(props.message);
        return html`<div>${msg.value}</div>`;
      });

      // Runtime will re-render <ssr-demo> client-side, replacing the server HTML.
    </script>
  </body>
</html>
```

Notes

- `renderToString` serializes VNode attributes from the `props.attrs` bag only; runtime-only values (functions, reactive state objects, directive metadata) are intentionally excluded from serialization.
  - Supports two rendering options:
    - `injectSvgNamespace?: boolean` (default: `true`) — when true, the SSR renderer will inject the standard SVG namespace attribute (`xmlns=\"http://www.w3.org/2000/svg\"`) onto `<svg>` elements that do not already provide an explicit `xmlns`.
    - `injectKnownNamespaces?: boolean` (default: follows `injectSvgNamespace`) — when true, the renderer will also inject known non-HTML namespaces for well-known top-level tags (for example `<math>` will receive the MathML namespace) when the vnode doesn't provide an explicit `xmlns`.
- Server rendering does not execute client lifecycle hooks.
- Ensure server and client render shapes match to avoid a visible content shift on first render.

## 🖼️ SVG namespace behavior

When rendering SVGs on the server you can encounter subtle differences between
server-produced markup and the client DOM unless namespaces are handled
explicitly. The client runtime creates SVG elements using the SVG namespace
internally (equivalent to `document.createElementNS('http://www.w3.org/2000/svg', ...)`).
To avoid namespace mismatches between the server-rendered string and the client DOM, the SSR renderer injects the standard SVG namespace attribute on `<svg>` elements by default.

Key points:

- By default, `renderToString(vnode)` will add `xmlns="http://www.w3.org/2000/svg"`
  to any `<svg>` vnode that doesn't already include an explicit `xmlns` attribute.
  This mirrors client-side behavior and makes the server output portable across
  parsers (HTML/XML).
- If a vnode already provides an `xmlns` on the `<svg>` or any child element,
  the renderer preserves that value verbatim (child overrides parent).
- You can opt out of the automatic injection when you need minimal markup by
  passing the `injectSvgNamespace: false` option.

API and examples

```ts
import { renderToString } from '@jasonshimmy/custom-elements-runtime/ssr';

// Default: injects xmlns on <svg> if missing
const htmlDefault = renderToString(vnodeTree);

// Opt-out: do not auto-insert the SVG namespace
const htmlNoNs = renderToString(vnodeTree, { injectSvgNamespace: false });
```

When to keep the default (recommended)

- If the client runtime will render the same component tree, leave the default enabled so SVG namespaces match between server HTML and the fresh client render.
- If your server output may be parsed by an XML/XHTML consumer or re-used in contexts where the HTML parser isn't available, an explicit xmlns is safer.

When to opt out

- If you intentionally need the smallest possible HTML output and you control the client parsing context, you can set `injectSvgNamespace: false`.

## 🛠️ SSR Fallback Logic

- In SSR mode, `createElementClass` returns a minimal class with no DOM or lifecycle logic.
- Only the `render` function is used to generate output.
- No `this` ctx or browser APIs are accessed.

**Example:**

```typescript
if (typeof window === 'undefined') {
  // SSR fallback: minimal class, no DOM, no lifecycle
  return class {
    constructor() {}
  };
}
```

## 🔄 Client Render (Not Hydration)

> **Important:** This runtime does **not** implement DOM-preserving hydration. The client performs a full fresh render inside each component's shadow root, replacing whatever the server placed there.

- **Server:** Renders HTML from VNode trees, which is sent to the browser
- **Client:** Runs a fresh render pass, discarding server HTML and building new DOM nodes from VNodes
- **Match output:** Because the client replaces server HTML, ensure that server and client render functions produce visually identical output to avoid a flash of content change on first render
- **Error handling:** Render errors are caught by error boundaries

## 🚀 SSR Best Practices

- **Avoid direct DOM manipulation:** Use VNode trees and pure functions
- **Keep logic stateless:** SSR should not depend on browser-only APIs
- **Use error boundaries:** Provide fallback UI for rendering errors
- **Match server and client output:** Ensure both render functions produce identical markup to avoid a visible content shift on upgrade

## 📚 Example: Universal Component

```typescript
component('universal-greeting', () => {
  const props = useProps({ name: 'World' });
  const greeting = ref(props.name);
  return html`<h1>Hello, ${greeting.value}!</h1>`;
});
```

- Works in SSR and client environments
- Client re-renders seamlessly for interactivity

## 🎨 SSR with JIT CSS Pre-generation (`renderToStringWithJITCSS`)

Use `renderToStringWithJITCSS()` to server-render a VNode tree **and** simultaneously pre-generate the JIT CSS for every utility class in the output. Embedding this CSS in `<head>` eliminates the Flash of Unstyled Content (FOUC) that occurs when the client runtime applies styles on the first client render.

```ts
import { html } from '@jasonshimmy/custom-elements-runtime';
import { renderToStringWithJITCSS } from '@jasonshimmy/custom-elements-runtime/ssr';

const appVNode = html`<div
  class="flex items-center gap-4 bg-primary-500 text-white p-4 rounded-lg"
>
  <h1 class="text-2xl font-bold">Hello from SSR</h1>
</div>`;

const {
  html: bodyHTML,
  css,
  htmlWithStyles,
} = renderToStringWithJITCSS(appVNode);

// Option A: use htmlWithStyles (pre-injects a <style> before </head>)
res.send(
  `<!DOCTYPE html><html><head>${headTags}</head><body>${htmlWithStyles}</body></html>`,
);

// Option B: use html + css separately
res.send(`<!DOCTYPE html><html>
  <head>${headTags}<style id="cer-ssr-jit">${css}</style></head>
  <body>${bodyHTML}</body>
</html>`);
```

### Options

```ts
renderToStringWithJITCSS(
  vnode: VNode,
  options?: RenderOptions & {
    jit?: JITCSSOptions; // extendedColors, customColors, disableVariants
  }
): SSRJITResult
```

### `SSRJITResult`

| Property         | Description                                                                              |
| ---------------- | ---------------------------------------------------------------------------------------- |
| `html`           | The rendered HTML string (no styles injected)                                            |
| `css`            | Pre-generated JIT CSS for all utility classes found in `html`                            |
| `htmlWithStyles` | `html` with `<style id="cer-ssr-jit">…</style>` injected before `</head>` (or prepended) |

### With extended colors

```ts
const { htmlWithStyles } = renderToStringWithJITCSS(appVNode, {
  jit: { extendedColors: true },
});
```

### Express example

```ts
import express from 'express';
import { html } from '@jasonshimmy/custom-elements-runtime';
import { renderToStringWithJITCSS } from '@jasonshimmy/custom-elements-runtime/ssr';

const app = express();

app.get('*', (req, res) => {
  const vnode = html`<div class="flex flex-col gap-6 p-8">
    <h1 class="text-3xl font-bold text-primary-500">My App</h1>
    <p class="text-neutral-700">Server rendered with JIT CSS.</p>
  </div>`;

  const { htmlWithStyles } = renderToStringWithJITCSS(vnode, {
    jit: { extendedColors: true },
  });

  res.send(`<!DOCTYPE html><html lang="en">
    <head><meta charset="utf-8"><title>My App</title></head>
    <body>${htmlWithStyles}</body>
  </html>`);
});

app.listen(3000);
```

---

## 🗺️ registerEntityMap (server-side entity map)

When performing server-side rendering you may want full HTML5 named-entity decoding (e.g. `&rsquo;`, `&hellip;`, etc.). The library keeps the client bundle small by not shipping the full entity map to the browser. If your SSR pipeline needs complete decoding, register a full entity map at server startup.

### Why register?

- The full HTML5 entity map is large. Publishing it with the client bundle would bloat CDN and npm consumers.
- This API lets server deployments opt in to the full map while keeping the library tiny for browsers.

### API

- `registerEntityMap(map: Record<string,string>, options?: { overwrite?: boolean })` — register the full map before rendering. First registration wins by default.
- `loadEntityMap(): Promise<Record<string,string>>` — dynamically load the full HTML5 named-entity map (useful in SSR pipelines that need complete entity support). Returns a promise that resolves to the map — the runtime tries the published package's `entities.json` first and falls back to a minimal inline map when the JSON cannot be loaded.
- `clearRegisteredEntityMap()` — clear the registration (useful in tests).

All three are importable from `@jasonshimmy/custom-elements-runtime/ssr`.

### Example (Express)

```js
// server.js
import express from 'express';
import { registerEntityMap } from '@jasonshimmy/custom-elements-runtime/ssr';
import entities from '@jasonshimmy/custom-elements-runtime/entities.json' assert { type: 'json' };

registerEntityMap(entities);

const app = express();
app.get('*', (req, res) => {
  // render using your library; decodeEntities will now use the full map
});
```

### Example (Next.js custom server)

Place `registerEntityMap` call in your server start file (before handling requests) so the map is available for all renders.

```js
// next-server.js (or similar startup entry)
import { registerEntityMap } from '@jasonshimmy/custom-elements-runtime/ssr';
import entities from '@jasonshimmy/custom-elements-runtime/entities.json' assert { type: 'json' };

// register synchronously at startup — do this before handling any incoming requests
registerEntityMap(entities);

// start server afterwards
// app.listen(...)
```

### Notes

- If you don't register a map, the library falls back to a small inline map and numeric entity decoding — this keeps the runtime safe and compact.
- For serverless deployments with strict memory or cold-start budgets, consider trimming the entity map to the subset your app uses.
- Avoid importing the big JSON into client-side code — doing so will cause bundlers to include it in client bundles.

## ❓ FAQ

**Q: How do I enable SSR?**
A: SSR is automatic when `window` is undefined (e.g., in Node.js or serverless environments).

**Q: Can I use lifecycle hooks in SSR?**
A: No, lifecycle hooks are ignored in SSR mode. Use them only for client-side logic.

**Q: Does the runtime preserve server-rendered markup on the client?**
A: No. The runtime performs a full fresh client render inside each shadow root, replacing the server HTML. To avoid a visible content shift, ensure server and client render functions produce identical output, and avoid browser-only side effects during server render.

**Q: Is SSR secure?**
A: Yes, the runtime escapes HTML and sanitizes styles to prevent XSS and injection attacks.

## 🏁 Summary

SSR support in the custom elements runtime enables fast, SEO-friendly, and universal web components. By leveraging VNode trees and pure functions, you can build components that work seamlessly on both server and client.

For more details, see the [JIT CSS guide](./jit-css.md) for styling in SSR contexts and the [Security guide](./security.md) for XSS prevention.
