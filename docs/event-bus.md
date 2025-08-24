# 📢 Event Bus Guide

> How to use the built-in event bus for decoupled communication between components

---

## 📖 Overview

The event bus is a lightweight publish/subscribe system for sending and receiving custom events across components. It helps you keep your code modular and reactive without tight coupling.

---

## 🚀 Importing

```ts
import { eventBus } from '@jasonshimmy/custom-elements-runtime';
```

---

## 📬 Sending Events

Use `eventBus.emit(eventName, payload?)` to broadcast an event.

```ts
// Send a custom event with optional data
eventBus.emit('cart:add', { id: 123, qty: 2 });
```

---

## 📥 Listening for Events

Use `eventBus.on(eventName, handler)` to listen for events. Returns an unsubscribe function.

```ts
const unsubscribe = eventBus.on('cart:add', (data) => {
  console.log('Item added:', data);
});

// To stop listening:
unsubscribe();
```

---

## 🔄 One-time Listeners

Use `eventBus.once(eventName, handler)` to listen for an event only once.

```ts
eventBus.once('user:login', (user) => {
  alert(`Welcome, ${user.name}!`);
});
```

---

## 🧹 Removing Listeners

You can remove listeners by calling the unsubscribe function returned by `.on()` or `.once()`.

---

## 🧩 Example: Component Communication

```ts
// In sender component
html`<button @click="${() => eventBus.emit('notify', 'Hello!')}">Notify</button>`

// In receiver component
onConnected: (state) => {
  state.unsub = eventBus.on('notify', (msg) => {
    state.message = msg;
  });
},
onDisconnected: (state) => {
  state.unsub(); // Clean up
}
```

---

## 💡 Tips

- Use event namespacing (e.g., `user:login`) for clarity.
- Always clean up listeners on disconnect to avoid memory leaks.
- Payload can be any type: object, string, number, etc.
- Event bus works across all components in the same app context.

---

For more, see the [API Reference](../src/lib/event-bus.ts) and [examples](../src/components/examples/).
