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
  render: (state) => html`
    <button @click="${() => state.count++}">Count: ${state.count}</button>
  `
});
```

No config needed — TypeScript support is built-in.

---

## ✨ Why Use It?

- **TypeScript-first:** Strict types and intellisense for all APIs.
- **Functional API:** Pure functions and config objects, no classes or decorators.
- **Zero dependencies:** No external libraries or build step.
- **Mobile-first:** Fast, responsive UIs.
- **Two-way binding:** Use `#model-*` for instant state sync.
- **Simple props/state/computed:** Automatic updates, easy reactivity.
- **Lifecycle hooks:** `onConnected`, `onDisconnected`, `onAttributeChanged`, error boundaries.
- **Custom events:** Built-in event bus for easy communication.
- **Scoped styles:** Secure, performant CSS with caching.
- **SSR-friendly:** Minimal fallback for server-side rendering.
- **HMR support:** Instant dev feedback.
- **Easy to use:** Just call `component()` with a config and render function.

---

## ⚠️ Things to Know

- Components must use kebab-case tags (e.g., `my-widget`).
- Each component must return a single root node from its render function.
- Only functional patterns — avoid `this`, classes, or decorators.
- Props are strings, numbers, or booleans (auto-converted).
- State and computed are deeply reactive and proxied.
- Watchers support immediate and deep options.
- Styles are sanitized and scoped per component.
- Error boundaries catch and display errors with fallback templates.
- SSR disables DOM/lifecycle logic for safe server rendering.

---

## 🧩 Directives & Binding

Directives make your templates expressive and reactive:

- **when(cond, children):** Render children only if condition is true.
- **each(list, render):** Render a block for each item in a list.
- **match():** Chain conditional branches for complex logic.

Example:
```ts
html`
  ${when(isVisible, html`<div>Visible!</div>`)}
  ${each(items, (item) => html`<li>${item}</li>`)}
  ${match().when(a, html`A`).when(b, html`B`).otherwise(html`None`).done()}
`
```

### Value, Event & Attribute Binding

- **Two-way binding:** Use `#model` for instant state sync with inputs.
- **Attribute binding:** Use `:attr` to bind dynamic attributes (e.g., `:disabled`).
- **Event binding:** Use `@event` (e.g., `@click`) for event handlers.

Example:
```ts
html`
  <input #model="count" type="number" :disabled="isLoading" />
  <button @click="${() => count++}">Increment</button>
`
```

---

## 🔧 Use Cases

- Design systems, UI libraries
- Dashboards, admin panels
- E-commerce widgets
- Interactive forms, wizards
- Docs sites, demos
- Reusable controls for any web app

---

## 🖥️ SSR Highlights

- Minimal class fallback, no DOM/lifecycle logic
- No browser API reliance on server
- Always valid HTML output, ready for hydration
- Error handling and prop parsing work in SSR

---

## 🛡️ Production Ready

- Secure by default: sanitizes HTML/CSS, blocks unsafe scripts/styles
- Handles edge cases and errors gracefully
- Fully tree-shakable and code-splittable
- No global state or side effects
- Easy to test with Vitest and Cypress

---

## ⚡ Performance Perks

- Ultra-fast rendering via virtual DOM diffing
- Debounced style updates for smooth UI
- Style caching/deduplication for minimal CSS
- Minimal memory footprint and fast startup
- No runtime bloat, no polyfills needed

---

## 🔬 Comparison: Vue, React, Svelte, Angular, Lit

| Feature                | Custom Elements Runtime | Vue     | React   | Svelte  | Angular | Lit     |
|------------------------|:----------------------:|:-------:|:-------:|:-------:|:-------:|:-------:|
| Type Safety            | ✅ Strict TypeScript    | ✅      | ✅      | ✅      | ✅      | ✅      |
| Functional API         | ✅ Yes                  | ⚠️ (Options/Composition) | ⚠️ (Hooks, JSX) | ✅ | ⚠️ (Classes, Decorators) | ✅ |
| Classes/Decorators     | ❌ Never                | ⚠️      | ❌      | ❌      | ✅      | ⚠️      |
| Dependencies           | ❌ None                 | ✅      | ✅      | ✅      | ✅      | ✅      |
| Bundle Size            | Ultra-small             | Small   | Medium  | Small   | Large   | Small   |
| Event Bus              | ✅ Built-in            | ⚠️ (manual) | ⚠️ (manual) | ⚠️ (manual) | ⚠️ (manual) | ⚠️ (manual) |
| Store/State Management | ✅ Built-in store      | ✅ Vuex/Pinia | ✅ Redux/etc | ✅ Writable | ✅ NgRx/etc | ⚠️ (manual) |
| Two-way Binding        | ✅ #model             | ✅ v-model | ⚠️ (manual) | ✅ bind: | ⚠️ (manual) | ⚠️ (manual) |
| Directives             | ✅ when, each, match    | ✅      | ⚠️      | ✅      | ✅      | ⚠️      |
| Attribute/Event Binding| ✅ :attr, @event        | ✅      | ✅      | ✅      | ✅      | ✅      |
| Scoped Styles          | ✅ Auto, secure         | ✅      | ⚠️      | ✅      | ✅      | ✅      |
| SSR Support            | ✅ Minimal fallback     | ✅      | ✅      | ✅      | ✅      | ✅      |
| HMR                    | ✅ Yes                  | ✅      | ✅      | ✅      | ✅      | ✅      |
| Learning Curve         | Very low                | Low     | Medium  | Low     | High    | Low     |
| Custom Elements        | ✅ Native               | ⚠️      | ⚠️      | ⚠️      | ⚠️      | ✅      |
| Usage                  | `component()` + config  | SFC/Options | JSX/Function | SFC/Script | NgModule | `LitElement` + template |

**Legend:**
- ✅ = Fully supported / native
- ⚠️ = Partially supported / requires extra code
- ❌ = Not supported

---

## 📚 Learn More

- [API Reference](./src/lib/runtime.ts)

---

## 🛠 Local Dev

```
# Clone the repo
git clone <repo-url>

# Run examples
npm run dev
```
