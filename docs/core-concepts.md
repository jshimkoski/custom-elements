# 🧩 Core Concepts

- **Reactive state**: Automatic updates via ES6 Proxy
- **Functional templates**: Just return HTML strings
- **Refs**: Direct DOM access, no selectors
- **Computed properties**: ES6 getters in state, recalculated on access
- **Event bus**: Cross-component communication
- **Global store**: Shared state, subscriptions

## 1. State changes automatically trigger re-renders using ES6 Proxies:

```typescript
state.count++; // Automatically re-renders the component
```

## 2. Template Functions
Templates are just JavaScript functions that return HTML strings:

```typescript
template: (state, api) => `<div>Hello ${state.name}!</div>`
```

## 3. Refs System
Direct DOM access without complex selectors:

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

## 4. Computed Properties

Define computed properties using the `computed` property in `ComponentConfig`. This ensures correct reactivity and separation of state and derived values:

```typescript
component('user-profile', {
  state: {
    firstName: 'Jane',
    lastName: 'Doe',
    email: '',
    password: ''
  },
  computed: {
    fullName: (state: ComponentState) => `${state.firstName} ${state.lastName}`,
    isValid: (state: ComponentState) => state.email.includes('@') && state.password.length >= 8
  },
  template: (state, computed) => `
    <div>Name: ${computed.fullName}</div>
    <div>Valid: ${computed.isValid ? 'Yes' : 'No'}</div>
  `
});
```

## 5. Automatic Event Binding

Define event handlers directly in your component config and use `data-on-*` attributes in your template for declarative, type-safe event handling. The runtime automatically attaches listeners after each render, ensuring no duplicate bindings and robust updates.

**Usage Example:**

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