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
    props?: Record<string, unknown>; // Component props
    attrs?: Record<string, unknown>; // Raw attributes
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
    reactiveRef?: unknown; // Reactive state ref
    isCustomElement?: boolean; // Compiler hint for custom elements
    _transitionGroup?: unknown; // Transition group metadata
    [key: string]: unknown; // Other dynamic props/attributes
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

## 🔄 How Rendering Works

1. **Receives VNode(s) and ctx**
2. **Diffs** current and previous VNode trees
3. **Patches** only the changed parts of the real DOM
4. **Handles directives, bindings, and events**

The rendering pipeline is fully managed by the runtime. Component authors interact with it exclusively through `component()` and the `html` template tag — the underlying renderer, diffing engine, and patch functions are implementation details.

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
import { component, html } from '@jasonshimmy/custom-elements-runtime';
import { each } from '@jasonshimmy/custom-elements-runtime/directives';

const items = ['Apple', 'Banana', 'Cherry'];

component('fruit-list', () => {
  return html`
    <ul>
      ${each(items, (item) => html`<li key="${item}">${item}</li>`)}
    </ul>
  `;
});
```

## 🧩 Public API Reference

- **`VNode` (type):** The only VDOM type that is part of the public API. Import it from the main entry or the SSR entry as shown above.
- **`html` tag function:** The standard way to produce VNode trees in component render functions.
- **`renderToString` / `renderToStringWithJITCSS`:** SSR renderers that consume VNode trees.

> **Internal APIs — not stable:** `vdomRenderer`, `assignKeysDeep`, `patchChildren`, and the internal diffing/patching functions are implementation details. They are not exported from the package root and their signatures may change between releases without a semver bump. Do not depend on them in application or library code.

## ❓ FAQ

**Q: Is the VDOM required for all components?**
A: Yes, all rendering is powered by VNode trees for consistency and performance. The runtime handles the diffing and patching automatically.

**Q: Can I use custom VNode types?**
A: Yes, as long as they follow the VNode interface.

**Q: How does VDOM handle errors?**
A: Error boundaries in the runtime catch and handle rendering errors gracefully.

## 🏁 Summary

The Virtual DOM is the backbone of efficient, declarative UI updates in the custom elements runtime. It enables fast rendering, minimal DOM changes, and a developer-friendly API for building modern web components.

For more details, see the source code in `src/lib/runtime/vdom.ts` and explore the examples in the documentation.
