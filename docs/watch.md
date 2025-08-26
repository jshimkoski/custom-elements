# 👀 Watch Guide

> How to use watchers for reactive state and prop value tracking

## 📖 Overview

Watchers let you react to changes in state or props. They support immediate execution, deep watching, and work with nested properties.

## 🚀 Basic Usage

Add a `watch` property to your component config:

```ts
watch: {
  count: (newVal, oldVal, ctx) => {
    console.log('Count changed:', newVal);
  }
}
```

## ⏩ Immediate Execution

Run the watcher callback as soon as the component is initialized:

```ts
watch: {
  count: [
    (newVal, oldVal, ctx) => console.log('Immediate:', newVal),
    { immediate: true }
  ]
}
```

## 🧬 Deep Watching

Deep watchers are triggered for any nested property change under the watched path.

```ts
watch: {
  'user.profile': [
    (newVal, oldVal, ctx) => console.log('Profile changed:', newVal),
    { deep: true }
  ]
}
```

## 🧩 Multiple Watchers

Add as many watchers as you need:

```ts
watch: {
  count: (n) => {...},
  'user.name': (n) => {...},
  theme: (t) => {...}
}
```

## 🔄 Callback Signature

All watcher callbacks receive:
- `newValue`: The updated value
- `oldValue`: The previous value
- `ctx`: The full reactive state object which includes state, props, and computed values

```ts
watch: {
  count: (newVal, oldVal, ctx) => {
    if (newVal > 10) ctx.count = 0;
  }
}
```

## 💡 Tips

- Use `{ immediate: true }` for initialization logic.
- Use `{ deep: true }` for nested objects/arrays.
- Watchers are cleaned up automatically on disconnect.
- Works with state and props.
- Callback errors are caught and logged.

For more, see the [API Reference](../src/lib/runtime.ts) and [examples](../src/components/examples/).
