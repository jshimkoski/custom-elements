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

When navigating to `/profile/123`, `<router-view>` loads and renders the default export from `profile-page.js`.

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

## 📚 See Also

- [component.md](./component.md)
- [state.md](./state.md)
- [store.md](./store.md)

# 🏁 Summary

The router module (`initRouter`) provides a fast, declarative solution for client-side navigation in custom-elements projects. Use `<router-view>` and `<router-link>` for seamless routing and navigation. Use async routing for optimal performance.
