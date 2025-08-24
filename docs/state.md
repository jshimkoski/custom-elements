# 🧬 State Guide

> How to use reactive state in your components

---

## 📖 Overview

State is the local, reactive data for each component. It supports deep reactivity, mutation tracking, and works seamlessly with templates, watchers, and computed values.

---

## 🚀 Defining State

Add a `state` property to your component config:

```ts
state: { count: 0, text: '' }
```

---

## 🏗️ Using State in Templates

Access state directly in your render function:

```ts
render: (state) => html`<span>${state.count}</span>`
```

---

## 🔄 Updating State

Mutate state directly for instant reactivity:

```ts
state.count++;
state.text = 'Hello';
```

---

## 🧬 Deep Reactivity

State supports nested objects and arrays:

```ts
state: { user: { name: '', age: 0 }, items: [] }

// Update nested value
state.user.name = 'Alice';
state.items.push('New Item');
```

---

## 🧩 State & Directives

Use state with directives for dynamic rendering:

```ts
html`
  ${when(state.count > 0, html`<div>Count is positive</div>`)}
  ${each(state.items, (item) => html`<li>${item}</li>`)}
`
```

---

## 👀 State & Watchers

Watchers react to state changes automatically:

```ts
watch: {
  count: (newVal) => console.log('Count changed:', newVal)
}
```

---

## 🧮 State & Computed

Computed values derive from state and update automatically:

```ts
computed: {
  doubled: (state) => state.count * 2
}
```

---

## 💡 Tips

- State is deeply reactive; all mutations trigger updates.
- Use TypeScript for type safety and intellisense.
- Always return a single root node from your render function.
- State is local to each component; use `createStore` for global state.

---

For more, see the [API Reference](../src/lib/runtime.ts) and [examples](../src/components/examples/).
