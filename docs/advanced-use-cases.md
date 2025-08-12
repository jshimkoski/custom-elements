
# Advanced Use Cases

Explore powerful patterns for scalable, maintainable components. All examples use the functional, type-safe API from `runtime.ts`.

## Key Patterns

- **Computed Properties:** Use `computed` for derived, reactive state.
- **Refs:** Attach refs for direct DOM access and imperative logic.
- **Lifecycle Hooks:** Use `onMounted` and `onUnmounted` for setup/teardown.
- **Error Boundaries:** Handle errors with `onError` for robust components.
- **Async Templates:** Return a Promise from `template` for async rendering.
- **Plugin System:** Extend runtime behavior with `useRuntimePlugin`.
- **Custom Event Handlers:** Map event handlers to `data-on-*` attributes in your template.

---

## Example: Advanced Component

```typescript
import { component, html, css, compile } from './lib/runtime.ts';

component('advanced-demo', {
  state: { count: 0 },
  computed: {
    doubled: (state) => state.count * 2
  },
  template: compile(({ count, doubled }) => html`
    <button data-on-click="increment">
      Count: ${count} (Doubled: ${doubled})
    </button>
  `),
  style: css`
    button { font-size: 1.2rem; padding: 0.5rem 1rem; }
  `,
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
    return `<div>Loaded: ${state.data ? state.data.value : '...'}</div>`;
  }
});
```

---

## Example: Plugin Usage

```typescript
import { useRuntimePlugin } from './lib/runtime.ts';

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

**See [`src/lib/runtime.ts`](src/lib/runtime.ts) for full API docs and advanced usage.**
