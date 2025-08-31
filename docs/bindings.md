# 🔗 Bindings Functionality Deep Dive

## 🧬 Overview

Bindings allow you to connect your component's state, props, and events directly to the DOM. The runtime supports three core binding types: attribute binding (`:attr`), event binding (`@event`), and two-way binding (`#model`). These make your templates interactive, reactive, and easy to maintain.

## 🛠️ Supported Bindings

- `:attr` — Attribute binding
- `@event` — Event binding
- `#model` — Two-way binding for form elements
- `ref` — Ref binding

## 🏷️ Attribute Binding (`:attr`)

Bind state or props to element attributes.

```html
<input :value="name" />
```
- Use `:attrName` to bind any attribute to a state/prop value.
- Updates automatically when the value changes.

## 🖱️ Event Binding (`@event`)

Bind event listeners to DOM events.

```html
<button @click="${() => ctx.count++}">Increment</button>
<button @click="increment">Increment</button>
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

## 🪝 Ref Binding (`ref`)

Add `ref="refName"` to any element in your template.

```typescript
html`
  <input ref="usernameInput" type="text" />
  <button ref="submitBtn">Submit</button>
`
```

### Accessing Refs

Refs are attached to the `refs` object on your component context. You can access them in lifecycle hooks or event handlers:

```typescript
onConnected(ctx) {
  // Focus the input when the component mounts
  ctx.refs.usernameInput?.focus();
}
```

### Best Practices

- Use descriptive, camelCase names for refs.
- Access refs only after the element is rendered (e.g., in `onConnected`).
- Avoid manipulating the DOM directly unless necessary; prefer declarative updates.


## 🧩 Example: All Bindings Together

```typescript
component('binding-demo', {
  state: { name: '', count: 0 },
  render: (ctx) => html`
    <div>
      <input #model="name" ref="nameInput" placeholder="Name" />
      <button @click="${() => ctx.count++}">Clicked ${ctx.count} times</button>
      <div :data-name="name">Hello, ${ctx.name}</div>
      <button @click="${() => ctx.refs.nameInput?.focus()}">Focus Name Input</button>
    </div>
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
- Use `ref` to access DOM elements when necessary.
- Prefer simple, declarative bindings for maintainability.
- Avoid side effects in event handlers unless necessary.

## 📚 Learn More

- [Directives Guide](./directives.md)
- [Render Guide](./render.md)
- [State Guide](./state.md)

## 🏁 Summary

Bindings make your components interactive and reactive. Use attribute, event, and two-way bindings to connect your state and props to the DOM, enabling seamless user experiences and maintainable code.
