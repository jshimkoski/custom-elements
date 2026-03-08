# 🧩 Virtual DOM Deep Dive

A comprehensive guide to the Virtual DOM (VDOM) implementation in the custom elements runtime. Learn how it powers efficient rendering, diffing, and updates for your components.

## 🏗️ What is the Virtual DOM?

The Virtual DOM (VDOM) is a lightweight, in-memory representation of the real DOM. It enables fast, efficient UI updates by minimizing direct DOM manipulations and batching changes.

- **Purpose:** Efficient rendering, diffing, and patching of UI.
- **Benefits:** Performance, maintainability, and predictable updates.

## ⚡ Core Concepts

- **VNode:** The basic unit of the VDOM, representing elements, text, or fragments.
- **vdomRenderer:** The main function that takes VNode(s) and updates the real DOM efficiently.
- **Diffing:** Compares previous and next VNode trees to determine minimal DOM changes.
- **Patching:** Applies calculated changes to the real DOM.

## 🧱 VNode Structure

A VNode typically includes:

- `tag`: Element tag name or special type (e.g., text, fragment)
- `props`: Attributes, event listeners, and bindings
- `children`: Array of child VNodes
- `key`: Optional, for efficient list diffing

**Example:**

```typescript
const vnode = {
  tag: 'div',
  props: { class: 'container' },
  children: [
    { tag: 'span', props: {}, children: ['Hello!'] },
    { tag: 'button', props: { onClick: handleClick }, children: ['Click'] },
  ],
};
```

## 📦 VNode Type Export

The `VNode` type is exported for TypeScript users who need type-safe virtual DOM manipulation. It is available from both the main entry and the SSR entry:

```typescript
// Preferred: import from main entry
import type { VNode } from '@jasonshimmy/custom-elements-runtime';

// Also available from the SSR entry
import type { VNode } from '@jasonshimmy/custom-elements-runtime/ssr';

// VNode interface structure
interface VNode {
  tag: string; // Element tag or special type
  key?: string; // Unique identifier for diffing
  props?: {
    // Props object (optional)
    key?: string; // Alternative key location
    props?: any; // Component props
    attrs?: Record<string, any>; // Raw attributes
    directives?: Record<
      string,
      {
        // Directive metadata
        value: string;
        modifiers: string[];
        arg?: string;
      }
    >;
    ref?: string; // String ref name
    reactiveRef?: any; // Reactive state ref
    isCustomElement?: boolean; // Compiler hint for custom elements
    _transitionGroup?: any; // Transition group metadata
    [key: string]: any; // Other dynamic props/attributes
  };
  children?: VNode[] | string; // Child nodes or text content
}
```

**Use cases:**

- Custom render functions with proper typing
- VDOM manipulation utilities
- Type-safe template composition
- Building reusable VNode factories

**Example: Type-safe VNode factory**

```typescript
import type { VNode } from '@jasonshimmy/custom-elements-runtime';

function createCard(title: string, content: string): VNode {
  return {
    tag: 'div',
    props: { class: 'card p-4 rounded shadow' },
    children: [
      { tag: 'h3', props: { class: 'font-bold' }, children: [title] },
      { tag: 'p', props: {}, children: [content] },
    ],
  };
}

// Use in component
component('card-demo', () => {
  const card = createCard('Hello', 'World');
  return html`${card}`;
});
```

## 🔄 How vdomRenderer Works

1. **Receives VNode(s) and ctx**
2. **Diffs** current and previous VNode trees
3. **Patches** only the changed parts of the real DOM
4. **Handles directives, bindings, and events**

Note: `vdomRenderer` is an internal runtime entry exported from `src/lib/runtime/vdom.ts`. It is the low-level renderer used by the runtime. It is not re-exported from the package root; most users should rely on the higher-level `component()` API and the runtime's standard rendering flow instead of calling `vdomRenderer` directly. If you are building low-level integrations or debugging the renderer, you can inspect `src/lib/runtime/vdom.ts` for the implementation and signature.

**Internal usage (for advanced cases / debugging):**

```ts
// internal runtime usage (not recommended for regular applications)
// See src/lib/runtime/vdom.ts for the exact signature and behavior.
vdomRenderer(shadowRoot, [vnode], context, refs);
```

## 🕵️‍♂️ Diffing Algorithm

- **Shallow comparison:** Checks type, key, and props
- **Deep comparison:** Recursively diffs children
- **Optimized for lists:** Uses keys for minimal reordering
- **Minimizes DOM operations:** Only updates what changed

## 🛠️ Features & Integrations

- **Directives:** Processes `when`, `each`, `match` for conditional and list rendering
- **Bindings:** Handles `:attr`, `@event`, `:model` for reactive updates
- **Error boundaries:** Supports error handling during rendering
- **SSR-friendly:** Can generate VNode trees for server-side rendering

## 🚀 Performance Optimizations

- **Batching:** Groups DOM updates to avoid layout thrashing
- **Minimal re-renders:** Only re-renders affected subtrees
- **Efficient event delegation:** Attaches listeners only when needed
- **Fragment support:** Reduces unnecessary wrapper elements

## 🧑‍💻 Best Practices

- **Use keys for lists:** Ensures stable identity and efficient updates
- **Keep VNode trees shallow when possible:** Improves diff speed
- **Avoid direct DOM manipulation:** Let vdomRenderer handle updates
- **Leverage directives and bindings:** For declarative, reactive UIs

## 📚 Example: Dynamic List Rendering

```typescript
const items = ['Apple', 'Banana', 'Cherry'];
const vnode = {
  tag: 'ul',
  props: {},
  children: items.map((item, i) => ({
    tag: 'li',
    key: item,
    props: {},
    children: [item],
  })),
};
vdomRenderer(shadowRoot, [vnode], context);
```

## 🧩 Internal API Reference

- **vdomRenderer(root, vnodes, ctx):** Main entry for rendering
- **VNode:** Type definition for virtual nodes
- **Diffing & patching:** Internal logic for efficient updates

## ❓ FAQ

**Q: Is the VDOM required for all components?**
A: Yes, all rendering is powered by VNode trees and vdomRenderer for consistency and performance.

**Q: Can I use custom VNode types?**
A: Yes, as long as they follow the VNode interface.

**Q: How does VDOM handle errors?**
A: Error boundaries in the runtime catch and handle rendering errors gracefully.

## 🏁 Summary

The Virtual DOM is the backbone of efficient, declarative UI updates in the custom elements runtime. It enables fast rendering, minimal DOM changes, and a developer-friendly API for building modern web components.

For more details, see the source code in `src/lib/runtime/vdom.ts` and explore the examples in the documentation.
