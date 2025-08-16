🚦 Routing

A lightweight, scalable router designed for seamless integration with Custom Elements Runtime. Zero dependencies, functional API, SSR/static site compatible, supports stateless components, plugins, error boundaries, event bus, global store, and is easy to use.

---

## Features

- Declarative route definitions  
- Functional API: pure functions, no classes  
- Reactive route state via Store  
- `<router-view>` custom element renders matched components  
- Programmatic navigation: `push`, `replace`, `back`  
- Route params and query support  
- SSR and static site compatible  
- Zero dependencies  
- Supports stateless and stateful components  
- Plugin system and error boundaries supported  
- Event bus and global store integration  

---

## Getting Started

### Define Routes

```typescript
const routes = [
  { path: '/', component: 'home-page' },
  { path: '/about', component: 'about-page' },
  { path: '/user/:id', component: 'user-page' }
];
```

### Initialize Router

```typescript
import { initRouter } from '@jasonshimmy/custom-elements-runtime';

const router = initRouter({ routes });
```

### Use `<router-view>` in Your App

```typescript
component('app-root', {
  template: () => `
    <nav>
      <a href="/" data-on-click="goHome">Home</a>
      <a href="/about" data-on-click="goAbout">About</a>
    </nav>
    <router-view></router-view>
  `,
  goHome: (_e, _state, api) => router.push('/'),
  goAbout: (_e, _state, api) => router.push('/about')
});
```

### Stateless Route Component Example

```typescript
component('stateless-home', {
  template: () => `<h1>Welcome Home!</h1>`
});
```

---


## API Reference

### `initRouter(config: RouterConfig)`

Initializes the router and exposes navigation methods.
- `routes`: Array of `{ path, component }` objects
- Returns: `{ store, push, replace, back, subscribe, matchRoute, getCurrent }`

### `useRouter(config: RouterConfig)`

Lower-level API for advanced use cases.

### `<router-view>`

Custom element that renders the matched component for the current route.

### Route Matching

- Supports path params (e.g., `/user/:id`)
- Supports query params (e.g., `/user/1?tab=info`)

### Navigation

- `push(path: string)`: Navigate to a new route
- `replace(path: string)`: Replace current route
- `back()`: Go back in history

### SSR & Static Site Support

- `matchRouteSSR(routes, path)`: Match a route for a given path on the server
- Pre-render each route to HTML for static site generation
- Works with stateless components and plugin system

## Plugin System, Error Boundaries, Event Bus, and Global Store

- Router works with plugin system hooks (`onInit`, `onRender`, `onError`).
- Use error boundaries for fallback UI and diagnostics during navigation.
- Integrate with event bus and global store for cross-component state and communication.

## Edge Cases & Best Practices

- SSR hydration requires template matching for seamless transitions.
- Only one event handler per event type per element; handlers must be defined on the config object.
- Controlled input sync always prioritizes user typing over state updates.
- Use stateless components for pure view routes.

---

## Example: SSR/Static Site

### Full SSR & Static Site Generation Example

```typescript
import { matchRouteSSR, renderToString } from '@jasonshimmy/custom-elements-runtime';

const routes = [
  { path: '/', component: 'home-page' },
  { path: '/about', component: 'about-page' },
  { path: '/user/:id', component: 'user-page' }
];

// Simulate static site generation for all routes
function generateStaticSite(routes: RouteConfig[]) {
  return routes.map(route => {
    // Example: generate for /user/42 as well
    const paths = route.path.includes(':id') ? ['/user/1', '/user/42'] : [route.path];
    return paths.map(path => {
      const match = matchRouteSSR(routes, path);
      if (!match.route) return null;
      // Render the matched component to HTML
      const html = renderToString({
        tag: match.route.component,
        props: match.params
      });
      return { path, html };
    });
  }).flat().filter(Boolean);
}

const staticPages = generateStaticSite(routes);
staticPages.forEach(page => {
  // Write each page.html to disk, e.g. /dist${page.path}/index.html
  console.log(`Generated: ${page.path}\n${page.html}\n`);
});
```

**Workflow:**
- Use `matchRouteSSR` to resolve the route and params for each path.
- Use `renderToString` to generate HTML for each route/component.
- Write the HTML to disk for each route (e.g., `/about/index.html`, `/user/42/index.html`).
- Deploy the generated static files to any static host (Netlify, Vercel, GitHub Pages, etc).

**Tips:**
- For dynamic params, enumerate all possible values you want to pre-render.
- You can extend this workflow to include nested routes, custom props, or data fetching.

**Result:**
- Your site is fully pre-rendered, SEO-friendly, and loads instantly with zero client-side routing required for initial navigation.

---

## Benefits

- **Scalable:** Supports nested routes, params, SSR/static sites
- **Robust:** Uses Store for reactivity, eventBus for communication
- **Developer Friendly:** Declarative config, simple API, automatic rendering
- **Lightweight:** Zero dependencies, minimal code
- **Easy Integration:** Plug-and-play with runtime.ts

---

## Advanced Usage

- Route guards, lazy loading, nested routes can be added as needed
- Subscribe to route changes via `router.store.subscribe(fn)`
- Access current route via `router.getCurrent()`

---

## Summary

This router makes navigation in Custom Elements Runtime projects effortless, robust, and maintainable—ideal for micro-frontends, design systems, SSR, and modern web apps.
