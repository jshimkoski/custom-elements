# 🧩 Custom Elements Runtime

> **Ultra-lightweight, type-safe runtime for fast, reactive, and maintainable web components.**

Build modern components with strict TypeScript, zero dependencies, and a clean functional API. Designed for speed, standards compliance, and productivity.

## 🚧 **Active Development Notice**

> ⚠️ **This package is in active development and not yet ready for production use.**
> Features, APIs, and stability may change frequently. Please use for testing, experimentation, or contribution only.

## ✨ Why You'll Love It

- ⚡ **Blazing Fast:** Minimal runtime, instant updates, zero dependencies.
- 🎨 **JIT CSS:** On-demand, utility-first styling directly in your HTML.
- 🧑‍💻 **TypeScript First:** Strict types, intellisense, and safety everywhere.
- 🧩 **Functional API:** No classes, no boilerplate—just pure functions.
- 🛠️ **SSR & HMR Ready:** Universal rendering and instant hot reloads.
- 🔌 **Extensible:** Directives, event bus, store, and more for advanced use cases.
- 🏆 **Developer Friendly:** Clean docs, examples, and a welcoming community.

---

## 🚀 Quick Start

### Install

```
npm install @jasonshimmy/custom-elements-runtime
```

### Example Usage

```ts
import { component, html } from '@jasonshimmy/custom-elements-runtime';

component('my-counter', (ctx) => html`
  <button @click="${() => ctx.count++}">Count: ${ctx.count}</button>
`, { state: { count: 0 } });
```

No config needed — TypeScript support is built-in.

## ⏱️ Getting Started in 60 Seconds

1. **Install:** `npm install @jasonshimmy/custom-elements-runtime`
2. **Create a Component:**
  ```ts
  import { component, html } from '@jasonshimmy/custom-elements-runtime';
  component('hello-world', () => html`<h1>Hello, World!</h1>`);
  ```
3. **Use in HTML:**
  ```html
  <hello-world></hello-world>
  ```
4. **Enjoy instant reactivity and type safety!**

# 📖 Documentation Index

Explore the full documentation for every runtime feature:

---

## 🏗️ Core Concepts
- [Component Config](./docs/component-config.md)
- [Component](./docs/component.md)
- [Render](./docs/render.md)
- [Props](./docs/props.md)
- [State](./docs/state.md)
- [Computed](./docs/computed.md)
- [Watch](./docs/watch.md)
- [Store](./docs/store.md)
- [Event Bus](./docs/event-bus.md)
- [Template](./docs/template.md)

## 🧩 Reactivity & Patterns
- [Directives](./docs/directives.md)
- [Bindings](./docs/bindings.md)
- [Directives & Binding](./docs/directives-and-binding.md)
- [Slot](./docs/slot.md)
- [Advanced Usage Patterns](./docs/advanced-usage-patterns.md)
- [Cross-Component Communication](./docs/cross-component-communication.md)

## 🎨 Styling
- [Style](./docs/style.md)
- [Deep Dive: JIT CSS](./docs/jit-css.md)

## ⚡ Performance & Architecture
- [Virtual DOM](./docs/virtual-dom.md)
- [HMR](./docs/hmr.md)
- [SSR](./docs/ssr.md)

## 🛡️ Error Handling & Lifecycle
- [Error](./docs/error.md)
- [Hooks](./docs/hooks.md)
- [Method Injection](./docs/method-injection.md)

## 🧰 Utilities & Troubleshooting
- [Troubleshooting](./docs/troubleshooting.md)

## 🔗 Framework Integration
- [Vue Integration](./docs/vue-integration.md)
- [React Integration](./docs/react-integration.md)
- [Svelte Integration](./docs/svelte-integration.md)
- [Angular Integration](./docs/angular-integration.md)

---

For deep dives, see each guide above or browse the source code in `src/lib/`.

## 🧑‍🔬 Real-World Examples
- [Form Input & Validation](./src/components/examples/FormInputValidation.ts)
- [Minimal Example](./src/components/examples/MinimalExample.ts)
- [Shopping Cart](./src/components/examples/ShoppingCart.ts)
- [Todo App](./src/components/examples/TodoApp.ts)

## 🌟 Showcase & Community
- **Showcase your components!** Open a PR to add your project to our gallery.
- **Questions or ideas?** [Start a discussion](https://github.com/jasonshimmy/custom-elements-runtime/discussions) or [open an issue](https://github.com/jasonshimmy/custom-elements-runtime/issues).
- **Contribute:** We welcome PRs for docs, features, and examples.

---

## 🛠 Local Dev

```
# Clone the repo
git clone <repo-url>

# Run examples
npm run dev
```
