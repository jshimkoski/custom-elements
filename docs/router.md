# 🚦 Router Deep Dive

A comprehensive guide to the router module for custom-elements. This page documents the `initRouter` API, the built-in `<router-view>` and `<router-link>`, async routing, and navigation guards.

## ⚡ Quick Start

```ts
import { initRouter } from '@jasonshimmy/custom-elements-runtime';

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
  - `push(path: string)`: Navigate to path
  - `replace(path: string)`: Replace current path
  - `back()`: Go back in history
  - `getCurrent()`: Get current route state (`{ path, params, query }`)
  - `subscribe(fn)`: Listen for route changes

Note: query parsing is performed for the initial browser location and for popstate (back/forward) events. Programmatic calls like `router.push('/path?x=1')` currently do not parse the query string into `getCurrent().query` (the runtime stores an empty query object for programmatic navigations). See "Behavior notes" below for details.

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
    }
  }
];
```

If a guard returns a string, navigation is redirected to that path. If it returns `false`, navigation is cancelled.

Clarification: guards are called after the router has matched a route for the requested path but before the navigation is committed. In other words, the router determines which route matches the target path, then runs `beforeEnter` and `onEnter` (both of which may be async and can return `false` to cancel or a string to redirect). `afterEnter` runs after the state is committed and cannot cancel.

## ❓ FAQ

- **Framework agnostic?** Yes.
- **Async components?** Use `load` property.

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

- Query parsing: when the router initializes in browser mode it parses the current URL's search string into `getCurrent().query`. The `popstate` handler also parses queries. However, calling `router.push('/some?x=1')` or `router.replace('/some?x=1')` programmatically will not populate `getCurrent().query` (the implementation currently stores an empty object for programmatic navigations). If query support for programmatic navigation is required, consider parsing `path` before calling `push` or update the router to extract the query from the provided path.

- Async `load` behavior: `load()` is supported and cached, but the built-in `router-view` expects `loaded.default` to be a string tag name to render. If you need the `load()` result to be a class/function/element, update the `router-view` render to use `resolveRouteComponent` and handle non-string results.

- Async `load` behavior: `load()` is supported and cached. `router-view` now accepts module defaults that are either a string tag name or a function component (sync or async). Function components should return a VNode or VNode[] (or a string tag). If you return another type, `router-view` will render the "Invalid route component" fallback. Use `resolveRouteComponent` if you need to handle module results manually.

- SSR `initialUrl`: for server-side or static rendering, pass `initialUrl` into `initRouter`/`useRouter` so the router can derive the initial `path` and `query` server-side. The router uses `initialUrl` only in non-browser mode.

## 📚 See Also

- [component.md](./component.md)
- [state.md](./state.md)
- [store.md](./store.md)

# 🏁 Summary

The router module (`initRouter`) provides a fast, declarative solution for client-side navigation in custom-elements projects. Use `<router-view>` and `<router-link>` for seamless routing and navigation. Use async routing for optimal performance.
