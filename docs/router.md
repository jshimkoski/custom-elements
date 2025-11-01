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

### `initRouter(config: RouterConfig)`

- Registers `<router-view>` (renders matched route) and `<router-link>` (navigation link/button).
- Returns router instance:
  - `push(path: string)`: Navigate to path (in browser mode this updates history and the URL)
  - `replace(path: string)`: Replace current path (in browser mode this updates history and the URL)
  - `back()`: Go back in history
  - `getCurrent()`: Get current route state (`{ path, params, query }`)
  - `subscribe(fn)`: Listen for route changes
  - `matchRoute(path: string)`: Manually match a path against configured routes (returns `{ route, params }`)
  - `resolveRouteComponent(route: Route)`: Helper that loads a route's component (supports static `component` or async `load`)
  - `store`: Low-level store object (exposes `getState()` and `subscribe()`) — primarily useful for tests or advanced integration.

Note: query parsing is performed for the initial browser location and for popstate (back/forward) events. Programmatic calls like `router.push('/path?x=1')` currently do not parse the query string into `getCurrent().query` (the runtime stores an empty query object for programmatic navigations). See "Behavior notes" below for details.

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

## 🏃 Navigation

```ts
router.push('/profile/jane');
```

- Updates browser URL
- Renders matching component in `<router-view>`

## 🔍 Accessing Route Data

```ts
const route = router.getCurrent();
console.log(route.path); // '/profile/jane'
console.log(route.params.username); // 'jane'
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

### Accessibility Features

- Disabled links get `aria-disabled="true"` and `tabindex="-1"`
- Buttons get `disabled` attribute when disabled
- Active links get `aria-current` attribute for screen readers
- External links get `rel="noopener noreferrer"` for security

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

- Query parsing: when the router initializes in browser mode it parses the current URL's search string into `getCurrent().query`. The `popstate` handler also parses queries. However, calling `router.push('/some?x=1')` or `router.replace('/some?x=1')` programmatically will not populate `getCurrent().query` — the implementation stores an empty object for programmatic navigations. If you need query parsing for programmatic navigations, parse the path before calling `push`/`replace` or extract the query yourself.

- Async `load` behavior: `load()` is supported and cached. The built-in `router-view` accepts module defaults that are either a string tag name (rendered as a custom element) or a function component (sync or async). Function components should return a VNode, VNode[] or a string tag (or a Promise resolving to one of those). If `router-view` receives another type it will render the "Invalid route component" fallback. Use the exported `resolveRouteComponent` helper when you need to load or inspect module results programmatically — it will load and cache the module default for the route and surface clear errors if the loader fails or the route has no component.

- SSR `initialUrl`: for server-side or static rendering, pass `initialUrl` into `initRouter`/`useRouter` so the router can derive the initial `path` and `query` server-side. If you explicitly pass `initialUrl` the runtime will honor it and initialize from that URL even when a `window` object exists (useful for SSR hydration and deterministic tests). If you omit `initialUrl` the router operates in normal browser mode and derives its initial state from `window.location`.

## 📚 See Also

- [Functional API](./functional-api.md)
- [Store](./store.md)

# 🏁 Summary

The router module (`initRouter`) provides a fast, declarative solution for client-side navigation in custom-elements projects. Use `<router-view>` and `<router-link>` for seamless routing and navigation. Use async routing for optimal performance.
