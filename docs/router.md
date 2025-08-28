# 🚦 Router Deep Dive

A comprehensive guide to the router module for custom-elements. This page documents the `initRouter` API, the built-in `router-view` and `router-link` components, and how to use asynchronous routing.

## ⚡ Quick Start

```ts
import { initRouter } from '@jasonshimmy/custom-elements-runtime';

const routes = [
  { path: '/', component: 'home-page' },
  { path: '/about', component: 'about-page' },
  { path: '/user/:id', component: 'user-page' },
];

// Initializes router and registers <router-view> and <router-link>
const router = initRouter({ routes });

// Programmatic navigation
router.push('/about');
router.replace('/user/42');
router.back();
```

## 🗺️ API Reference

### initRouter(config: RouterConfig)

Initializes the router and registers the following custom elements:
- `<router-view>`: Renders the matched route's component automatically.
- `<router-link>`: Declarative navigation link/button.

Returns a router instance with:
- `push(path: string)`: Navigate to a path.
- `replace(path: string)`: Replace current path.
- `back()`: Go back in history.
- `getCurrent()`: Get current route state (`{ path, params, query }`).
- `subscribe(fn)`: Subscribe to route changes.

## 🧩 Route Definitions

```ts
const routes = [
  { path: '/', component: 'home-page' },
  { path: '/profile/:username', component: 'profile-page' },
];
```

- Static routes: `/about`
- Dynamic routes: `/user/:id`

## 🏃 Navigation

```ts
router.push('/profile/jane');
```

- Updates the browser URL
- Renders the matching component in `<router-view>`

## 🔍 Accessing Route Data

```ts
const route = router.getCurrent();
console.log(route.path); // '/profile/jane'
console.log(route.params.username); // 'jane'
```

## 🧩 Asynchronous Routing Example

You can load route components asynchronously using the `load` property:

```ts
const routes = [
  {
    path: '/profile/:id',
    load: () => import('./profile-page.js'), // returns Promise<{ default: string }>
  },
];

const router = initRouter({ routes });
```

When navigating to `/profile/123`, `<router-view>` will automatically load and render the component exported as `default` from `profile-page.js`.

## 🧩 Using `<router-view>` and `<router-link>`

```html
<router-view></router-view>

<router-link to="/about">About</router-link>
<router-link to="/profile/42" tag="button">Profile</router-link>
```

- `<router-view>` automatically renders the matched route's component.
- `<router-link>` creates a link or button for navigation. Use `tag="button"` for a button element.

## ❓ FAQ

- **Can I use with other frameworks?**
  - Yes, it's framework-agnostic.
- **How do I handle async components?**
  - Use the `load` property in your route definition.

## 📝 Best Practices

- Define all routes in a single array
- Use the `load` property for code-splitting and async components
- Access route params via `router.getCurrent()`
- Use `<router-link>` for navigation

## 🆘 Troubleshooting

- Ensure routes are unique
- Use `router.push()` for programmatic navigation
- Check route params for dynamic segments

## 📚 See Also

- [component.md](./component.md)
- [state.md](./state.md)
- [store.md](./store.md)

## 🏁 Summary

The router module, via `initRouter`, provides a fast, declarative solution for client-side navigation in custom-elements projects. Use `<router-view>` and `<router-link>` for seamless routing and navigation, and leverage async routing for optimal performance.
