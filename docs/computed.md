# 🧮 Computed Functionality Deep Dive

## ⚡ Overview
Computed properties allow you to derive values from your component's state, props, and other computed properties. They are automatically injected into the state object, are reactive, and update whenever their dependencies change. Computed properties help keep your render logic clean and declarative.

---

## 🛠️ Defining Computed Properties
- Computed properties are defined in the `computed` field of your `ComponentConfig`.
- Each computed property is a function that receives the full state (including props and other computed values).
- The return value is automatically escaped for security.

```typescript
computed: {
  fullName: (state) => `${state.firstName} ${state.lastName}`,
  isAdult: (state) => state.age >= 18,
}
```

---

## 🔄 Reactivity & Updates
- Computed properties are recalculated whenever their dependencies change.
- They are available in `state` for use in `render`, `watch`, and methods.
- No need to manually update computed values; the runtime handles it for you.

---

## 🧩 Accessing Computed in Component
- Use computed properties just like state or props in your render function and other config fields.

```typescript
render: (state) => html`
  <h1>${state.fullName}</h1>
  <p>Adult: ${state.isAdult ? "Yes" : "No"}</p>
`
```

---

## 🧪 Example: Full Computed Usage
```typescript
component('user-info', {
  state: { firstName: 'Jane', lastName: 'Doe', age: 22 },
  computed: {
    fullName: (s) => `${s.firstName} ${s.lastName}`,
    isAdult: (s) => s.age >= 18,
  },
  render: (state) => html`
    <div>
      <h2>${state.fullName}</h2>
      <p>Age: ${state.age}</p>
      <p>Status: ${state.isAdult ? "Adult" : "Minor"}</p>
    </div>
  `,
});
```

---

## 🧠 How Computed Works Internally
- Computed functions are injected as getters on the state object.
- They are recalculated on every render, ensuring up-to-date values.
- Values are escaped for security before being exposed.
- Computed properties can depend on state, props, and other computed values.

---

## 🛡️ Error Handling
- If a computed function throws an error, the runtime calls `onError` and/or `errorFallback` if defined.
- Errors in computed do not break the component; fallback logic can be provided.

---

## 📝 Tips & Best Practices
- Keep computed functions pure and side-effect free.
- Use computed for derived values, not for triggering actions.
- Avoid heavy computations inside computed; prefer memoization if needed.
- Use descriptive names for computed properties.

---

## 📚 Learn More
- [Component Config Guide](./component-config.md)
- [State Guide](./state.md)
- [Props Guide](./props.md)

---

## 🏁 Summary
Computed properties provide a declarative, reactive, and secure way to derive values from your component's state and props. They help keep your UI logic clean, maintainable, and efficient.
