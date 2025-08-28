# 🔗 Cross-Component Communication Deep Dive

A guide to communicating between custom elements using the runtime. Learn how to use the event bus, props, stores, and direct DOM events for robust, decoupled UIs.

## 📡 Event Bus

The built-in event bus enables decoupled communication between components.

- **Publish events:**
  ```typescript
  import { eventBus } from "runtime";
  eventBus.emit("cart:add", { id: 123 });
  ```
- **Subscribe to events:**
  ```typescript
  eventBus.on("cart:add", (payload) => {
    // Handle add to cart
  });
  ```
- **Unsubscribe:**
  ```typescript
  const unsub = eventBus.on("cart:add", handler);
  unsub(); // Remove listener
  ```

## 🧩 Props & Attribute Passing

Pass data from parent to child using props and attributes (string, number, boolean). For function props (event handlers), set them as properties on the element instance (not as attributes).

- **Primitive props example:**
  ```html
  <user-card name="Alice" age="30"></user-card>
  ```
  ```typescript
  component("user-card", {
    props: { name: { type: String }, age: { type: Number } },
    render: (ctx) => html`<div>${ctx.name} (${ctx.age})</div>`
  });
  ```

- **Function prop (event handler) example:**
  ```typescript
  // In parent code
  const el = document.createElement('user-card');
  el.onCustomEvent = (detail, ctx) => {
    // handle event
  };
  document.body.appendChild(el);
  ```

## 🏪 Shared Store

Use the built-in store for global or shared state.

- **Create a store:**
  ```typescript
  import { createStore } from "runtime";
  const store = createStore({ theme: "light" });
  ```
- **Access in components:**
  ```typescript
  component("theme-toggle", {
    render: (ctx) => html`
      <button @click="${() => store.theme = store.theme === 'light' ? 'dark' : 'light'}">
        Theme: ${store.theme}
      </button>
    `
  });
  ```

## 🛠️ DOM Events

Use native DOM events for direct communication.

- **Dispatch custom events (from within runtime component):**
  ```typescript
  // Use context.emit for custom events
  ctx.emit('my-event', { foo: 'bar' });
  ```
- **Listen in parent (frameworks):**
  - Vue: `<my-child @my-event="handleEvent" />`
  - Angular: `<my-child (my-event)="handleEvent($event)" ></my-child>`
  - Svelte: `<my-child on:my-event={handleEvent} />`
  - React: Use ref and `addEventListener`
    ```jsx
    el.addEventListener('my-event', e => { /* ... */ });
    ```

**Note:**
- The `@event` binding only works in templates rendered by the runtime or supported frameworks.
- For plain HTML, always use `addEventListener`.

## 🚦 Best Practices

- Prefer event bus for decoupled, app-wide communication
- Use props for parent-to-child data (primitive types via attributes, function props via property assignment)
- Use store for shared/global state
- Use DOM events for direct parent-child or sibling communication
- Always set function props (event handlers) as properties, not attributes
- Clean up listeners to avoid memory leaks

## ❓ FAQ

**Q: When should I use the event bus?**
A: For decoupled, app-wide events or when components do not have a direct parent-child relationship.

**Q: How do I share state between components?**
A: Use the built-in store or pass props for local state.

**Q: Can I use native DOM events?**
A: Yes, for direct communication or integration with other libraries.

## 🏁 Summary

Cross-component communication is easy and flexible with the runtime. Use the event bus, props, store, and DOM events to build robust, maintainable UIs.

For more details, see the event bus, store, and component config in `src/lib/`.
