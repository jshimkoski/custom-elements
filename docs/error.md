# ❗ Error Handling Functionality Deep Dive

## 🛡️ Overview

Error handling in the custom elements runtime is robust, secure, and developer-friendly. Components can gracefully recover from errors in rendering, computed properties, props, and lifecycle hooks using built-in error boundaries and customizable templates.

## ⚙️ Error Handling Options

You can handle errors in your component config using:
- `onError`: Callback for any error in render, computed, props, or lifecycle.
- `errorTemplate`: Custom template to display when an error occurs.
- `errorFallback`: Fallback HTML string for critical errors.

```typescript
onError: (error, ctx) => {
  console.error('Component error:', error);
},
errorTemplate: (error, ctx) => html`<div>Error: ${error?.message}</div>`,
errorFallback: (error, ctx) => `<div>Critical error: ${error?.message}</div>`,
```

## 🚦 How Errors Are Caught

- All major logic (render, computed, props, lifecycle) is wrapped in an error boundary.
- If an error occurs:
  - `onError` is called (if provided).
  - If `errorTemplate` is defined, it is rendered in the shadow DOM.
  - If `errorFallback` is defined, its HTML string is injected into the shadow DOM.
- Errors do not crash the app; they are isolated to the component instance.

## 🧩 Example: Full Error Handling Usage

```typescript
component('error-demo', {
  state: { fail: false },
  render: (ctx) => {
    if (ctx.fail) throw new Error('Intentional failure');
    return html`<button @click="${() => ctx.fail = true}">Fail</button>`;
  },
  onError: (err, ctx) => {
    console.warn('Error caught:', err);
  },
  errorTemplate: (err, ctx) => html`<div>Oops! ${err?.message}</div>`,
  errorFallback: (err, ctx) => `<div>Something went wrong: ${err?.message}</div>`,
});
```

## 🧠 How Error Handling Works Internally

- The runtime sets a `_hasError` flag and invokes error handlers.
- The shadow DOM is updated with the error template or fallback HTML.
- Errors in watchers, computed, or props also trigger error handling.
- Error handling is per-instance; other components remain unaffected.

## 📝 Tips & Best Practices

- Always provide an `errorTemplate` for user-friendly error messages.
- Use `onError` for logging and analytics.
- Use `errorFallback` for critical failures (e.g., render cannot recover).
- Avoid throwing errors for control flow; use them for truly exceptional cases.

## 📚 Learn More

- [Component Config Guide](./component-config.md)
- [Render Guide](./render.md)
- [State Guide](./state.md)
- [Computed Guide](./computed.md)

## 🏁 Summary

Error handling in the runtime is secure, isolated, and customizable. Use the provided hooks and templates to ensure your components fail gracefully and provide a great user experience even when things go wrong.
