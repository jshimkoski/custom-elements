
# Core Concepts

Essential building blocks for every component. All features are strictly typed, regression-tested, and match the runtime implementation in src/lib.

---

## Reactive State & Attribute Sync

- State changes automatically trigger re-renders using ES6 Proxy. Direct assignment is supported.
- Controlled input sync: Inputs with `data-model` (including checkboxes, radios, multi-checkbox groups, and modifiers) stay in sync with state. User typing always wins. VDOM patching is regression-tested for reliable event handling and focus preservation.
- Attribute-state sync: All primitive state keys (string, number, boolean) are automatically observed as attributes and kept in sync. Parent-to-child communication is seamless.
- Focus preservation: Inputs retain focus and selection during updates, even with rapid state changes.
- Error boundaries: Use `onError` for fallback UI and diagnostics. All lifecycle and render errors are handled robustly.
- SSR caveats: SSR excludes refs, event listeners, and lifecycle hooks; hydration is opt-in via the `hydrate` property. Templates must match for hydration.
- Plugin system: Extend runtime behavior with hooks (`onInit`, `onRender`, `onError`). Plugins can be registered globally and affect all components.
- Global event bus: Built-in `eventBus` for cross-component communication. Emit, listen, and unsubscribe from global events with event storm protection.
- Global store: Use the built-in `Store` class for global, reactive state management across components. Subscribe to changes and update state directly.
- Computed properties: Use `computed` for derived, reactive values. Efficient state management for complex logic.
- Refs: Direct DOM access via `refs` for imperative logic and event handling. No complex selectors required.
- Lifecycle hooks: Use `onMounted` and `onUnmounted` for setup/teardown. All hooks are strictly typed.

---

## Attribute-State Reactivity

**How attributes sync with state:**

- All primitive keys in your component's `state` (string, number, boolean) are automatically observed as attributes and kept in sync. Changing the attribute updates the state and UI instantly.
- When an attribute changes (via parent, VDOM, or direct DOM mutation), the runtime updates the corresponding state value and triggers a re-render—no manual wiring needed.
- On initial connection, any attributes present on the element are merged into state for a seamless initial sync.
- No need to manually declare `observedAttributes`—the runtime does it for you.
- Only primitive state keys are observed as attributes; objects and arrays are not synced via attributes.
- If you override `attributeChangedCallback`, always call `super.attributeChangedCallback` to keep reactivity working.

**Best practices:**
- Use attributes for parent-to-child communication and initial state, and use state for internal logic and reactivity.
- Always define a state object in your component to enable attribute-state merging and type inference.

---

## Functional Templates & Helpers

- Templates are JavaScript functions that return HTML strings or use tagged helpers (`html`, `compile`, `css`, `classes`, `styles`, `ref`, `on`).
- Templates can be compiled for performance and SSR.

```typescript
template: (state, api) => `<div>Hello ${state.name}!</div>`
```

---

## Refs System

- Direct DOM access without complex selectors. Use `refs` for imperative logic and event handling.

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

## Event Binding

- Use `data-on-*` attributes for declarative, type-safe event binding. Handlers must be defined on the config object. Only one handler per event type per element is attached; previous handlers are removed on rerender.

```html
<button data-on-click="increment">Click Me</button>
```

```typescript
increment(_e, state) { state.count++; }
```

## Input Binding

- Use `data-model` for controlled, one-way binding between a state property and a form input. Supports modifiers (`|number`, `|trim`).
- Use `data-bind` for deep, two-way binding to nested state objects or arrays. Supports dot notation and array indices.

## Global Store & Event Bus

- Use the built-in `Store` class for global, reactive state management across components. Subscribe to changes and update state directly.
- Use the built-in `eventBus` for cross-component communication. Emit, listen, and unsubscribe from global events with event storm protection.

## SSR & Hydration

- Universal rendering and opt-in hydration. Templates must match for hydration. SSR excludes refs, event listeners, and lifecycle hooks. Hydration is opt-in via the `hydrate` property.

## Error Boundaries

- Use `onError` for fallback UI and diagnostics. All lifecycle and render errors are handled robustly.

## Plugin System

- Extend runtime behavior with hooks (`onInit`, `onRender`, `onError`). Plugins can be registered globally and affect all components.

## VDOM Utilities

- Fine-grained DOM diffing and patching for controlled inputs, event listeners, and efficient updates.

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