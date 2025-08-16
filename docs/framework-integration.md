
# 🔗 Framework Integration

This guide shows how to use Custom Elements built with `@jasonshimmy/custom-elements-runtime` in popular frontend frameworks.

---


## General Principles

- Custom Elements are natively supported in all major frameworks (React, Vue, Svelte, Angular, etc.).
- No wrapper libraries or adapters are required; use the web standard `<my-element></my-element>` tag.
- Pass data via attributes, properties, or events. Use the runtime's attribute-state sync and event bus for communication.
- All features (SSR, hydration, global store, event bus, plugin system, router, stateless components, error boundaries) work seamlessly in any framework environment.
- For SSR/static site generation, use runtime SSR APIs and router matching for universal rendering.

---


## React Integration

```typescript
// Register your custom elements before using them in React
import { component } from '@jasonshimmy/custom-elements-runtime';

component('hello-world', {
  state: { name: 'React User' },
  template: ({ name }) => `<h1>Hello, ${name}!</h1>`
});

component('simple-counter', {
  state: { count: 0 },
  template: ({ count }) => `<button data-on-click="increment">Count: ${count}</button>`,
  increment(_e, state) { state.count++; }
});

component('stateless-demo', {
  template: () => `<div>Pure view, no state!</div>`
});
```

```tsx
// After registering components, use them as custom elements in JSX
function App() {
  return (
    <div>
      {/* Use lowercase tag names and attributes */}
      <hello-world name="React User" />
      <simple-counter />
      <stateless-demo />
    </div>
  );
}

export default App;
```

**Caveats:**
- React does not natively forward custom events from custom elements to `on*` props. Use `addEventListener` on refs for custom events.
- Always use lowercase attribute names in JSX for custom elements (e.g., `name="value"`).
- Avoid passing objects/functions as props; use primitives and strings for attribute reflection.
- React may warn about unknown attributes—these are safe to ignore for custom elements.
- SSR/static site generation: use runtime SSR APIs and router matching for universal rendering.


## Vue Integration

```typescript
// Register your custom elements before using them in Vue
import { component } from '@jasonshimmy/custom-elements-runtime';

component('hello-world', {
  state: { name: 'Vue User' },
  template: ({ name }) => `<h1>Hello, ${name}!</h1>`
});

component('simple-counter', {
  state: { count: 0 },
  template: ({ count }) => `<button data-on-click="increment">Count: ${count}</button>`,
  increment(_e, state) { state.count++; }
});

component('stateless-demo', {
  template: () => `<div>Pure view, no state!</div>`
});
```

```vue
<template>
  <!-- Use custom elements directly in your template -->
  <hello-world name="Vue User" />
  <simple-counter />
  <stateless-demo />
</template>
```

**Caveats:**
- Pre-render each route to HTML using SSR APIs and router matching for instant loads and SEO.
- Use kebab-case for custom element tags and attributes in templates.
- Vue 2 requires `vue-custom-element` or similar plugin; Vue 3 supports custom elements natively.
- Custom events must be listened to with `@event-name` (not `@onEventName`).
- Avoid using v-model directly; use `data-model` and attribute reflection for two-way binding.


### SSR Example: Using Custom Elements in Nuxt

**Server-side rendering (Nuxt server):**

```typescript
// server/utils/render-custom-element.ts
import { renderToString } from '@jasonshimmy/custom-elements-runtime';

const userCardConfig = {
  state: { name: 'Jane Doe', email: 'jane@example.com' },
  template: ({ name, email }) => `
    <div class="user-card">
      <h3>${name}</h3>
      <p>${email}</p>
    </div>
  `
};

export function renderUserCardSSR() {
  return renderToString({ ...userCardConfig, tag: 'user-card' });
}
```

**Use in a Nuxt page:**
```vue
<template>
  <div v-html="userCardHtml" />
</template>

<script setup>
import { ref } from 'vue';
import { renderUserCardSSR } from '~/server/utils/render-custom-element';

const userCardHtml = ref(renderUserCardSSR());
</script>
```

**Client-side hydration (Nuxt plugin):**
```typescript
// plugins/custom-elements.client.ts
import { component } from '@jasonshimmy/custom-elements-runtime';

component('user-card', {
  state: { name: '', email: '' },
  template: ({ name, email }) => `
    <div class="user-card">
      <h3>${name}</h3>
      <p>${email}</p>
    </div>
  `
});
```

This pattern ensures SSR works in Nuxt and the component hydrates correctly in the browser.

## Svelte Integration

```typescript
// Register your custom elements before using them in Svelte
import { component } from '@jasonshimmy/custom-elements-runtime';

component('hello-world', {
  state: { name: 'Svelte User' },
  template: ({ name }) => `<h1>Hello, ${name}!</h1>`
});

component('simple-counter', {
  state: { count: 0 },
  template: ({ count }) => `<button data-on-click="increment">Count: ${count}</button>`,
  increment(_e, state) { state.count++; }
});
```

```svelte
<!-- Use custom elements directly in your Svelte markup -->
<hello-world name="Svelte User" />
<simple-counter />
```

**Caveats:**
- Svelte supports custom elements natively; no wrapper needed.
- Use `bind:this={el}` to get a reference and attach event listeners for custom events.
- Svelte does not support two-way binding (`bind:value`) on custom elements; use attribute reflection and event bus.

## Angular Integration

```typescript
// Register your custom elements before using them in Angular
import { component } from '@jasonshimmy/custom-elements-runtime';

component('hello-world', {
  state: { name: 'Angular User' },
  template: ({ name }) => `<h1>Hello, ${name}!</h1>`
});

component('simple-counter', {
  state: { count: 0 },
  template: ({ count }) => `<button data-on-click=\"increment\">Count: ${count}</button>`,
  increment(_e, state) { state.count++; }
});
```

```typescript
// app.module.ts
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import '@jasonshimmy/custom-elements-runtime';

@NgModule({
  declarations: [AppComponent],
  imports: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  bootstrap: [AppComponent]
})
export class AppModule {}
```

```html
<!-- Use custom elements directly in your Angular templates -->
<hello-world name="Angular User"></hello-world>
<simple-counter></simple-counter>
```

**Caveats:**
- Add `CUSTOM_ELEMENTS_SCHEMA` to your module to allow custom elements.
- Angular does not support two-way binding (`[(ngModel)]`) on custom elements; use attribute reflection and event bus.
- Custom events must be listened to with standard DOM APIs (not Angular event bindings).
- Avoid using Angular-specific directives on custom elements.

## Event Handling Example

All frameworks can listen for custom events emitted by your components:

```js
const el = document.querySelector('simple-counter');
el.addEventListener('incremented', (e) => {
  console.log('Counter incremented:', e.detail);
});
```

---

## SSR & Hydration

- Use the runtime's SSR helpers (`renderToString`, `generateHydrationScript`) for server-side rendering in any framework.
- Hydration is opt-in and works with all frameworks that support custom elements.

---

## Best Practices

- Register your custom elements before rendering them in the framework.
- Use attribute reflection and event bus for cross-framework communication.
- Avoid direct DOM manipulation; use the runtime's API and lifecycle hooks.
- All features are strictly typed and compatible with TypeScript projects.

---

For more details, see the [API Reference](./api-reference.md) and [Examples](./examples.md).
