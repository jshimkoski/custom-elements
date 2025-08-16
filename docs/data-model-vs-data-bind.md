# 🥊 Data Model vs Data Bind

Understand when to use `data-model` or `data-bind` to keep form inputs in sync with your component's state.

---

## 🔍 Overview

Both attributes enable declarative, reactive binding between form inputs and state. They're type-safe, SSR-compatible, and work with stateless components, plugins, error boundaries, the event bus, and the global store.

---

## `data-model`

**Use for:** Simple, one-way binding to a single, top-level state property.

- Controlled inputs: input stays synced to state; user typing always wins.
- Supports modifiers like `|number`, `|trim`.
- Works with all standard input types (text, checkbox, radio, etc.).
- Works in both stateful and stateless components.

**Example:**
```html
<input type="text" data-model="username" />
<input type="checkbox" data-model="accepted" />
<input type="text" data-model="amount|number" />
```

**State:**
```ts
state: {
  username: '',
  accepted: false,
  amount: 0
}
```

✅ Best for:
- Simple forms
- Flat state
- Controlled input handling
- Input normalization (e.g., number conversion)

---

## `data-bind`

**Use for:** Two-way, deep binding to nested or dynamic state structures.

- Supports dot notation and array indices: `user.name`, `items[0].title`
- Ideal for dynamic forms or complex state shapes.
- Also works with all standard inputs and stateless components.

**Example:**
```html
<input type="text" data-bind="user.address.street" />
<input type="checkbox" data-bind="items[0].selected" />
```

**State:**
```ts
state: {
  user: { address: { street: '' } },
  items: [{ selected: false }]
}
```

✅ Best for:
- Nested or dynamic state
- Lists and array-based forms
- Binding beyond top-level keys

---

## ✅ Comparison

| Feature                | `data-model`                | `data-bind`                  |
|------------------------|-----------------------------|------------------------------|
| Binding Type           | One-way, controlled         | Two-way, deep                |
| State Shape            | Flat, primitive             | Nested, dynamic              |
| Modifiers              | ✅ Yes                      | ❌ No                        |
| Input Types            | ✅ All standard             | ✅ All standard              |
| Deep Binding           | ❌ No                       | ✅ Yes                       |
| Stateless Support      | ✅ Yes                      | ✅ Yes                       |
| SSR Hydration          | ✅ Yes                      | ✅ Yes                       |
| Plugin System          | ✅ Yes                      | ✅ Yes                       |
| Error Boundaries       | ✅ Yes                      | ✅ Yes                       |
| Event Bus/Store        | ✅ Yes                      | ✅ Yes                       |
| Dot Notation           | ❌ No                       | ✅ Yes                       |
| Array Index Support    | ❌ No                       | ✅ Yes                       |
| Checkbox/Radio Support | ✅ Yes                      | ✅ Yes                       |
| Performance            | ⚡ Fastest                  | ⚡ Flexible, optimized       |
| Best For               | Simple forms                | Dynamic/nested forms         |

---

## 💡 When to Use

- Use **`data-model`** when:
  - State is flat or simple
  - You need modifiers (`|number`, `|trim`)
  - You want max performance and simplicity

- Use **`data-bind`** when:
  - Binding to nested or array-based state
  - Building dynamic or complex forms

---

## 🔁 Advanced Tips

- You can **mix `data-model` and `data-bind`** in the same component.
- Use `data-bind` with array indices for repeatable/dynamic inputs.
- Stick with `data-model` for controlled input workflows whenever possible.

---

## 🧠 Summary

- **`data-model`** → Simple, performant, one-way binding for flat state. Supports modifiers.
- **`data-bind`** → Deep, flexible two-way binding for nested or dynamic state.

Choose the one that fits your form complexity and keep your components clean, fast, and reactive.
