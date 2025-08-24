# 🧭 Directives Functionality Deep Dive

## 🚦 Overview
Directives provide powerful, declarative control over rendering in your custom elements. The runtime supports three core directives: `when`, `each`, and `match`. These enable conditional rendering, list rendering, and pattern matching, making your templates expressive and maintainable.

---

## 🛠️ Supported Directives
- `when`: Conditional rendering (if/else logic)
- `each`: List rendering (loops)
- `match`: Pattern matching (switch/case logic)

---

## 🔍 when Directive
Render content only if a condition is true.

```typescript
import { when } from 'runtime';

render: (state) => html`
  ${when(state.isVisible, html`<div>Visible!</div>`)}
`
```
- First argument: condition (boolean)
- Second argument: content to render if true
- Optional third argument: content to render if false

```typescript
${when(state.hasError, html`<div>Error!</div>`, html`<div>All good!</div>`)}
```

---

## 🔄 each Directive
Render a list of items.

```typescript
import { each } from 'runtime';

render: (state) => html`
  <ul>
    ${each(state.items, (item, i) => html`<li>${i}: ${item}</li>`)}
  </ul>
`
```
- First argument: array to iterate
- Second argument: callback receives item and index, returns content

---

## 🧩 match Directive
Pattern matching for multiple cases.

```typescript
import { match } from 'runtime';

render: (state) => html`
  ${match(state.status, {
    loading: html`<div>Loading...</div>`,
    error: html`<div>Error!</div>`,
    success: html`<div>Success!</div>`,
    _: html`<div>Unknown status</div>`, // fallback
  })}
`
```
- First argument: value to match
- Second argument: object mapping cases to content
- Use `_` for fallback/default case

---

## 🧪 Example: All Directives Together
```typescript
component('directive-demo', {
  state: { items: [1,2,3], show: true, status: 'loading' },
  render: (state) => html`
    ${when(state.show, html`<h2>List:</h2>`)}
    <ul>
      ${each(state.items, (item) => html`<li>${item}</li>`)}
    </ul>
    ${match(state.status, {
      loading: html`<div>Loading...</div>`,
      error: html`<div>Error!</div>`,
      success: html`<div>Done!</div>`,
      _: html`<div>Unknown</div>`,
    })}
  `,
});
```

---

## 🧠 How Directives Work Internally
- Directives are pure functions that return VNode(s) for the virtual DOM.
- They integrate seamlessly with the template compiler and reactive state.
- Directives optimize rendering by only updating affected regions.

---

## 📝 Tips & Best Practices
- Use `when` for concise conditional logic.
- Use `each` for lists; always provide a unique key if possible.
- Use `match` for readable multi-case logic.
- Keep directive usage declarative and avoid side effects.

---

## 📚 Learn More
- [Binding Guide](./directives-and-binding.md)
- [Render Guide](./render.md)
- [Component Guide](./component.md)

---

## 🏁 Summary
Directives make your templates expressive, maintainable, and performant. Use them to control rendering logic declaratively and keep your components clean and robust.
