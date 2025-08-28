# 🪣 Slot Functionality Deep Dive

A guide to slot functionality in the custom elements runtime. Learn how to use native <slot> elements, as well as slot-like patterns with props and child nodes, for flexible UIs.

## 🏷️ What are Slots?

Slots allow you to pass custom content from a parent to a child component, enabling composition and reuse. The runtime fully supports native `<slot>` elements for content projection, as well as slot-like patterns using props and child nodes.

- **Purpose:** Flexible content injection and composition
- **Benefits:** Reusable layouts, dynamic content, separation of concerns

## 🧩 Slot-like Patterns with Props

Pass content as a prop from parent to child, then render it in the child component.

**Example:**
```typescript
component("parent-comp", {
  render: () => html`<child-comp content="<b>Custom!</b>"></child-comp>`
});

component("child-comp", {
  props: { content: { type: String, default: "" } },
  render: (ctx) => html`<div>${ctx.content}</div>`
});
```

## 🧬 Slot-like Patterns with Child Nodes

Read and render child nodes passed to a custom element.

**Example:**
```typescript
component("slot-demo", {
  render: (ctx) => html`<div>${ctx._children}</div>`
});
// Usage:
// <slot-demo><span>Injected!</span></slot-demo>
```

- Use a helper to extract and render child nodes if needed.

## 🔄 Multiple Slots

Simulate multiple slots by passing multiple props or using a structured object.

**Example:**
```typescript
component("multi-slot", {
  props: {
    header: { type: String, default: "" },
    footer: { type: String, default: "" }
  },
  render: (ctx) => html`
    <header>${ctx.header}</header>
    <main>...</main>
    <footer>${ctx.footer}</footer>
  `
});
```

## 🪄 Using Native <slot> Elements

You can use native `<slot>` elements inside your component's template to enable true content projection. This works seamlessly with the runtime and the Shadow DOM.

**Example:**
```typescript
component("native-slot-demo", {
  render: () => html`
    <div>
      <slot name="header"></slot>
      <main><slot></slot></main>
      <slot name="footer"></slot>
    </div>
  `
});
```

**Usage:**
```html
<native-slot-demo>
  <span slot="header">Header Content</span>
  <p>Main Content</p>
  <span slot="footer">Footer Content</span>
</native-slot-demo>
```

- Unnamed `<slot>` elements receive default content.
- Named slots (`slot="header"`) receive content with matching slot attributes.
- Slot content is projected into the Shadow DOM automatically.

## 🛠️ Best Practices

- Use native `<slot>` elements for true content projection and composition
- Use props for simple slot content
- Use child nodes for complex or nested content
- Sanitize and escape HTML to prevent XSS
- Document expected slot usage in your component API

## ❓ FAQ

**Q: Can I use native `<slot>` elements?**
A: Yes! The runtime fully supports native `<slot>` elements for content projection in the Shadow DOM.

**Q: How do I pass complex content?**
A: Use child nodes or serialize content as a string prop.

**Q: How do I support multiple slots?**
A: Use multiple props or a structured object for different content regions.

**Q: Is slot content reactive?**
A: Props are reactive; child nodes are static unless managed by the parent.

## 🏁 Summary

Slot functionality in the runtime enables flexible, composable UIs. Use native `<slot>` elements for true content projection, and props or child nodes for additional patterns.

For more details, see advanced usage examples and the source code in `src/lib/index.ts`.
