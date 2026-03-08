# 🔗 Bindings Functionality Deep Dive

## 🧬 Overview

Bindings allow you to connect your component's refs, props, and events directly to the DOM. The runtime supports several core binding types that enable reactive, interactive components.

## 🛠️ Supported Bindings

- `:attr` / `:prop` — Attribute/property binding
- `@event` — Event binding
- `:class` — Class binding
- `:style` — Style binding
- `:model` — Two-way binding for form elements (native + custom elements)
- `:ref` — Ref binding for element access
- `:show` — Show/hide elements with display: none
- `:when` — Conditional rendering (adds/removes from DOM)

## 🏷️ Attribute / Property Binding (`:prop` / `:attr`)

Bind refs or props to element attributes or DOM properties. The template syntax `:name` creates a binding; by default the compiler places it on vnode attrs (an HTML attribute). To guarantee a JS property assignment use the `:bind` object form or rely on specific directives (for example `:model` for inputs or the compiler transform for custom elements).

```html
<input :value="name" />
```

- Use `:name` to bind a value to an element property (where supported). This updates automatically when the value changes.
- For custom elements prefer property binding to target element properties (e.g. `:someProp="obj"`). HTML attributes are string-only and should be used for literal text.

Note: the compiler/runtime will promote many bound values into JS properties so they are observed by the element immediately. For native elements a curated promotable list exists (value, checked, disabled, etc.); for custom elements any bound attribute is promoted and kebab-case is converted to camelCase when applied to the instance.

Runtime note: the renderer optimizes updates and will only notify a custom element (call its internal update hooks such as \_applyProps/requestRender) when a prop or attribute actually changes. Re-rendering a parent without prop/attr differences will not retrigger the child's apply/update lifecycle.

### Object form — `:bind` (guaranteed JS property assignment)

If you need to ensure values are set as JavaScript properties (not HTML attributes), use the `:bind` object form. This is useful for numbers, objects, functions, or when targeting custom element properties explicitly.

Example: passing a function via `:bind` sets the function on the element instance as a property (e.g. `(el as any).someCallback = () => {}`), which is not possible when using plain HTML attributes.

```html
<my-el :bind="{ someProp: obj, count: 42, onAction: handleAction }" />
```

- The compiler/runtime will assign the entries on the `props` object so the renderer performs JS property assignment when possible.
- Use this when `:name` (attribute form) would otherwise produce an HTML attribute string instead of setting the element's property.

Tip: prefer `:bind` or compiler transforms when you need deterministic property assignment (for example passing objects, functions, or non-string values to custom elements).

## 🖱️ Event Binding (`@event`)

Bind event listeners to DOM events.

```html
<button @click="${() => count++}">Increment</button>
<button @click="${increment}">Increment</button>
```

- Use `@eventName` to bind a handler function.
- Handler can access and update refs, props, or call component methods.

## 🎨 Class Binding (`:class`)

Bind dynamic classes to your elements using `:class`. This enables conditional, array, and object-based class assignment for flexible styling.

### Usage

```html
<div :class="${{ active: isActive, error: hasError }}"></div>
<div :class="${['foo', isBar ? 'bar' : '']}"></div>
<div :class="${'static-class' + (isActive ? ' active' : '')}"></div>
```

### Best Practices

- Use object syntax for conditional classes.
- Use array syntax for multiple dynamic classes.
- Avoid empty strings or falsy values in arrays/objects.
- Combine with static classes using string concatenation if needed.

### Example

```typescript
component('class-binding-demo', () => {
  const props = useProps({ isActive: true, hasError: false });
  return html`
    <div :class="${{ active: props.isActive, error: props.hasError }}">
      Status
    </div>
    <div :class="${['foo', props.isActive ? 'active' : '']}">Multi</div>
    <div :class="${'static' + (props.isActive ? ' active' : '')}">
      Static + Dynamic
    </div>
  `;
});
```

## 🎨 Style Binding (`:style`)

Bind dynamic styles to your elements using `:style`. This enables conditional, object and string-based style assignment for flexible inline styling.

### Usage

```html
<div
  :style="${{ color: isActive ? 'green' : 'red', fontWeight: 'bold' }}"
></div>
<div :style="${'background: yellow; border: 1px solid #ccc;'}"></div>
```

### Best Practices

- Use object syntax for conditional and multiple styles.
- Use string syntax for static or precomputed style strings.
- Prefer camelCase keys in objects (e.g., `fontWeight`), which are auto-converted to kebab-case.
- Avoid empty strings or falsy values in arrays/objects.

### Example

```typescript
component('style-binding-demo', () => {
  const isActive = ref(true);
  const color = ref('blue');

  return html`
    <div
      :style="${{
        color: color.value,
        fontWeight: isActive.value ? 'bold' : 'normal',
      }}"
    >
      Styled
    </div>
    <div :style="${'background: #eee; padding: 10px;'}">Static + Dynamic</div>
  `;
});
```

### How It Works

- Object syntax: `{ color: 'red', fontWeight: 'bold' }` → `color: red; font-weight: bold;`
- String syntax: `'background: yellow; border: 1px solid #ccc;'` → used as-is.
- All styles are merged and applied as inline styles.

### Tips

- Use conditional logic for dynamic styles.
- Combine with static styles using string concatenation if needed.
- Avoid setting styles that conflict with your CSS classes.

## 🔄 Two-Way Binding (`:model`)

Two-way binding synchronizes form element values with reactive refs. The enhanced `:model` directive supports direct binding to reactive refs in the functional API.

### Enhanced Functional API Usage

```typescript
import { component, html, ref } from '@jasonshimmy/custom-elements-runtime';

component('form-example', () => {
  const username = ref('');
  const email = ref('');
  const isSubscribed = ref(false);
  const selectedFruit = ref('apple');

  return html`
    <form>
      <!-- Text input -->
      <input :model="${username}" placeholder="Username" />
      <p>Username: ${username.value}</p>

      <!-- Email input -->
      <input type="email" :model="${email}" placeholder="Email" />

      <!-- Checkbox -->
      <label>
        <input type="checkbox" :model="${isSubscribed}" />
        Subscribe to newsletter
      </label>

      <!-- Select dropdown -->
      <select :model="${selectedFruit}">
        <option value="apple">Apple</option>
        <option value="banana">Banana</option>
        <option value="orange">Orange</option>
      </select>
    </form>
  `;
});
```

### Modifiers

- `lazy` — Use change event instead of input event
- `trim` — Automatically trim whitespace
- `number` — Convert to number type

### Custom Elements with `:model`

For custom elements, `:model` follows Vue.js conventions. The runtime maps the bound ref's value to the element's `value` property and listens for the corresponding `update:modelValue` or `input` event to write back changes.

## 🪝 Ref Binding (`:ref`)

Use `:ref` to get direct access to DOM elements in the functional API. Bind a reactive ref directly to `:ref` for automatic element assignment:

```typescript
import {
  component,
  html,
  ref,
  useOnConnected,
} from '@jasonshimmy/custom-elements-runtime';

component('ref-example', () => {
  const inputRef = ref<HTMLInputElement | null>(null);
  const buttonRef = ref<HTMLButtonElement | null>(null);

  useOnConnected(() => {
    // Elements are automatically assigned to .value
    inputRef.value?.focus();
    console.log('Button element:', buttonRef.value);
  });

  return html`
    <input :ref="${inputRef}" type="text" placeholder="Type here..." />
    <button :ref="${buttonRef}">Submit</button>
    <p>Input connected: ${inputRef.value ? 'Yes' : 'No'}</p>
  `;
});
```

### Best Practices

- Initialize refs as `null` and use proper TypeScript types (e.g., `HTMLInputElement | null`)
- Access refs in lifecycle hooks (`useOnConnected`) to ensure elements are rendered
- Avoid direct DOM manipulation when possible; prefer declarative updates

## 👁️ Show/Hide Binding (`:show`)

Toggle element visibility using `display: none` based on a boolean condition.

```html
<div :show="${isVisible}">This content can be hidden</div>
<span :show="${count.value > 5}">High count!</span>
```

### How `:show` Works

- Shows element when condition is truthy
- Hides element (`display: none`) when condition is falsy
- Element remains in the DOM (unlike `:when` which removes it)
- Better for performance when toggling frequently since DOM structure is preserved

### Example

```typescript
import { component, html, ref } from '@jasonshimmy/custom-elements-runtime';

component('toggle-content', () => {
  const props = useProps({ showDetails: false });
  const isExpanded = ref(props.showDetails);

  return html`
    <div>
      <button @click="${() => (isExpanded.value = !isExpanded.value)}">
        ${isExpanded.value ? 'Hide' : 'Show'} Details
      </button>
      <div :show="${isExpanded.value}" class="details">
        <p>These details can be toggled!</p>
        <p>The element stays in the DOM but is hidden with display: none.</p>
      </div>
    </div>
  `;
});
```

### When to Use `:show`

- ✅ Frequent toggling (animations, dropdowns, modals)
- ✅ When you want to preserve element state
- ✅ When you need the element to remain in the DOM
- ❌ For conditional rendering based on data (use `:when` instead)
- ❌ When element should be completely removed from DOM

## 🔀 Conditional Rendering (`:when`)

Conditionally render elements using the `:when` directive. Elements are added or removed from the DOM based on the condition.

```html
<div :when="${isLoggedIn}">Welcome back!</div>
<span :when="${count.value > 10}">Count exceeded!</span>
```

### How `:when` Works

- Renders element when condition is truthy
- Completely removes element from DOM when condition is falsy
- Uses anchor comment nodes for efficient re-rendering
- Automatically wraps element in anchor blocks during compilation

### Comparison: `when()` function vs `:when` directive

Both approaches work identically under the hood:

**Function approach**:

```typescript
${when(isVisible, html`<div>Content</div>`)}
```

**Directive approach**:

```html
<div :when="${isVisible}">Content</div>
```

### Advantages of `:when` directive

- ✅ Cleaner, more HTML-like syntax
- ✅ Better co-location of condition with element
- ✅ Works with any HTML element
- ✅ Automatically wraps in anchor blocks

### Example

```typescript
import { component, html, ref } from '@jasonshimmy/custom-elements-runtime';

component('conditional-message', () => {
  const props = useProps({ loggedIn: false });
  const messageCount = ref(0);

  return html`
    <div>
      <div :when="${loggedIn}">
        <h2>Welcome back!</h2>
        <p>You have ${messageCount.value} new messages.</p>
      </div>
      <div :when="${!loggedIn}">
        <h2>Please log in</h2>
        <button @click="${() => emit('login-requested')}">Log In</button>
      </div>
    </div>
  `;
});
```

### When to Use `:when`

- ✅ Conditional rendering based on data or state
- ✅ When element should be completely removed from DOM
- ✅ For simpler syntax than `when()` function
- ✅ Single element conditional rendering
- ❌ For if/else logic with multiple branches (use `match()` instead)
- ❌ For lists (use `each()` instead)

### `:show` vs `:when` Comparison

| Feature                | `:show`                      | `:when`                         |
| ---------------------- | ---------------------------- | ------------------------------- |
| **DOM Presence**       | Always in DOM                | Added/removed from DOM          |
| **Method**             | `display: none`              | Complete removal                |
| **Performance**        | Better for frequent toggling | Better for rarely shown content |
| **State Preservation** | Preserves element state      | Recreates element each time     |
| **Use Case**           | Visibility toggles           | Conditional rendering           |

## 🧩 Example: All Bindings Together

```typescript
import {
  component,
  html,
  ref,
  useOnConnected,
} from '@jasonshimmy/custom-elements-runtime';

component('binding-demo', () => {
  const props = useProps({ initialName: '', initialCount: 0 });
  const name = ref(props.initialName);
  const count = ref(props.initialCount);
  const inputRef = ref<HTMLInputElement | null>(null);

  return html`
    <div>
      <input :model="${name}" :ref="${inputRef}" placeholder="Name" />
      <button @click="${() => count.value++}">
        Clicked ${count.value} times
      </button>
      <div :data-name="${name.value}">Hello, ${name.value}</div>
      <button @click="${() => inputRef.value?.focus()}">
        Focus Name Input
      </button>
    </div>
  `;
});
```

## 🧠 How Bindings Work Internally

- Bindings are parsed by the template compiler and connected to the reactive refs
- Attribute and event bindings update automatically on ref changes
- Two-way bindings use directive handlers that sync DOM values with reactive refs
- All bindings support reactive refs for automatic dependency tracking

## 📝 Tips & Best Practices

- Use `:attr` for dynamic attributes (e.g., `:disabled`, `:class`).
- Use `@event` for all user interactions.
- Use `:model` for forms and user input.
- Use `:ref` to access DOM elements when necessary.
- Prefer simple, declarative bindings for maintainability.
- Avoid side effects in event handlers unless necessary.

## 📚 Learn More

- [Directives Guide](./directives.md)
- [Template Guide](./template.md)

## 🏁 Summary

Bindings make your components interactive and reactive. Use attribute, event, and two-way bindings to connect your refs and props to the DOM, enabling seamless user experiences and maintainable code.
