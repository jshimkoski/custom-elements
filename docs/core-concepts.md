
# Core Concepts

Essential building blocks for every component. All features are strictly typed, regression-tested, and match the runtime implementation.

---

## Reactive State

- State changes automatically trigger re-renders using ES6 Proxy.
- Controlled input sync: Inputs with `data-model` (including checkboxes, radios, multi-checkbox groups, and modifiers) stay in sync with state; user typing always wins. VDOM patching is regression-tested for reliable event handling.
- Attribute-state sync: Primitive state keys are automatically observed as attributes and kept in sync.
- Focus preservation: Inputs retain focus and selection during updates.
- Error boundaries: Use `onError` for fallback UI and diagnostics.
- SSR caveats: SSR excludes refs, event listeners, and lifecycle hooks; hydration is opt-in via the `hydrate` property.
- Plugin system: Extend runtime behavior with hooks (`onInit`, `onRender`, `onError`).
- Global event bus: Built-in store and event bus for cross-component communication.
- Computed properties: Use `computed` for derived, reactive values.
- Refs: Direct DOM access via `refs`; no complex selectors.
- Lifecycle hooks: Use `onMounted` and `onUnmounted` for setup/teardown.

---

## Attribute-State Reactivity

**How attributes sync with state:**

- All primitive keys in your component's `state` (string, number, boolean) are automatically observed as attributes.
- When an attribute changes (via parent, VDOM, or direct DOM mutation), the runtime updates the corresponding state value and triggers a re-render—no manual wiring needed.
- On initial connection, any attributes present on the element are merged into state for a seamless initial sync.
- This makes parent-to-child communication and declarative reactivity easy:

```html
<my-counter count="5"></my-counter>
```

```typescript
component('my-counter', {
  state: { count: 0 },
  template: ({ count }) => `<span>Count: ${count}</span>`
});
```

- Changing the `count` attribute instantly updates the state and UI.
- Only primitive state keys are observed as attributes; objects and arrays are not synced via attributes.
- No need to manually declare `observedAttributes`—the runtime does it for you.
- If you override `attributeChangedCallback`, always call `super.attributeChangedCallback` to keep reactivity working.

## Best practices

- Use attributes for parent-to-child communication and initial state, and use state for internal logic and reactivity.
- Always define a state object in your component to enable attribute-state merging and type inference.

---

## Functional Templates

- Templates are JavaScript functions that return HTML strings or use tagged helpers.

```typescript
template: (state, api) => `<div>Hello ${state.name}!</div>`
```

---

## Refs System

- Direct DOM access without complex selectors.

```typescript
refs: {
  myButton: (element, state, api) => {
    element.addEventListener('click', () => {
      state.clicks++;
      api.emit('button-clicked', { clicks: state.clicks });
    });
  }
}
```

---

## Computed Properties

- Use the `computed` property for derived, reactive values.

```typescript
component('user-profile', {
  state: {
    firstName: 'Jane',
    lastName: 'Doe',
    email: '',
    password: ''
  },
  computed: {
    fullName: (state) => `${state.firstName} ${state.lastName}`,
    isValid: (state) => state.email.includes('@') && state.password.length >= 8
  },
  template: (state, computed) => `
    <div>Name: ${computed.fullName}</div>
    <div>Valid: ${computed.isValid ? 'Yes' : 'No'}</div>
  `
});
```

---

## Automatic Event Binding

- Define event handlers in your config and use `data-on-*` attributes for declarative, type-safe event handling.
- Listeners are attached after each render, with no duplicates.

```typescript
component('my-form', {
  state: { name: '' },
  template: (state) => `
    <form>
      <input data-model="name" type="text">
      <button type="submit" data-on-click="handleSubmit">Submit</button>
    </form>
  `,
  handleSubmit(e, state, api) {
    e.preventDefault();
    api.emit('form-submitted', { name: state.name });
  }
});
```

**Benefits:**
- No manual event listener management
- Handlers are type-safe and colocated with component logic
- Works with all native DOM events
- No duplicate listeners after rerender

**Supported Syntax:**
- `data-on-click="handlerName"`
- `data-on-input="handlerName"`
- `data-on-change="handlerName"`
- ...any DOM event type

See the TodoApp example for advanced usage.