# 🪝 Hooks Functionality Deep Dive

## 🔗 Overview

Hooks in the runtime provide lifecycle management and event handling for your custom elements. They allow you to run code at key moments: when the component connects, disconnects, attributes change, or errors occur. Hooks are defined in your `ComponentConfig` and receive the full reactive state.

## 🛠️ Available Hooks

- `onConnected`: Runs when the element is added to the DOM.
- `onDisconnected`: Runs when the element is removed from the DOM.
- `onAttributeChanged`: Runs when a prop attribute changes.
- `onError`: Runs when any error occurs in render, computed, props, or lifecycle.
- `errorFallback`: Provides fallback HTML for critical errors.

```typescript
onConnected: (ctx) => {
  console.log('Element connected!', ctx);
},
onDisconnected: (ctx) => {
  console.log('Element disconnected!', ctx);
},
onAttributeChanged: (name, oldValue, newValue, ctx) => {
  console.log(`Attribute ${name} changed from ${oldValue} to ${newValue}`);
},
onError: (error, ctx) => {
  console.error('Error:', error);
},
errorFallback: (error, ctx) => `<div>Critical error: ${error?.message}</div>`,
```

## 🔄 Lifecycle Flow

1. **Connected**: `onConnected` runs after initial setup and render.
2. **Attribute Change**: `onAttributeChanged` runs whenever a prop attribute changes.
3. **Disconnected**: `onDisconnected` runs when the element is removed from the DOM.
4. **Error**: `onError` runs on any error; `errorFallback` provides fallback HTML if needed.

## 🧪 Example: Full Hooks Usage

```typescript
component('lifecycle-demo', {
  state: { active: false },
  props: { label: { type: String, default: 'Demo' } },
  onConnected: (ctx) => {
    ctx.active = true;
    console.log('Connected:', ctx);
  },
  onDisconnected: (ctx) => {
    ctx.active = false;
    console.log('Disconnected:', ctx);
  },
  onAttributeChanged: (name, oldValue, newValue, ctx) => {
    console.log(`Prop ${name} changed: ${oldValue} → ${newValue}`);
  },
  onError: (err, ctx) => {
    console.warn('Error caught:', err);
  },
  errorFallback: (err, ctx) => `<div>Something went wrong: ${err?.message}</div>`,
  render: (ctx) => html`<div>${ctx.label} - ${ctx.active ? 'Active' : 'Inactive'}</div>`,
});
```

## 🧠 How Hooks Work Internally

- Hooks are called at the appropriate lifecycle stage by the runtime.
- All hooks receive the full reactive state (including props and computed).
- Errors in hooks are caught and handled via `onError` and `errorFallback`.
- Hooks are injected only if defined in the config.
- Hooks do not block rendering; they run asynchronously when possible.

## 📝 Tips & Best Practices

- Use hooks for side effects, subscriptions, cleanup, and analytics.
- Avoid heavy computations in hooks; keep them fast and focused.
- Always provide `onError` and `errorFallback` for robust error handling.
- Use `onAttributeChanged` for prop-driven logic.

## 📚 Learn More

- [Component Config Guide](./component-config.md)
- [Error Handling Guide](./error.md)
- [Render Guide](./render.md)

## 🏁 Summary

Hooks provide lifecycle and error management for your custom elements. Use them to run code at key moments, handle errors gracefully, and keep your components robust and maintainable.
