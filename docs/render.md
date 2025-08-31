# ✨ Render Functionality Deep Dive

## 🚀 Overview

The `render` function is the heart of every component in the custom elements runtime. It defines how your component's UI is generated based on its state, props, computed values, and methods. The runtime ensures efficient, secure, and reactive rendering with zero dependencies.

## 🛠️ Defining the Render Function

- The `render` function is **required** in every `ComponentConfig`.
- It receives a single argument: the merged state, computed, props, and methods object.
- It must return a `VNode`, an array of `VNode`, or a `Promise` resolving to either.

```typescript
render: (ctx) => html`<div>Hello, ${ctx.name}!</div>`
```

## 🧩 What You Can Use Inside Render

- **State**: All reactive state properties.
- **Props**: All defined props (with type and default).
- **Computed**: All computed properties (auto-injected).
- **Methods**: Any custom methods defined in config.
- **Directives**: Use `when`, `each`, `match` for conditional and list rendering.
- **Bindings**: Use `:attr`, `:model`, `@event` for attribute, two-way, and event bindings.

## ⏳ Async Rendering

- The `render` function can be **async** (return a Promise).
- The runtime will show a loading template (if provided) while awaiting the result.
- If the Promise rejects, the error template (if provided) will be shown.

```typescript
render: async (ctx) => {
  const data = await fetchData(ctx.id);
  return html`<div>${data.value}</div>`;
}
loadingTemplate: (ctx) => html`<div>Loading...</div>`,
errorTemplate: (err, ctx) => html`<div>Error: ${err.message}</div>`,
```

## 🏗️ Example: Full Render Usage

```typescript
component('user-card', {
  state: { name: 'Alice', age: 30 },
  props: { id: { type: Number, default: 1 } },
  computed: {
    greeting: (s) => `Hello, ${s.name}!`,
  },
  render: (ctx) => html`
    <div>
      <h2>${ctx.greeting}</h2>
      <p>Age: ${ctx.age}</p>
      <button @click="${() => ctx.age++}">Increase Age</button>
    </div>
  `,
});
```

## 🧠 How Rendering Works Internally

- The runtime uses a virtual DOM (`vdomRenderer`) for efficient updates.
- State changes trigger re-renders automatically.
- Array mutations (push, pop, etc.) are tracked and trigger updates.
- Render is debounced to avoid excessive updates (max 10 per 16ms).
- Error boundaries prevent crashes; error templates can be shown.

## 🛡️ Error Handling in Render

- If an error occurs during rendering, the runtime calls `onError` and/or `errorFallback` if provided.
- The shadow DOM is updated with fallback content if needed.

## 🎨 Styling During Render

- Styles are applied after rendering, using the `style` property in config.
- Dynamic styles can depend on state and are efficiently cached.

## 📝 Tips & Best Practices

- Keep render functions pure and declarative.
- Use directives and bindings for clean, readable templates.
- Prefer returning a single root node for best performance.
- Use async render only when necessary; provide loading/error templates for UX.
- Avoid side effects inside render.

## 📚 Learn More

- [Component Config Guide](./component-config.md)
- [Template Guide](./template.md)
- [State Guide](./state.md)

## 🏁 Summary

The `render` function is the declarative, reactive, and secure way to define your component's UI. It integrates seamlessly with state, props, computed, and methods, supporting both sync and async rendering for modern web apps.
