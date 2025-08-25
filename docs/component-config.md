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
  render: (ctx) => html`<h1>Hello, ${ctx.name}!</h1>`
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
  doubled: (ctx) => ctx.count * 2,
  greeting: (ctx) => `Hello, ${ctx.text}!`
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
style: (ctx) => `:host { color: ${ctx.color}; }`
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
render: (ctx) => html`<div>${ctx.label}</div>`
// or async
render: async (ctx) => html`<div>${await fetchLabel()}</div>`
```

---

## ⏳ loadingTemplate & errorTemplate

Optional templates for loading and error states.

```ts
loadingTemplate: (ctx) => html`<span>Loading...</span>`
errorTemplate: (err, ctx) => html`<span>Error: ${err.message}</span>`
```

---

## 🔄 Lifecycle Hooks

Run logic on connect, disconnect, attribute change, or error.

```ts
onConnected: (ctx) => console.log('Mounted!'),
onDisconnected: (ctx) => cleanup(),
onAttributeChanged: (name, oldVal, newVal, ctx) => {...},
onError: (err, ctx) => reportError(err)
```

---

## 🛑 errorFallback

Return a fallback HTML string if an error occurs.

```ts
errorFallback: (err, ctx) => `<div>Something went wrong</div>`
```

---

## 🛠️ Custom Methods

Add your own helper functions to the config. They are injected into state.

```ts
reset: (ctx) => { ctx.count = 0; }
```

---

## 🏁 Full Example

```ts
component('my-widget', {
  state: { count: 0 },
  computed: {
    doubled: (ctx) => ctx.count * 2
  },
  props: {
    label: { type: String, default: 'Add' }
  },
  watch: {
    count: [(n, o) => console.log(n), { immediate: true }]
  },
  style: (ctx) => `:host { color: ${ctx.count > 5 ? 'green' : 'red'}; }`,
  styleOptimizations: { enableCaching: true },
  render: (ctx) => html`
    <button @click="${() => ctx.count++}">${ctx.label}: ${ctx.count}</button>
    <div>Doubled: ${ctx.doubled}</div>
  `,
  loadingTemplate: (ctx) => html`<span>Loading...</span>`,
  errorTemplate: (err, ctx) => html`<span>Error: ${err.message}</span>`,
  onConnected: (ctx) => console.log('Connected!'),
  onDisconnected: (ctx) => console.log('Disconnected!'),
  onError: (err, ctx) => alert('Error!'),
  errorFallback: (err, ctx) => `<div>Fallback error UI</div>`,
  reset: (ctx) => { ctx.count = 0; }
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
