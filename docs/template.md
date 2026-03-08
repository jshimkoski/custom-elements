# 🧩 Template Guide

> How to use the `html` template function for expressive, reactive UIs

## 📖 Overview

The `html` template function lets you write declarative, type-safe templates for your components. It supports directives, bindings, and dynamic content with full reactivity.

## 🚀 Importing

```ts
import { html, useEmit } from '@jasonshimmy/custom-elements-runtime';
```

## 🏗️ Basic Usage

Write templates using tagged template literals:

```ts
component('my-component', () => {
  const props = useProps({ name: 'World' });
  return html`<h1>Hello, ${props.name}!</h1>`;
});
```

## 🧩 Embedding Directives

Use directives like `when`, `each`, and `match` inside your template:

```ts
html`
  ${when(isVisible, html`<div>Visible!</div>`)}
  ${each(items, (item) => html`<li>${item}</li>`)}
  ${match()
    .when(a, html`A`)
    .otherwise(html`None`)
    .done()}
`;
```

## 🏷️ Attribute & Event Binding

Bind attributes and events directly in your template:

```ts
component('interactive-component', () => {
  const props = useProps({ count: 0, isLoading: false });
  const emit = useEmit();

  const increment = () => {
    emit('count-changed', props.count + 1);
  };

  return html`
    <input :value="${count}" :disabled="${isLoading}" />
    <button @click="${increment}">Increment</button>
  `;
});
```

Note: event handlers should be passed as function references (e.g. `@click="${increment}"`) — don't call the function in the template (for example `@click="${increment()}"`), as that will execute during render and likely cause incorrect behavior or infinite render loops. The compiler/runtime will warn when it detects common mistakes.

## 🔗 Two-way Binding

Sync input values with state using `:model`:

```ts
import { ref } from '@jasonshimmy/custom-elements-runtime';

component('form-component', () => {
  const inputValue = ref('');

  return html`
    <input :model="${inputValue}" type="text" />
    <p>Current value: ${inputValue.value}</p>
  `;
});
```

Notes on `:model` behavior:

- Works with reactive refs (created by `ref()` or `computed()`) and with legacy string-path state bindings.
- Supports modifiers: `:model.lazy` (use `change` instead of `input`), `:model.trim` (trim string input), and `:model.number` (coerce to Number when possible).
- For custom elements, `:model` is compiled to set the `modelValue` prop by default and to listen for `update:<prop>` events emitted by the child. The runtime emits both kebab-case and camel-case update events (for example `update:model-value` and `update:modelValue`) for compatibility.
- You can bind a nested property using `:model:propName` (e.g. `:model:name`) which will update only that nested property on object refs or nested paths.

## 🧬 Dynamic Content

Templates can include any dynamic value, including computed properties and store values:

```ts
component('dynamic-component', () => {
  const props = useProps({ multiplier: 2 });
  const baseValue = ref(5);
  const doubled = computed(() => baseValue.value * props.multiplier);

  return html`
    <span>Base: ${baseValue.value}</span>
    <span>Doubled: ${doubled.value}</span>
    <span>Theme: ${store.getState().theme}</span>
  `;
});
```

## 🧩 Nesting & Composition

Templates can be nested and composed for complex UIs:

```ts
html`
  <section>${each(users, (user) => html` <div>${user.name}</div> `)}</section>
`;
```

## 💡 Tips

- Prefer returning a single root node from your render function for simpler VDOM updates; multi-root templates are supported when necessary.
- Use directives and bindings for maximum reactivity.
- TypeScript infers types for template variables.
- Works seamlessly with state, props, computed, store, and event bus.

For more, see the [Bindings Reference](./bindings.md) and [Directives Reference](./directives.md).

## 🧾 Raw HTML and Entities

The template runtime escapes interpolated values by default to prevent XSS. Two helpers are provided when you need finer control:

- `decodeEntities(str)` — decodes common HTML entities (named & numeric). In browser environments this uses a small DOM-based decoder; in SSR environments it falls back to a tiny entity map and can load a full `entities.json` map via `registerEntityMap()` for accurate decoding.
- `unsafeHTML(htmlString)` — opt-in wrapper to insert raw HTML. Use only with trusted or sanitized HTML. The runtime recognizes the wrapper object and will insert its markup directly into the VDOM.

Implementation notes:

- `decodeEntities` will emit a dev warning in SSR when only a small fallback map is used; register the full entity map on the server with `registerEntityMap(entities)` to enable full decoding.
- `unsafeHTML` returns an object with `__unsafeHTML` and `__rawHTML` properties; the template compiler/renderer checks for this shape via `isUnsafeHTML()` before inserting raw nodes.
