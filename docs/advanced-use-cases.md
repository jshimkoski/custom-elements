
# Advanced Use Cases

Explore advanced patterns and features available in the Custom Elements Runtime. All features are strictly typed, regression-tested, and match the implementation in src/lib. These enable robust, scalable, and maintainable web components for complex applications.

## Key Patterns

**Key Patterns & Features:**
- **SSR & Hydration:** Universal rendering to HTML on the server, opt-in hydration via the `hydrate` property. SSR excludes refs, event listeners, and lifecycle hooks; hydration restores interactivity and state. Templates must match for hydration.
- **Plugin System:** Extend runtime behavior with `useRuntimePlugin`. Register hooks (`onInit`, `onRender`, `onError`) globally or per component. Plugins are strictly typed and composable.
- **Error Boundaries:** Use `onError` to catch and handle errors during rendering or lifecycle events. Provide fallback UI, diagnostics, or recovery logic. All errors are surfaced for debugging and can be logged or reported.
- **Global Store & Event Bus:** Use the built-in `Store` class for global, reactive state management across components. Use the built-in `eventBus` for cross-component communication. Emit, listen, and unsubscribe from global events with event storm protection.
- **Computed Properties:** Use `computed` for derived, reactive values based on state. Efficiently manage complex logic and dependencies. Computed values are automatically updated when dependencies change.
- **Refs:** Attach refs for direct DOM access and imperative logic. No complex selectors required.
- **Lifecycle Hooks:** Use `onMounted` and `onUnmounted` for setup/teardown. All hooks are strictly typed and match the runtime implementation.
- **Async Templates:** Return a Promise from `template` for async rendering.
- **Custom Event Handlers:** Map event handlers to `data-on-*` attributes in your template. Handlers are type-safe and cleaned up automatically.
- **VDOM & Edge Cases:** Fine-grained DOM diffing and patching for controlled inputs, event listeners, and efficient updates. Handles focus preservation, event rebinding, and input edge cases. Regression-tested for reliability in all scenarios. VDOM utilities are exposed for advanced use.

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
