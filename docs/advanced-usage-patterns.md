# 🧠 Advanced Usage Patterns Deep Dive

A guide to advanced patterns for building powerful, maintainable custom elements with the runtime. Learn how to leverage async templates, nested components, dynamic config, and more.

---

## ⏳ Async Templates

Render functions can return Promises for async data or templates. The runtime handles loading and error states automatically.

**Example:**
```typescript
component("async-demo", {
  state: { userId: 1 },
  loadingTemplate: (state) => html`<div>Loading...</div>`,
  errorTemplate: (err, state) => html`<div>Error: ${err?.message}</div>`,
  render: async (state) => {
    const user = await fetchUser(state.userId);
    return html`<div>User: ${user.name}</div>`;
  }
});
```

---

## 🧩 Nested Components

Components can render other custom elements, passing state and props for composition.

**Example:**
```typescript
component("parent-comp", {
  state: { name: "Alice" },
  render: (state) => html`<child-comp name="${state.name}"></child-comp>`
});

component("child-comp", {
  props: { name: { type: String, default: "" } },
  render: (state) => html`<span>Hello, ${state.name}!</span>`
});
```

---

## 🔄 Dynamic Component Config

You can update component configs at runtime for feature toggles, theming, or A/B testing.

**Example:**
```typescript
// Update config for live components
registry.set("my-comp", { ...newConfig });
```

---

## 🏷️ Custom Directives & Bindings

Extend the runtime with custom directives or bindings for specialized behaviors.

**Example:**
```typescript
// Add a custom directive
export function myDirective(node, value, context) {
  // Custom logic
}
```

---

## 🧬 Deep State & Watchers

Watch deeply nested state for complex reactivity.

**Example:**
```typescript
component("deep-watch", {
  state: { user: { profile: { age: 30 } } },
  watch: {
    "user.profile.age": [(newVal, oldVal) => {
      console.log("Age changed:", newVal);
    }, { deep: true }]
  },
  render: (state) => html`<div>Age: ${state.user.profile.age}</div>`
});
```

---

## 🧩 Slot-like Patterns

Simulate slots by passing content as props or using child nodes.

**Example:**
```typescript
component("slot-demo", {
  props: { content: { type: String, default: "" } },
  render: (state) => html`<div>${state.content}</div>`
});
```

---

## 🛠️ Error Boundaries Everywhere

Use errorTemplate and errorFallback for robust error handling in any render or lifecycle logic.

**Example:**
```typescript
component("error-demo", {
  errorTemplate: (err, state) => html`<div>Oops: ${err?.message}</div>`,
  render: (state) => { throw new Error("Fail!"); }
});
```

---

## 🚀 Performance Patterns

- Use style dependencies for efficient style updates
- Debounce expensive renders
- Minimize deep state mutations
- Use keys for list rendering

---

## ❓ FAQ

**Q: Can I use async/await in render?**
A: Yes, the runtime supports async render functions with loading/error templates.

**Q: How do I pass data between nested components?**
A: Use props and state; parent can set attributes on child elements.

**Q: Can I extend the runtime with custom logic?**
A: Yes, add custom directives, bindings, or utility functions as needed.

---

## 🏁 Summary

Advanced patterns unlock the full power of the runtime for scalable, maintainable, and feature-rich custom elements. Experiment with async templates, nested components, deep state, and more for robust UIs.

---

For more details, see examples in the documentation and source code in `src/lib/runtime.ts`.
