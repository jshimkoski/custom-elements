# 👀 Watch Guide

> How to use watchers for reactive state, prop, and computed value tracking

---

## 📖 Overview

Watchers let you react to changes in state, props, or computed values. They support immediate execution, deep watching, and work with nested properties.

---

## 🚀 Basic Usage

Add a `watch` property to your component config:

```ts
watch: {
  count: (newVal, oldVal) => {
    console.log('Count changed:', newVal);
  }
}
```

---

## ⏩ Immediate Execution

Run the watcher callback as soon as the component is initialized:

```ts
watch: {
  count: [
    (newVal, oldVal) => console.log('Immediate:', newVal),
    { immediate: true }
  ]
}
```

---

## 🧬 Deep Watching

Track changes to nested objects or arrays:

```ts
watch: {
  'user.profile': [
    (newVal, oldVal) => console.log('Profile changed:', newVal),
    { deep: true }
  ]
}
```

---

## 🏷️ Watching Props & Computed

You can watch props and computed values too:

```ts
watch: {
  label: (newVal) => console.log('Prop changed:', newVal),
  doubled: (newVal) => console.log('Computed changed:', newVal)
}
```

---

## 🧩 Multiple Watchers

Add as many watchers as you need:

```ts
watch: {
  count: (n) => {...},
  'user.name': (n) => {...},
  theme: (t) => {...}
}
```

---

## 🔄 Callback Signature

All watcher callbacks receive:
- `newValue`: The updated value
- `oldValue`: The previous value
- `state`: The full reactive state object

```ts
watch: {
  count: (newVal, oldVal, state) => {
    if (newVal > 10) state.count = 0;
  }
}
```

---

## 💡 Tips

- Use `{ immediate: true }` for initialization logic.
- Use `{ deep: true }` for nested objects/arrays.
- Watchers are cleaned up automatically on disconnect.
- Works with state, props, and computed values.
- Callback errors are caught and logged.

---

For more, see the [API Reference](../src/lib/runtime.ts) and [examples](../src/components/examples/).
