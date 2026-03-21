# 🧩 Custom Elements Runtime

[![Patreon](https://img.shields.io/badge/support-patreon-orange?logo=patreon)](https://patreon.com/jshimkoski)

> **The Complete Web Components Framework**

Build modern components with strict TypeScript, zero dependencies, and a clean functional API. Designed for speed, standards compliance, and productivity.

- Try it on [Codepen.io](https://codepen.io/jshimkoski/pen/JoYmpxm).
- Build SPA, SSR, and SSG apps with the [CER App Framework](https://github.com/jshimkoski/vite-plugin-cer-app).
- Check out the [Material Design 3 Components](https://github.com/jshimkoski/cer-material) built with this runtime.
- Play a game of [Solatro](https://solatro.netlify.app) built with this runtime in 100% Web Components.
- Learn more about the author at [jasonshimmy.com](https://jasonshimmy.com).

## ✨ Why You'll Love It

- ⚡ **Blazing Fast:** Minimal runtime, instant updates, zero dependencies.
- 🎨 **JIT CSS:** On-demand, utility-first styling directly in your HTML at runtime.
- 💪 **No Build Necessary:** Instant development feedback, no bundling required.
- 🧑‍💻 **TypeScript First:** Strict types, intellisense, and safety everywhere.
- 🧩 **Functional API:** No classes, no boilerplate—just pure functions.
- 🛠️ **SSR & HMR Ready:** Universal rendering and instant hot reloads.
- 🔌 **Extensible:** Directives, event bus, store, and more for advanced use cases.
- 🏆 **Developer Friendly:** Clean docs, examples, and a welcoming community.

## ⏱️ Getting Started

1. **Install:** `npm install @jasonshimmy/custom-elements-runtime`
2. **Create a Component:**

```ts
import {
  component,
  defineModel,
  html,
} from '@jasonshimmy/custom-elements-runtime';
import { useJITCSS } from '@jasonshimmy/custom-elements-runtime/jit-css';

component('my-counter', () => {
  useJITCSS();

  const count = defineModel('count', 0);

  const handleClick = () => {
    count.value++;
  };

  return html`
    <button
      type="button"
      class="px-4 py-2 bg-primary-500 text-white rounded"
      @click.prevent="${handleClick}"
    >
      Count: ${count.value}
    </button>
  `;
});
```

3. **Use in HTML:**

```html
<my-counter count="5"></my-counter>

<script>
  const myCounter = document.querySelector('my-counter');
  myCounter.addEventListener('update:count', (event) => {
    myCounter.setAttribute('count', event.detail);
    console.log('Count updated to:', event.detail);
  });
</script>
```

4. **Enjoy instant reactivity and type safety!**

## 📦 Complete API Reference

Below is the **complete list of public symbols** exported by the runtime and its named subpaths (root entry + subpath entries).

### Root Entry

**Package:** `@jasonshimmy/custom-elements-runtime`

| Export                       | Description                                                                                                                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `component`                  | Define a custom element with the functional component API.                                                                                                                                |
| `html`                       | Template tag function producing runtime VNodes from template literals.                                                                                                                    |
| `css`                        | Define component-scoped/JIT styles or register stylesheets.                                                                                                                               |
| `ref`                        | Create a reactive reference object with a `.value` property.                                                                                                                              |
| `computed`                   | Create a memoized, derived read-only value from other reactive sources.                                                                                                                   |
| `watch`                      | Register watchers reacting to changes in reactive values.                                                                                                                                 |
| `watchEffect`                | Auto-track reactive reads and re-run a side-effect whenever dependencies change.                                                                                                          |
| `nextTick`                   | Returns a Promise resolving after all pending DOM updates are flushed.                                                                                                                    |
| `flushDOMUpdates`            | Synchronously flush all pending DOM update tasks (useful in tests).                                                                                                                       |
| `scheduleWithPriority`       | Schedule a callback at a given `UpdatePriority` level.                                                                                                                                    |
| `provide`                    | Store a value on the current component for descendant injection.                                                                                                                          |
| `inject`                     | Retrieve a value provided by an ancestor component.                                                                                                                                       |
| `createComposable`           | Package reusable stateful logic (hooks, reactive state) into a composable.                                                                                                                |
| `getCurrentComponentContext` | Access the active component context from within a composable or render function.                                                                                                          |
| `useProps`                   | Hook to declare/consume typed component props with defaults.                                                                                                                              |
| `defineModel`                | Declare a two-way model binding prop; combines `useProps` + `useEmit` in one ergonomic hook.                                                                                              |
| `useEmit`                    | Hook returning an emit function for dispatching custom events.                                                                                                                            |
| `useOnConnected`             | Hook that runs a callback when the component connects.                                                                                                                                    |
| `useOnDisconnected`          | Hook that runs a callback when the component disconnects.                                                                                                                                 |
| `useOnAttributeChanged`      | Hook observing host attribute changes.                                                                                                                                                    |
| `useOnError`                 | Hook to register a component-level error handler.                                                                                                                                         |
| `useStyle`                   | Hook to register or compute component styles at runtime.                                                                                                                                  |
| `useDesignTokens`            | Apply typed design token overrides to `:host` as CSS custom properties.                                                                                                                   |
| `useGlobalStyle`             | Inject CSS into `document.adoptedStyleSheets`, escaping Shadow DOM encapsulation. Use sparingly.                                                                                          |
| `useExpose`                  | Publish methods and properties onto the host element as an imperative public API.                                                                                                         |
| `useSlots`                   | Inspect which named slots have been filled by the component consumer.                                                                                                                     |
| `useTeleport`                | Render virtual DOM content into any DOM node outside the shadow root.                                                                                                                     |
| `registerKeepAlive`          | Register `<cer-keep-alive>` to preserve component state across DOM removals.                                                                                                              |
| `registerSuspense`           | Register the `<cer-suspense>` built-in component.                                                                                                                                         |
| `registerErrorBoundary`      | Register the `<cer-error-boundary>` built-in component.                                                                                                                                   |
| `registerBuiltinComponents`  | Register `<cer-keep-alive>`, `<cer-suspense>` and `<cer-error-boundary>` in one call.                                                                                                     |
| `unsafeHTML`                 | Insert raw HTML into a template (**unsafe; use carefully**).                                                                                                                              |
| `decodeEntities`             | Utility to decode HTML entities in strings.                                                                                                                                               |
| `setDevMode`                 | Toggle dev-mode logging on or off at runtime.                                                                                                                                             |
| `devLog`                     | Log a message to the console in dev mode only (no-op in production).                                                                                                                      |
| `isReactiveState`            | Type-guard returning `true` when a value is a `ReactiveState` instance.                                                                                                                   |
| `createHealthMonitor`        | Create a new health monitor instance (factory; each call returns an independent instance).                                                                                                |
| `getHealthMonitor`           | Return the global singleton health monitor instance (lazily created).                                                                                                                     |
| `updateHealthMetric`         | Update a named metric on the global singleton health monitor.                                                                                                                             |
| `getHealthStatus`            | Return the current `HealthReport` from the global singleton health monitor.                                                                                                               |
| `hydrateApp`                 | Trigger hydration of all DSD-rendered custom elements within a root (call after registering all components on the client).                                                                |
| **Types**                    | `ModelRef`, `HealthMonitorInstance`, `HealthReport`, `UpdatePriority`, `TeleportHandle`, `ReactiveState`, `VNode`, `JITCSSOptions`, `DesignTokens`, `ComponentOptions`, `HydrateStrategy` |

---

### Directives

**Package:** `@jasonshimmy/custom-elements-runtime/directives`

| Export        | Description                                                        |
| ------------- | ------------------------------------------------------------------ |
| `when`        | Conditional rendering: render children when the condition is true. |
| `each`        | Iterate arrays and render a VNode per item with stable keys.       |
| `match`       | Fluent branching API (`when`/`otherwise`/`done`) returning VNodes. |
| `anchorBlock` | Create a stable anchor VNode used as block boundaries.             |

---

### Directive Enhancements

**Package:** `@jasonshimmy/custom-elements-runtime/directive-enhancements`

| Export             | Description                                                              |
| ------------------ | ------------------------------------------------------------------------ |
| `unless`           | Inverse of `when` (render when condition is false).                      |
| `whenEmpty`        | Render content when a collection is empty or null.                       |
| `whenNotEmpty`     | Render content when a collection has items.                              |
| `eachWhere`        | Filter + iterate; render only items matching a predicate.                |
| `switchOnLength`   | Render different content based on array length cases.                    |
| `eachGroup`        | Group array items by a key and render per-group content.                 |
| `eachPage`         | Render a paginated subset (page) of items.                               |
| `switchOnPromise`  | Render loading/success/error/idle states for async data.                 |
| `whenMedia`        | Render content when a CSS media query matches.                           |
| `mediaVariants`    | Map of responsive media queries (`sm`, `md`, `lg`, `xl`, `2xl`, `dark`). |
| `responsiveOrder`  | Ordered breakpoint keys used by responsive helpers.                      |
| `responsive`       | Per-breakpoint helpers (`sm`/`md`/`lg`/`xl`/`2xl`/`dark`).               |
| `whenVariants`     | Compose multiple variants (e.g., `dark + lg`) into one media query.      |
| `responsiveSwitch` | Render different content for different breakpoints.                      |
| `switchOn`         | Fluent switch/case API matching a value to content.                      |

---

### Transitions

**Package:** `@jasonshimmy/custom-elements-runtime/transitions`

| Export                    | Description                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------- |
| `Transition`              | Wrap content with enter/leave transition metadata consumed by the runtime.            |
| `TransitionGroup`         | Animate lists with enter/leave/move transitions for children.                         |
| `transitionPresets`       | Built-in transition presets (`fade`, `slide`, `scale`, etc.).                         |
| `createTransitionPreset`  | Create a reusable transition preset programmatically.                                 |
| `getTransitionStyleSheet` | Obtain the `CSSStyleSheet` used by the transition runtime.                            |
| **Types**                 | `TransitionClasses`, `TransitionHooks`, `TransitionOptions`, `TransitionGroupOptions` |

---

### Event Bus

**Package:** `@jasonshimmy/custom-elements-runtime/event-bus`

| Export           | Description                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `EventHandler`   | Type: callback signature used by the event bus.                                                                                |
| `GlobalEventBus` | Class: singleton implementing a global pub/sub event bus.                                                                      |
| `eventBus`       | Proxy: lazy proxy to the singleton `GlobalEventBus` instance.                                                                  |
| `emit`           | Emit a global event with an optional payload.                                                                                  |
| `on`             | Register a handler for a global event (returns unsubscribe function).                                                          |
| `off`            | Remove a handler for a global event.                                                                                           |
| `once`           | One-time listener. **Callback form** `once(name, handler)` → `void`. **Promise form** `once(name)` → `Promise<T>`. Do not mix. |
| `listen`         | Listen for native `CustomEvent` on the global event bus (returns unsubscribe).                                                 |

---

### Store

**Package:** `@jasonshimmy/custom-elements-runtime/store`

| Export        | Description                                                 |
| ------------- | ----------------------------------------------------------- |
| `Store`       | Interface describing `subscribe` / `getState` / `setState`. |
| `createStore` | Create a simple observable store that notifies subscribers. |

---

### Router

**Package:** `@jasonshimmy/custom-elements-runtime/router`

| Export                  | Description                                                                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useRouter`             | Create and use a router instance configured with routes (client & SSR).                                                                             |
| `initRouter`            | Initialize the router and register `router-view` / `router-link`.                                                                                   |
| `matchRoute`            | Match a path against configured routes and extract params.                                                                                          |
| `matchRouteSSR`         | SSR-friendly wrapper for route matching. Automatically strips query strings and URL fragments before matching, so `req.url` can be passed directly. |
| `findMatchedRoute`      | Find the first matching route entry from an array of routes (lower-level helper).                                                                   |
| `parseQuery`            | Parse a query string into a key/value map.                                                                                                          |
| `serializeQuery`        | Serialize a key/value map into a query string (e.g. `?a=b`).                                                                                        |
| `normalizePathForRoute` | Normalize a path string for consistent route matching (strips trailing slashes, etc.).                                                              |
| `DEFAULT_SCROLL_CONFIG` | Default scroll-to-fragment configuration object used by the router.                                                                                 |
| `isDangerousScheme`     | Returns `true` for dangerous URL schemes (e.g. `javascript:`).                                                                                      |
| `isAbsoluteUrl`         | Returns `true` when a URL string is absolute (has a protocol).                                                                                      |
| `safeDecode`            | Decode a URI component, returning the original string on error.                                                                                     |
| `canonicalizeBase`      | Normalize a router base path string (strips trailing slashes, ensures leading slash).                                                               |
| `resolveRouteComponent` | Resolve/load a route's component (supports async loaders + caching).                                                                                |
| `clearComponentCache`   | Clear the resolved route component cache (useful for testing and HMR).                                                                              |
| `activeRouterProxy`     | Stable proxy to the currently active router; forwards subscriptions and method calls (advanced/testing use).                                        |
| **Types**               | `Route`, `RouteState`, `RouteComponent`, `GuardResult`, `RouterLinkProps`, `RouterLinkComputed`, `RouterConfig`, `Router`                           |

---

### SSR

**Package:** `@jasonshimmy/custom-elements-runtime/ssr`

| Export                        | Description                                                                                                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `renderToString`              | Render a VNode tree to HTML for server-side rendering (backwards-compatible baseline).                                                                                                                                    |
| `renderToStringWithJITCSS`    | Render to HTML + pre-generate JIT CSS. Pass `dsd: true` for Declarative Shadow DOM output with full per-shadow-root CSS stack.                                                                                            |
| `renderToStringWithJITCSSDSD` | **Recommended.** Convenience alias: `renderToStringWithJITCSS(vnode, { dsd: true, ... })`. Full DSD output, hydration-ready, zero FOUC. Requires a **single root VNode** — wrap multi-element templates in one container. |
| `renderToStringDSD`           | Render to DSD HTML string (no JIT CSS pipeline). Appends DSD polyfill by default.                                                                                                                                         |
| `renderToStream`              | Render to a `ReadableStream<string>` for streaming SSR / chunked transfer encoding.                                                                                                                                       |
| `DSD_POLYFILL_SCRIPT`         | Minified inline `<script>` that implements DSD for Firefox < 123. Injected automatically; export it for manual placement.                                                                                                 |
| `registerEntityMap`           | Register a custom named-entity map for SSR `decodeEntities`.                                                                                                                                                              |
| `loadEntityMap`               | Async loader for the full HTML5 named-entity map.                                                                                                                                                                         |
| `clearRegisteredEntityMap`    | Reset the entity map to the built-in minimal set.                                                                                                                                                                         |
| `VNode` (type)                | The runtime VNode shape used by renderers and SSR.                                                                                                                                                                        |
| `RenderOptions` (type)        | Options for `renderToString` (`injectSvgNamespace`, `injectKnownNamespaces`).                                                                                                                                             |
| `DSDRenderOptions` (type)     | Options for DSD rendering (`dsd`, `dsdPolyfill`, plus all `RenderOptions`).                                                                                                                                               |
| `SSRJITResult` (type)         | Result of `renderToStringWithJITCSS`: `{ html, css, globalStyles, htmlWithStyles }`.                                                                                                                                      |

### SSR Middleware

**Package:** `@jasonshimmy/custom-elements-runtime/ssr-middleware`

Framework-agnostic handler factories for Express, Fastify, Hono, and raw Node.js.

| Export                        | Description                                                                                               |
| ----------------------------- | --------------------------------------------------------------------------------------------------------- |
| `createSSRHandler`            | Returns an `async (req, res)` handler that SSR-renders a VNode and sends the full HTML document response. |
| `createStreamingSSRHandler`   | Returns an `async (req, res)` handler that streams the rendered HTML using chunked transfer encoding.     |
| `MinimalRequest` (type)       | Minimal `{ url?, method?, headers? }` interface compatible with all major Node.js HTTP frameworks.        |
| `MinimalResponse` (type)      | Minimal `{ setHeader, write?, end }` interface compatible with all major Node.js HTTP frameworks.         |
| `SSRMiddlewareOptions` (type) | Options for `createSSRHandler` and `createStreamingSSRHandler`.                                           |

### Global Styles (CSS)

**Package:** `@jasonshimmy/custom-elements-runtime/css` or `@jasonshimmy/custom-elements-runtime/css/style.css`

| Export      | Description                                              |
| ----------- | -------------------------------------------------------- |
| `style.css` | CSS export that contains CSS variables and a base reset. |

### Variables (CSS)

**Package:** `@jasonshimmy/custom-elements-runtime/css/variables.css`

| Export          | Description                                                   |
| --------------- | ------------------------------------------------------------- |
| `variables.css` | CSS export that contains design tokens (colors, fonts, etc.). |

### Reset (CSS)

**Package:** `@jasonshimmy/custom-elements-runtime/css/reset.css`

| Export      | Description                                       |
| ----------- | ------------------------------------------------- |
| `reset.css` | CSS export that contains a base reset for styles. |

### Extended Color Palette (TypeScript)

**Package:** `@jasonshimmy/custom-elements-runtime/css/colors`

Opt-in extended color palette with full Tailwind-compatible color names (`slate`, `gray`, `zinc`, `stone`, `red`, `orange`, `amber`, `yellow`, `lime`, `green`, `emerald`, `teal`, `cyan`, `sky`, `blue`, `indigo`, `violet`, `purple`, `fuchsia`, `pink`, `rose`) with shades 50–950.

```ts
import { extendedColors } from '@jasonshimmy/custom-elements-runtime/css/colors';

// Use individual color scales
const blueShades = extendedColors.blue; // { '50': '#eff6ff', '100': '...', ... }

// Use in a component
component('branded-card', () => {
  useStyle(
    () => css`
      :host {
        --card-accent: ${extendedColors.violet['500']};
      }
    `,
  );
  return html`<slot></slot>`;
});
```

| Export           | Description                                                                            |
| ---------------- | -------------------------------------------------------------------------------------- |
| `extendedColors` | Full extended palette — `Record<string, Record<string, string>>` (name → shade → hex). |
| `ColorScale`     | Type: single color scale with shade keys `50`–`950`.                                   |

---

### JIT CSS Engine

**Package:** `@jasonshimmy/custom-elements-runtime/jit-css`

Opt-in JIT CSS engine with hooks, global control, and the `cls()` helper for IDE tooling.

| Export                   | Description                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `useJITCSS`              | Enable JIT CSS for the current component (per-component opt-in). Pass `JITCSSOptions` to configure colors/variants. |
| `useDesignTokens`        | Apply typed design token overrides to `:host` as CSS custom properties.                                             |
| `useGlobalStyle`         | Inject CSS into `document.adoptedStyleSheets`, escaping Shadow DOM encapsulation.                                   |
| `enableJITCSS`           | Enable JIT CSS globally for all components.                                                                         |
| `disableJITCSS`          | Disable JIT CSS globally.                                                                                           |
| `isJITCSSEnabled`        | Returns `true` when JIT CSS is globally active.                                                                     |
| `isJITCSSEnabledFor`     | Returns `true` when JIT CSS is active for a specific `ShadowRoot`.                                                  |
| `jitCSS`                 | Generate CSS from an HTML string (low-level engine).                                                                |
| `extractClassesFromHTML` | Extract unique class names from an HTML string.                                                                     |
| `cls`                    | Identity function that signals JIT class names to IDE tooling and static scanners (no-op at runtime).               |
| `parseColorClass`        | Parse a color utility class name to its CSS declaration.                                                            |
| `parseColorWithOpacity`  | Parse a color class with an optional `/opacity` modifier into its CSS declaration.                                  |
| `parseGradientColorStop` | Parse a gradient color stop utility (`from-*`, `via-*`, `to-*`) to its CSS declaration.                             |
| `parseSpacing`           | Parse a spacing utility class name to its CSS declaration.                                                          |
| `parseArbitrary`         | Parse an arbitrary value utility class name.                                                                        |
| `utilityMap`             | Complete mapping of all static utility class names to their CSS declarations.                                       |
| `selectorVariants`       | State and pseudo-class variant selector map (`hover:`, `focus:`, `disabled:`, `inert:`, etc.).                      |
| `mediaVariants`          | Responsive breakpoint media query map (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`, `dark:`).                                |
| `containerVariants`      | Container query breakpoint map (`@sm:`, `@md:`, `@lg:`, `@xl:`, `@2xl:`).                                           |
| `colors`                 | Semantic color palette object (`neutral`, `primary`, `secondary`, `success`, `info`, `warning`, `error`).           |
| **Types**                | `JITCSSOptions`, `DesignTokens`                                                                                     |

---

### DOM JIT CSS

**Package:** `@jasonshimmy/custom-elements-runtime/dom-jit-css`

Runtime DOM scanner for non-Shadow DOM contexts (React, Svelte, Vue, plain HTML).

```ts
import { createDOMJITCSS } from '@jasonshimmy/custom-elements-runtime/dom-jit-css';

const jit = createDOMJITCSS({ extendedColors: true });
jit.mount(); // start watching
jit.destroy(); // tear down
```

| Export            | Description                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| `createDOMJITCSS` | Create a DOM JIT CSS instance that watches class changes and injects utility CSS into the document. |
| **Types**         | `DOMJITCSSOptions`, `DOMJITCSSHandle`                                                               |

---

### Vite Plugin

**Package:** `@jasonshimmy/custom-elements-runtime/vite-plugin`

Build-time static analysis plugin that emits pre-generated CSS, eliminating runtime parsing cost entirely. Two exports are available:

- **`cerPlugin`** — All-in-one: JIT CSS + SSR configuration. Recommended for SSR apps.
- **`cerJITCSS`** — JIT CSS only.

```ts
// vite.config.ts — SSR app (recommended)
import { cerPlugin } from '@jasonshimmy/custom-elements-runtime/vite-plugin';

export default defineConfig({
  plugins: [
    cerPlugin({
      content: ['./src/**/*.{ts,tsx,html}'],
      ssr: { dsd: true, jit: { extendedColors: true } },
    }),
  ],
});
```

```ts
// vite.config.ts — JIT CSS only
import { cerJITCSS } from '@jasonshimmy/custom-elements-runtime/vite-plugin';

export default defineConfig({
  plugins: [
    cerJITCSS({
      content: ['./src/**/*.{ts,tsx,html}'],
      output: 'src/generated-jit.css',
      extendedColors: true,
    }),
  ],
});
```

| Export      | Description                                                                                   |
| ----------- | --------------------------------------------------------------------------------------------- |
| `cerPlugin` | Combined plugin: JIT CSS + SSR config (`virtual:cer-ssr-config`). Returns a `Plugin[]` array. |
| `cerJITCSS` | JIT CSS-only Vite plugin that scans source files at build time and emits pre-generated CSS.   |
| **Types**   | `CerPluginOptions`, `CerSSROptions`, `CerJITCSSPluginOptions`                                 |

---

## 📖 Documentation Index

Explore the complete documentation for every runtime feature:

### 🚀 **Getting Started**

- [**🎯 Functional API**](./docs/functional-api.md) - **Start here!** Complete guide to the modern functional component API

### 🏗️ **Core Features**

- [🧩 Template](./docs/template.md) - Template syntax and html function
- [🧭 Directives](./docs/directives.md) - Conditional rendering with `when`, `each`, and `match`
- [🛠️ Directive Enhancements](./docs/directive-enhancements.md) - Advanced directive utilities:
  - `unless` - Inverse of `when`
  - `whenEmpty` / `whenNotEmpty` - Collection checks
  - `eachWhere` - Filtered iteration
  - `switchOnLength` - Render based on array length
  - `eachGroup` - Group and render items
  - `eachPage` - Pagination support
  - `switchOnPromise` - Async state rendering
  - `whenMedia` - Media query responsive rendering
  - `responsive` - Responsive utilities
- [🔗 Bindings](./docs/bindings.md) - Data binding with `:prop`, `@event`, `:model`, `:class`, `:style`
- [🔔 Events Deep Dive](./docs/events-deep-dive.md) - Custom event emission and handling patterns
- [🎬 Transitions Guide](./docs/transitions.md) - Animation and transition effects

### 🎨 **Styling**

- [🎨 JIT CSS](./docs/jit-css.md) - On-demand utility-first styling system (opt-in architecture, all utilities, `useJITCSS`, `useDesignTokens`, `useGlobalStyle`, `cls`)
- [⚡ DOM JIT CSS](./docs/dom-jit-css.md) - Runtime DOM scanner for non-Shadow DOM contexts (React, Svelte, Vue, plain HTML)
- [🔧 Vite Plugin](./docs/vite-plugin.md) - `cerPlugin` (JIT CSS + SSR config) and `cerJITCSS` (JIT CSS only) build-time plugins
- [📏 Space Utilities](./docs/space-utilities.md) - Tailwind-style `space-x-*` and `space-y-*` spacing utilities
- [📝 Prose Typography](./docs/prose.md) - Beautiful typography for long-form content
- [🎨 Colors](./docs/colors.md) - Extended Tailwind-compatible color palette (`/css/colors` subpath)

### 🔗 **Communication & State**

- [📢 Event Bus](./docs/event-bus.md) - Global event system for cross-component communication
- [🗄️ Store](./docs/store.md) - Global state management
- [🚦 Router](./docs/router.md) - Client-side routing
- [🤝 Cross-Component Communication](./docs/cross-component-communication.md) - Patterns for component interaction

### ⚡ **Advanced Features**

- [⚡ Reactive API](./docs/reactive-api.md) - `watch()` targeted watchers, `computed()` memoization, `watchEffect()` auto-tracking, and `nextTick()`
- [🏝️ Provide / Inject](./docs/provide-inject.md) - Ancestor-to-descendant dependency injection without prop-drilling
- [🧩 Composables](./docs/composable.md) - Reusable stateful logic with `createComposable()`
- [🚀 Teleport](./docs/teleport.md) - Render content outside the shadow root with `useTeleport()`
- [♻️ Keep-Alive](./docs/keep-alive.md) - Preserve component state across DOM removals with `<cer-keep-alive>`
- [🩺 Health Monitor](./docs/health-monitor.md) - Track runtime metrics and receive periodic health reports with `createHealthMonitor()`
- [🔮 Virtual DOM](./docs/virtual-dom.md) - VDOM implementation and performance details
- [🌐 SSR](./docs/ssr.md) - Complete SSR guide: Declarative Shadow DOM output, hydration, streaming, partial hydration (island architecture), `useStyle` in SSR, routing with SSR, and framework integration
- [🌐 SSR Middleware](./docs/ssr-middleware.md) - `createSSRHandler` and `createStreamingSSRHandler` for Express, Fastify, Hono, raw Node.js, and router integration
- [♻️ HMR](./docs/hmr.md) - Hot module replacement
- [🛡️ Infinite Loop Protection](./docs/infinite-loop-protection.md) - Runtime safeguards against infinite loops
- [🔒 Secure Expression Evaluator](./docs/secure-expression-evaluator.md) - Safe evaluation of dynamic expressions in templates

### 🔧 **Integration Guides**

- [⚛️ React Integration](./docs/react-integration.md) - Using components in React apps
- [🦊 Vue Integration](./docs/vue-integration.md) - Using components in Vue apps
- [🅰️ Angular Integration](./docs/angular-integration.md) - Using components in Angular apps
- [🔥 Svelte Integration](./docs/svelte-integration.md) - Using components in Svelte apps

### 🛡️ **Security & Quality**

- [🔒 Security](./docs/security.md) - XSS prevention, `unsafeHTML`, CSP guidance, and safe input handling
- [🧪 Testing](./docs/testing.md) - Testing components with Vitest + happy-dom, reactive state, events, and async components
- [⚡ Performance](./docs/performance.md) - Update scheduler, `computed` memoization, avoiding re-renders, profiling
- [🔧 Troubleshooting](./docs/troubleshooting.md) - Common issues and solutions

### 🔄 **Upgrading**

- [📦 Migration Guide](./docs/migration.md) - Upgrade instructions, including the v3.0 JIT CSS opt-in change

### 📖 **Reference**

- [📚 Glossary](./docs/glossary.md) - Definitions for library-specific and web-components terms

For examples and implementation details, explore the source code in `src/lib/`.

## 🧑‍🔬 Real-World Examples

- [Form Input & Validation](./src/components/examples/FormInputValidation.ts)
- [Minimal Example](./src/components/examples/MinimalExample.ts)
- [Shopping Cart](./src/components/examples/ShoppingCart.ts)
- [Todo App](./src/components/examples/TodoApp.ts)

## 🌟 Showcase & Community

- **Showcase your components!** Open a PR to add your project to our gallery.
- **Questions or ideas?** [Start a discussion](https://github.com/jasonshimmy/custom-elements-runtime/discussions) or [open an issue](https://github.com/jasonshimmy/custom-elements-runtime/issues).
- **Contribute:** We welcome PRs for docs, features, and examples.
- ❤️ Like what you see? [Support ongoing development on Patreon](https://patreon.com/jshimkoski)

### Community Gallery

- [Material Design 3 Components](https://github.com/jshimkoski/cer-material) built with this runtime.
- [Solatro](https://solatro.netlify.app) is a RTS card-based game built with this runtime.

## 💖 Support This Project

Custom Elements Runtime is a labor of love built to make modern web development faster and more expressive. If it's helping you build better components, [learn more about me](https://jasonshimmy.com) or consider [supporting me on Patreon](https://patreon.com/jshimkoski) to help keep the momentum going.

Your support helps fund continued development, documentation, and community engagement. Every bit helps—thank you!
