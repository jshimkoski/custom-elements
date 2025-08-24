# 🔗 Cross-Component Communication Deep Dive

A guide to communicating between custom elements using the runtime. Learn how to use the event bus, props, stores, and direct DOM events for robust, decoupled UIs.

---

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

---

## 🧩 Props & Attribute Passing

Pass data from parent to child using props and attributes.

**Please note:** Props can only be of type string, number, or boolean.

- **Example:**
  ```html
  <user-card name="Alice" age="30"></user-card>
  ```
  ```typescript
  component("user-card", {
    props: { name: { type: String }, age: { type: Number } },
    render: (state) => html`<div>${state.name} (${state.age})</div>`
  });
  ```

---

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
    render: (state) => html`
      <button @click="store.theme = store.theme === 'light' ? 'dark' : 'light'">
        Theme: ${store.theme}
      </button>
    `
  });
  ```

---

## 🛠️ DOM Events

Use native DOM events for direct communication.

- **Dispatch custom events:**
  ```typescript
  this.dispatchEvent(new CustomEvent("my-event", { detail: { foo: "bar" } }));
  ```
- **Listen in parent:**
  ```html
  <my-child @my-event="handleEvent"></my-child>
  ```

**Note:**
- The `@event` binding only works in templates rendered by the runtime.
- For plain HTML, always use `addEventListener`.

---

## 🚦 Best Practices

- Prefer event bus for decoupled, app-wide communication
- Use props for parent-to-child data
- Use store for shared/global state
- Use DOM events for direct parent-child or sibling communication
- Clean up listeners to avoid memory leaks

---

## ❓ FAQ

**Q: When should I use the event bus?**
A: For decoupled, app-wide events or when components do not have a direct parent-child relationship.

**Q: How do I share state between components?**
A: Use the built-in store or pass props for local state.

**Q: Can I use native DOM events?**
A: Yes, for direct communication or integration with other libraries.

---

## 🏁 Summary

Cross-component communication is easy and flexible with the runtime. Use the event bus, props, store, and DOM events to build robust, maintainable UIs.

---

For more details, see the event bus, store, and component config in `src/lib/`.
