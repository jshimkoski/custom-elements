# 🖥️ Server-Side Rendering (SSR) Deep Dive

A comprehensive guide to SSR support in the custom elements runtime. Learn how SSR works, how to use it, and best practices for building universal web components.

## 🌐 What is SSR?

Server-Side Rendering (SSR) is the process of generating HTML on the server, sending it to the client, and hydrating it for interactivity. SSR improves performance, SEO, and user experience by delivering ready-to-display content.

- **Purpose:** Faster initial load, better SEO, improved accessibility.
- **Benefits:** Universal rendering, progressive enhancement, reduced time-to-interactive.

## 🏗️ SSR Architecture in the Runtime

- **Functional API:** Components are defined as pure functions/configs, making them easy to render on the server.
- **No DOM Dependency:** SSR mode avoids direct DOM APIs, using VNode trees for output.
- **Hydration:** Client-side runtime attaches interactivity to server-rendered markup.
- **Error Boundaries:** SSR gracefully handles errors and fallback rendering.

## ⚡ How SSR Works

1. **Component registration:** Components are registered as usual.
2. **SSR detection:** If `window` is undefined, the runtime switches to SSR mode.
3. **VNode rendering:** The `render` function returns VNode trees, which are serialized to HTML.
4. **No DOM/lifecycle:** In SSR, no DOM APIs or lifecycle hooks are called.
5. **Hydration:** On the client, the runtime hydrates the markup and attaches event listeners, bindings, and styles.

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
- On the client: The runtime hydrates the markup and enables interactivity.

## ✉️ Rendering to string with `renderToString`

The runtime provides `renderToString` for SSR. The small SSR entrypoint is `src/lib/ssr.ts` (it re-exports the internal `runtime/vdom-ssr` helper) — import `renderToString` from the SSR entry so bundlers don't pull server-only code into the client bundle. Use `html` to build VNodes on the server and `renderToString` to produce markup.

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
const html = renderToString(vnode);
```

Async renders

If `render` returns a Promise, await it before stringifying:

```ts
const vnode = await maybeAsyncRender(ctx);
const html = renderToString(vnode);
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

Client-side hydration example

On the client register the same component and let the runtime hydrate existing server markup. The runtime attaches listeners and enables bindings without re-rendering the initial content.

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

      // Runtime will hydrate the existing <ssr-demo> node.
    </script>
  </body>
</html>
```

Notes

- `renderToString` serializes HTML only; Adopted StyleSheets / JIT CSS are not automatically included server-side — collect and inline styles if needed.
- Server rendering does not execute client lifecycle hooks.
- Ensure server and client render shapes match to avoid hydration mismatches.

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

## 🔄 Hydration Process

- **Server:** Renders HTML from VNode trees
- **Client:** Attaches event listeners, bindings, and styles
- **Attachment:** On the client the runtime will re-run the render to attach interactivity. The renderer will reconcile VNodes and apply listeners/styles; currently this re-render may replace the server DOM rather than perform a DOM-preserving hydration pass — ensure server and client render output match to avoid visual/hydration mismatch.
- **Error handling:** Any hydration errors are caught by error boundaries

## 🚀 SSR Best Practices

- **Avoid direct DOM manipulation:** Use VNode trees and pure functions
- **Keep logic stateless:** SSR should not depend on browser-only APIs
- **Use error boundaries:** Provide fallback UI for rendering errors
- **Design for hydration:** Ensure markup matches between server and client

## 📚 Example: Universal Component

```typescript
component('universal-greeting', () => {
  const props = useProps({ name: 'World' });
  const greeting = ref(props.name);
  return html`<h1>Hello, ${greeting.value}!</h1>`;
});
```

- Works in SSR and client environments
- Hydrates seamlessly for interactivity

## 🗺️ registerEntityMap (server-side entity map)

When performing server-side rendering you may want full HTML5 named-entity decoding (e.g. `&rsquo;`, `&hellip;`, etc.). The library keeps the client bundle small by not shipping the full entity map to the browser. If your SSR pipeline needs complete decoding, register a full entity map at server startup.

### Why register?

- The full HTML5 entity map is large. Publishing it with the client bundle would bloat CDN and npm consumers.
- This API lets server deployments opt in to the full map while keeping the library tiny for browsers.

### API

- `registerEntityMap(map: Record<string,string>, options?: { overwrite?: boolean })` — register the full map before rendering. First registration wins by default.
- `clearRegisteredEntityMap()` — clear the registration (useful in tests).

### Example (Express)

```js
// server.js
import express from 'express';
import { registerEntityMap } from 'your-lib';
import entities from './entities.json'; // generated or copied by the server team

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
import { registerEntityMap } from 'your-lib';
import entities from './entities.json';

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

**Q: How do I hydrate server-rendered markup?**
A: The runtime runs client render to attach interactivity; this will reconcile the DOM but may replace server nodes on initial render. To ensure smooth transition, keep markup identical and avoid browser-only side effects during server render.

**Q: Is SSR secure?**
A: Yes, the runtime escapes HTML and sanitizes styles to prevent XSS and injection attacks.

## 🏁 Summary

SSR support in the custom elements runtime enables fast, SEO-friendly, and universal web components. By leveraging VNode trees, pure functions, and hydration, you can build components that work seamlessly on both server and client.

For more details, see the SSR entrypoint and helper in `src/lib/ssr.ts` (which re-exports the runtime SSR helpers) and inspect the SSR fallback logic in `src/lib/runtime/component.ts`.
