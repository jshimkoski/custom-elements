# 🔗 Bindings Functionality Deep Dive

## 🧬 Overview

Bindings allow you to connect your component's state, props, and events directly to the DOM. The runtime supports three core binding types: attribute binding (`:attr`), event binding (`@event`), and two-way binding (`#model`). These make your templates interactive, reactive, and easy to maintain.

## 🛠️ Supported Bindings

- `:attr` — Attribute binding
- `@event` — Event binding
- `#model` — Two-way binding for form elements

## 🏷️ Attribute Binding (`:attr`)

Bind state or props to element attributes.

```html
<input :value="state.name" />
```
- Use `:attrName` to bind any attribute to a state/prop value.
- Updates automatically when the value changes.

## 🖱️ Event Binding (`@event`)

Bind event listeners to DOM events.

```html
<button @click="${() => ctx.count++}">Increment</button>
```
- Use `@eventName` to bind a handler function.
- Handler can access and update state, props, or call injected methods.

## 🔄 Two-Way Binding (`#model`)

Synchronize form element values with state.

```html
<input #model="email" />
```
- Use `#model` for two-way binding on form fields.
- Supports nested state: `#model="user.name"`
- Updates state when the input value changes, and vice versa.

## 🧩 Example: All Bindings Together

```typescript
component('binding-demo', {
  state: { name: '', count: 0 },
  render: (ctx) => html`
    <input #model="name" placeholder="Name" />
    <button @click="${() => ctx.count++}">Clicked ${ctx.count} times</button>
    <div :data-name="name">Hello, ${ctx.name}</div>
  `,
});
```

## 🧠 How Bindings Work Internally

- Bindings are parsed by the template compiler and connected to the reactive state.
- Attribute and event bindings update automatically on state changes.
- Two-way bindings use proxies to keep state and DOM in sync.
- Supports nested properties and arrays for deep reactivity.

## 📝 Tips & Best Practices

- Use `:attr` for dynamic attributes (e.g., `:disabled`, `:class`).
- Use `@event` for all user interactions.
- Use `#model` for forms and user input.
- Prefer simple, declarative bindings for maintainability.
- Avoid side effects in event handlers unless necessary.

## 📚 Learn More

- [Directives Guide](./directives.md)
- [Render Guide](./render.md)
- [State Guide](./state.md)

## 🏁 Summary

Bindings make your components interactive and reactive. Use attribute, event, and two-way bindings to connect your state and props to the DOM, enabling seamless user experiences and maintainable code.
