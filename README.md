# 🧩 Custom Elements Runtime

[![Patreon](https://img.shields.io/badge/support-patreon-orange?logo=patreon)](https://patreon.com/jshimkoski)

> **The Complete Web Components Framework**

Build modern components with strict TypeScript, zero dependencies, and a clean functional API. Designed for speed, standards compliance, and productivity.

🕹️ Try it on [Codepen.io](https://codepen.io/jshimkoski/pen/JoYmpxm).

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
  ref,
  html,
  useEmit,
  useProps,
} from '@jasonshimmy/custom-elements-runtime';

component('my-counter', () => {
  const props = useProps({ initialCount: 0 });
  const count = ref(props.initialCount);
  const emit = useEmit();

  const handleClick = () => {
    count.value++;
    emit('update:initial-count', { count: count.value });
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
<my-counter
  initial-count="5"
  @update:initial-count="handleCountUpdate"
></my-counter>

<script>
  function handleCountUpdate(event) {
    console.log('Count updated to:', event.detail.count);
  }
</script>
```

4. **Enjoy instant reactivity and type safety!**

## 📦 Complete API Reference

Below is the **complete list of public symbols** exported by the runtime and its named subpaths (root entry + subpath entries).

### Root Entry

**Package:** `@jasonshimmy/custom-elements-runtime`

| Export                       | Description                                                                                           |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| `component`                  | Define a custom element with the functional component API.                                            |
| `html`                       | Template tag function producing runtime VNodes from template literals.                                |
| `css`                        | Define component-scoped/JIT styles or register stylesheets.                                           |
| `ref`                        | Create a reactive reference object with a `.value` property.                                          |
| `computed`                   | Create a memoized, derived read-only value from other reactive sources.                               |
| `watch`                      | Register watchers reacting to changes in reactive values.                                             |
| `watchEffect`                | Auto-track reactive reads and re-run a side-effect whenever dependencies change.                      |
| `nextTick`                   | Returns a Promise resolving after all pending DOM updates are flushed.                                |
| `flushDOMUpdates`            | Synchronously flush all pending DOM update tasks (useful in tests).                                   |
| `scheduleWithPriority`       | Schedule a callback at a given `UpdatePriority` level.                                                |
| `provide`                    | Store a value on the current component for descendant injection.                                      |
| `inject`                     | Retrieve a value provided by an ancestor component.                                                   |
| `createComposable`           | Package reusable stateful logic (hooks, reactive state) into a composable.                            |
| `getCurrentComponentContext` | Access the active component context from within a composable or render function.                      |
| `useProps`                   | Hook to declare/consume typed component props with defaults.                                          |
| `useEmit`                    | Hook returning an emit function for dispatching custom events.                                        |
| `useOnConnected`             | Hook that runs a callback when the component connects.                                                |
| `useOnDisconnected`          | Hook that runs a callback when the component disconnects.                                             |
| `useOnAttributeChanged`      | Hook observing host attribute changes.                                                                |
| `useOnError`                 | Hook to register a component-level error handler.                                                     |
| `useStyle`                   | Hook to register or compute component styles at runtime.                                              |
| `useExpose`                  | Publish methods and properties onto the host element as an imperative public API.                     |
| `useSlots`                   | Inspect which named slots have been filled by the component consumer.                                 |
| `useTeleport`                | Render virtual DOM content into any DOM node outside the shadow root.                                 |
| `registerKeepAlive`          | Register `<ce-keep-alive>` to preserve component state across DOM removals.                           |
| `registerCeSuspense`         | Register the `<ce-suspense>` built-in component.                                                      |
| `registerCeErrorBoundary`    | Register the `<ce-error-boundary>` built-in component.                                                |
| `registerBuiltinComponents`  | Register both `<ce-suspense>` and `<ce-error-boundary>` in one call.                                  |
| `unsafeHTML`                 | Insert raw HTML into a template (**unsafe; use carefully**).                                          |
| `decodeEntities`             | Utility to decode HTML entities in strings.                                                           |
| `setDevMode`                 | Toggle dev-mode logging on or off at runtime.                                                         |
| `devLog`                     | Log a message to the console in dev mode only (no-op in production).                                  |
| `isReactiveState`            | Type-guard returning `true` when a value is a `ReactiveState` instance.                               |
| `createHealthMonitor`        | Create a new health monitor instance (factory; each call returns an independent instance).            |
| `getHealthMonitor`           | Return the global singleton health monitor instance (lazily created).                                 |
| `updateHealthMetric`         | Update a named metric on the global singleton health monitor.                                         |
| `getHealthStatus`            | Return the current `HealthReport` from the global singleton health monitor.                           |
| **Types**                    | `HealthMonitorInstance`, `HealthReport`, `UpdatePriority`, `TeleportHandle`, `ReactiveState`, `VNode` |

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

| Export                  | Description                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `useRouter`             | Create and use a router instance configured with routes (client & SSR).                                                   |
| `initRouter`            | Initialize the router and register `router-view` / `router-link`.                                                         |
| `matchRoute`            | Match a path against configured routes and extract params.                                                                |
| `matchRouteSSR`         | SSR-friendly wrapper for route matching.                                                                                  |
| `findMatchedRoute`      | Find the first matching route entry from an array of routes (lower-level helper).                                         |
| `parseQuery`            | Parse a query string into a key/value map.                                                                                |
| `serializeQuery`        | Serialize a key/value map into a query string (e.g. `?a=b`).                                                              |
| `normalizePathForRoute` | Normalize a path string for consistent route matching (strips trailing slashes, etc.).                                    |
| `DEFAULT_SCROLL_CONFIG` | Default scroll-to-fragment configuration object used by the router.                                                       |
| `isDangerousScheme`     | Returns `true` for dangerous URL schemes (e.g. `javascript:`).                                                            |
| `isAbsoluteUrl`         | Returns `true` when a URL string is absolute (has a protocol).                                                            |
| `safeDecode`            | Decode a URI component, returning the original string on error.                                                           |
| `canonicalizeBase`      | Normalize a router base path string (strips trailing slashes, ensures leading slash).                                     |
| `resolveRouteComponent` | Resolve/load a route's component (supports async loaders + caching).                                                      |
| `clearComponentCache`   | Clear the resolved route component cache (useful for testing and HMR).                                                    |
| `activeRouterProxy`     | Stable proxy to the currently active router; forwards subscriptions and method calls (advanced/testing use).              |
| **Types**               | `Route`, `RouteState`, `RouteComponent`, `GuardResult`, `RouterLinkProps`, `RouterLinkComputed`, `RouterConfig`, `Router` |

---

### SSR

**Package:** `@jasonshimmy/custom-elements-runtime/ssr`

| Export                     | Description                                                                   |
| -------------------------- | ----------------------------------------------------------------------------- |
| `renderToString`           | Render a VNode tree to HTML for server-side rendering.                        |
| `registerEntityMap`        | Register a custom named-entity map for SSR `decodeEntities`.                  |
| `loadEntityMap`            | Async loader that fetches and registers the full HTML5 entity map from a URL. |
| `clearRegisteredEntityMap` | Reset the registered entity map back to the built-in minimal set.             |
| `VNode` (type)             | The runtime VNode shape used by renderers and SSR.                            |
| `RenderOptions` (type)     | Options for `renderToString` (`injectSvgNamespace`, `injectKnownNamespaces`). |

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

- [🎨 JIT CSS](./docs/jit-css.md) - On-demand utility-first styling system
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
- [♻️ Keep-Alive](./docs/keep-alive.md) - Preserve component state across DOM removals with `<ce-keep-alive>`
- [🩺 Health Monitor](./docs/health-monitor.md) - Track runtime metrics and receive periodic health reports with `createHealthMonitor()`
- [🔮 Virtual DOM](./docs/virtual-dom.md) - VDOM implementation and performance details
- [🌐 SSR](./docs/ssr.md) - Server-side rendering support
- [♻️ HMR](./docs/hmr.md) - Hot module replacement
- [🛡️ Infinite Loop Protection](./docs/infinite-loop-protection.md) - Runtime safeguards against infinite loops
- [🔒 Secure Expression Evaluator](./docs/secure-expression-evaluator.md) - Safe evaluation of dynamic expressions in templates

### 🔧 **Integration Guides**

- [⚛️ React Integration](./docs/react-integration.md) - Using components in React apps
- [🦊 Vue Integration](./docs/vue-integration.md) - Using components in Vue apps
- [🅰️ Angular Integration](./docs/angular-integration.md) - Using components in Angular apps
- [🔥 Svelte Integration](./docs/svelte-integration.md) - Using components in Svelte apps

### 🛠️ **Troubleshooting**

- [🔧 Troubleshooting](./docs/troubleshooting.md) - Common issues and solutions

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

## 💖 Support This Project

Custom Elements Runtime is a labor of love built to make modern web development faster and more expressive. If it's helping you build better components, consider [supporting me on Patreon](https://patreon.com/jshimkoski) to help keep the momentum going.

Your support helps fund continued development, documentation, and community engagement. Every bit helps—thank you!
