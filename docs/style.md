# 🎨 Style Functionality Deep Dive

---

## 🖌️ Overview
The `style` property in the runtime lets you define CSS for your custom element. Styles can be static strings, dynamic functions based on state, or advanced configs for performance. All styles are scoped to the shadow DOM, secure, and optimized for mobile-first rendering.

---

## 🛠️ Defining Styles
- Use the `style` field in your `ComponentConfig`.
- Accepts a CSS string, a function returning a CSS string, or a `DynamicStyleConfig` object.

```typescript
style: `:host { color: blue; }`
// or
style: (ctx) => `:host { color: ${ctx.theme}; }`
```

---

## ⚡ Dynamic Styles
- Functions receive the full state (including props and computed).
- Styles update automatically when dependencies change.
- Use for theming, responsive design, or state-driven appearance.

```typescript
style: (ctx) => `:host { background: ${ctx.active ? 'green' : 'gray'}; }`
```

---

## 🌈 The `css` Function for Syntax Highlighting

The runtime provides a `css` helper function to improve syntax highlighting for CSS-in-JS code blocks. This function is purely for developer experience—it does **not** sanitize or process your CSS. All actual CSS sanitization and security is handled by the runtime engine itself.

**Usage Example:**
```typescript
import { component, html, css } from '@jasonshimmy/custom-elements-runtime';

const style = css`
  :host {
    color: var(--primary);
    padding: 1rem;
  }
`;

component('highlighted-box', {
  style,
  render: () => html`<div>Styled with syntax highlighting!</div>`
});
```

**Note:**
- The `css` function is for editor syntax highlighting only.
- It does **not** sanitize, validate, or transform your CSS.
- All CSS security is built into the runtime and applied automatically.

---

## 🧩 Advanced: DynamicStyleConfig
- Use an object for fine-grained control:
  - `css`: CSS string or function
  - `dependencies`: Array of state keys to watch for style updates
  - `cache`: Enable/disable style caching

```typescript
style: {
  css: (ctx) => `:host { font-size: ${ctx.size}px; }`,
  dependencies: ['size'],
  cache: true,
}
```

---

## 🚀 Style Optimizations
- Use `styleOptimizations` for performance tuning:
  - `enableCaching`: Cache styles by dependency hash
  - `enableMinification`: Minify CSS
  - `enableDeduplication`: Remove duplicate rules
  - `cacheSize`: Max cache entries
  - `debounceMs`: Debounce style updates

```typescript
styleOptimizations: {
  enableCaching: true,
  enableMinification: true,
  cacheSize: 50,
}
```

---

## 🛡️ Security
- All styles are sanitized: no `javascript:` URLs, no `<script>` tags, no CSS expressions.
- Styles are injected into the shadow DOM for isolation.

---

## 🧪 Example: Full Style Usage
```typescript
component('styled-box', {
  state: { color: 'red', size: 24 },
  style: (ctx) => `:host { color: ${ctx.color}; font-size: ${ctx.size}px; }`,
  styleOptimizations: { enableMinification: true },
  render: (ctx) => html`<div>Styled content</div>`,
});
```

---

## 🧠 How Styles Work Internally
- Styles are injected as a `<style>` tag in the shadow DOM.
- Dynamic styles are recalculated and updated efficiently.
- Caching and deduplication reduce DOM updates and memory usage.
- Dependencies trigger style updates only when needed.

---

## 📝 Tips & Best Practices
- Prefer dynamic styles for interactive components.
- Use dependencies for efficient updates.
- Minify and deduplicate for production.
- Avoid global selectors; use `:host` for scoping.
- Keep styles mobile-first and responsive.

---

## 📚 Learn More
- [Component Config Guide](./component-config.md)
- [Render Guide](./render.md)
- [State Guide](./state.md)

---

## 🏁 Summary
The `style` property provides secure, efficient, and flexible styling for your custom elements. Use static, dynamic, or advanced configs to create beautiful, performant, and maintainable components.
