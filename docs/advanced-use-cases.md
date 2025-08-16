
# Advanced Use Cases

Explore advanced patterns and features available in the Custom Elements Runtime.

## Key Patterns

**Key Patterns & Features:**
- **SSR & Hydration:** Universal HTML rendering, opt-in hydration (`data-hydrate`), and strict template matching. SSR excludes refs, event listeners, and lifecycle hooks.
- **Plugin System:** Extend runtime with `useRuntimePlugin` and global/component hooks (`onInit`, `onRender`, `onError`).
- **Error Boundaries:** Use `onError` for fallback UI, diagnostics, and recovery; all errors surfaced for debugging.
- **Global Store & Event Bus:** Built-in reactive store and event bus for cross-component state and communication.
- **Computed Properties & Refs:** Derived state with `computed`; direct DOM access with `refs`.
- **Lifecycle Hooks & Async Templates:** Setup/teardown with `onMounted`/`onUnmounted`; async rendering via Promise templates.
- **Declarative Event Handling & VDOM:** Type-safe handlers via `data-on-*`; fine-grained DOM diffing, focus preservation, and robust input sync.

---

## Example: Advanced Component

```typescript
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
    myButton: (element, state, api) => {
      element.addEventListener('click', () => {
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

## Example: Async Template

```typescript
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


## Example: Plugin Usage

```typescript
import { useRuntimePlugin } from '@jasonshimmy/custom-elements-runtime';

useRuntimePlugin({
  onInit: (config) => {
    // Add analytics, logging, etc.
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

## Example: Router Usage

```typescript
import { initRouter } from '@jasonshimmy/custom-elements-runtime';
const router = initRouter({ routes: [
  { path: '/', component: 'home-page' },
  { path: '/about', component: 'about-page' }
] });
```

---

## Example: Stateless Component

```typescript
component('stateless-demo', {
  template: () => html`<div>Pure view, no state!</div>`()
});
```

## Example: Dynamic Style

```typescript
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

**See [`src/lib/runtime.ts`](src/lib/runtime.ts) for full API docs and advanced usage.**
