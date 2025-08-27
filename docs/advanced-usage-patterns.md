# 🧠 Advanced Usage Patterns Deep Dive

A guide to advanced patterns for building powerful, maintainable custom elements with the runtime. Learn how to leverage async templates, nested components, dynamic config, and more.

## ⏳ Async Templates

Render functions can return Promises for async data or templates. The runtime handles loading and error states automatically.

**Example:**
```typescript
component("async-demo", {
  state: { userId: 1 },
  loadingTemplate: (ctx) => html`<div>Loading...</div>`,
  errorTemplate: (err, ctx) => html`<div>Error: ${err?.message}</div>`,
  render: async (ctx) => {
    const user = await fetchUser(ctx.userId);
    return html`<div>User: ${user.name}</div>`;
  }
});
```

## 🧩 Nested Components

Components can render other custom elements, passing state and props for composition.

**Example:**
```typescript
component("parent-comp", {
  state: { name: "Alice" },
  render: (ctx) => html`<child-comp name="${ctx.name}"></child-comp>`
});

component("child-comp", {
  props: { name: { type: String, default: "" } },
  render: (ctx) => html`<span>Hello, ${ctx.name}!</span>`
});
```

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
  render: (ctx) => html`<div>Age: ${ctx.user.profile.age}</div>`
});
```

## 🛠️ Error Boundaries Everywhere

Use errorTemplate and errorFallback for robust error handling in any render or lifecycle logic.

**Example:**
```typescript
component("error-demo", {
  errorTemplate: (err, ctx) => html`<div>Oops: ${err?.message}</div>`,
  render: (ctx) => { throw new Error("Fail!"); }
});
```

## 🚀 Performance Patterns

- Debounce expensive renders
- Minimize deep state mutations
- Use keys for list rendering

## ❓ FAQ

**Q: Can I use async/await in render?**
A: Yes, the runtime supports async render functions with loading/error templates.

**Q: How do I pass data between nested components?**
A: Use props and state; parent can set attributes on child elements.

**Q: Can I extend the runtime with custom logic?**
A: Yes, add custom directives, bindings, or utility functions as needed.

## 🏁 Summary

Advanced patterns unlock the full power of the runtime for scalable, maintainable, and feature-rich custom elements. Experiment with async templates, nested components, deep state, and more for robust UIs.

For more details, see examples in the documentation and source code in `src/lib/runtime.ts`.
