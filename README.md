# Custom Elements Runtime

> **A modern, ultra-lightweight TypeScript runtime for building fast, reactive, and maintainable web components.**

## ✨ Features

- **Reactive State:** ES6 Proxy-based state triggers automatic re-renders; direct assignment is fully supported.
- **Template Functions:** Use plain functions, tagged helpers (`html`, `compile`), or async Promises for templates.
- **Refs System:** Direct DOM access via `refs` with single-attach event logic; no complex selectors needed.
- **Computed Properties:** Use the `computed` property for derived, reactive values.
- **Automatic Event Binding:** Declarative event handlers via `data-on-*` attributes; only one handler per event type per element, with automatic cleanup on rerender.
- **Controlled Input Sync:** Inputs with `data-model` stay in sync with state, supporting modifiers like `trim` and `number`; user typing always wins over state updates.
- **SSR & Hydration:** Universal rendering and opt-in hydration via the `hydrate` property; templates must match for hydration.
- **Error Boundaries:** Optional `onError` handler for fallback UI and diagnostics.
- **Global State & Event Bus:** Built-in store and event bus for cross-component communication and shared state.
- **Devtools & Performance Monitoring:** Inspect components, track state changes, and measure render performance in development.
- **Focus Preservation:** Input, textarea, and select fields retain focus and selection during updates.
- **Smart DOM Batching:** State-triggered renders are batched via requestAnimationFrame for optimal performance.
- **Strict TypeScript:** Type-safe, developer-friendly, zero dependencies.
- **Tree-shakable & Modular:** Import only what you use; no external dependencies.
- **Functional API:** One function, no classes.

### Limitations & Edge Cases

- Templates must have a single root node.
- Fragment templates are supported, but reconciliation is strict and positional; use keys for robust updates.
- Only one event handler per event type per element is attached; previous handlers are removed on rerender.
- Controlled input sync prioritizes user typing (focused/dirty inputs) over state updates.
- SSR hydration is opt-in via the `hydrate` property; fallback hydrates the entire shadow root if no region is marked.
- All user-generated content is escaped in templates using `html` and `compile` helpers; static HTML is not escaped.
- Only features documented here and in `src/lib/runtime.ts` are supported; undocumented features may not work as expected.

## Minimal Example

```typescript
import { component, html, css } from './lib/runtime.ts';

component('minimal-example', {
  state: { count: 0 },
  template: ({ count }) => html`
    <div>
      <button data-on-click="increment">Count: ${count}</button>
    </div>
  `,
  style: css`
    button { font-size: 1.2rem; padding: 0.5rem 1rem; }
  `,
  increment(_e, state) {
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

See the [API Reference](docs/api-reference.md) for detailed usage, configuration options, and advanced patterns.