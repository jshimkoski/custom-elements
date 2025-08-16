
# Core Concepts

Essential building blocks for every component. All features are strictly typed, regression-tested, and match the runtime implementation in src/lib. This guide covers stateless/stateful components, plugin system, router, SSR, error boundaries, event bus, global store, input binding, and VDOM utilities.

---


## Reactive State & Attribute Sync

- State changes trigger re-renders; direct assignment is supported.
- Controlled input sync: `data-model` and `data-bind` inputs stay in sync with state; user typing always wins.
- Attribute-state sync: Primitive state keys are observed as attributes and kept in sync.
- Focus preservation: Inputs retain focus and selection during updates.
- Error boundaries: Use `onError` for fallback UI and diagnostics.
- SSR: SSR excludes refs, event listeners, and lifecycle hooks; hydration is opt-in via `hydrate` and requires template matching.
- Plugin system: Extend runtime with hooks (`onInit`, `onRender`, `onError`).
- Router: Lightweight, functional router with SSR/static site support, `<router-view>`, route params, and programmatic navigation.
- Global event bus & store: Built-in `eventBus` and `Store` for cross-component communication and global state.
- Computed properties & refs: Use `computed` for derived state; direct DOM access via `refs`.
- Lifecycle hooks: Use `onMounted` and `onUnmounted` for setup/teardown.
- Stateless components: Omit `state` for pure view components.

---


## Attribute-State Reactivity

**How attributes sync with state:**

- Primitive state keys (`string`, `number`, `boolean`) are automatically observed as attributes and kept in sync.
- Attribute changes (parent, VDOM, or DOM mutation) update state and trigger re-render—no manual wiring needed.
- Initial attributes are merged into state for seamless sync; no need to declare `observedAttributes`.
- Only primitives are synced; objects/arrays are not. If overriding `attributeChangedCallback`, call `super` to preserve reactivity.

**Best practices:**
- Use attributes for parent-to-child communication and initial state, and use state for internal logic and reactivity.
- Stateless components: omit `state` for pure view components.
- Always define a state object in your component to enable attribute-state merging and type inference (unless stateless).

---


## Functional Templates & Helpers

- Templates are JavaScript functions that return HTML strings or use tagged helpers (`html`, `compile`, `css`, `classes`, `styles`, `ref`, `on`).
- Templates can be compiled for performance and SSR.
- Async templates are supported for data fetching and progressive rendering.

```typescript
template: (state, api) => `<div>Hello ${state.name}!</div>`
```

---


## Refs System

- Direct DOM access without complex selectors. Use `refs` for imperative logic and event handling.

```typescript
import { component } from '@jasonshimmy/custom-elements-runtime';

component('ref-demo', {
  state: { clicks: 0 },
  template: (state) => `
    <button data-ref="myButton">Clicked: ${state.clicks} times</button>
  `,
  refs: {
    myButton: (element, state, api) => {
      element.addEventListener('click', () => {
        state.clicks++;
        api.emit('button-clicked', { clicks: state.clicks });
      });
    }
  }
});
```

## Event Binding

- Use `data-on-*` attributes for declarative, type-safe event binding. Handlers must be defined on the config object. Only one handler per event type per element is attached; previous handlers are removed on rerender.

```html
<button data-on-click="increment">Click Me</button>
```

```typescript
increment(event, state, api) {
  event.preventDefault()
  state.count++;
  api.emit('count-incremented', { count: state.count });
}
```


## Event Binding

- Use `data-on-*` attributes for declarative, type-safe event binding. Handlers must be defined on the config object. Only one handler per event type per element is attached; previous handlers are removed on rerender.

```html
<button data-on-click="increment">Click Me</button>
```

```typescript
increment(event, state, api) {
  // ...existing code...
}
```

## Plugin System

- Extend runtime with hooks (`onInit`, `onRender`, `onError`) for global/component logic.

```typescript
import { useRuntimePlugin } from '@jasonshimmy/custom-elements-runtime';
useRuntimePlugin({
  onInit: (config) => { /* global setup */ },
  onRender: (state, api) => { /* global render logic */ },
  onError: (error, state, api) => { /* global error handling */ }
});
```

## Router

- Lightweight, functional router with SSR/static site support, `<router-view>`, route params, and programmatic navigation.

```typescript
import { initRouter } from '@jasonshimmy/custom-elements-runtime';
const router = initRouter({ routes: [
  { path: '/', component: 'home-page' },
  { path: '/about', component: 'about-page' }
] });
```

## SSR & Hydration

- Universal rendering, opt-in hydration, and template matching. SSR excludes refs, event listeners, and lifecycle hooks.

## Error Boundaries

- Use `onError` in component config or plugin for robust error handling and fallback UI.

## Global Store & Event Bus

- Built-in reactive store and event bus for cross-component state and communication.

## Input Binding

- Declarative, type-safe event and input binding via `data-on-*`, `data-model`, and `data-bind`.

## VDOM & Template Helpers

- Utilities for virtual DOM diffing, compiling templates, and CSS-in-JS.

## Build Tools

- Utilities for SSR, static site generation, and advanced rendering.

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
  template: (state) => `
    <div>Name: ${fullName}</div>
    <div>Valid: ${isValid ? 'Yes' : 'No'}</div>
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

---

## Dynamic Styles

- Use the `style` property to define CSS for your component.
- `style` can be a static string or a function that returns a CSS string based on state.
- The runtime updates the style automatically whenever state changes.

**Static style example:**
```typescript
style: `div { color: blue; }`
```

**Dynamic style example:**
```typescript
style: (state) => `div { color: ${state.isActive ? 'green' : 'red'}; }`
```

### Performance Considerations

- Only one `<style>` tag per component is updated (not global).
- Dynamic style functions should be efficient; avoid heavy computations.
- The runtime replaces the entire `<style>` content if changed—no CSS diffing.
- Static strings are fastest; dynamic functions are performant for most use cases.

---

## Stateless Components

- Components can be defined without a state. These stateless components are simpler and are useful for rendering UI that doesn't require reactivity.

```typescript
component('stateless-demo', {
  template: () => `<div>Stateless component rendered!</div>`
});
```

Stateless components can still use all the other features like event binding, refs, and lifecycle hooks, but they won't have a `state` property or reactive updates. They're ideal for presentational components or when you want to optimize for performance and simplicity.