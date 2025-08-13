
# Custom Elements Runtime

> **Ultra-lightweight, type-safe runtime for fast, reactive, and maintainable web components.**

Build modern web components with strict TypeScript, zero dependencies, and a functional API. Designed for performance, standards compliance, and developer productivity.

## ✨ Features

- **Reactive State:** Automatic re-renders using ES6 Proxy; direct assignment supported.
- **Attribute-State Sync:** Primitive state keys are automatically observed as attributes; parent-to-child communication is seamless.
- **Functional Templates:** Use plain functions, tagged helpers (`html`, `compile`), or async Promises.
- **Refs:** Direct DOM access via `refs`; no complex selectors.
- **Computed Properties:** Define derived, reactive values with `computed`.
- **Automatic Event Binding:** Declarative, type-safe handlers via `data-on-*`; auto cleanup on rerender.
- **Controlled Input Sync:** Inputs with `data-model` (including checkboxes, radios, multi-checkbox groups, and modifiers) stay in sync with state; user typing always wins. Regression-tested VDOM patching ensures reliable event handling.
- **Deep State Binding:** Use `data-bind` for two-way binding to nested or dynamic state (objects, arrays, lists).
- **SSR & Hydration:** Universal rendering and opt-in hydration; templates must match for hydration. SSR excludes refs, event listeners, and lifecycle hooks.
- **Error Boundaries:** Optional `onError` for fallback UI and diagnostics; robust error handling and recovery.
- **Global State & Event Bus:** Built-in store and event bus for cross-component communication.
- **Focus Preservation:** Inputs retain focus and selection during updates.
- **Smart DOM Batching:** State-triggered renders are batched for performance.
- **Plugin System:** Extend runtime behavior with hooks (`onInit`, `onRender`, `onError`).
- **Debug Mode:** Enable detailed runtime logs for any component via `debug: true`.
- **Strict TypeScript:** Type-safe, developer-friendly, zero dependencies.
- **Tree-shakable & Modular:** Import only what you use.
- **Functional API:** No classes, no boilerplate.

### Limitations & Edge Cases

- Templates must have a single root node.
- Fragment templates are supported, but reconciliation is strict and positional; use keys for robust updates.
- Only one event handler per event type per element is attached; previous handlers are removed on rerender.
- Controlled input sync prioritizes user typing (focused/dirty inputs) over state updates.
- SSR hydration is opt-in via the `hydrate` property; fallback hydrates the entire shadow root if no region is marked.
- SSR excludes refs, event listeners, and lifecycle hooks.
- All user-generated content is escaped in templates using `html` and `compile` helpers; static HTML is not escaped.
- Only features documented here and in [`src/lib/runtime.ts`](src/lib/runtime.ts) are supported; undocumented features may not work as expected.
- VDOM patching for controlled inputs (checkboxes, radios, etc.) is regression-tested to ensure event listeners are always attached and state updates are reliable.


## Minimal Example

```typescript
import { html, css, component } from '../../lib/runtime';

interface MinimalExampleState {
  count: number;
}

component('minimal-example', {
  state: { count: 0 },
  template: ({ count }: MinimalExampleState) => html`
    <button data-on-click="increment">Count: ${count}</button>
  `({ count }),
  style: css`
    button { font-size: 1.2rem; padding: 0.5rem 1rem; }
  `,
  increment(_e: Event, state: MinimalExampleState) {
    state.count++;
  }
});
```

## 🚀 Getting Started

1. **Clone this repository**
2. **Run the examples**: `npm run dev`
3. **Create your first component** (see minimal example above)
4. **Build something awesome!**

## 🎯 Use Cases

- **Micro-frontends**: Lightweight, isolated components
- **Progressive Enhancement**: Add reactivity to existing sites
- **Design Systems**: Reusable component libraries
- **SSR Applications**: Universal rendering with hydration
- **Performance-Critical Apps**: When bundle size matters
- **Web Standards**: Future-proof, standards-based development

## ⚠️ SSR Caveats

- SSR only generates HTML and styles; DOM APIs, refs, and event listeners are not available during server rendering.
- Lifecycle hooks (`onMounted`, `onUnmounted`) and refs are ignored during SSR.
- Hydration requires the client bundle to match the server-rendered markup and state exactly.

## 🛡️ Production-Readiness

- Strict TypeScript, modular structure
- Early returns, guard clauses, custom error types
- No external dependencies
- Manual input validation and error handling

## ⚡ Performance Features

- **Batched Updates**: Multiple state changes are batched using RAF
- **Template & Computed Property Caching**: Expensive calculations are cached
- **Memory Management**: Automatic cleanup prevents memory leaks
- **Focus Preservation**: Smart input focus handling during updates
- **Fine-grained DOM diffing**: Only changed DOM nodes are updated, not replaced, for optimal performance and UX
- **Async rendering**: Supports Promises in templates for async data and UI
- **Selective hydration**: Hydrate only regions marked with `data-hydrate` for efficient SSR


## Documentation

- [API Reference](docs/api-reference.md)
- [Core Concepts](docs/core-concepts.md)
- [Data Model vs Data Bind](docs/data-model-vs-data-bind.md)
- [Advanced Use Cases](docs/advanced-use-cases.md)
- [Form Input Bindings](docs/form-input-bindings.md)
- [SSR Guide](docs/ssr.md)
- [Framework Comparison](docs/framework-comparison.md)
- [Examples](docs/examples.md)

See the [API Reference](docs/api-reference.md) for detailed usage, configuration options, and advanced patterns. For advanced topics, see the linked docs above.
