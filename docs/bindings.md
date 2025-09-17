# 🔗 Bindings Functionality Deep Dive

## 🧬 Overview

Bindings allow you to connect your component's state, props, and events directly to the DOM. The runtime supports several core binding types that enable reactive, interactive components.

## 🛠️ Supported Bindings

- `:attr` / `:prop` — Attribute/property binding
- `@event` — Event binding
- `:class` — Class binding
- `:style` — Style binding
- `:model` — Two-way binding for form elements (native + custom elements)
- `:ref` — Ref binding for element access

## 🏷️ Attribute / Property Binding (`:prop` / `:attr`)

Bind state or props to element attributes or DOM properties. The template syntax `:name` creates a binding; by default the compiler places it on vnode attrs (an HTML attribute). To guarantee a JS property assignment use the `:bind` object form or rely on specific directives (for example `:model` for inputs or the compiler transform for custom elements).

```html
<input :value="name" />
```

- Use `:name` to bind a value to an element property (where supported). This updates automatically when the value changes.
- For custom elements prefer property binding to target element properties (e.g. `:someProp="obj"`). HTML attributes are string-only and should be used for literal text.

Note: the compiler/runtime will promote many bound values into JS properties so they are observed by the element immediately. For native elements a curated promotable list exists (value, checked, disabled, etc.); for custom elements any bound attribute is promoted and kebab-case is converted to camelCase when applied to the instance.

Runtime note: the renderer optimizes updates and will only notify a custom element (call its internal update hooks such as _applyProps/requestRender) when a prop or attribute actually changes. Re-rendering a parent without prop/attr differences will not retrigger the child's apply/update lifecycle.

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
- Handler can access and update state, props, or call component methods.

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
component('class-binding-demo', ({ isActive = true, hasError = false }) => {
  return html`
    <div :class="${{ active: isActive, error: hasError }}">Status</div>
    <div :class="${['foo', isActive ? 'active' : '', hasError && 'error']}">Multi</div>
    <div :class="${'static' + (isActive ? ' active' : '')}">Static + Dynamic</div>
  `;
});
```

## 🎨 Style Binding (`:style`)

Bind dynamic styles to your elements using `:style`. This enables conditional, object and string-based style assignment for flexible inline styling.

### Usage

```html
<div :style="${{ color: isActive ? 'green' : 'red', fontWeight: 'bold' }}"></div>
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
    <div :style="${{ color: color.value, fontWeight: isActive.value ? 'bold' : 'normal' }}">Styled</div>
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

Two-way binding synchronizes form element values with reactive state. The enhanced `:model` directive supports direct binding to reactive state objects in the functional API.

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

For custom elements, `:model` follows Vue.js conventions. For detailed information about custom element `:model` binding, see the [Enhanced Model Binding](./enhanced-model-binding.md) documentation.

## 🪝 Ref Binding (`:ref`)

Use `:ref` to get direct access to DOM elements in the functional API. Bind a reactive state object directly to `:ref` for automatic element assignment:

```typescript
import { component, html, ref, useOnConnected } from '@jasonshimmy/custom-elements-runtime';

component('ref-example', () => {
  const inputRef = state<HTMLInputElement | null>(null);
  const buttonRef = state<HTMLButtonElement | null>(null);
  
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

- Initialize ref state as `null` and use proper TypeScript types (e.g., `HTMLInputElement | null`)
- Access refs in lifecycle hooks (`useOnConnected`) to ensure elements are rendered
- Avoid direct DOM manipulation when possible; prefer declarative updates


## 🧩 Example: All Bindings Together

```typescript
import { component, html, ref, useOnConnected } from '@jasonshimmy/custom-elements-runtime';

component('binding-demo', ({ 
  initialName = '',
  initialCount = 0 
}: {
  initialName?: string;
  initialCount?: number;
}) => {
  const name = ref(initialName);
  const count = ref(initialCount);
  const inputRef = state<HTMLInputElement | null>(null);
  
  return html`
    <div>
      <input :model="${name}" :ref="${inputRef}" placeholder="Name" />
      <button @click="${() => count.value++}">Clicked ${count.value} times</button>
      <div :data-name="${name.value}">Hello, ${name.value}</div>
      <button @click="${() => inputRef.value?.focus()}">Focus Name Input</button>
    </div>
  `;
});
```

## 🧠 How Bindings Work Internally

- Bindings are parsed by the template compiler and connected to the reactive state
- Attribute and event bindings update automatically on state changes
- Two-way bindings use directive handlers that sync DOM values with reactive state
- All bindings support reactive state objects for automatic dependency tracking

## 📝 Tips & Best Practices

- Use `:attr` for dynamic attributes (e.g., `:disabled`, `:class`).
- Use `@event` for all user interactions.
- Use `:model` for forms and user input.
- Use `:ref` to access DOM elements when necessary.
- Prefer simple, declarative bindings for maintainability.
- Avoid side effects in event handlers unless necessary.

## 📚 Learn More

- [Directives Guide](./directives.md)
- [Enhanced Model Binding](./enhanced-model-binding.md)
- [Template Guide](./template.md)

## 🏁 Summary

Bindings make your components interactive and reactive. Use attribute, event, and two-way bindings to connect your state and props to the DOM, enabling seamless user experiences and maintainable code.
