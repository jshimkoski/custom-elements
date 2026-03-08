# 🏝️ Provide / Inject

`provide()` and `inject()` implement a **dependency injection** pattern for custom elements. A parent component _provides_ a value under a key; any descendant component anywhere in the shadow DOM tree can _inject_ it.

This pattern avoids deep prop-drilling while remaining explicit about data flow.

---

## API

### `provide(key, value)`

Stores a value on the current component so descendants can read it.

```typescript
function provide<T>(key: string | symbol, value: T): void;
```

**Must be called during component render.**

### `inject(key, defaultValue?)`

Traverses the shadow DOM ancestor chain to find the nearest `provide()` call with the matching key.

```typescript
function inject<T>(key: string | symbol, defaultValue?: T): T | undefined;
```

**Must be called during component render.**

Returns `defaultValue` (or `undefined`) if no provider is found.

---

## Basic Example

```typescript
import {
  component,
  html,
  provide,
  inject,
} from '@jasonshimmy/custom-elements-runtime';

// Provider
component('theme-provider', () => {
  provide('theme', 'dark');
  return html`<slot></slot>`;
});

// Consumer — anywhere in the provider's shadow DOM subtree
component('themed-button', () => {
  const theme = inject<string>('theme', 'light');
  return html`<button class="btn btn-${theme}">Click</button>`;
});
```

---

## Symbol Keys

Using `Symbol.for()` as keys avoids accidental key collisions in large component trees:

```typescript
// tokens.ts
export const THEME_TOKEN = Symbol.for('my-app/theme');

// provider
provide(THEME_TOKEN, { primary: '#3b82f6', mode: 'dark' });

// consumer
const theme = inject<Theme>(THEME_TOKEN);
```

---

## Providing Objects and Complex Values

Any value — primitives, objects, functions, `ref` instances — can be provided:

```typescript
component('form-provider', () => {
  const errors = ref<Record<string, string>>({});

  provide('form-context', {
    errors,
    setError: (field: string, msg: string) => {
      errors.value = { ...errors.value, [field]: msg };
    },
  });

  return html`<form><slot></slot></form>`;
});

component('form-field', () => {
  const form = inject<FormContext>('form-context');
  return html`
    <div class="${form?.errors.value.email ? 'error' : ''}">
      <input name="email" />
    </div>
  `;
});
```

---

## Default Values

`inject()` accepts an optional second argument as a fallback:

```typescript
const locale = inject<string>('locale', 'en-US');
```

If no ancestor called `provide('locale', ...)`, `locale` will be `'en-US'`.

---

## Error Cases

Both `provide()` and `inject()` **throw** if called outside a component render function:

```typescript
provide('key', 'value'); // ❌ Error: provide must be called during component render
inject('key'); // ❌ Error: inject must be called during component render
```

---

## How Traversal Works

`inject()` starts from the consuming component's `_host` element and walks **upward** through the DOM, crossing `ShadowRoot` boundaries:

1. The consumer's host element walks its light-DOM parent chain.
2. When it crosses a `ShadowRoot`, it checks the shadow host's component context for a matching key in the `provides` Map.
3. It continues upward through nested shadow roots until the document root.

This means `inject()` only finds values from **true DOM ancestors** — not siblings or cousins — regardless of how deeply nested the components are.

---

## Tips

- Keep keys in a shared constants module to avoid typos.
- Prefer `Symbol.for()` over strings for library-level APIs.
- Providing a reactive `ref` lets consumers react to changes without needing to re-provide.
- `provide()` is called on every render; the latest provided value overwrites the previous one.
