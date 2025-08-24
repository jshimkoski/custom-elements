# 🛠️ ComponentConfig Guide

> How to configure components with the Custom Elements Runtime

---

## 📖 Overview

`ComponentConfig` is a strongly typed object that defines your component's state, props, computed values, styles, rendering logic, lifecycle hooks, and more. All options are optional except `render`.

---

## 🧩 Basic Example

```ts
component('my-greeting', {
  state: { name: 'World' },
  render: (state) => html`<h1>Hello, ${state.name}!</h1>`
});
```

---

## 📦 State

Define reactive local state for your component.

```ts
state: { count: 0, text: '' }
```

---

## 🧮 Computed

Add derived values based on state (auto-updates when dependencies change).

```ts
computed: {
  doubled: (state) => state.count * 2,
  greeting: (state) => `Hello, ${state.text}!`
}
```

---

## 🏷️ Props

Define external attributes for your component. Supports type conversion and defaults.

```ts
props: {
  label: { type: String, default: 'Click Me' },
  disabled: { type: Boolean, default: false },
  amount: { type: Number }
}
```

---

## 👀 Watch

React to changes in state, computed, or props. Supports immediate and deep options.

```ts
watch: {
  count: [(newVal, oldVal) => console.log('Count changed:', newVal), { immediate: true }],
  'user.name': (newVal, oldVal) => alert(`Name changed to ${newVal}`)
}
```

---

## 🎨 Style

Scoped CSS for your component. Can be a string, function, or dynamic config.

```ts
style: `:host { color: red; }`
// or
style: (state) => `:host { color: ${state.color}; }`
// or
style: { css: '...', dependencies: ['theme'], cache: true }
```

---

## ⚡ styleOptimizations

Fine-tune style caching, minification, deduplication, debounce, etc.

```ts
styleOptimizations: { enableCaching: true, enableMinification: true, debounceMs: 32 }
```

---

## 🖼️ Render

Required. Returns a VNode or array of VNodes. Supports async (Promise).

```ts
render: (state) => html`<div>${state.label}</div>`
// or async
render: async (state) => html`<div>${await fetchLabel()}</div>`
```

---

## ⏳ loadingTemplate & errorTemplate

Optional templates for loading and error states.

```ts
loadingTemplate: (state) => html`<span>Loading...</span>`
errorTemplate: (err, state) => html`<span>Error: ${err.message}</span>`
```

---

## 🔄 Lifecycle Hooks

Run logic on connect, disconnect, attribute change, or error.

```ts
onConnected: (state) => console.log('Mounted!'),
onDisconnected: (state) => cleanup(),
onAttributeChanged: (state, name, oldVal, newVal) => {...},
onError: (err, state) => reportError(err)
```

---

## 🛑 errorFallback

Return a fallback HTML string if an error occurs.

```ts
errorFallback: (err, state) => `<div>Something went wrong</div>`
```

---

## 🛠️ Custom Methods

Add your own helper functions to the config. They are injected into state.

```ts
reset: (state) => { state.count = 0; }
```

---

## 🏁 Full Example

```ts
component('my-widget', {
  state: { count: 0 },
  computed: {
    doubled: (state) => state.count * 2
  },
  props: {
    label: { type: String, default: 'Add' }
  },
  watch: {
    count: [(n, o) => console.log(n), { immediate: true }]
  },
  style: (state) => `:host { color: ${state.count > 5 ? 'green' : 'red'}; }`,
  styleOptimizations: { enableCaching: true },
  render: (state) => html`
    <button @click="${() => state.count++}">${state.label}: ${state.count}</button>
    <div>Doubled: ${state.doubled}</div>
  `,
  loadingTemplate: (state) => html`<span>Loading...</span>`,
  errorTemplate: (err, state) => html`<span>Error: ${err.message}</span>`,
  onConnected: (state) => console.log('Connected!'),
  onDisconnected: (state) => console.log('Disconnected!'),
  onError: (err, state) => alert('Error!'),
  errorFallback: (err, state) => `<div>Fallback error UI</div>`,
  reset: (state) => { state.count = 0; }
});
```

---

## 💡 Tips

- Only `render` is required; all other options are optional.
- All config methods (except lifecycle hooks) are injected into state.
- Use kebab-case for component tags.
- Always return a single root node from `render`.
- Use TypeScript for best experience and type safety.

---

For more, see the [API Reference](../src/lib/runtime.ts) and [examples](../src/components/examples/).
