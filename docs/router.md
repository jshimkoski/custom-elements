# 🚦 Router Deep Dive

A comprehensive guide to the router module for custom-elements. This page documents the `initRouter` API, the built-in `<router-view>` and `<router-link>`, async routing, and navigation guards.

## ⚡ Quick Start

```ts
import { initRouter } from '@jasonshimmy/custom-elements-runtime/router';

const routes = [
  { path: '/', component: 'home-page' },
  { path: '/about', component: 'about-page' },
  { path: '/user/:id', component: 'user-page' },
];

// Initialize router and register <router-view> and <router-link>
const router = initRouter({ routes });

// Navigation
router.push('/about');
router.replace('/user/42');
router.back();
```

## 🗺️ API Reference

### `initRouter(config: RouterConfig)` — **recommended**

- Registers `<router-view>` (renders matched route) and `<router-link>` (navigation link/button).
- Sets the global active router instance used by `activeRouterProxy`.
- Clears the route component cache so stale lazy components don't persist across hot-reloads / test re-runs.
- Returns router instance:
  - `push(path: string)`: Navigate to path (in browser mode this updates history and the URL)
  - `replace(path: string)`: Replace current path (in browser mode this updates history and the URL)
  - `back()`: Go back in history
  - `getCurrent()`: Get current route state (`{ path, params, query }`)
  - `subscribe(fn)`: Listen for route changes
  - `matchRoute(path: string)`: Manually match a path against configured routes (returns `{ route, params }`)
  - `resolveRouteComponent(route: Route)`: Helper that loads a route's component (supports static `component` or async `load`)
  - `base`: The configured base path (string). When provided in `initRouter({ base: '/app' })` this value
    is used by the runtime (for example `<router-link>`) when constructing normalized absolute hrefs.
  - `scrollToFragment(frag?: string)`: Programmatically request scrolling to a fragment/anchor on the current page. Returns `Promise<boolean>` which resolves `true` when the scroll was performed or `false` on timeout/cancellation.
  - `store`: Low-level store object (exposes `getState()` and `subscribe()`) — primarily useful for tests or advanced integration.

### `useRouter(config: RouterConfig)` — low-level

`useRouter` is the underlying factory function that creates and returns the router object. **Prefer `initRouter` in almost all cases.**

`initRouter` is a thin wrapper around `useRouter` that additionally:

1. Clears the resolved route-component cache (avoiding stale lazy imports across re-initializations).
2. Sets the active router instance on the global proxy (`activeRouterProxy`) so all component references are updated atomically.
3. Registers the `<router-view>` and `<router-link>` custom elements.

`useRouter` is useful when you need the router object alone without registering custom elements — for example in unit tests, SSR utilities, or library code that wraps the router:

```ts
import { useRouter } from '@jasonshimmy/custom-elements-runtime/router';

// Create a router without registering custom elements.
// Useful in server environments or isolated tests.
const router = useRouter({ routes, initialUrl: '/about' });
const { route, params } = router.matchRoute('/about');
```

Both functions accept the same `RouterConfig` parameter and return the same `Router` interface.

Also: `push()` and `replace()` only update the browser URL/history when the router is running in browser mode (i.e. when `initialUrl` is not provided). When `initialUrl` is supplied (SSR/static rendering), navigation occurs via the server-side code path and may reject if a route or guard fails — server-side navigation does not mutate the client's history.

## 🧩 Route Definitions

```ts
const routes = [
  { path: '/', component: 'home-page' },
  { path: '/profile/:username', component: 'profile-page' },
];
```

- Static: `/about`
- Dynamic: `/user/:id`
- Catch-all / splat: `/*` or `/:rest*` (terminal-only — must be the last segment)

## 🏃 Navigation

```ts
router.push('/profile/jane');
```

- Updates browser URL
- Renders matching component in `<router-view>`

## #️⃣ Fragment (hash) handling and scrollToFragment

The router preserves URL fragments (the part after `#`) on navigation and provides a robust, configurable
mechanism to scroll to an element with the fragment id when it appears in the DOM.

Behavior overview:

- By default the router will attempt to scroll to the fragment after navigation when running in browser mode.
- The built-in flow is resilient: it first tries an immediate scroll (to handle synchronous renders), then retries
  after the next animation frame, and finally uses a MutationObserver fallback to detect the element when it
  is appended asynchronously. A bounded timeout prevents observers from lingering indefinitely.
- If the user navigates again while a scroll attempt is in flight, the attempt is cancelled so no stale scrolls
  occur on the new page.

Configuration (via `initRouter({ scrollToFragment })`):

- `scrollToFragment` may be a boolean (enable/disable) or an object with options:
  - `enabled?: boolean` — whether automatic fragment scrolling is enabled (default: `true`).
  - `offset?: number` — pixel offset to apply when computing scroll position (useful for fixed headers). Default `0`.
  - `timeoutMs?: number` — how long (ms) to wait for the target element to appear before giving up. Default `2000`.

Public API:

- `router.scrollToFragment(frag?: string): Promise<boolean>` — programmatically request scrolling to the fragment.
  If `frag` is omitted, the router uses the current route state's `fragment`. The returned Promise resolves to
  `true` if the scroll was performed, or `false` if the attempt timed out or was cancelled by a subsequent
  navigation.

Recommended usage:

- When a route's component inserts the anchor asynchronously (e.g. after fetching data or lazy-rendering),
  prefer calling `router.scrollToFragment()` from the component's mount lifecycle (for example, in `useOnConnected`
  or an equivalent hook) once the DOM node is present. This is deterministic and avoids relying on heuristics.
- If you cannot modify the component (third-party code), rely on the router's automatic flow — it's robust and
  includes a MutationObserver fallback, but you may want to increase `timeoutMs` for very slow loads.

Example:

```ts
// init
const router = initRouter({
  routes,
  scrollToFragment: { enabled: true, offset: 64, timeoutMs: 3000 },
});

// Inside a route component, after the target element is appended:
router.scrollToFragment(); // resolves true when scrolled
```

## 🔍 Accessing Route Data

```ts
const route = router.getCurrent();
console.log(route.path); // '/profile/jane'
console.log(route.params.username); // 'jane'

Notes on params:
- Param names may include letters, numbers, underscores and hyphens (for example `:user-id`).
- Captured values are `decodeURIComponent`-decoded where possible; if decoding throws the raw value is used as-is.
```

## 🧩 Asynchronous Routing Example

Use the `load` property for async components:

```ts
const routes = [
  {
    path: '/profile/:id',
    load: () => import('./profile-page.js'), // returns Promise<{ default: string | HTMLElement | Function }>
  },
];

const router = initRouter({ routes });
```

When navigating to `/profile/123`, `<router-view>` loads the module returned by `load()` (if present) and uses its `default` export as the route component. The runtime supports these shapes for the module `default`:

- string tag name (e.g. `'profile-page'`) — rendered as a custom element VNode
- function component (sync) — invoked and its returned VNode(s) are used
- function component (async) — awaited and the returned VNode(s) are used

Notes:

- If a function component returns a string tag, a VNode for that tag will be rendered.
- If the `default` is neither a string nor a function (for example, a plain HTMLElement instance or other object), `<router-view>` will render the "Invalid route component" fallback.
- Function defaults are invoked with no arguments; they must return a VNode, VNode[] or a string tag (or a Promise resolving to one of those). If you export a class constructor as the default, it will be treated as a function and invoked — prefer exporting a string tag or a function component.
- The router caches the module `default` value returned by `load()` under `componentCache[route.path]` (keyed by the route's `path`). Use the exported `resolveRouteComponent` helper if you need to load or inspect the component programmatically; it will throw a clear error when a loader fails or when no component/loader is defined for a route.

## 🧩 Using `<router-view>` and `<router-link>`

```html
<router-view></router-view>

<router-link to="/about">About</router-link>
<router-link to="/profile/42" tag="button">Profile</router-link>
```

- `<router-view>` renders the matched route's component.
- `<router-link>` creates a link or button for navigation. Use `tag="button"` for a button.

## 🔗 Router Link Props

The `<router-link>` component supports the following props:

### Basic Props

- **`to`** (string, required) - Target path for navigation
- **`tag`** (string, default: `'a'`) - HTML tag to render (`'a'`, `'button'`, etc.)

### Navigation Props

- **`replace`** (boolean, default: `false`) - Use `router.replace()` instead of `router.push()`
- **`external`** (boolean, default: `false`) - Open link in new tab with `target="_blank" rel="noopener noreferrer"` (only for `<a>` tags)
- **`disabled`** (boolean, default: `false`) - Disable navigation and add `aria-disabled="true" tabindex="-1"`

### Active Class Props

- **`exact`** (boolean, default: `false`) - Require exact path match for active class
- **`activeClass`** (string, default: `'active'`) - CSS class applied when route is active (JIT CSS supported)
- **`exactActiveClass`** (string, default: `'exact-active'`) - CSS class applied when route is exactly active (JIT CSS supported)

### Accessibility Props

- **`ariaCurrentValue`** (string, default: `'page'`) - Value for `aria-current` attribute on exact match

### Styling Props

- **`class`** (string) - Additional CSS classes to apply (JIT CSS supported)

### Examples

#### Basic Navigation

```html
<router-link to="/about">About</router-link>
```

#### Button Navigation

```html
<router-link to="/settings" tag="button">Settings</router-link>
```

#### Replace Navigation (no history entry)

```html
<router-link to="/login" replace>Login</router-link>
```

#### Exact Match Active Class

```html
<router-link to="/" exact activeClass="home-active">Home</router-link>
```

#### External Link

```html
<router-link to="https://example.com" external>External Site</router-link>
```

#### Disabled Link

```html
<router-link to="/premium" disabled>Premium (Coming Soon)</router-link>
```

#### Custom Active Classes

```html
<router-link
  to="/dashboard"
  exact
  activeClass="is-active"
  exactActiveClass="is-exact-active"
  ariaCurrentValue="page"
>
  Dashboard
</router-link>
```

#### Styling with JIT CSS

```html
<router-link to="/profile" class="nav-link" active-class="nav-link-active">
  Profile
</router-link>
```

### Active Class Behavior

Router links automatically compute active classes based on the current route:

- **Active**: Applied when `current.path.startsWith(to)` (unless `exact` is true)
- **Exact Active**: Applied when `current.path === to`
- **`aria-current`**: Automatically added with value from `ariaCurrentValue` when exactly active

Note: the router now special-cases the root target (`'/'`) so a `<router-link to="/">` will only be considered active when the current route is exactly `/`. Without this special case the root link would appear active on every route because every path starts with `/`.

### Accessibility Features

- Disabled links get `aria-disabled="true"` and `tabindex="-1"`
- Buttons get `disabled` attribute when disabled
- Active links get `aria-current` attribute for screen readers
- External links get `rel="noopener noreferrer"` for security
- Dangerous `javascript:` URIs are blocked by `<router-link>`: the runtime omits the `href` for such targets and prevents activation (a development warning is emitted). If you need to allow non-http schemes (for example `mailto:` or `tel:`) consider validating/whitelisting schemes at the application level.

# 🛡️ Navigation Guards

Routes support three types of navigation guards:

- `beforeEnter(to, from)`: Runs before matching. Return `false` to cancel navigation, or a string path to redirect.
- `onEnter(to, from)`: Runs right before navigation commits. Can cancel or redirect.
- `afterEnter(to, from)`: Runs after navigation completes. Cannot cancel.

All guards support async (return a Promise). Example:

```ts
const routes = [
  {
    path: '/admin',
    component: 'admin-page',
    beforeEnter: async (to, from) => {
      if (!isUserAdmin()) return '/login'; // redirect if not admin
      return true;
    },
    onEnter: (to, from) => {
      // log entry
      return true;
    },
    afterEnter: (to, from) => {
      // analytics
    },
  },
];
```

If a guard returns a string, navigation is redirected to that path. If it returns `false`, navigation is cancelled.

Clarification: guards are called after the router has matched a route for the requested path but before the navigation is committed. In other words, the router determines which route matches the target path, then runs `beforeEnter` and `onEnter` (both of which may be async and can return `false` to cancel or a string to redirect). `afterEnter` runs after the state is committed and cannot cancel.

## ❓ FAQ

- **Framework agnostic?** Yes.
- **Async components?** Use `load` property.

## � Utility Functions

The router module exports several utility functions for advanced use cases:

### `parseQuery(search: string)`

Parse a URL query string into an object:

```ts
import { parseQuery } from '@jasonshimmy/custom-elements-runtime/router';

const params = parseQuery('?foo=bar&baz=qux&count=5');
// { foo: 'bar', baz: 'qux', count: '5' }

// Also works with leading '?' or without
const params2 = parseQuery('foo=bar');
// { foo: 'bar' }
```

**Parameters:**

- `search`: string - URL query string (with or without leading '?')

**Returns:** `Record<string, string>` - Parsed query parameters. Note: this uses the platform `URLSearchParams` when available; in environments where `URLSearchParams` is unavailable (some server runtimes) the function falls back to returning an empty object.

### `serializeQuery(q: Record<string,string> | undefined)`

Serialize a query object into a leading `?a=b&c=d` string. Returns an empty string when the object is empty or when serialization fails. This helper is used by the runtime when constructing history entries for programmatic navigations (`push`/`replace`).

```ts
import { serializeQuery } from '@jasonshimmy/custom-elements-runtime/router';

serializeQuery({ x: '1', y: 'two' }); // '?x=1&y=two'
```

### `matchRoute(routes: Route[], path: string)`

Manually match a route against a path:

```ts
import { matchRoute } from '@jasonshimmy/custom-elements-runtime/router';

const routes = [
  { path: '/', component: 'home-page' },
  { path: '/user/:id', component: 'user-page' },
];

const result = matchRoute(routes, '/user/123');
// {
//   route: { path: '/user/:id', component: 'user-page' },
//   params: { id: '123' }
// }

// No match returns null route
const noMatch = matchRoute(routes, '/nonexistent');
// { route: null, params: {} }
```

**Parameters:**

- `routes`: Route[] - Array of route definitions
- `path`: string - Path to match against routes

**Returns:** `{ route: Route | null; params: Record<string, string> }`

Implementation details (accurate behavior):

- Matching is performed in the given `routes` array order. The first configured route that matches the path is returned — there is no automatic specificity-based re-ordering. If you rely on specificity, order your routes accordingly.
- Supported param syntax: `:name` (single segment) and `:name*` (terminal splat capturing the rest of the path). An anonymous `*` is also supported as a terminal splat.
- Terminal-only splats: `:rest*` and `*` must be the final segment in the route. If a splat appears in a non-terminal position (for example `/a/*/b` or `/:rest*/more`) the router emits a dev warning and that route will be ignored at compile time.
- Splat semantics: splats use a `(.*)` style capture that allows matching an empty string. For example `/docs/:rest*` matches `/docs` with `rest === ''` and `/docs/a/b` with `rest === 'a/b'`.
- Trailing slash tolerance: routes tolerate a trailing slash when matching (so `/about` matches both `/about` and `/about/`).
- Static segments are regex-escaped during compile so literal regex characters in static segments are matched literally.
- Captured param values are decoded (via `decodeURIComponent`) when possible.
- Route regexes are compiled once per `Route` object and cached (WeakMap) for performance.

### `matchRouteSSR(routes: Route[], path: string)`

Match routes during server-side rendering:

```ts
import { matchRouteSSR } from '@jasonshimmy/custom-elements-runtime/router';

// On the server
const result = matchRouteSSR(routes, req.path);
if (result.route) {
  // Render the matched component
  const component = result.route.component;
  // ... render to string
}
```

**Parameters:**

- `routes`: Route[] - Array of route definitions
- `path`: string - Path to match

**Returns:** `{ route: Route | null; params: Record<string, string> }`

**Note:** This function is identical to `matchRoute()` but named specifically for SSR use cases to make code intent clearer.

In SSR usage you should supply `initialUrl` to `initRouter` / `useRouter` so the router can derive the initial `path` and `query` server-side. When `initialUrl` is provided the router runs in an SSR-mode code path: `push`/`replace` call into `navigateSSR` which will throw on missing routes or guard failures so server-side code can observe and handle navigation errors. SSR navigation does not attempt to update browser history.

### `initRouter(config: RouterConfig)`

Initialize router programmatically (covered in detail above):

```ts
import { initRouter } from '@jasonshimmy/custom-elements-runtime/router';

const router = initRouter({
  routes: [
    { path: '/', component: 'home-page' },
    { path: '/about', component: 'about-page' },
  ],
  initialUrl: '/about', // optional, for SSR or testing
});
```

**Returns:** Router instance with methods:

- `push(path: string)` - Navigate to path (browser mode: updates history and URL)
- `replace(path: string)` - Replace current path (browser mode: updates history and URL)
- `back()` - Go back in history
- `getCurrent()` - Get current route state
- `subscribe(fn)` - Listen for route changes
  - `matchRoute(path: string)` - Manually match a path against routes
  - `resolveRouteComponent(route: Route)` - Load/inspect a route's component (static or async)

## 📝 Best Practices

- Define all routes in one array
- Use `load` for async/code-split components
- Access params via `router.getCurrent()`
- Use `<router-link>` for navigation

## 🆘 Troubleshooting

- Ensure route paths are unique
- Use `router.push()` for navigation
- Check route params for dynamic segments

Behavior notes:

- Query parsing: when the router initializes in browser mode it parses the current URL's search string into `getCurrent().query`. The `popstate` handler also parses queries. Programmatic navigations (for example `router.push('/some?x=1')` or `router.replace('/some?x=1')`) now parse and store query parameters on the current route state and include the serialized query string in the browser history entry. Use `router.getCurrent().query` to access parsed params after programmatic navigation.

- Async `load` behavior: `load()` is supported and cached. The built-in `router-view` accepts module defaults that are either a string tag name (rendered as a custom element) or a function component (sync or async). Function components should return a VNode, VNode[] or a string tag (or a Promise resolving to one of those). If `router-view` receives another type it will render the "Invalid route component" fallback. Use the exported `resolveRouteComponent` helper when you need to load or inspect module results programmatically — it will load and cache the module default for the route and surface clear errors if the loader fails or the route has no component.

- SSR `initialUrl`: for server-side or static rendering, pass `initialUrl` into `initRouter`/`useRouter` so the router can derive the initial `path` and `query` server-side. If you explicitly pass `initialUrl` the runtime will honor it and initialize from that URL even when a `window` object exists (useful for SSR hydration and deterministic tests). If you omit `initialUrl` the router operates in normal browser mode and derives its initial state from `window.location`.

## 🛠️ Router Utility Functions

The `/router` subpath exports several standalone utility functions useful for custom tooling, SSR pipelines, and library authors:

```ts
import {
  parseQuery,
  serializeQuery,
  normalizePathForRoute,
  DEFAULT_SCROLL_CONFIG,
  isDangerousScheme,
  isAbsoluteUrl,
  safeDecode,
  canonicalizeBase,
  matchRoute,
  matchRouteSSR,
  findMatchedRoute,
  resolveRouteComponent,
  clearComponentCache,
  activeRouterProxy,
} from '@jasonshimmy/custom-elements-runtime/router';
```

| Function                | Signature                                     | Description                                                                                                                                                          |
| ----------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parseQuery`            | `(search: string) => Record<string, string>`  | Parse a URL query string (with or without leading `?`) into a key/value map.                                                                                         |
| `serializeQuery`        | `(params: Record<string, string>) => string`  | Serialize a key/value map to a canonical `?key=value` query string.                                                                                                  |
| `normalizePathForRoute` | `(path: string, base?: string) => string`     | Strip the base from a path and normalize it for route matching.                                                                                                      |
| `DEFAULT_SCROLL_CONFIG` | `object`                                      | Default scroll-to-fragment configuration (`{ enabled: true, offset: 0, timeoutMs: 2000 }`).                                                                          |
| `isDangerousScheme`     | `(url: string) => boolean`                    | Returns `true` for unsafe URL schemes (`javascript:`, `data:`, `vbscript:`).                                                                                         |
| `isAbsoluteUrl`         | `(url: string) => boolean`                    | Returns `true` for absolute URLs with a scheme (e.g. `https://`).                                                                                                    |
| `safeDecode`            | `(str: string) => string`                     | `decodeURIComponent` with a fallback that returns the raw string on error.                                                                                           |
| `canonicalizeBase`      | `(base?: string) => string`                   | Normalize a router base path (ensure leading slash, strip trailing slash).                                                                                           |
| `matchRoute`            | `(routes, path) => { route, params }`         | Match a path against a route array and return the matched route and extracted params.                                                                                |
| `matchRouteSSR`         | `(routes, path) => { route, params }`         | Same as `matchRoute` but named for SSR contexts.                                                                                                                     |
| `findMatchedRoute`      | `(routes, path) => { route, params } \| null` | Find the first matching route (returns `null` if none match).                                                                                                        |
| `resolveRouteComponent` | `(route: Route) => Promise<RouteComponent>`   | Load and cache a route's component. Throws a descriptive error if `load()` fails or no component is defined.                                                         |
| `clearComponentCache`   | `() => void`                                  | Clear the resolved route component cache (useful in tests or HMR).                                                                                                   |
| `activeRouterProxy`     | `Router`                                      | A stable proxy object that always delegates to the currently active router instance. Useful in modules that must reference the router before `initRouter` is called. |

## 🧾 TypeScript types (exports)

The package now exports a small set of types that are useful for TypeScript/npm consumers. The most important is the `Router` interface which
describes the runtime object returned from `initRouter()`:

```ts
import { initRouter } from '@jasonshimmy/custom-elements-runtime/router';
import type { Router } from '@jasonshimmy/custom-elements-runtime/router';

const router: Router = initRouter({ routes, base: '/app' });
console.log(router.base); // -> '/app'
```

Key exported types you can import from the package:

- `Router` — the runtime instance returned by `initRouter()` (includes `push`, `replace`, `back`, `getCurrent`, `subscribe`, `matchRoute`, `resolveRouteComponent`, `base`, and `scrollToFragment`).
- `RouterConfig` — the configuration object accepted by `initRouter()` (includes `routes`, optional `base`, and `scrollToFragment` options).
- `Route`, `RouteState`, `RouteComponent` — route definitions and runtime state shapes.
- `RouterLinkProps` — the props accepted by the `<router-link>` custom element (`to`, `tag`, `replace`, `external`, `disabled`, `exact`, `activeClass`, `exactActiveClass`, `ariaCurrentValue`, `class`, `style`).
- `RouterLinkComputed` — the derived state object computed by `<router-link>` on each render; useful when building custom link components or testing router-link behavior. Fields: `current` (route state), `isExactActive`, `isActive`, `className`, `ariaCurrent`, `isButton`, `disabledAttr`, `externalAttr`.
- `parseQuery`, `matchRoute`, `matchRouteSSR`, `resolveRouteComponent`, `normalizePathForRoute` — small utility exports that can be useful in server rendering or custom tooling.

These types are lightweight and intended to make it easier to integrate the router into TypeScript projects and server-side code (for example
typing the return value of `initRouter()` or annotating handler functions that call `router.push()`).

## 📚 See Also

- [Functional API](./functional-api.md)
- [Store](./store.md)

# 🏁 Summary

The router module (`initRouter`) provides a fast, declarative solution for client-side navigation in custom-elements projects. Use `<router-view>` and `<router-link>` for seamless routing and navigation. Use async routing for optimal performance.
