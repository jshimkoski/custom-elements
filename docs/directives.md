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
