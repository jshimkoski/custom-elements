# 🧩 Template Guide

> How to use the `html` template function for expressive, reactive UIs

## 📖 Overview

The `html` template function lets you write declarative, type-safe templates for your components. It supports directives, bindings, and dynamic content with full reactivity.

## 🚀 Importing

```ts
import { html, useEmit } from '@jasonshimmy/custom-elements-runtime';
```

## 🏗️ Basic Usage

Write templates using tagged template literals:

```ts
component('my-component', ({ name = 'World' }) => {
  return html`<h1>Hello, ${name}!</h1>`;
});
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
component('interactive-component', ({ count = 0, isLoading = false }) => {
  const emit = useEmit();
  
  const increment = () => {
    emit('count-changed', count + 1);
  };
  
  return html`
    <input :value="${count}" :disabled="${isLoading}" />
    <button @click="${increment}">Increment</button>
  `;
});
```

## 🔗 Two-way Binding

Sync input values with state using `:model`:

```ts
import { ref } from '@jasonshimmy/custom-elements-runtime';

component('form-component', () => {
  const inputValue = ref('');
  
  return html`
    <input :model="${inputValue}" type="text" />
    <p>Current value: ${inputValue.value}</p>
  `;
});
```

## 🧬 Dynamic Content

Templates can include any dynamic value, including computed properties and store values:

```ts
component('dynamic-component', ({ multiplier = 2 }) => {
  const baseValue = ref(5);
  const doubled = computed(() => baseValue.value * multiplier);
  
  return html`
    <span>Base: ${baseValue.value}</span>
    <span>Doubled: ${doubled.value}</span>
    <span>Theme: ${store.getState().theme}</span>
  `;
});
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

- Prefer returning a single root node from your render function for simpler VDOM updates; multi-root templates are supported when necessary.
- Use directives and bindings for maximum reactivity.
- TypeScript infers types for template variables.
- Works seamlessly with state, props, computed, store, and event bus.

For more, see the [API Reference](../src/lib/template-compiler.ts) and [examples](../src/components/examples/).
