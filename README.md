# 🧩 Custom Elements Runtime

> **Ultra-lightweight, type-safe runtime for fast, reactive, and maintainable web components.**

Build modern components with strict TypeScript, zero dependencies, and a clean functional API. Designed for speed, standards compliance, and productivity.

---

## 🚀 Quick Start

### Install

```
npm install @jasonshimmy/custom-elements-runtime
```

### Example Usage

```ts
import { component, html } from '@jasonshimmy/custom-elements-runtime';

component('my-counter', {
  state: { count: 0 },
  template: ({ count }) => html`
    <button data-on-click="increment">Count: ${count}</button>
  `({ count }),
  increment(event, state) { state.count++; }
});
```

No config needed — TypeScript support is built-in.

👉 Explore [Advanced Usage](docs/api-reference.md)

---

## ✨ Why Use It?

- **Stateful or Stateless:** Flexible components with or without internal state  
- **Reactive & Declarative:** Auto updates, attribute sync, and data binding  
- **Functional Templates:** Tagged helpers (`html`, `compile`), Promises, and styles  
- **Refs & Computed:** Access elements or create derived state easily  
- **Built-in Store & Events:** Global state and event bus included  
- **SSR & Hydration:** Universal rendering with opt-in hydration  
- **Error Handling & Focus Retention:** Smooth updates without breaking UX  
- **Plugin System:** Hooks like `onInit`, `onRender`, `onError`  
- **Lightweight Router:** SSR-ready with `<router-view>` and programmatic navigation  
- **Tiny & Fast:** Tree-shakable, modular, no dependencies  

---

## ⚠️ Things to Know

- Templates need a single root node (fragments allowed with keys)
- Always use helpers (e.g.; `html`, `compile`, `css`) to sanitize templates and styles
- One handler per event type per element  
- User input takes priority over programmatic changes  
- SSR hydration is opt-in (`data-hydrate`)  
- Only documented features are officially supported  
- Plugins must be pure and side-effect free  
- Router requires matching templates for SSR hydration  

---

## 🔧 Use Cases

- Micro-frontends  
- Progressive enhancement  
- Design systems  
- SSR apps  
- Performance-critical projects  
- Standards-based development  
- Static site generation  
- Plugin-extendable architectures  

---

## 🖥️ SSR Highlights

- SEO-friendly HTML/CSS out of the box  
- Hydrate only what you need  
- Robust support for fragments, keyed nodes, and error handling  
- Compatible with routing and static site generation  

---

## 🛡️ Production Ready

- Strict TypeScript and modular design  
- No dependencies  
- Clean error handling and validation  
- Secure: sanitizes user input  
- Fully tested  

---

## ⚡ Performance Perks

- DOM batching and minimal re-renders  
- Tree-shakable exports  
- Focus preservation and efficient DOM updates  
- Async rendering with Promises  
- Smart memory cleanup  

---

## 📚 Learn More

- [⚙️ Advanced Use Cases](docs/advanced-use-cases.md)  
- [🛠 API Reference](docs/api-reference.md)  
- [🌱 Core Concepts](docs/core-concepts.md)  
- [🥊 Data Model vs Data Bind](docs/data-model-vs-data-bind.md)  
- [📦 Examples](docs/examples.md)  
- [🎛️ Form Input Bindings](docs/form-input-bindings.md)  
- [🎯 Framework Comparison](docs/framework-comparison.md)  
- [🔗 Framework Integration](docs/framework-integration.md)  
- [🚦 Routing](docs/routing.md)  
- [🌐 SSR Guide](docs/ssr.md)  

---

## 🛠 Local Dev

```
# Clone the repo
git clone <repo-url>

# Run examples
npm run dev
```
