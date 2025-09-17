# 🧩 Custom Elements Runtime

[![Patreon](https://img.shields.io/badge/support-patreon-orange?logo=patreon)](https://patreon.com/jshimkoski)

> **Ultra-powerful, type-safe runtime for fast, reactive, and maintainable web components.**

Build modern components with strict TypeScript, zero dependencies, and a clean functional API. Designed for speed, standards compliance, and productivity.

🕹️ Try it on [Codepen.io](https://codepen.io/jshimkoski/pen/JoYmpxm).

## ✨ Why You'll Love It

- ⚡ **Blazing Fast:** Minimal runtime, instant updates, zero dependencies.
- 🎨 **JIT CSS:** On-demand, utility-first styling directly in your HTML at runtime.
- 💪 **No Build Necessary:** Instant development feedback, no bundling required.
- 🧑‍💻 **TypeScript First:** Strict types, intellisense, and safety everywhere.
- 🧩 **Functional API:** No classes, no boilerplate—just pure functions.
- 🛠️ **SSR & HMR Ready:** Universal rendering and instant hot reloads.
- 🔌 **Extensible:** Directives, event bus, store, and more for advanced use cases.
- 🏆 **Developer Friendly:** Clean docs, examples, and a welcoming community.

## ⏱️ Getting Started

1. **Install:** `npm install @jasonshimmy/custom-elements-runtime`
2. **Create a Component:**
```ts
import { component, ref, html, useEmit } from '@jasonshimmy/custom-elements-runtime';

component('my-counter', ({ initialCount = 0 }: { initialCount?: number }) => {
  const count = ref(initialCount);
  const emit = useEmit();
  
  const handleClick = () => {
    count.value++;
    emit('count-changed', { count: count.value });
  };
  
  return html`
    <button
      class="px-4 py-2 bg-blue-500 text-white rounded"
      @click="${handleClick}"
    >
      Count: ${count.value}
    </button>
  `;
});
```
3. **Use in HTML:**
  ```html
  <my-counter initial-count="5"></my-counter>
  ```
4. **Enjoy instant reactivity and type safety!**

## 📖 Documentation Index

Explore the complete documentation for every runtime feature:

### 🚀 **Getting Started**
- [**🎯 Streamlined Functional API**](./docs/streamlined-functional-api.md) - **Start here!** Complete guide to the modern functional component API

### 🏗️ **Core Features**
- [🧩 Template](./docs/template.md) - Template syntax and html function
- [🧭 Directives](./docs/directives.md) - Conditional rendering with `when`, `each`, and `match`
- [🛠️ Directive Enhancements](./docs/directive-enhancements.md) - Advanced directive utilities (`unless`, `whenEmpty`, etc.)
- [🔗 Bindings](./docs/bindings.md) - Data binding with `:prop`, `@event`, `:model`, `:class`, `:style`
- [🔔 Events Deep Dive](./docs/events-deep-dive.md) - Custom event emission and handling patterns

### 🎨 **Styling**
- [🎨 JIT CSS](./docs/jit-css.md) - On-demand utility-first styling system

### 🔗 **Communication & State**
- [📢 Event Bus](./docs/event-bus.md) - Global event system for cross-component communication
- [🗄️ Store](./docs/store.md) - Global state management
- [🚦 Router](./docs/router.md) - Client-side routing
- [🤝 Cross-Component Communication](./docs/cross-component-communication.md) - Patterns for component interaction

### ⚡ **Advanced Features**
- [🔮 Virtual DOM](./docs/virtual-dom.md) - VDOM implementation and performance details
- [🌐 SSR](./docs/ssr.md) - Server-side rendering support
- [♻️ HMR](./docs/hmr.md) - Hot module replacement
- [🛡️ Infinite Loop Protection](./docs/infinite-loop-protection.md) - Runtime safeguards against infinite loops

### 🔧 **Integration Guides**
- [⚛️ React Integration](./docs/react-integration.md) - Using components in React apps
- [🦊 Vue Integration](./docs/vue-integration.md) - Using components in Vue apps
- [🅰️ Angular Integration](./docs/angular-integration.md) - Using components in Angular apps
- [🔥 Svelte Integration](./docs/svelte-integration.md) - Using components in Svelte apps

### 🛠️ **Troubleshooting**
- [🔧 Troubleshooting](./docs/troubleshooting.md) - Common issues and solutions

For examples and implementation details, explore the source code in `src/lib/`.

## 🧑‍🔬 Real-World Examples
- [Form Input & Validation](./src/components/examples/FormInputValidation.ts)
- [Minimal Example](./src/components/examples/MinimalExample.ts)
- [Shopping Cart](./src/components/examples/ShoppingCart.ts)
- [Todo App](./src/components/examples/TodoApp.ts)

## 🌟 Showcase & Community

- **Showcase your components!** Open a PR to add your project to our gallery.
- **Questions or ideas?** [Start a discussion](https://github.com/jasonshimmy/custom-elements-runtime/discussions) or [open an issue](https://github.com/jasonshimmy/custom-elements-runtime/issues).
- **Contribute:** We welcome PRs for docs, features, and examples.
- ❤️ Like what you see? [Support ongoing development on Patreon](https://patreon.com/jshimkoski)

## 💖 Support This Project

Custom Elements Runtime is a labor of love built to make modern web development faster and more expressive. If it's helping you build better components, consider [supporting me on Patreon](https://patreon.com/jshimkoski) to help keep the momentum going.

Your support helps fund continued development, documentation, and community engagement. Every bit helps—thank you!
