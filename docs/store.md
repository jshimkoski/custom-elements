# 🗄️ Store Guide

> How to use the built-in `createStore` for global, reactive state management

## 📖 Overview

`createStore` creates a lightweight, type-safe, reactive state store for your app. It works with any component or directive.

## 🚀 Importing

```ts
import { createStore } from '@jasonshimmy/custom-elements-runtime/store';
```

## 🏗️ Creating a Store

Call `createStore(initialState)` to create a store.

```ts
const store = createStore({
  user: null,
  theme: 'light',
  cart: [],
});
```

## 📦 Using Store in Components

Use the store in your component logic or templates. Note: calling `store.getState()` returns the current snapshot but does not automatically cause components to re-render — use `subscribe` to react to updates or call your component's render/request routine when the store changes.

Recommended pattern: subscribe in the render function body (not inside `useOnConnected`) so the subscription is re-established if the component is ever removed from the DOM and re-inserted. `subscribe` returns an unsubscribe function and _immediately_ calls the listener with the current state when registered.

> **Important:** Do **not** subscribe inside `useOnConnected`. `useOnConnected` fires exactly once per component instance lifetime — it does not re-fire on reconnect. Subscriptions set up there are permanently removed when the component disconnects and are never re-established. See [`useOnConnected` Fires Once Per Instance Lifetime](./reactive-api.md#useonconnected-fires-once-per-instance-lifetime) for the full explanation and the reconnect-safe pattern.

```ts
const store = createStore({ count: 0 });

component('my-counter', () => {
  const count = ref(store.getState().count);

  // Subscribe in the render body so the subscription is active after
  // reconnects. subscribe() calls the listener immediately with current state.
  const unsubscribe = store.subscribe((state) => {
    count.value = state.count;
  });

  // Always clean up on disconnect.
  useOnDisconnected(unsubscribe);

  const handleIncrement = () => {
    store.setState((prev) => ({ count: (prev.count as number) + 1 }));
  };

  return html`
    <button @click="${handleIncrement}">
      Count: ${count.value}
    </button>
  `;
});
```

## 👀 Reactivity

Store is shallowly reactive: `setState()` performs a shallow merge and replaces the internal state object, then notifies subscribers. Use `subscribe(listener)` to react to state changes; the listener is invoked immediately with the current state when you subscribe and `subscribe` returns an unsubscribe function.

`setState` accepts **either** a partial state object or an updater function that receives the previous state. The updater form is preferred when the new value depends on the current state:

```ts
// Object form — shallow merge
store.setState({ theme: 'dark' });

// Updater function form — preferred for derived updates
store.setState((prev) => ({ count: prev.count + 1 }));
```

```ts
const unsubscribe = store.subscribe((state) => {
  console.log('State changed:', state);
});

store.setState({ theme: 'dark' });

// later, to stop listening:
// unsubscribe();
```

## 🔍 Watching Store Changes

You can subscribe to store changes and update your UI or logic.

```ts
store.subscribe((state) => {
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

component('my-counter', () => {
  return html`
    <button
      @click="${() => store.setState((prev) => ({ count: prev.count + 1 }))}"
    >
      ${store.getState().count}
    </button>
  `;
});
```

## 💡 Tips

- Use a single store for global state, or multiple stores for modular state.
- Store is shallowly reactive; always use `setState()` for updates.
- Works with all directives and templates.
- TypeScript infers types from your initial state.

For more, see the [API Reference](../src/lib/store.ts).
