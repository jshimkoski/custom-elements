
# `data-model` vs `data-bind`: Comparison & Use Cases

This document explains the differences between the `data-model` and `data-bind` attributes in the Custom Elements Runtime, provides usage examples, edge cases, stateless components, plugin system, SSR, error boundaries, event bus, global store, deep binding, modifiers, and best practices.

---


## Overview

Both `data-model` and `data-bind` enable declarative, reactive binding between your component's state and form inputs. They serve different purposes and are optimized for distinct scenarios. All binding is strictly type-safe and regression-tested for reliability. Works with stateless components, plugin system, SSR, error boundaries, event bus, and global store.

---


## `data-model`

**Purpose:**
- Controlled, one-way binding between a single state property and a form input. Input stays in sync with state; user typing always wins.
- Supports modifiers (e.g., `|number`, `|trim`) for type conversion and normalization.
- Works with all standard input types: text, number, checkbox, radio, textarea, select.
- Works with stateless and stateful components.

**Example:**
```html
<input type="text" data-model="username" />
<input type="checkbox" data-model="accepted" />
<input type="text" data-model="amount|number" />
```

**State Example:**
```typescript
state: {
  username: '',
  accepted: false,
  amount: 0
}
```

**Best For:**
- Simple, direct binding to primitive state properties.
- Controlled forms where each input maps to a single state key.
- Scenarios needing input normalization (modifiers).
- Checkbox/radio groups with array state.

---


## `data-bind`

**Purpose:**
- Enables deep, two-way binding to nested state objects or arrays. Supports dot notation and array indices for complex structures (e.g., `user.address.street`, `items[0].name`).
- Useful for dynamic forms, lists, or when state shape is not flat.
- Can be used for advanced scenarios where `data-model` is insufficient.
- Works with stateless and stateful components.

**Example:**
```html
<input type="checkbox" data-bind="items[0].name" />
<input type="text" data-bind="user.address.street" />
```

**State Example:**
```typescript
state: {
  items: [{ name: '' }],
  user: { address: { street: '' } }
}
```

**Best For:**
- Deeply nested or dynamic state structures.
- Dynamic forms, lists, or arrays of inputs.
- Scenarios where you need to bind to a property not at the root of state.

---


## Plugin System, SSR, Error Boundaries, Event Bus, and Global Store

- Both binding strategies work with plugin system hooks (`onInit`, `onRender`, `onError`).
- SSR: Input bindings are excluded from SSR output; hydration restores input sync.
- Error boundaries: Use `onError` for fallback UI and diagnostics during input sync.
- Use with event bus and global store for cross-component state and communication.

## Comparison Table

| Feature                | `data-model`                | `data-bind`                  |
|------------------------|-----------------------------|------------------------------|
| Binding Type           | One-way, controlled         | Two-way, deep                |
| State Shape            | Flat, primitive             | Nested, dynamic              |
| Modifiers              | Supported (`number`, etc.)  | Not supported                |
| Input Types            | All standard                | All standard                 |
| Deep Binding           | No                          | Yes                          |
| Stateless Support      | Yes                         | Yes                          |
| SSR Hydration          | Yes                         | Yes                          |
| Plugin System          | Yes                         | Yes                          |
| Error Boundaries       | Yes                         | Yes                          |
| Event Bus/Store        | Yes                         | Yes                          |
| Dot Notation           | No                          | Yes                          |
| Array Index Support    | No                          | Yes                          |
| Edge Cases             | User typing always wins     | Handles dynamic lists        |
| Input Types            | All standard                | All standard                 |
| Checkbox/Radio Groups  | Supported                   | Supported                    |
| Use Case               | Simple forms, direct state  | Dynamic forms, nested state  |
| Performance            | Highly optimized            | Optimized, but more flexible |
| VDOM Patch Reliability | Regression-tested           | Regression-tested            |

---

## When to Use Each

- Use **`data-model`** for most forms and simple state bindings. It is more performant, easier to reason about, and supports input modifiers.
- Use **`data-bind`** when you need to bind to nested or dynamic state, such as lists, arrays, or deeply nested objects.
- Both are regression-tested for VDOM patching and event reliability.

---

## Advanced Patterns

- You can mix `data-model` and `data-bind` in the same component for maximum flexibility.
- For dynamic lists, use `data-bind` with array indices or object paths.
- For controlled forms, prefer `data-model` for clarity and performance.

---

## Summary

- `data-model`: Simple, performant, controlled binding to flat state properties. Supports modifiers.
- `data-bind`: Flexible, deep binding for nested or dynamic state. Use for advanced forms and lists.
- Choose the right binding for your use case to maximize maintainability and performance.
