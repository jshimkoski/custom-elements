# 🗄️ Store Guide

> How to use the built-in `createStore` for global, reactive state management

## 📖 Overview

`createStore` creates a lightweight, type-safe, reactive state store for your app. It works with any component or directive.

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

Use the store in your component logic or templates. Access state via `getState()`, update with `setState()`.

```ts
const store = createStore({ count: 0 });

component('my-counter', {
  render: () => html`
    <button @click="${() => store.setState(prev => ({ count: prev.count + 1 }))}">${store.getState().count}</button>
  `
});
```

## 👀 Reactivity

Store is shallowly reactive. Use `subscribe(listener)` to react to state changes.

```ts
store.subscribe(state => {
  console.log('State changed:', state);
});

store.setState({ theme: 'dark' });
```

## 🔍 Watching Store Changes

You can subscribe to store changes and update your UI or logic.

```ts
store.subscribe(state => {
  // React to state changes
});
```

## 🧩 Sharing Store Across Components

Import and use the same store instance in any component or module.

```ts
// store.ts
export const store = createStore({ count: 0 });

// my-counter.ts
import { store } from './store';

component('my-counter', {
  render: () => html`
    <button @click="${() => store.setState(prev => ({ count: prev.count + 1 }))}">${store.getState().count}</button>
  `
});
```

## 💡 Tips

- Use a single store for global state, or multiple stores for modular state.
- Store is shallowly reactive; always use `setState()` for updates.
- Works with all directives and templates.
- TypeScript infers types from your initial state.

For more, see the [API Reference](../src/lib/store.ts).
