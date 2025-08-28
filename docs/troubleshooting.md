# 🛠️ Troubleshooting Deep Dive

A guide to diagnosing and resolving common issues in the custom elements runtime. Find solutions for rendering, state, style, events, and more—with friendly tips and best practices.

## 🚦 Rendering Issues

- **Blank output:**
  - Check that your `render` function returns a valid VNode or array.
  - Ensure the component is registered and tag name matches usage.
- **Async render never resolves:**
  - Confirm your async function returns a VNode, not just data.
  - Use `loadingTemplate` and `errorTemplate` for feedback.

## 🧬 State & Props Problems

- **State not updating:**
  - Mutate state only via reactive proxies (avoid direct assignment).
  - For arrays/objects, use supported mutating methods.
- **Props not received:**
  - Check attribute spelling and casing (use kebab-case in HTML).
  - Ensure `props` config matches expected types.

## 🎨 Style Issues

- **Styles not applied:**
  - Confirm your `style` config is a string, function, or valid object.
  - Check for missing dependencies in dynamic styles.
- **Unsafe CSS warning:**
  - Avoid `url(javascript:...)`, `<script>`, or `expression()` in styles.

## 🔗 Event & Binding Problems

- **Events not firing:**
  - Use `@event` syntax in templates (e.g., `@click`).
  - Ensure event handler is a function in state/config.
- **Two-way binding not working:**
  - Use `#model` for supported input elements.
  - Check that state property exists and is reactive.

## 🧩 Lifecycle & Watchers

- **Lifecycle hooks not called:**
  - Use correct hook names (`onConnected`, `onDisconnected`, etc.).
  - Hooks must be functions in config.
- **Watchers not triggering:**
  - Use correct path for nested state (e.g., `user.profile.age`).
  - Set `{ deep: true }` for deep watchers.

## 🧱 Template & Directives

- **Directives not working:**
  - Use supported directives (`when`, `each`, `match`).
  - Ensure directive syntax matches documentation.
- **Template errors:**
  - Use error boundaries (`errorTemplate`, `errorFallback`) for robust handling.

## 🔥 HMR & SSR

- **HMR not updating:**
  - Ensure development mode and `import.meta.hot` is available.
  - Check that configs are updated in the registry.
- **SSR output incorrect:**
  - Avoid browser-only APIs in SSR mode.
  - Use pure functions for render and style.

## 🧪 Debugging Tips

- Use browser dev tools to inspect shadow DOM and state.
- Add `console.log` in render, hooks, and watchers for insight.
- Use error boundaries to catch and display runtime errors.
- Test with minimal configs to isolate issues.

## ❓ FAQ

**Q: Why is my component not rendering?**
A: Check registration, tag name, and that `render` returns a valid VNode.

**Q: Why are my styles missing?**
A: Confirm style config; check for unsafe CSS.

**Q: Why aren't events firing?**
A: Use `@event` syntax and ensure handler is a function.

**Q: How do I debug async templates?**
A: Use `loadingTemplate` and `errorTemplate` for feedback; log errors in async code.

## 🏁 Summary

Troubleshooting is easier with clear configs, error boundaries, and dev tools. Use this guide to quickly resolve issues and build robust custom elements.

For more help, see the documentation for each feature and inspect the source code in `src/lib/index.ts`.
