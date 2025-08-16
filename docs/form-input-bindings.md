# 🎛️ Form Input Bindings

Declaratively connect form elements to component state with automatic syncing, modifiers, and advanced features.

---

## 🚀 Overview

Form input bindings link HTML inputs (`input`, `textarea`, `select`, etc.) to your component’s reactive `state`. The runtime keeps everything in sync, supports modifiers, nested binding, multi-checkbox arrays, SSR, plugin integration, error boundaries, and more.

---

## ✅ Supported Input Types

- `<input type="text">`
- `<input type="number">`
- `<input type="checkbox">` (single + multi-group)
- `<input type="radio">`
- `<textarea>`
- `<select>`

---

## 🔗 Basic Binding

Use `data-model` to bind inputs to state:

```html
<input type="text" data-model="message" />
<textarea data-model="description"></textarea>
<select data-model="selectedOption">
  <option value="a">A</option>
  <option value="b">B</option>
</select>
```

```ts
state: {
  message: '',
  description: '',
  selectedOption: 'a'
}
```

---

## 🧪 Modifiers

Use `|trim` or `|number` to preprocess input:

```html
<input data-model="amount|number" />
<input data-model="username|trim" />
```

```ts
state: {
  amount: 0,
  username: ''
}
```

---

## ☑️ Single Checkbox

```html
<input type="checkbox" data-model="accepted" />
```

```ts
state: {
  accepted: false
}
```

---

## 🔁 Multi-Checkbox Group

```html
<input type="checkbox" value="apple" data-model="fruits" />
<input type="checkbox" value="banana" data-model="fruits" />
<input type="checkbox" value="cherry" data-model="fruits" />
```

```ts
state: {
  fruits: [] // e.g. ['apple', 'banana']
}
```

- Checked: value added to array
- Unchecked: value removed

---

## 🔘 Radio Group

```html
<input type="radio" name="color" value="red" data-model="favoriteColor" />
<input type="radio" name="color" value="blue" data-model="favoriteColor" />
<input type="radio" name="color" value="green" data-model="favoriteColor" />
```

```ts
state: {
  favoriteColor: 'red'
}
```

- Radios must share `name` and `data-model`
- State reflects the selected value

---

## ✍️ Textarea

```html
<textarea data-model="notes"></textarea>
```

```ts
state: {
  notes: ''
}
```

---

## 📤 Select

```html
<select data-model="selected">
  <option value="a">A</option>
  <option value="b">B</option>
</select>
```

```ts
state: {
  selected: 'a'
}
```

---

## 🧬 Deep Binding

Use `data-bind` for nested properties or arrays:

```html
<input data-bind="user.address.street" />
<input type="checkbox" data-bind="items[0].checked" />
```

```ts
state: {
  user: { address: { street: '' } },
  items: [{ checked: false }]
}
```

---

## ✅ True/False Value Mapping

```html
<input
  type="checkbox"
  data-model="accepted"
  data-true-value="yes"
  data-false-value="no"
/>
```

```ts
state: {
  accepted: 'yes' | 'no'
}
```

- When checked: `'yes'`
- When unchecked: `'no'`

---

## 🔄 Event Handling & Sync

- Events handled: `input`, `change`, `keydown`, `blur`
- Inputs update state unless focused (to preserve user typing)
- Radios/checkboxes keep `checked` in sync with state
- Multi-checkbox checks if value is in array

---

## ⚙️ Integration Support

- ✅ Plugin system: `onInit`, `onRender`, `onError`
- ✅ SSR: Inputs excluded from SSR; hydration restores state
- ✅ Error boundaries: Use `onError` for fallback rendering
- ✅ Global store & event bus: Full compatibility

---

## 🧪 Full Example

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

```ts
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

## 💡 Tips & Best Practices

- Always use `data-model` (not `name`) for state binding
- Combine modifiers as needed (e.g. `data-model="amount|trim|number"`)
- Multi-checkbox state must be an array
- Stateless components can still bind to inputs
- SSR hydration is opt-in—bindings restore on hydrate

---

## 🛠️ Troubleshooting

- Input not syncing? Check that the state key exists and matches the model
- Radios: must share `name` + `data-model`
- Checkboxes: must have unique `value`
- Debug logs in browser console can help

---

## 📚 References

- See `runtime.ts` for implementation
- Examples reflect current runtime behavior
