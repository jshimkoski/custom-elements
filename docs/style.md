# 🎨 Style Functionality Deep Dive

## 🖌️ Overview

The `style` property in the runtime lets you define CSS for your custom element. Styles can be static strings, dynamic functions based on state, or advanced configs for performance. All styles are scoped to the shadow DOM, secure, and optimized for mobile-first rendering.

A [JIT CSS](./jit-css.md) engine is also included that generates only the necessary CSS based on your HTML content. It is simple, expressive, and ensures minimal styles are applied.

## 🛠️ Defining Styles

- Use the `style` field in your `ComponentConfig`.
- Accepts a CSS string, a function returning a CSS string, or a `DynamicStyleConfig` object.

```typescript
style: `:host { color: blue; }`
// or
style: (ctx) => `:host { color: ${ctx.theme}; }`
```

## ⚡ Dynamic Styles

- Functions receive the full state (including props and computed).
- Styles update automatically when dependencies change.
- Use for theming, responsive design, or state-driven appearance.

```typescript
style: (ctx) => `:host { background: ${ctx.active ? 'green' : 'gray'}; }`
```

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

## 🛡️ Security
- All styles are sanitized: no `javascript:` URLs, no `<script>` tags, no CSS expressions.
- Styles are injected into the shadow DOM for isolation.

## 🧪 Example: Full Style Usage

```typescript
component('styled-box', {
  state: { color: 'red', size: 24 },
  style: (ctx) => `:host { color: ${ctx.color}; font-size: ${ctx.size}px; }`,
  minifyCSS: true,
  render: (ctx) => html`<div>Styled content</div>`,
});
```

## 🧠 How Styles Work Internally

- Styles are injected as a `<style>` tag in the shadow DOM.
- Dynamic styles are recalculated and updated efficiently.

## 📝 Tips & Best Practices

- Prefer dynamic styles for interactive components.
- Avoid global selectors; use `:host` for scoping.
- Keep styles mobile-first and responsive.

## 📚 Learn More

- [Component Config Guide](./component-config.md)
- [Render Guide](./render.md)
- [State Guide](./state.md)

## 🏁 Summary

The `style` property provides secure, efficient, and flexible styling for your custom elements. Use static, dynamic, or advanced configs to create beautiful, performant, and maintainable components.

See [JIT CSS](./jit-css.md) to learn about how to generate only the necessary CSS based on your HTML content.