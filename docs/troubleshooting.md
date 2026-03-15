# 🛠️ Troubleshooting

A guide to diagnosing and resolving common issues with the custom elements runtime.

## 🚦 Rendering Issues

- **Blank output:**
  - Check that your render function returns a valid VNode or array.
  - Ensure the component is registered and the tag name matches usage.
- **Async render never resolves:**
  - Confirm your async function returns a VNode, not just data.

## 🧬 State & Props Problems

- **State not updating:**
  - Mutate state only via reactive refs (avoid direct assignment to the object — set `.value`).
  - For arrays/objects, use supported mutating methods or replace the value entirely.
- **Props not received:**
  - Check attribute spelling and casing (use kebab-case in HTML, e.g. `my-prop="value"`).
  - Ensure your `useProps()` call includes the correct default values.

## 🎨 Style Issues

- Use the `useStyle()` hook to provide component-scoped styles, or opt in to JIT CSS with `useJITCSS()`.
- **Unsafe CSS warning:**
  - Avoid `url(javascript:...)`, `<script>`, or `expression()` in styles.

## 🔗 Event & Binding Problems

- **Events not firing:**
  - Check that the handler is correctly bound and accessible in the component scope (no accidental shadowing or missing closure capture).
  - Ensure the element is mounted before wiring listeners when using imperative `addEventListener`.
  - Use `@event` syntax in templates (e.g., `@click`) or attach listeners via refs + `addEventListener` for cross-framework compatibility.
  - Ensure the event handler is a function and not accidentally `undefined`.
- **Two-way binding not working:**
  - Check that the bound state is a reactive ref.
  - Verify the child component uses `defineModel` and dispatches `update:<propName>` events.
  - See the [Bindings guide](./bindings.md) for a full walkthrough.

## 🧩 Lifecycle & Watchers

- **Lifecycle hooks not called:**
  - Use the correct hook names inside functional components: `useOnConnected`, `useOnDisconnected`, `useOnAttributeChanged`, `useOnError`.
  - Hooks must be called during the synchronous execution of the component render function, not inside callbacks or async code.
- **Watchers not triggering:**
  - For nested state, provide the correct source function (e.g., `() => user.profile.age`).
  - Use `watch(source, cb, { deep: true })` to observe nested object/array mutations. Without `{ deep: true }`, only top-level `.value` reassignment is detected.
  - Never mutate state directly during render — use `watchEffect` or `watch` for side effects.

## 🧱 Template & Directives

- Use supported directives: `when`, `each`, `match` (from `directives`), and enhanced helpers like `switchOnPromise`, `eachWhere`, and others (from `directive-enhancements`). See the [Directives guide](./directives.md) and [Directive Enhancements guide](./directive-enhancements.md).
- Some async/collection helpers return anchor blocks (stable boundaries) that affect keying and patch behavior — keep this in mind when nesting directives.
- **Template errors:**
  - Use `<cer-error-boundary>` with a `slot="fallback"` attribute for robust error handling.

## 🔥 HMR & SSR

- **HMR not updating:**
  - Ensure you are in development mode and that `import.meta.hot` is available.
  - See the [HMR guide](./hmr.md) for setup details.
- **SSR output incorrect:**
  - Avoid browser-only APIs in SSR mode.
  - Use pure functions for rendering and style generation.

## 🧪 Debugging Tips

- Use browser dev tools to inspect the shadow DOM and component state.
- Add `console.log` calls in render functions, hooks, and watchers to trace execution.
- Use `<cer-error-boundary>` to catch and display runtime errors.
- Enable dev-mode logging with `setDevMode(true)` for additional runtime warnings.
- Test with minimal configurations to isolate issues.

## ❓ FAQ

**Q: Why is my component not rendering?**
A: Check that the component is registered, the tag name matches, and the render function returns a valid VNode.

**Q: Why are my styles missing?**
A: Confirm that `useStyle()` or `useJITCSS()` is called in the component, and check for unsafe CSS warnings in the console.

**Q: Why aren't events firing?**
A: Use `@event` syntax in templates and ensure the handler is a function. For cross-framework use, prefer `addEventListener` on a ref.

**Q: How do I debug async templates?**
A: Use `try/catch` in async code and log errors. Consider using `switchOnPromise` to handle loading and error states declaratively.

## 🏁 Summary

Troubleshooting is easier with error boundaries, dev-mode logging, and browser dev tools. Consult the feature-specific documentation for deeper guidance on each topic.
