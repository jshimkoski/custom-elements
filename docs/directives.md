# 🧭 Directives Functionality Deep Dive

## 🚦 Overview

Directives provide powerful, declarative control over rendering in your custom elements. The runtime supports three core directives: `when`, `each`, and `match`. These enable conditional rendering, list rendering, and pattern matching, making your templates expressive and maintainable.

## 🛠️ Supported Directives

- `when`: Conditional rendering (if/else logic)
- `each`: List rendering (loops)
- `match`: Pattern matching (switch/case logic)

## 🔍 when Directive

Render content only if a condition is true.

```typescript
import { when } from '@jasonshimmy/custom-elements-runtime/directives';
import { useProps } from '@jasonshimmy/custom-elements-runtime';

component('conditional-component', () => {
  const props = useProps({ isVisible: false });
  return html` ${when(props.isVisible, html`<div>Visible!</div>`)} `;
});
```

- First argument: condition (boolean)
- Second argument: content to render if true

For if/else logic, use multiple `when` calls or the `match` directive:

```typescript
// Multiple when calls for if/else
${when(hasError, html`<div>Error!</div>`)}
${when(!hasError, html`<div>All good!</div>`)}

// Or use match for cleaner if/else logic
${match()
  .when(hasError, html`<div>Error!</div>`)
  .otherwise(html`<div>All good!</div>`)
  .done()}
```

### 💤 Lazy `when` (runtime-only)

For safety and to avoid eager evaluation of expensive or throwing expressions, the `when` directive supports a runtime lazy overload that accepts a factory function as the second argument. This overload defers construction of the children until the condition is truthy.

Example:

```ts
// factory is not called until `isVisible` is truthy
${when(isVisible, () => html`<div>${computeExpensive()}</div>`) }
```

Why this exists (short): JavaScript evaluates template literal interpolations eagerly before the runtime/directive sees them. If the inner expression throws or performs expensive work, the only reliable way to avoid that evaluation at runtime is to defer constructing the VNode(s) with a function.

Notes:

- This is a runtime-only behavior. No build or compile-time transform is required or used.
- Use the factory form when you need guarded/eager-avoidant behavior.

Implementation note: The runtime wraps conditional content in stable "anchor blocks" which provide consistent start/end boundaries for the renderer. Anchor blocks preserve meaningful falsy children such as `0`, `false`, and the empty string `''` — only `null` and `undefined` are filtered out. This design ensures predictable DOM anchors for `when`/`match` branches and avoids accidental loss of valid falsy values.

## 🔄 each Directive

Render a list of items.

```typescript
import { each } from '@jasonshimmy/custom-elements-runtime/directives';
import { useProps } from '@jasonshimmy/custom-elements-runtime';

component('list-component', () => {
  const props = useProps({ items: [] as any[] });
  return html`
    <ul>
      ${each(props.items, (item, i) => html`<li>${i}: ${item}</li>`)}
    </ul>
  `;
});
```

- First argument: array to iterate
- Second argument: callback receives item and index, returns content

Implementation note: When possible provide a stable key for list items. The runtime will use a primitive value as the key for primitives, or prefer `item.key` or `item.id` for objects. If no key-like property exists the renderer falls back to an index-derived identity (`idx-<index>`). Supplying stable keys prevents unnecessary remounts and keeps form controls and focus stable across updates.

## 🧩 match Directive

Pattern matching for multiple cases.

```typescript
import { match } from '@jasonshimmy/custom-elements-runtime/directives';
import { useProps } from '@jasonshimmy/custom-elements-runtime';

component('status-display', () => {
  const props = useProps({
    status: 'loading' as 'loading' | 'error' | 'success',
  });
  return html`
    ${match()
      .when(props.status === 'loading', html`<div>Loading...</div>`)
      .when(props.status === 'error', html`<div>Error!</div>`)
      .when(props.status === 'success', html`<div>Success!</div>`)
      .otherwise(html`<div>Unknown status</div>`)
      .done()}
  `;
});
```

### Lazy `match` branches

The `match` directive follows the same runtime-only lazy principle. Branch content passed to `match().when(...)` can be either pre-built VNode(s) or a factory function. Use a factory when branch content is expensive or may throw.

Example:

```typescript
component('directive-demo', () => {
  const props = useProps({
    initialItems: [1, 2, 3] as number[],
    initialShow: true,
    initialStatus: 'loading' as 'loading' | 'error' | 'success' | 'unknown',
  });
  const items = ref(props.initialItems);
  const show = ref(props.initialShow);
  const status = ref(props.initialStatus);

  return html`
    ${when(show.value, html`<h2>List:</h2>`)}
    <ul>
      ${each(items.value, (item) => html`<li>${item}</li>`)}
    </ul>
    ${match()
      .when(status.value === 'loading', html`<div>Loading...</div>`)
      .when(status.value === 'error', html`<div>Error!</div>`)
      .when(status.value === 'success', html`<div>Success!</div>`)
      .otherwise(html`<div>Unknown status</div>`)
      .done()}
  `;
});
```

## 🔲 anchorBlock — Stable VNode Fragment Primitive

`anchorBlock` is a lower-level utility exported from `./directives` that wraps VNode content in a keyed fragment with stable start/end boundaries. All higher-level directives (`when`, `each`, `match`) use it internally.

You can import and use it directly when building custom directive-like helpers that need stable keys for the virtual DOM differ:

```typescript
import { anchorBlock } from '@jasonshimmy/custom-elements-runtime/directives';
import type { VNode } from '@jasonshimmy/custom-elements-runtime';

function myCustomDirective(cond: boolean, content: VNode | VNode[]): VNode {
  return anchorBlock(cond ? content : [], 'my-directive-key');
}
```

**Parameters:**

- `children` — `VNode | VNode[] | null | undefined` — Content to render inside the anchor.
- `anchorKey` — `string` — A stable string key that uniquely identifies this anchor block in its sibling list.

**Notes:**

- `null` and `undefined` children are filtered out; meaningful falsy values (`0`, `false`, `''`) are preserved.
- The `anchorKey` is used by the VDOM differ to efficiently track which anchor block moved, grew, or shrank.

## 🧠 How Directives Work Internally

- Directives are pure functions that return VNode(s) for the virtual DOM.
- They integrate seamlessly with the template compiler and reactive state.
- Directives optimize rendering by only updating affected regions.

## 📝 Tips & Best Practices

- Use `when` for concise conditional logic.
- Use `each` for lists; always provide a unique key, if possible. `each` will use value for primitives or prefer `item.key` or `item.id` for objects.
- Use `match` for readable multi-case logic.
- Keep directive usage declarative and avoid side effects.

## 📚 Learn More

- [Directive Enhancements Guide](./directive-enhancements.md)
- [Functional API](./functional-api.md)
- [Template Guide](./template.md)

## 🏁 Summary

Directives make your templates expressive, maintainable, and performant. Use them to control rendering logic declaratively and keep your components clean and robust.
