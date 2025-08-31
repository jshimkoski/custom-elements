# 🧩 Template Guide

> How to use the `html` template function for expressive, reactive UIs

## 📖 Overview

The `html` template function lets you write declarative, type-safe templates for your components. It supports directives, bindings, and dynamic content with full reactivity.

## 🚀 Importing

```ts
import { html } from '@jasonshimmy/custom-elements-runtime';
```

## 🏗️ Basic Usage

Write templates using tagged template literals:

```ts
render: (ctx) => html`<h1>Hello, ${ctx.name}!</h1>`
```

## 🧩 Embedding Directives

Use directives like `when`, `each`, and `match` inside your template:

```ts
html`
  ${when(isVisible, html`<div>Visible!</div>`)}
  ${each(items, (item) => html`<li>${item}</li>`)}
  ${match().when(a, html`A`).otherwise(html`None`).done()}
`
```

## 🏷️ Attribute & Event Binding

Bind attributes and events directly in your template:

```ts
html`
  <input :value="count" :disabled="isLoading" />
  <button @click="${() => ctx.count++}">Increment</button>
`
```

## 🔗 Two-way Binding

Sync input values with state using `:model`:

```ts
html`
  <input :model="count" type="number" />
`
```

## 🧬 Dynamic Content

Templates can include any dynamic value, including computed properties and store values:

```ts
html`
  <span>${ctx.doubled}</span>
  <span>${store.theme}</span>
`
```

## 🧩 Nesting & Composition

Templates can be nested and composed for complex UIs:

```ts
html`
  <section>
    ${each(users, (user) => html`
      <div>${user.name}</div>
    `)}
  </section>
`
```

## 💡 Tips

- Always return a single root node from your render function.
- Use directives and bindings for maximum reactivity.
- TypeScript infers types for template variables.
- Works seamlessly with state, props, computed, store, and event bus.

For more, see the [API Reference](../src/lib/template-compiler.ts) and [examples](../src/components/examples/).
