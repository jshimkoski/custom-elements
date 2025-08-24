# 🎨 Style Utils Deep Dive

A comprehensive guide to the style utilities in the custom elements runtime. Learn how style caching, minification, deduplication, and performance monitoring work to optimize your components.

---

## 🖌️ What are Style Utils?

Style utils are a set of internal tools that optimize CSS for custom elements. They ensure styles are fast, secure, deduplicated, and efficiently updated.

- **Purpose:** Optimize, cache, and secure component styles
- **Benefits:** Faster rendering, reduced memory usage, secure CSS, and better developer experience

---

## 🏗️ Core Style Utilities

- **StyleCache:** Caches generated styles for fast retrieval and minimal recomputation
- **createStateHash:** Generates a hash from state dependencies for cache keys
- **minifyCSS:** Removes whitespace and comments for smaller CSS
- **deduplicateCSS:** Removes duplicate rules to avoid bloat
- **createDebouncer:** Batches style updates to avoid excessive DOM changes
- **stylePerformanceMonitor:** Tracks style update timings for performance analysis

---

## ⚡ How Style Utils Work

1. **Style generation:** Styles can be static strings, functions, or dynamic configs
2. **Dependency tracking:** Only state-dependent styles are regenerated when needed
3. **Caching:** Styles are cached by dependency hash for fast updates
4. **Minification & deduplication:** Optional optimizations for production
5. **Performance monitoring:** Timers track style update durations

---

## 🧩 Style Config Example

```typescript
component("styled-demo", {
  state: { color: "#007aff" },
  style: (state) => `div { color: ${state.color}; }`,
  styleOptimizations: {
    enableCaching: true,
    enableMinification: true,
    enableDeduplication: true,
    cacheSize: 50,
    debounceMs: 20
  },
  render: (state) => html`<div>Styled!</div>`
});
```

---

## 🛠️ StyleCache

- **Purpose:** Store and retrieve styles by dependency hash
- **Usage:** Avoids recomputation for unchanged state
- **Configurable size:** Prevents memory leaks

---

## 🧮 createStateHash

- **Purpose:** Generate a unique hash from state dependencies
- **Usage:** Used as cache keys for styles
- **Ensures:** Only relevant style changes trigger updates

---

## ✂️ minifyCSS & deduplicateCSS

- **minifyCSS:** Removes whitespace, comments, and unnecessary characters
- **deduplicateCSS:** Removes duplicate CSS rules for smaller output
- **Usage:** Enable in production for best performance

---

## ⏱️ createDebouncer & stylePerformanceMonitor

- **createDebouncer:** Batches style updates to avoid layout thrashing
- **stylePerformanceMonitor:** Tracks how long style updates take
- **Usage:** Helps diagnose and optimize slow style updates

---

## 🚀 Best Practices

- **Use dependency tracking:** Only regenerate styles when needed
- **Enable caching:** For dynamic styles, use caching for performance
- **Minify and deduplicate in production:** Reduce bundle size and memory
- **Monitor performance:** Use stylePerformanceMonitor for large apps
- **Sanitize CSS:** Prevent XSS and unsafe styles

---

## 📚 Example: Dynamic & Cached Styles

```typescript
component("dynamic-style", {
  state: { theme: "dark" },
  style: {
    css: (state) => state.theme === "dark"
      ? "body { background: #222; color: #fff; }"
      : "body { background: #fff; color: #222; }",
    dependencies: ["theme"],
    cache: true
  },
  render: (state) => html`<body>Theme: ${state.theme}</body>`
});
```

---

## ❓ FAQ

**Q: Are style utils required for all components?**
A: No, but they are recommended for dynamic or complex styles.

**Q: How do I enable style optimizations?**
A: Use the `styleOptimizations` config in your component.

**Q: Is CSS sanitized?**
A: Yes, unsafe CSS (e.g., `url(javascript:...)`, `<script>`, `expression()`) is removed automatically.

**Q: Can I use style utils with SSR?**
A: Yes, style generation and caching work in SSR mode as well.

---

## 🏁 Summary

Style utils in the custom elements runtime provide powerful, secure, and efficient CSS management. Use them to optimize your components for speed, safety, and scalability.

---

For more details, see the source code in `src/lib/style-utils.ts` and explore style examples in the documentation.
