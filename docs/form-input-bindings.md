
# Form Input Bindings in Custom Elements Runtime

This document describes all supported ways to use form input bindings in the custom-elements runtime (`runtime.ts`).

---


## Overview

Form input bindings allow you to declaratively connect HTML form controls (input, textarea, select, etc.) to your component's reactive state. The runtime automatically synchronizes values, handles user input, and supports advanced features like modifiers, multi-checkbox groups, deep binding, stateless components, plugin system, SSR, error boundaries, and global store integration.

---


## Supported Input Types

- `<input type="text">`
- `<input type="number">`
- `<input type="checkbox">` (single and multi-checkbox group)
- `<input type="radio">` (radio group)
- `<textarea>`
- `<select>`

---


## Basic Usage

Bind an input to a state property using the `data-model` attribute:

```html
<input type="text" data-model="message" />
<textarea data-model="description"></textarea>
<select data-model="selectedOption">
  <option value="a">A</option>
  <option value="b">B</option>
</select>
```

**State Example:**
```typescript
state: {
  message: '',
  description: '',
  selectedOption: 'a'
}
```

---


## Modifiers

Modifiers can be added to `data-model` using the pipe (`|`) syntax:

- `trim`: Trims whitespace from string input
- `number`: Converts input value to a number

**Example:**
```html
<input type="text" data-model="amount|number" />
<input type="text" data-model="username|trim" />
```

**State Example:**
```typescript
state: {
  amount: 0,
  username: ''
}
```

---


## Checkbox Bindings

### Single Checkbox

```html
<input type="checkbox" data-model="accepted" />
```

**State Example:**

## Deep Binding with `data-bind`

Bind to nested state objects or arrays using dot notation or array indices:

```html
<input type="text" data-bind="user.address.street" />
<input type="checkbox" data-bind="items[0].checked" />
```

**State Example:**
```typescript
state: {
  user: { address: { street: '' } },
  items: [{ checked: false }]
}
```

## Plugin System, SSR, and Error Boundaries

- Input binding works with plugin system hooks (`onInit`, `onRender`, `onError`).
- SSR: Input bindings are excluded from SSR output; hydration restores input sync.
- Error boundaries: Use `onError` for fallback UI and diagnostics during input sync.

## Global Store & Event Bus Integration

- Use input bindings with global store and event bus for cross-component state and communication.

## Edge Cases & Best Practices

- Controlled input sync always prioritizes user typing over state updates.
- Only one event handler per event type per element; handlers must be defined on the config object.
- Use stateless components for pure view/input scenarios.
- SSR hydration is opt-in; input bindings are restored on hydration.

#### True/False values

```html
<input
  type="checkbox"
  data-model="accepted"
  data-true-value="yes"
  data-false-value="no"
>
```

`data-true-value` and `data-false-value` are attributes that only work with data-model.

- When checked, state is set to `yes`.
- When unchecked, state is set to `no`.

### Multi-Checkbox Group (Array)

```html
<input type="checkbox" value="apple" data-model="fruits" />
<input type="checkbox" value="banana" data-model="fruits" />
<input type="checkbox" value="cherry" data-model="fruits" />
```

**State Example:**
```typescript
state: {
  fruits: [] // e.g. ['apple', 'banana']
}
```

- When checked, value is added to the array.
- When unchecked, value is removed from the array.

---

## Radio Group Bindings

```html
<input type="radio" name="color" value="red" data-model="favoriteColor" />
<input type="radio" name="color" value="blue" data-model="favoriteColor" />
<input type="radio" name="color" value="green" data-model="favoriteColor" />
```

**State Example:**
```typescript
state: {
  favoriteColor: 'red'
}
```

- Only one radio can be selected at a time.
- State is set to the value of the selected radio.
- All radios in the group must share the same `name` and `data-model`.

---

## Textarea Bindings

```html
<textarea data-model="notes"></textarea>
```

**State Example:**
```typescript
state: {
  notes: ''
}
```

---

## Select Bindings

```html
<select data-model="selected">
  <option value="a">A</option>
  <option value="b">B</option>
</select>
```

**State Example:**
```typescript
state: {
  selected: 'a'
}
```

---

## Event Handling and Sync

- The runtime automatically attaches listeners for `input`, `change`, `keydown`, and `blur` events.
- Controlled inputs are only updated if not focused or dirty (user is not typing).
- For radios and checkboxes, the runtime ensures the `checked` property matches the state after every update.
- For multi-checkbox groups, the runtime checks if the value is present in the array.

---

## Advanced: VNode Keying and Data UID

- Inputs with `data-model` are assigned a stable `data-uid` attribute for VDOM reconciliation.
- For radios and checkboxes, the key is `model:value` (e.g., `favoriteColor:red`).
- For other inputs, the key is the model name (e.g., `message`).

---

## Full Example

```html
<form>
  <input type="text" data-model="username|trim" placeholder="Username" />
  <input type="number" data-model="age|number" placeholder="Age" />
  <input type="checkbox" value="subscribe" data-model="subscriptions" />
  <input type="checkbox" value="alerts" data-model="subscriptions" />
  <input type="radio" name="gender" value="male" data-model="gender" />
  <input type="radio" name="gender" value="female" data-model="gender" />
  <textarea data-model="bio"></textarea>
  <select data-model="country">
    <option value="us">USA</option>
    <option value="ca">Canada</option>
  </select>
</form>
```

**State Example:**
```typescript
state: {
  username: '',
  age: 0,
  subscriptions: [],
  gender: 'male',
  bio: '',
  country: 'us'
}
```

---

## Notes

- Always use `data-model` for binding; do not use `name` for state.
- Modifiers are optional and can be combined (e.g., `data-model="amount|number|trim"`).
- For multi-checkbox groups, initialize state as an array.
- The runtime automatically syncs DOM and state after every update.

---

## Troubleshooting

- If an input is not updating, check that the state property exists and matches the model name.
- For radio groups, ensure all radios share the same `name` and `data-model`.
- For checkboxes, ensure each has a unique `value`.
- If you see unexpected behavior, check the browser console for debug logs.

---

## References

- See `runtime.ts` for implementation details.
- All examples above are accurate to the current runtime behavior.
