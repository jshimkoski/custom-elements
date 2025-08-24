# 🧩 Directives & Binding Guide

> All supported directives, attribute, and event bindings in Custom Elements Runtime

---

## 📖 Overview

Directives make your templates expressive, reactive, and easy to maintain. Attribute and event bindings connect your UI to state and logic.

---

## 🧩 Core Directives

### 🟢 when
Render content only if a condition is true.
```ts
html`
  ${when(isVisible, html`<div>Visible!</div>`)}
`
```

### 🔁 each
Render a block for each item in a list.
```ts
html`
  <ul>
    ${each(items, (item) => html`<li>${item}</li>`)}
  </ul>
`
```

### 🧩 match
Chain conditional branches for complex logic.
```ts
html`
  ${match()
    .when(a, html`A`)
    .when(b, html`B`)
    .otherwise(html`None`)
    .done()}
`
```

---

## 🏷️ Attribute Binding

Bind dynamic attributes to state or computed values using `:attr` syntax.
```ts
html`
  <input :disabled="isLoading" :value="count" />
`
```
- Any attribute can be bound: `:checked`, `:aria-label`, `:class`, etc.
- Value updates automatically when state changes.

---

## 🔗 Two-way Binding

Sync input values with state using `#model`.
```ts
html`
  <input #model="count" type="number" />
`
```
- Works with text, number, checkbox, radio, textarea, etc.
- Updates state instantly on user input.

---

## 🛎️ Event Binding

Bind event handlers using `@event` syntax.
```ts
html`
  <button @click="${() => count++}">Increment</button>
  <input @input="${onInput}" />
`
```
- Supported events: `@click`, `@input`, `@change`, `@keydown`, etc.
- Handler can be inline or a function from state.

---

## 🧩 Advanced: Nested & Custom Directives

Directives can be nested and combined for complex UIs.
```ts
html`
  ${when(isReady, html`
    ${each(users, (user) => html`
      <div>${user.name}</div>
    `)}
  `)}
`
```

---

## 💡 Tips

- All directives return VNodes; use them directly in your template.
- Attribute/event binding works on any HTML element.
- Always use a single root node in your render output.
- Use TypeScript for best experience and type safety.

---

For more, see the [API Reference](../src/lib/directives.ts) and [examples](../src/components/examples/).
