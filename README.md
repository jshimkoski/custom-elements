
# Custom Elements Runtime

> **Ultra-lightweight, type-safe runtime for fast, reactive, and maintainable web components.**

Build modern web components with strict TypeScript, zero dependencies, and a functional API. Designed for performance, standards compliance, and developer productivity.

## ✨ Features

- **Reactive State:** Automatic re-renders using ES6 Proxy; direct assignment supported. State changes trigger batched updates for performance.
- **Attribute-State Sync:** All primitive state keys (string, number, boolean) are automatically observed as attributes and kept in sync. Parent-to-child communication is seamless.
- **Functional Templates:** Use plain functions, tagged helpers (`html`, `compile`), or async Promises. Templates can be compiled for performance and SSR.
- **Refs:** Direct DOM access via `refs` for imperative logic and event handling. No complex selectors required.
- **Computed Properties:** Define derived, reactive values with `computed` for efficient state management.
- **Automatic Event Binding:** Declarative, type-safe handlers via `data-on-*` attributes. Only one handler per event type per element is attached; previous handlers are removed on rerender. Handlers are defined directly on the component config.
- **Controlled Input Sync:** Inputs with `data-model` (including checkboxes, radios, multi-checkbox groups, and modifiers) stay in sync with state. User typing always wins. VDOM patching ensures reliable event handling and focus preservation.
- **Deep State Binding:** Use `data-bind` for two-way binding to nested or dynamic state (objects, arrays, lists). Supports dot notation and array indices for deep binding.
- **Global Store:** Use the built-in `Store` class for global, reactive state management across components. Subscribe to changes and update state directly.
- **Global Event Bus:** Use the built-in `eventBus` for cross-component communication. Emit, listen, and unsubscribe from global events with event storm protection.
- **SSR & Hydration:** Universal rendering and opt-in hydration. Templates must match for hydration. SSR excludes refs, event listeners, and lifecycle hooks. Hydration is opt-in via the `hydrate` property.
- **Error Boundaries:** Optional `onError` for fallback UI and diagnostics. Robust error handling and recovery for all lifecycle and render errors.
- **Focus Preservation:** Inputs retain focus and selection during updates, even with rapid state changes.
- **Smart DOM Batching:** State-triggered renders are batched using requestAnimationFrame for optimal performance.
- **Plugin System:** Extend runtime behavior with hooks (`onInit`, `onRender`, `onError`). Plugins can be registered globally and affect all components.
- **Debug Mode:** Enable detailed runtime logs for any component via `debug: true` in the config. Logs warnings, errors, and mutation diagnostics.
- **Strict TypeScript:** Type-safe, developer-friendly, zero dependencies. All APIs and configuration are strictly typed.
- **Tree-shakable & Modular:** Import only what you use. All exports are modular and optimized for tree-shaking.
- **Functional API:** No classes, no boilerplate. All configuration is functional and declarative.
- **Template Helpers:** Use `html`, `compile`, `css`, `classes`, `styles`, `ref`, and `on` for efficient, type-safe template authoring.
- **Build Tools:** Integrate with Vite, Webpack, or Rollup for build-time template compilation and optimization.
- **VDOM Utilities:** Fine-grained DOM diffing and patching for controlled inputs, event listeners, and efficient updates.

### Limitations & Edge Cases

- Templates must have a single root node. Fragment templates are supported, but reconciliation is strict and positional; use keys for robust updates.
- Only one event handler per event type per element is attached; previous handlers are removed on rerender. Handlers must be defined on the config object.
- Controlled input sync prioritizes user typing (focused/dirty inputs) over state updates. VDOM patching is regression-tested for reliability.
- SSR hydration is opt-in via the `hydrate` property. If no region is marked, the entire shadow root is hydrated. SSR excludes refs, event listeners, and lifecycle hooks.
- All user-generated content is escaped in templates using `html` and `compile` helpers. Static HTML is not escaped.
- Only features documented here and in [`src/lib/runtime.ts`](src/lib/runtime.ts) are supported. Undocumented features may not work as expected.
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

- [API Reference](docs/api-reference.md): All runtime exports, configuration options, and advanced patterns.
- [Core Concepts](docs/core-concepts.md): State, attribute sync, event binding, input binding, global store, event bus, lifecycle, error boundaries, SSR, plugin system.
- [Data Model vs Data Bind](docs/data-model-vs-data-bind.md): Comparison, use cases, modifiers, deep binding, edge cases.
- [Advanced Use Cases](docs/advanced-use-cases.md): Patterns for event bus, store, plugin system, async templates, error boundaries, SSR, VDOM.
- [Form Input Bindings](docs/form-input-bindings.md): All supported input types, modifiers, deep binding, edge cases, VDOM patching.
- [SSR Guide](docs/ssr.md): SSR, hydration, limitations, API.
- [Framework Comparison](docs/framework-comparison.md): Unique features, tradeoffs, strengths, and when to choose each approach.
- [Examples](docs/examples.md): Concise, accurate code for all features and patterns.

See the [API Reference](docs/api-reference.md) for detailed usage, configuration options, and advanced patterns. For advanced topics, see the linked docs above.
