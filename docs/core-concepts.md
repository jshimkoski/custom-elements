# 🌱 Core Concepts

Essential building blocks for every component.

---

## 🔄 Reactive State & Sync

- State is reactive—just assign to update and re-render.
- Use `data-model` and `data-bind` for controlled inputs (user input always wins).
- Primitive state keys sync to attributes automatically.
- Input focus and cursor position are preserved during updates.
- Use `onError` for fallback UIs and error handling.
- SSR skips refs, event listeners, and lifecycle hooks.
- Hydration is opt-in via `data-hydrate` and requires matching templates.
- Plugins extend the runtime with `onInit`, `onRender`, and `onError`.
- Built-in router, store, and event bus for shared state and navigation.
- Use `computed` for derived values and `refs` for direct DOM access.
- Lifecycle hooks: `onMounted` and `onUnmounted`.
- Omit `state` to create stateless components.

---

## 🔗 Attribute-State Reactivity

- Primitives (`string`, `number`, `boolean`) sync between attributes and state.
- Changes from parents or DOM mutations update state automatically.
- Initial attributes merge into state—no need to declare `observedAttributes`.
- Objects/arrays aren’t synced.
- If overriding `attributeChangedCallback`, call `super` to preserve reactivity.

**Best Practices:**
- Use attributes for parent input and initial state.
- Use state for internal logic and reactivity.
- Define a `state` object for type inference and syncing.

---

## 🧩 Templates & Helpers

- Templates are functions returning HTML strings or tagged template helpers.
- Use `html`, `compile`, `css`, `classes`, and `styles` for clean templates.
- Supports async templates for data loading.

```ts
template: (state) => `<div>Hello ${state.name}!</div>`
```

---

## 🔍 Refs System

- Use `data-ref` for direct DOM access—no query selectors needed.

```ts
component('ref-demo', {
  state: { clicks: 0 },
  template: (state) => html`
    <button data-ref="myButton">Clicked: ${state.clicks}</button>
  `(state),
  refs: {
    myButton: (el, state, api) => {
      el.addEventListener('click', () => {
        state.clicks++;
        api.emit('button-clicked', { clicks: state.clicks });
      });
    }
  }
});
```

---

## ⚡ Event Binding

- Use `data-on-*` attributes to declaratively bind event handlers.
- Handlers must be defined on the component config.
- One handler per event per element—auto-cleaned on rerender.

```html
<button data-on-click="increment">Click Me</button>
```

```ts
increment(event, state, api) {
  event.preventDefault();
  state.count++;
  api.emit('count-incremented', { count: state.count });
}
```

---

## 🔌 Plugin System

Add global logic with runtime plugins.

```ts
useRuntimePlugin({
  onInit: (config) => { /* setup */ },
  onRender: (state, api) => { /* custom logic */ },
  onError: (error, state, api) => { /* error handling */ }
});
```

---

## 🚦 Router

Simple, SSR-friendly router with `<router-view>`, route params, and navigation.

```ts
const router = initRouter({
  routes: [
    { path: '/', component: 'home-page' },
    { path: '/about', component: 'about-page' }
  ]
});
```

---

## 🖥 SSR & Hydration

- SSR renders static HTML.
- Hydration is opt-in via `data-hydrate`.
- Templates must match exactly for hydration to succeed.

---

## 🛡 Error Boundaries

- Use `onError` in your component or plugin for catching and handling errors gracefully.

---

## 🌍 Global Store & Event Bus

Built-in tools for shared state and cross-component communication.

```ts
const store = Store({ count: 0 });
store.subscribe((state) => console.log(state.count));

eventBus.emit('event-name', { some: 'data' });
eventBus.on('event-name', (data) => console.log(data));
```

---

## 🧠 Computed Properties

Create reactive, derived values with `computed`.

```ts
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
  template: ({ fullName, isValid }) => html`
    <div>Name: ${fullName}</div>
    <div>Valid: ${isValid ? 'Yes' : 'No'}</div>
  `({ fullName, isValid })
});
```

---

## 🧷 Automatic Event Binding

- Define handlers in your component config.
- Use `data-on-*` in your template—listeners are attached automatically and efficiently.

```ts
component('my-form', {
  state: { name: '' },
  template: (state) => html`
    <form>
      <input data-model="name" type="text">
      <button type="submit" data-on-click="handleSubmit">Submit</button>
    </form>
  `({ state }),
  handleSubmit(event, state, api) {
    event.preventDefault();
    api.emit('form-submitted', { name: state.name });
  }
});
```

**Benefits:**
- No manual event listeners
- Type-safe, colocated handlers
- Prevents duplicate listeners on rerender

**Examples:**
- `data-on-click="handlerName"`
- `data-on-input="handlerName"`
- `data-on-change="handlerName"`
- `data-on-submit="handlerName"`

---

## 🎨 Dynamic Styles

- Use `style` to define scoped CSS.
- Static strings or functions based on state are both supported.

```ts
// Static
style: `div { color: blue; }`

// Dynamic
style: (state) => `
  div {
    color: ${state.isActive ? 'green' : 'red'};
  }
`
```

**Performance Tips:**
- One `<style>` tag per component
- No CSS diffing—style is replaced entirely
- Keep dynamic styles efficient

---

## 📦 Stateless Components

Omit `state` for lightweight, non-reactive components.

```ts
component('stateless-demo', {
  template: () => html`<div>Stateless component rendered!</div>`()
});
```

Stateless components still support event binding, refs, and lifecycle hooks—perfect for pure UI or optimized rendering.
