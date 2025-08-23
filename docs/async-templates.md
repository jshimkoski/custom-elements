# Async Templates

This guide covers how to use asynchronous templates in the custom elements runtime, enabling dynamic loading of components and route-based content.

## Table of Contents

- [Basic Concepts](#basic-concepts)
- [Async Components](#async-components)
- [Router Integration](#router-integration)
- [Template Caching](#template-caching)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [API Reference](#api-reference)

## Basic Concepts

Async templates allow components to load their content asynchronously, perfect for:
- Dynamic route loading
- API-driven content
- Code splitting
- Progressive loading experiences

### Sync vs Async Templates

**Synchronous (Traditional):**
```typescript
component('my-component', {
  state: { message: 'Hello' },
  render(state) {
    return html`<div>${state.message}</div>`;
  }
});
```

**Asynchronous:**
```typescript
asyncComponent('my-async-component', {
  state: { message: 'Hello' },
  renderAsync: async (state) => {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 1000));
    return html`<div>${state.message}</div>`;
  },
  loadingTemplate: (state) => html`<div>Loading...</div>`,
  errorTemplate: (error, state) => html`<div>Error: ${error.message}</div>`
});
```

## Async Components

### Basic Async Component

```typescript
import { asyncComponent, html } from './lib/runtime';

asyncComponent('user-profile', {
  state: { userId: 1, user: null },

  renderAsync: async (state) => {
    // Fetch user data
    const response = await fetch(`/api/users/${state.userId}`);
    const user = await response.json();
    
    // Update state
    state.user = user;

    return html`
      <div class="profile">
        <img src="${user.avatar}" alt="${user.name}" />
        <h2>${user.name}</h2>
        <p>${user.email}</p>
      </div>
    `;
  },

  loadingTemplate: (state) => html`
    <div class="loading">Loading user ${state.userId}...</div>
  `,

  errorTemplate: (error, state) => html`
    <div class="error">
      <h3>Failed to load user</h3>
      <p>${error.message}</p>
      <button @click="${() => location.reload()}">Retry</button>
    </div>
  `
});
```

### Using createAsyncTemplate

For more control over caching and dependencies:

```typescript
import { createAsyncTemplate, asyncComponent, html } from './lib/runtime';

asyncComponent('product-list', {
  state: { category: 'electronics', products: [] },

  renderAsync: createAsyncTemplate(
    async (state) => {
      const response = await fetch(`/api/products?category=${state.category}`);
      const products = await response.json();
      
      state.products = products;

      return html`
        <div class="products">
          ${products.map(product => html`
            <div class="product">
              <h3>${product.name}</h3>
              <p>$${product.price}</p>
            </div>
          `)}
        </div>
      `;
    },
    {
      // Cache key based on category
      cacheKey: (state) => `products-${state.category}`,
      dependencies: ['category'] // Reload when category changes
    }
  ),

  loadingTemplate: (state) => html`
    <div>Loading ${state.category} products...</div>
  `
});
```

## Router Integration

### Route-Based Components

```typescript
import { routeComponent, html } from './lib/runtime';

routeComponent('dynamic-page', {
  state: { content: '' },

  routeLoader: async () => {
    const path = window.location.pathname;
    
    // Dynamic import based on route
    if (path.includes('about')) {
      const module = await import('./pages/about');
      return { default: module.aboutTemplate };
    } else if (path.includes('contact')) {
      const module = await import('./pages/contact');
      return { default: module.contactTemplate };
    } else {
      return { default: () => html`<h1>Home Page</h1>` };
    }
  },

  loadingTemplate: () => html`
    <div class="page-loader">
      <div class="spinner"></div>
      <p>Loading page...</p>
    </div>
  `,

  errorTemplate: (error) => html`
    <div class="error-page">
      <h1>Page Not Found</h1>
      <p>The requested page could not be loaded.</p>
      <a href="/">Go Home</a>
    </div>
  `
});
```

### Creating Async Routes

```typescript
import { createAsyncRoute, createAsyncRoutes } from './lib/router';

// Single route
const aboutRoute = createAsyncRoute('/about', 
  async () => import('./pages/about'),
  {
    tagName: 'about-page',
    loadingTemplate: () => html`<div>Loading About...</div>`
  }
);

// Multiple routes
const routes = createAsyncRoutes([
  {
    path: '/dashboard',
    loader: async () => import('./pages/dashboard'),
    tagName: 'dashboard-page'
  },
  {
    path: '/profile/:id',
    loader: async () => import('./pages/profile'),
    tagName: 'profile-page',
    state: { userId: null }
  }
]);
```

### Router Setup

```typescript
import { useRouter } from './lib/router';

const router = useRouter({
  routes: [
    ...routes, // async routes
    { path: '/', component: 'home-page' }, // sync route
    { path: '*', component: 'not-found-page' }
  ],
  base: '/app'
});

// Navigate programmatically
router.push('/dashboard');
router.replace('/profile/123');
```

## Template Caching

### Cache Management

Templates are automatically cached based on cache keys:

```typescript
import { templateCache, invalidateTemplateCache } from './lib/runtime';

// Check if template is cached
if (templateCache.has('user-123')) {
  console.log('Template is cached');
}

// Invalidate specific cache
invalidateTemplateCache('user-123');

// Clear all cache
invalidateTemplateCache();
```

### Custom Cache Keys

```typescript
const asyncTemplate = createAsyncTemplate(
  async (state) => {
    // Template logic
  },
  {
    // Custom cache key function
    cacheKey: (state) => `user-${state.userId}-${state.theme}`,
    
    // Dependencies that trigger cache invalidation
    dependencies: ['userId', 'theme']
  }
);
```

### Cache Invalidation on State Changes

Cache is automatically invalidated when state properties change:

```typescript
asyncComponent('my-component', {
  state: { userId: 1 },

  renderAsync: createAsyncTemplate(
    async (state) => {
      // This will reload when userId changes
      const user = await fetchUser(state.userId);
      return html`<div>${user.name}</div>`;
    },
    {
      dependencies: ['userId'] // Cache invalidated when userId changes
    }
  )
});
```

## Error Handling

### Error Templates

Always provide error templates for better UX:

```typescript
asyncComponent('robust-component', {
  state: { data: null },

  renderAsync: async (state) => {
    try {
      const response = await fetch('/api/data');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      state.data = data;
      return html`<div>${data.content}</div>`;
    } catch (error) {
      // Error will be passed to errorTemplate
      throw error;
    }
  },

  errorTemplate: (error, state) => {
    if (error.message.includes('404')) {
      return html`
        <div class="not-found">
          <h3>Content Not Found</h3>
          <p>The requested content is not available.</p>
        </div>
      `;
    }

    if (error.message.includes('network')) {
      return html`
        <div class="network-error">
          <h3>Connection Error</h3>
          <p>Please check your internet connection.</p>
          <button @click="${() => location.reload()}">Retry</button>
        </div>
      `;
    }

    return html`
      <div class="generic-error">
        <h3>Something went wrong</h3>
        <p>${error.message}</p>
        <button @click="${() => location.reload()}">Refresh</button>
      </div>
    `;
  }
});
```

### Global Error Handling

```typescript
// Handle unhandled template loading errors
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('Template loading error')) {
    console.error('Global template error:', event.reason);
    // Show global error UI
  }
});
```

## Best Practices

### 1. Loading States

Always provide meaningful loading states:

```typescript
loadingTemplate: (state) => html`
  <div class="loading-container">
    <div class="skeleton-content">
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
      <div class="skeleton-line"></div>
    </div>
    <p>Loading ${state.contentType}...</p>
  </div>
`
```

### 2. Progressive Loading

Load critical content first, then enhance:

```typescript
asyncComponent('article-page', {
  state: { article: null, comments: null },

  renderAsync: async (state) => {
    // Load article first (critical)
    const article = await fetchArticle();
    state.article = article;

    // Render article immediately
    const articleHtml = html`
      <article>
        <h1>${article.title}</h1>
        <div>${article.content}</div>
      </article>
    `;

    // Load comments in background (non-critical)
    setTimeout(async () => {
      const comments = await fetchComments();
      state.comments = comments;
      // This will trigger a re-render with comments
    }, 0);

    return articleHtml;
  }
});
```

### 3. Error Boundaries

Use error boundaries for graceful degradation:

```typescript
component('error-boundary', {
  state: { hasError: false, error: null },

  render(state) {
    if (state.hasError) {
      return html`
        <div class="error-boundary">
          <h2>Something went wrong</h2>
          <details>
            <summary>Error details</summary>
            <pre>${state.error?.stack}</pre>
          </details>
          <button @click="${() => { state.hasError = false; state.error = null; }}">
            Try again
          </button>
        </div>
      `;
    }

    return html`
      <div>
        <async-component></async-component>
      </div>
    `;
  },

  onError(error, state) {
    state.hasError = true;
    state.error = error;
  }
});
```

### 4. Performance Optimization

- Use appropriate cache keys to avoid unnecessary reloads
- Implement proper cleanup in disconnectedCallback
- Consider lazy loading for non-critical components

```typescript
asyncComponent('optimized-component', {
  state: { data: null },

  renderAsync: createAsyncTemplate(
    async (state) => {
      // Implementation
    },
    {
      // Efficient cache key
      cacheKey: (state) => `data-${state.id}-${state.version}`,
      dependencies: ['id', 'version']
    }
  ),

  // Cleanup on disconnect
  onDisconnected(state) {
    // Cancel ongoing requests
    if (state.abortController) {
      state.abortController.abort();
    }
  }
});
```

## API Reference

### Component Functions

#### `asyncComponent<S, C, P, T>(tag: string, config: AsyncComponentConfig)`
Creates an async component with loading and error states.

#### `routeComponent<S, C, P>(tag: string, config: RouteComponentConfig)`
Creates a route-based async component for dynamic page loading.

### Template Functions

#### `createAsyncTemplate<T>(loader: Function, options?: TemplateOptions)`
Creates a cached async template with dependency tracking.

#### `createRouteTemplate(routeLoader: Function, options?: RouteOptions)`
Creates a route-based template loader for dynamic imports.

### Router Functions

#### `createAsyncRoute(path: string, loader: Function, options?: RouteOptions)`
Creates a single async route configuration.

#### `createAsyncRoutes(routes: AsyncRouteConfig[])`
Creates multiple async route configurations.

### Cache Functions

#### `templateCache.get(key: string): VNode | VNode[] | null`
Retrieves cached template by key.

#### `templateCache.set(key: string, template: VNode | VNode[]): void`
Stores template in cache.

#### `invalidateTemplateCache(key?: string): void`
Invalidates specific cache entry or clears all cache.

### Configuration Interfaces

```typescript
interface AsyncComponentConfig<S, C, P, T> {
  state: S;
  computed?: { [K in keyof C]: (state: S & C) => C[K] };
  props?: Record<string, PropConfig>;
  watch?: WatchConfig<S & C & P>;
  style?: string | ((state: S & C) => string);
  
  // Async template (required)
  renderAsync: (state: S & C & P & InferMethods<T>) => Promise<VNode | VNode[]>;
  
  // Loading and error states
  loadingTemplate?: (state: S & C & P & InferMethods<T>) => VNode | VNode[];
  errorTemplate?: (error: Error, state: S & C & P & InferMethods<T>) => VNode | VNode[];
  
  // Lifecycle hooks
  onConnected?: (state: S & C & P & InferMethods<T>, api: ComponentAPI) => void;
  onDisconnected?: (state: S & C & P & InferMethods<T>, api: ComponentAPI) => void;
  onError?: (error: Error, state: S & C & P & InferMethods<T>, api: ComponentAPI) => void;
}

interface TemplateOptions {
  cacheKey?: (state: any) => string;
  dependencies?: string[];
}

interface RouteOptions {
  cacheByPath?: boolean;
}
```

This async template system provides powerful capabilities for building dynamic, performant web components with excellent loading states and error handling.