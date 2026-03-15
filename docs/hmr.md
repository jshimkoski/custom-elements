# ♻️ Hot Module Replacement (HMR) Deep Dive

A comprehensive guide to Hot Module Replacement (HMR) in the custom elements runtime. Learn how HMR works, how to use it, and best practices for fast, iterative development.

## 🔥 What is HMR?

Hot Module Replacement (HMR) allows you to update modules in a running application without a full reload. This enables instant feedback, preserves state, and speeds up development.

- **Purpose:** Fast, stateful updates during development
- **Benefits:** No page reloads, preserves component state, instant UI feedback

## 🏗️ HMR Architecture in the Runtime

- **Registry:** All component configs are stored in an internal registry (internal API)
- **HMR Detection:** Checks for `import.meta.hot` to enable HMR logic
- **Config Updates:** On module update, new configs are merged into the registry
- **Instance Refresh:** All live component instances are updated with the new config and re-rendered

## ⚡ How HMR Works

1. **HMR enabled:** The runtime detects `import.meta.hot` in development
2. **Module update:** When a module changes, HMR triggers an update
3. **Registry update:** The new component configs are merged into the internal registry
4. **Instance update:** All matching custom elements in the DOM are updated with the new config
5. **Re-render:** Each instance calls its internal render method to reflect changes instantly

**Example:**

```typescript
if (
  typeof import.meta !== 'undefined' &&
  (import.meta as any).hot &&
  import.meta &&
  import.meta.hot
) {
  import.meta.hot.accept((newModule) => {
    // Update internal registry and refresh live instances. The registry is
    // an internal runtime structure; in the browser it is available for
    // dev tools via the Symbol slot Symbol.for('cer.registry') but should
    // not be relied on as a public API.
  });
}
```

## 🧩 HMR-Friendly Component Example

```typescript
component('hmr-demo', () => {
  const props = useProps({ initialCount: 0 });
  const count = ref(props.initialCount);

  const handleClick = () => {
    count.value++;
  };

  return html`<button @click="${handleClick}">${count.value}</button>`;
});
```

- Edit the render function or state logic
- HMR updates the config and all live instances instantly
- State is preserved—no page reload required

## 🚀 HMR Best Practices

- **Use functional components:** The streamlined functional API works seamlessly with HMR
- **Keep state external:** External reactive state is preserved across HMR updates
- **Avoid side effects in render:** Keep component functions pure for reliable updates
- **Test with multiple instances:** Ensure all live elements update correctly

## 🛠️ Internal HMR Logic

- **Registry update:**
  - New component functions replace old ones in the internal registry
- **Instance refresh:**
  - All DOM elements matching the tag are updated with the new component function
  - Internal render methods are called for each instance
- **Error handling:**
  - Errors during HMR are caught and displayed using error boundaries

## ❓ FAQ

**Q: Is HMR enabled in production?**
A: No, HMR is only active in development environments with `import.meta.hot`.

**Q: Does HMR preserve component state?**
A: Yes, state is preserved across config updates for seamless development.

**Q: What happens if a config update fails?**
A: Errors are caught and displayed using error boundaries; the app remains stable.

**Q: Can I use HMR with all features?**
A: Yes, HMR works with state, props, computed, style, render, and more.

## 🏁 Summary

HMR in the custom elements runtime enables fast, stateful, and reliable development. By updating configs and live instances instantly, you get immediate feedback and a smooth developer experience.

Try editing components in development mode to see HMR in action.
