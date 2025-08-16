# ⚙️ Advanced Use Cases

Explore powerful patterns and features built into Custom Elements Runtime.

---

## 🔑 Key Features

- **SSR & Hydration:** Render HTML on the server, hydrate on the client (`data-hydrate`). SSR skips refs, listeners, and lifecycle hooks.
- **Plugin System:** Extend runtime with `useRuntimePlugin` and hooks like `onInit`, `onRender`, and `onError`.
- **Error Boundaries:** Catch errors with `onError` and provide fallback UI or diagnostics.
- **Global Store & Events:** Built-in reactive store and event bus for shared state and communication.
- **Refs & Computed State:** Use `data-ref` for direct DOM access and `computed` for derived values.
- **Lifecycle Hooks:** Add setup/cleanup logic with `onMounted` and `onUnmounted`.
- **Async Templates:** Render templates from `async` functions (Promises supported).
- **Declarative Events & VDOM:** Use `data-on-*`, preserve focus, and enjoy efficient DOM updates.

---

## 🧩 Example: Advanced Component

```ts
import { component, html, css, compile } from '@jasonshimmy/custom-elements-runtime';

component('advanced-demo', {
  state: { count: 0 },
  computed: {
    doubled: (state) => state.count * 2
  },
  template: ({ count, doubled }) => html`
    <button data-ref="myButton" data-on-click="increment">
      Count: ${count} (Doubled: ${doubled})
    </button>
  `({ count, doubled }),
  style: css`
    button { font-size: 1.2rem; padding: 0.5rem 1rem; }
  `,
  refs: {
    myButton: (el, state, api) => {
      el.addEventListener('click', () => {
        state.count++;
        api.emit('button-clicked', { count: state.count });
      });
    }
  },
  increment(_e, state) {
    state.count++;
  },
  onMounted(state) {
    console.log('Mounted!', state);
  },
  onUnmounted(state) {
    console.log('Unmounted!', state);
  },
  onError(error, state) {
    console.error('Component error:', error);
  }
});
```

---

## ⏳ Example: Async Template

```ts
component('async-advanced', {
  state: { loading: true, data: null },
  template: async (state) => {
    if (state.loading) {
      const data = await fetch('/api/data').then(r => r.json());
      state.data = data;
      state.loading = false;
    }
    return html`<div>Loaded: ${state.data ? state.data.value : '...'}</div>`(state);
  }
});
```

---

## 🔌 Example: Plugin Usage

```ts
import { useRuntimePlugin } from '@jasonshimmy/custom-elements-runtime';

useRuntimePlugin({
  onInit: (config) => {
    // Analytics, logging, etc.
  },
  onRender: (state, api) => {
    // Custom render logic
  },
  onError: (error, state, api) => {
    // Global error handling
  }
});
```

---

## 🌐 Example: Router

```ts
import { initRouter } from '@jasonshimmy/custom-elements-runtime';

const router = initRouter({
  routes: [
    { path: '/', component: 'home-page' },
    { path: '/about', component: 'about-page' }
  ]
});
```

---

## 🚫 Example: Stateless Component

```ts
component('stateless-demo', {
  template: () => html`<div>Pure view, no state!</div>`()
});
```

---

## 🎨 Example: Dynamic Style

```ts
component('advanced-style-demo', {
  state: { level: 1 },
  template: ({ level }) => html`<div>Level: ${level}</div>`({ level }),
  style: (state) => `
    div {
      font-size: ${1 + state.level * 0.2}rem;
      color: ${state.level > 3 ? 'gold' : 'gray'};
    }
  `
});
```

---

**📄 Full API Docs:** See [`src/lib/runtime.ts`](src/lib/runtime.ts) for all available options and advanced patterns.
