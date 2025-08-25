# 🧑‍💻 Method Injection Functionality Deep Dive

## 🪄 Overview
Method injection allows you to define custom functions in your component config and have them automatically available on the reactive state object. This makes it easy to organize logic, reuse code, and keep your render functions clean and declarative.

---

## 🛠️ Defining Methods
- Add any function to your `ComponentConfig` (except lifecycle hooks).
- Methods are injected into the state object and can be called from render, computed, watch, or other methods.
- Each method receives the component state as its last argument.

```typescript
component('counter-demo', {
  state: { count: 0 },
  increment: (by, ctx) => { ctx.count += by; },
  reset: (ctx) => { ctx.count = 0; },
  render: (ctx) => html`
    <button @click="${() => ctx.increment(1)}">+1</button>
    <button @click="${ctx.reset}">Reset</button>
    <div>Count: ${ctx.count}</div>
  `,
});
```

---

## 🔄 How Method Injection Works
- All non-hook functions in the config are injected into the state object.
- Methods are available everywhere you use state: render, computed, watch, and other methods.
- Methods are always called with the current state as the last argument, ensuring access to all reactive data.

---

## 🧩 Example: Using Methods in Computed and Watch
```typescript
component('math-demo', {
  state: { value: 2 },
  double: (ctx) => ctx.value * 2,
  computed: {
    squared: (ctx) => ctx.double(ctx) ** 2,
  },
  watch: {
    value: [(newVal, oldVal, ctx) => {
      console.log('Value changed:', newVal);
      ctx.double(ctx); // Use method in watcher
    }],
  },
  render: (ctx) => html`
    <div>Value: ${ctx.value}, Squared: ${ctx.squared}</div>
    <button @click="${() => ctx.value++}">Inc</button>
  `,
});
```

---

## 🧠 Internal Mechanism
- During component initialization, all config keys that are functions (and not hooks) are wrapped and injected into the state.
- Methods are always available and reactive, just like state properties.
- This avoids the need for `this` and keeps logic functional and modular.

---

## 📝 Tips & Best Practices
- Use method injection for reusable logic and actions.
- Avoid side effects in methods unless intended (e.g., state updates).
- Name methods descriptively for clarity.
- Do not use lifecycle hook names for methods (they are reserved).
- Keep methods pure when possible for testability.

---

## 📚 Learn More
- [Component Config Guide](./component-config.md)
- [Render Guide](./render.md)
- [Hooks Guide](./hooks.md)

---

## 🏁 Summary
Method injection makes your components more modular, maintainable, and developer-friendly. Define custom functions in your config and use them anywhere in your component logic for clean, functional code.
