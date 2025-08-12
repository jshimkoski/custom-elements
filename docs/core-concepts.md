
# Core Concepts

Essential building blocks for every component. All features are strictly typed and match the runtime implementation.

---

## Reactive State

- State changes automatically trigger re-renders using ES6 Proxy.

```typescript
state.count++; // Automatically re-renders the component
```

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