# 🔗 Bindings Functionality Deep Dive

## 🧬 Overview

Bindings allow you to connect your component's state, props, and events directly to the DOM. The runtime supports three core binding types: attribute binding (`:attr`), event binding (`@event`), and two-way binding (`:model`). These make your templates interactive, reactive, and easy to maintain.

## 🛠️ Supported Bindings

- `:attr` / `:prop` — Attribute/property binding
- `@event` — Event binding
- `:model` — Two-way binding for form elements (native + custom elements)
- `ref` — Ref binding

## 🏷️ Attribute / Property Binding (`:prop` / `:attr`)

Bind state or props to element attributes or DOM properties. The template syntax `:name` will set the DOM property when supported (preferred for numbers, objects and functions); use bare attributes for string literals only.

```html
<input :value="name" />
```

- Use `:name` to bind a value to an element property (where supported). This updates automatically when the value changes.
- For custom elements prefer property binding to target element properties (e.g. `:someProp="obj"`). HTML attributes are string-only and should be used for literal text.

## 🖱️ Event Binding (`@event`)

Bind event listeners to DOM events.

```html
<button @click="${() => ctx.count++}">Increment</button>
<button @click="increment">Increment</button>
```
- Use `@eventName` to bind a handler function.
- Handler can access and update state, props, or call injected methods.

## 🎨 Class Binding (`:class`)

Bind dynamic classes to your elements using `:class`. This enables conditional, array, and object-based class assignment for flexible styling.

### Usage

```html
<div :class="${{ active: isActive, error: hasError }}"></div>
<div :class="${['foo', isBar ? 'bar' : '']}"></div>
<div :class="${'static-class' + (isActive ? ' active' : '')}"></div>
```

### Best Practices
- Use object syntax for conditional classes.
- Use array syntax for multiple dynamic classes.
- Avoid empty strings or falsy values in arrays/objects.
- Combine with static classes using string concatenation if needed.

### Example

```typescript
component('class-binding-demo', {
  state: { isActive: true, hasError: false },
  render: (ctx) => html`
    <div :class="${{ active: ctx.isActive, error: ctx.hasError }}">Status</div>
    <div :class="${['foo', ctx.isActive ? 'active' : '', ctx.hasError && 'error']}">Multi</div>
    <div :class="${'static' + (ctx.isActive ? ' active' : '')}">Static + Dynamic</div>
  `,
});
```

## 🎨 Style Binding (`:style`)

Bind dynamic styles to your elements using `:style`. This enables conditional, object and string-based style assignment for flexible inline styling.

### Usage

```html
<div :style="${{ color: isActive ? 'green' : 'red', fontWeight: 'bold' }}"></div>
<div :style="${'background: yellow; border: 1px solid #ccc;'}"></div>
```

### Best Practices
- Use object syntax for conditional and multiple styles.
- Use string syntax for static or precomputed style strings.
- Prefer camelCase keys in objects (e.g., `fontWeight`), which are auto-converted to kebab-case.
- Avoid empty strings or falsy values in arrays/objects.

### Example

```typescript
component('style-binding-demo', {
  state: { isActive: true, color: 'blue' },
  render: (ctx) => html`
    <div :style="${{ color: ctx.color, fontWeight: ctx.isActive ? 'bold' : 'normal' }}">Styled</div>
    <div :style="${'background: #eee; padding: 10px;'}">Static + Dynamic</div>
  `,
});
```

### How It Works
- Object syntax: `{ color: 'red', fontWeight: 'bold' }` → `color: red; font-weight: bold;`
- String syntax: `'background: yellow; border: 1px solid #ccc;'` → used as-is.
- All styles are merged and applied as inline styles.

### Tips
- Use conditional logic for dynamic styles.
- Combine with static styles using string concatenation if needed.
- Avoid setting styles that conflict with your CSS classes.

## 🔄 Two-Way Binding (`:model`)

Two-way binding synchronizes user-editable values with component state. The directive behaves differently for native form controls (input/select/textarea) vs custom elements — this section documents both behaviors.

Basic native usage

```html
<input :model="email" />
<textarea :model="bio" />
<select :model="country">...</select>
```

- Use plain `:model` for native form controls. The runtime maps the directive to the sensible DOM property for the control:
  - text/textarea/select → `value`
  - checkbox/radio → `checked` (checkboxes can also be bound to arrays for multiple selections)
- Supports nested state paths: `:model="user.name"`.
- Modifiers supported on native controls: `lazy` (use change instead of input), `trim`, and `number`.

Native examples

```html
<input :model="user.email" />
<input type="checkbox" :model="agree" />
<input type="checkbox" :model="selectedFruits" value="apple" />
<input :model.lazy="search" />
<input :model.trim.number="count" />
```

### Custom elements (Vue-compatible) — argument form

When binding to a property on a custom element use the argument form `:model:prop` to target a specific property on the element. The compiler and runtime automatically canonicalize hyphenated (kebab-case) tags as custom elements at compile-time. When the compiler cannot determine a tag at compile-time it may consult the internal runtime registry to resolve registrations — the registry is an implementation detail and should not be relied on as a public API.

Parent usage:

```html
<my-toggle :model:active="isOn"></my-toggle>
```

Inside the custom element, emit updates like:

```ts
this.dispatchEvent(new CustomEvent('update:active', {
  detail: newValue,
  bubbles: true,
  composed: true,
}));
// or, when using runtime helpers:
ctx.emit('update:active', newValue);
```

Behavior: when the host receives `update:active`, the runtime reads `event.detail` and writes it into the bound host state (e.g. `isOn`). The runtime never mutates component props on behalf of the component — emitting an `update:<prop>` event is the correct host-notification pattern. Emit a plain value in `event.detail` (not an object wrapper) and set `bubbles: true` and `composed: true` so events cross shadow boundaries.

#### Arg rules and caveats

- The `arg` (the `prop` in `:model:prop`) must be a simple identifier (no dot-paths). The host binding (RHS) may be a nested path such as `user.name`.
- The runtime expects the new value in `event.detail`. If your component uses a different shape (for example `event.detail = { value: ... }`), adapt the component or emit a plain value.
 - The `arg` (the `prop` in `:model:prop`) must be a simple identifier (no dot-paths). The host binding (RHS) may be a nested path such as `user.name`.
 - The runtime expects the new value in `event.detail`. If your component uses a different shape (for example `event.detail = { value: ... }`), adapt the component or emit a plain value.

Note: The compiler/runtime may consult an internal runtime registry when compile-time information is insufficient. The registry is an implementation detail; in the browser dev environment it is available to tooling via the Symbol slot Symbol.for('cer.registry') for HMR/debugging only. Consumers should use the public runtime API (`component`, `html`, etc.) and avoid depending on the registry or any global. Server-side code that truly requires access to registrations should import the internal runtime module directly (not recommended for public packages).

Plain `:model` on custom elements → model-value

For convenience and Vue parity, when you use a plain `:model` (no argument) on a custom element, the compiler and runtime follow Vue's convention: they bind to the `modelValue` property and listen for `update:model-value` events.

Example shorthand and equivalent manual wiring:

```html
<!-- Template shorthand -->
<my-custom :model="value" />

<!-- Equivalent explicit wiring -->
<my-custom :modelValue="value" @update:model-value="val => value = val" />
```

### Important: inside custom elements do not rely on `:model` to mutate host props

If a custom element receives a prop from a host, the element should not directly mutate that prop expecting the host to magically receive the change. Instead, the component should emit the kebab-cased `update:<prop-name>` CustomEvent with the new value in `event.detail`. The host binding will observe that event and update its state.

Compact pattern inside a custom element that maintains local state and notifies the host:

```ts
component('baby', {
  props: { babyText: { type: String } },
  state: { localText: '' },
  onConnected(ctx) {
    // initialize local state from prop
    ctx.localText = ctx.babyText ?? '';
  },
  render: (ctx) => html`
    <input :model="localText" @input="${(e: Event) => ctx.emit('update:baby-text', (e.target as HTMLInputElement).value)}" />
  `,
});
```

### Examples summary

```html
<!-- Native input (plain :model) -->
<input :model="email" />

<!-- Custom element, explicit prop -->
<my-toggle :model:active="isOn"></my-toggle>

<!-- Custom element, shorthand plain :model (maps to model-value) -->
<my-custom :model="value" />
```

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
      <input :model="name" ref="nameInput" placeholder="Name" />
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
- Use `:model` for forms and user input.
- Use `ref` to access DOM elements when necessary.
- Prefer simple, declarative bindings for maintainability.
- Avoid side effects in event handlers unless necessary.

## 📚 Learn More

- [Directives Guide](./directives.md)
- [Render Guide](./render.md)
- [State Guide](./state.md)

## 🏁 Summary

Bindings make your components interactive and reactive. Use attribute, event, and two-way bindings to connect your state and props to the DOM, enabling seamless user experiences and maintainable code.
