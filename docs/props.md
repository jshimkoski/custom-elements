# 🎯 Props Functionality Deep Dive

## 📦 Overview

Props allow you to pass data from HTML attributes into your custom element components. They are strongly typed, support default values, and are automatically reactive. Props are merged into the component's state and available in render, computed, and methods.

## 🛠️ Defining Props

- Props are defined in the `props` field of your `ComponentConfig`.
- Each prop must specify a `type` (String, Number, or Boolean).
- You can provide a `default` value.

```typescript
props: {
  title: { type: String, default: "Hello" },
  count: { type: Number, default: 0 },
  active: { type: Boolean, default: false },
}
```

## 🏷️ Using Props in HTML

- Props are set via attributes on your custom element, using kebab-case.
- Boolean props: use `active="true"` or omit for default.
- Number props: use `count="42"`.
- String props: use `title="Welcome"`.

```html
<my-element title="Welcome" count="42" active="true"></my-element>
```

## 🔄 Reactivity & Updates

- Props are reactive: changing an attribute updates the prop and triggers a re-render.
- The runtime automatically parses and escapes values for security.
- Default values are used if the attribute is missing.

## 🧩 Accessing Props in Component

- Props are available in `ctx` inside `render`, `computed`, `watch`, and methods.

```typescript
render: (ctx) => html`
  <h1>${ctx.title}</h1>
  <p>Count: ${ctx.count}</p>
  <p>Active: ${ctx.active ? "Yes" : "No"}</p>
`
```

## 🧪 Example: Full Props Usage

```typescript
component('demo-props', {
  props: {
    name: { type: String, default: "World" },
    age: { type: Number, default: 18 },
    subscribed: { type: Boolean, default: false },
  },
  render: (ctx) => html`
    <div>
      <h2>Hello, ${ctx.name}!</h2>
      <p>Age: ${ctx.age}</p>
      <p>Subscribed: ${ctx.subscribed ? "✅" : "❌"}</p>
    </div>
  `,
});
```

## 🧠 How Props Work Internally

- Props are parsed from attributes using kebab-case mapping.
- Types are enforced: String, Number, Boolean.
- Values are escaped for security.
- Props are merged into the reactive state object.
- Changing an attribute triggers `attributeChangedCallback`, updating state and re-rendering.

## 🛡️ Error Handling

- If a prop value is invalid, it falls back to the default (if provided).
- Errors in prop parsing trigger `onError` and/or `errorFallback` if defined.

## 📝 Tips & Best Practices

- Always specify types for props for strong typing and security.
- Use defaults to ensure predictable behavior.
- Use kebab-case for attribute names in HTML.
- Avoid complex objects as props; use primitives for best performance.

## 📚 Learn More

- [Component Config Guide](./component-config.md)
- [Render Guide](./render.md)
- [State Guide](./state.md)

## 🏁 Summary

Props provide a secure, reactive, and strongly typed way to pass data into your components. They integrate seamlessly with state, computed, and render, making your custom elements flexible and robust.
