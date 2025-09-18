# 🛠️ Troubleshooting Deep Dive

A guide to diagnosing and resolving common issues in the custom elements runtime. Find solutions for rendering, ref, style, events, and more—with friendly tips and best practices.

## 🚦 Rendering Issues

- **Blank output:**
  - Check that your `render` function returns a valid VNode or array.
  - Ensure the component is registered and tag name matches usage.
- **Async render never resolves:**
  - Confirm your async function returns a VNode, not just data.

## 🧬 State & Props Problems

- **State not updating:**
  - Mutate state only via reactive proxies (avoid direct assignment).
  - For arrays/objects, use supported mutating methods.
- **Props not received:**
  - Check attribute spelling and casing (use kebab-case in HTML).
  - Ensure your component function parameters have proper default values.

## 🎨 Style Issues

  - Use the `useStyle()` hook to provide component-scoped styles or rely on the runtime's JIT CSS (the renderer runs `jitCSS` on the rendered HTML).
  - Handle loading/error state inside your component (for example use a `ref` for loading, or use `switchOnPromise` / the async-aware directives) and render conditional templates for feedback.
- **Unsafe CSS warning:**
  - Avoid `url(javascript:...)`, `<script>`, or `expression()` in styles.

## 🔗 Event & Binding Problems

- **Events not firing:**
  - Check for missing reactive dependencies inside your style callback.
  - Use `@event` syntax in templates (e.g., `@click`).
  - Ensure event handler is a function accessible in the component scope.
- **Two-way binding not working:**
  - Check that state property exists and is reactive.
  - Use the provided hook helpers inside your component render: `useOnConnected`, `useOnDisconnected`, `useOnAttributeChanged`, `useOnError`, and `useStyle` (see `src/lib/runtime/hooks.ts`).
  - For the component config object (legacy API) lifecycle callbacks are named `onConnected`, `onDisconnected`, etc., but inside functional components prefer the `use*` hook helpers.

## 🧩 Lifecycle & Watchers

- **Lifecycle hooks not called:**
  - Use correct hook names (`onConnected`, `onDisconnected`, etc.) from the hooks object.
  - For the functional `watch()` helper, provide the correct source function (e.g., `() => user.profile.age`) to observe nested values.
  - The lightweight `watch()` exported by the runtime does not support a `{ deep: true }` option; instead watch the specific nested path or create separate watchers for nested properties.
  - Ensure hooks are properly destructured from the second parameter.
- **Watchers not triggering:**
  - Use correct path for nested state (e.g., `user.profile.age`).

## 🧱 Template & Directives

  - Use supported built-in directives and helpers such as `when`, `each`, `match`, `model`, `bind`, `show`, `class`, `style`, and `ref` as well as enhanced helpers like `switchOnPromise` / `switchOnPromise` and the `each*` helpers in `src/lib/directive-enhancements.ts`.
  - Ensure directive syntax matches documentation and remember that some async/collection helpers return anchor blocks (stable boundaries) which affect keying and patch behavior.

  - Use supported directives (`when`, `each`, `match`).
  - Handle loading and error state in your component (for example using `ref` or `switchOnPromise`), and log errors in async code.
- **Template errors:**
  - Use error boundaries (`errorTemplate`, `errorFallback`) for robust handling.

## 🔥 HMR & SSR

- **HMR not updating:**
  - Ensure development mode and `import.meta.hot` is available.
  - Check that configs are updated in the runtime (internal) registry. In
    browser dev you can inspect the registry via the Symbol slot Symbol.for('cer.registry')
    for debugging, but do not rely on it in
    production code.
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
A: Log errors in async code.

## 🏁 Summary

Troubleshooting is easier with clear configs, error boundaries, and dev tools. Use this guide to quickly resolve issues and build robust custom elements.

For more help, see the documentation for each feature and inspect the source code in `src/lib/index.ts`.
