# 🧩 Custom Elements Runtime

> **Ultra-lightweight, type-safe runtime for fast, reactive, and maintainable web components.**

Build modern web components with strict TypeScript, zero dependencies, and a functional API. Designed for performance, standards compliance, and developer productivity.

## 🚀 Getting Started

### Install

```bash
npm install @jasonshimmy/custom-elements-runtime
```

### Import and use in your project

```typescript
import { component, html } from '@jasonshimmy/custom-elements-runtime';

component('my-counter', {
  state: { count: 0 },
  template: ({ count }) => html`
    <button data-on-click="increment">Count: ${count}</button>
  `({ count }),
  increment: (_e, state) => state.count++
});
```

### TypeScript support

All types and interfaces are available for auto-completion and strict typing in code editors. No extra configuration is needed.

### Advanced usage

See the [API Reference](docs/api-reference.md) for advanced configuration, SSR, plugin system, global store, event bus, and more.


## ✨ Features

- **Stateless & Stateful Components:** Define components with or without state for maximum flexibility and performance.
- **Reactive State & Attribute Sync:** Automatic re-renders and attribute reflection for primitive keys. Direct assignment triggers batched updates.
- **Functional Templates & Styling:** Use functions, tagged helpers (`html`, `compile`), or async Promises. Supports static and dynamic styles.
- **Refs & Computed Properties:** Direct DOM access via `data-ref` and derived state with `computed`.
- **Declarative Event & Input Binding:** Use `data-on-*`, `data-model`, and `data-bind` for type-safe event and input sync, including deep and nested state.
- **Global Store & Event Bus:** Built-in reactive store and event bus for cross-component state and communication.
- **SSR & Hydration:** Universal rendering, opt-in hydration, and template matching. SSR excludes refs, event listeners, and lifecycle hooks.
- **Error Boundaries & Focus Preservation:** Robust error handling and input focus retention during updates.
- **Plugin System:** Extend runtime with hooks (`onInit`, `onRender`, `onError`) for global/component logic.
- **Router:** Lightweight, functional router with SSR/static site support, `<router-view>`, route params, and programmatic navigation.
- **Performance & Modularity:** Smart DOM batching, tree-shakable exports, strict TypeScript, and modular functional API.

### Limitations & Edge Cases

- Templates require a single root node. Fragments are supported, but strict reconciliation and keys are recommended for robust updates.
- Only one event handler per event type per element; handlers must be defined on the config object.
- Controlled input sync always prioritizes user typing over state updates.
- SSR hydration is opt-in via `hydrate`; refs, event listeners, and lifecycle hooks are excluded during SSR.
- User-generated content is escaped in templates using `html` and `compile` helpers.
- Only documented features are supported; undocumented features may not work as expected.
- Plugin system hooks must be pure and side-effect free for best results.
- Router requires template matching for SSR hydration; navigation is programmatic and declarative.


## � Use Cases

- **Micro-frontends**: Lightweight, isolated components
- **Progressive Enhancement**: Add reactivity to existing sites
- **Design Systems**: Reusable component libraries
- **SSR Applications**: Universal rendering with hydration
- **Performance-Critical Apps**: When bundle size matters
- **Web Standards**: Future-proof, standards-based development
- **Static Site Generation**: Pre-render routes for instant loads and SEO
- **Plugin-driven Architectures**: Extend runtime with custom hooks


## 🖥️ SSR Highlights

- **Universal Rendering & SEO:** Fast, standards-compliant HTML/CSS for instant loads and search optimization.
- **Opt-in Hydration:** Hydrate only needed regions for efficient interactivity; templates must match for seamless transitions.
- **Fragment & Keyed Templates:** Robust reconciliation for fragments and keyed nodes.
- **Error Boundaries & Compliance:** Graceful fallback UI; lifecycle hooks and refs excluded for predictable SSR.
- **SSR Router Support:** Match routes server-side for static site generation and universal rendering.


## 🛡️ Production-Readiness

- Strict TypeScript, modular structure
- Early returns, guard clauses, custom error types
- No external dependencies
- Manual input validation and error handling
- Deep sanitization of user-generated content
- Regression-tested features and API


## ⚡ Performance Features

- Smart DOM batching and minimal re-renders
- Tree-shakable exports for optimal bundle size
- Modular functional API for code splitting
- Zero dependencies for maximum speed
- SSR and static site generation for instant loads
- Input focus and selection preservation
- Efficient attribute-state sync and event handling

---

- **Batched Updates & Caching:** State changes are batched (RAF); templates and computed properties are cached for speed.
- **Memory Management:** Automatic cleanup prevents leaks.
- **Focus & DOM Efficiency:** Input focus is preserved; only changed DOM nodes are updated for optimal UX.
- **Async & Selective Rendering:** Promises supported in templates; hydrate only marked regions for efficient SSR.


## 📚 Documentation

- [API Reference](docs/api-reference.md): All runtime exports, configuration options, and advanced patterns.
- [Core Concepts](docs/core-concepts.md): State, attribute sync, event binding, input binding, global store, event bus, lifecycle, error boundaries, SSR, plugin system.
- [Data Model vs Data Bind](docs/data-model-vs-data-bind.md): Comparison, use cases, modifiers, deep binding, edge cases.
- [Advanced Use Cases](docs/advanced-use-cases.md): Patterns for event bus, store, plugin system, async templates, error boundaries, SSR, VDOM.
- [Form Input Bindings](docs/form-input-bindings.md): All supported input types, modifiers, deep binding, edge cases, VDOM patching.
- [SSR Guide](docs/ssr.md): SSR, hydration, limitations, API.
- [Routing](docs/routing.md): Lightweight, functional router with SSR/static site support.
- [Framework Comparison](docs/framework-comparison.md): Unique features, tradeoffs, strengths, and when to choose each approach.
- [Framework Integration](docs/framework-integration.md): Using with React, Vue, Angular, Svelte, and Lit.
- [Examples](docs/examples.md): Concise, accurate code for all features and patterns.

See the [API Reference](docs/api-reference.md) for detailed usage, configuration options, and advanced patterns. For advanced topics, see the linked docs above.

## Local development

1. **Clone this repository**
2. **Run the examples**: `npm run dev`
