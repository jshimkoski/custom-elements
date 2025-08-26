# 🗄️ Store Guide

> How to use the built-in `createStore` for global, reactive state management

## 📖 Overview

`createStore` lets you create a reactive, shared state object for your app. It's lightweight, type-safe, and works seamlessly with components and directives.

## 🚀 Importing

```ts
import { createStore } from '@jasonshimmy/custom-elements-runtime';
```

## 🏗️ Creating a Store

Call `createStore(initialState)` to create a store.

```ts
const store = createStore({
  user: null,
  theme: 'light',
  cart: []
});
```

## 📦 Using Store in Components

Access and mutate store values directly in your component logic or templates.

```ts
component('my-cart', {
  render: (ctx) => html`
    <div>Items: ${store.cart.length}</div>
    <button @click="${() => store.cart.push({ id: 1 })}">Add</button>
  `
});
```

## 👀 Reactivity

Store values are deeply reactive. Changes automatically update all components using the store.

```ts
store.theme = 'dark'; // All components using store.theme will update
```

## 🔍 Watching Store Changes

You can use watchers in your component config to react to store changes.

```ts
component('my-theme', {
  watch: {
    'theme': (newVal) => {
      console.log('Theme changed:', newVal);
    }
  },
  render: () => html`<span>Current theme: ${store.theme}</span>`
});
```

## 🧩 Sharing Store Across Components

Import and use the same store instance in any component or module.

```ts
// store.js
export const store = createStore({ count: 0 });

// my-counter.ts
import { store } from './store.js';

component('my-counter', {
  render: () => html`<button @click="${() => store.count++}">${store.count}</button>`
});
```

## 💡 Tips

- Use a single store for global state, or multiple stores for modular state.
- Store is deeply reactive; array/object mutations are tracked.
- Works with all directives and templates.
- TypeScript infers types from your initial state.

For more, see the [API Reference](../src/lib/store.ts) and [examples](../src/components/examples/).
