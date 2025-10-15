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
import { when } from '@jasonshimmy/custom-elements-runtime';

component('conditional-component', ({ isVisible = false }) => {
  return html`
    ${when(isVisible, html`<div>Visible!</div>`)}
  `;
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

## 🔄 each Directive

Render a list of items.

```typescript
import { each } from '@jasonshimmy/custom-elements-runtime';

component('list-component', ({ items = [] }) => {
  return html`
    <ul>
      ${each(items, (item, i) => html`<li>${i}: ${item}</li>`)}
    </ul>
  `;
});
```
- First argument: array to iterate
- Second argument: callback receives item and index, returns content

## 🧩 match Directive

Pattern matching for multiple cases.

```typescript
import { match } from '@jasonshimmy/custom-elements-runtime';

component('status-display', ({ status = 'loading' }: { status?: string }) => {
  return html`
    ${match()
      .when(status === 'loading', html`<div>Loading...</div>`)
      .when(status === 'error', html`<div>Error!</div>`)
      .when(status === 'success', html`<div>Success!</div>`)
      .otherwise(true, html`<div>Unknown status</div>`)
      .done()}
  `;
});
```

### Lazy `match` branches

The `match` directive follows the same runtime-only lazy principle. Branch content passed to `match().when(...)` can be either pre-built VNode(s) or a factory function. Use a factory when branch content is expensive or may throw.

Example:

```ts
match()
  .when(false, () => html`<div>${expensive()}</div>`) // not evaluated
  .when(true, html`<div>fallback</div>`) // evaluated and returned
  .done();
```

Notes:
- The factory is only executed for the branch that matches. This is a runtime-only mechanism (no compiler transforms).
- Existing `match().when(cond, html`...`)` users are unaffected.

### ✅ When to use the factory overload

- When the interpolated expression may throw (parsing user input, calling a function that can throw).
- When constructing the children is computationally expensive and you want to avoid that cost while the condition is falsy.

### Anchor child normalization (preserving falsy children)

The runtime's anchor block normalization preserves meaningful falsy children like `0`, `false`, and the empty string `''`. Only `null` and `undefined` are filtered out when an anchor block's children are normalized. This ensures you can reliably render intentionally falsy values inside conditional blocks.

## 🧪 Example: All Directives Together

```typescript
component('directive-demo', ({
  initialItems = [1, 2, 3],
  initialShow = true,
  initialStatus = 'loading'
}: {
  initialItems?: number[];
  initialShow?: boolean; 
  initialStatus?: 'loading' | 'error' | 'success' | 'unknown';
}) => {
  const items = ref(initialItems);
  const show = ref(initialShow);
  const status = ref(initialStatus);
  
  return html`
    ${when(show.value, html`<h2>List:</h2>`)}
    <ul>
      ${each(items.value, (item) => html`<li>${item}</li>`)}
    </ul>
    ${match()
      .when(status.value === 'loading', html`<div>Loading...</div>`)
      .when(status.value === 'error', html`<div>Error!</div>`)
      .when(status.value === 'success', html`<div>Success!</div>`)
      .otherwise(true, html`<div>Unknown status</div>`)
      .done()}
  `;
});
```

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
