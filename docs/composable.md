# 🧩 Composables: `createComposable`

`createComposable()` lets you extract and reuse stateful logic — including lifecycle hooks — across multiple components. This is the equivalent of Vue composables or React custom hooks.

---

## API

```typescript
function createComposable<T>(fn: () => T): (ctx?: Record<string, unknown>) => T;
```

- `fn` — A function that may call any hooks (`useOnConnected`, `useOnDisconnected`, `provide`, `inject`, `ref`, `computed`, `watchEffect`, etc.).
- Returns a **composable factory** function. Call it inside a component render function to execute the logic in that component's context.

---

## Basic Example

```typescript
import {
  component,
  html,
  ref,
  useOnConnected,
  useOnDisconnected,
  createComposable,
} from '@jasonshimmy/custom-elements-runtime';

// Define a composable
const useCounter = createComposable(() => {
  const count = ref(0);
  const increment = () => count.value++;
  const decrement = () => count.value--;
  return { count, increment, decrement };
});

// Use it in a component
component('my-counter', () => {
  const { count, increment, decrement } = useCounter();

  return html`
    <button @click="${decrement}">-</button>
    <span>${count.value}</span>
    <button @click="${increment}">+</button>
  `;
});
```

---

## Composables with Lifecycle Hooks

Hooks registered inside a composable are bound to the component that calls the factory:

```typescript
const useWindowSize = createComposable(() => {
  const width = ref(window.innerWidth);
  const height = ref(window.innerHeight);

  const onResize = () => {
    width.value = window.innerWidth;
    height.value = window.innerHeight;
  };

  useOnConnected(() => window.addEventListener('resize', onResize));
  useOnDisconnected(() => window.removeEventListener('resize', onResize));

  return { width, height };
});

component('responsive-panel', () => {
  const { width } = useWindowSize();
  return html`<div class="${width.value < 640 ? 'mobile' : 'desktop'}">
    ...
  </div>`;
});
```

---

## Composables with `provide` and `inject`

```typescript
const useTheme = createComposable(() => {
  const theme = inject<string>('theme', 'light');
  return { theme };
});

component('themed-card', () => {
  const { theme } = useTheme();
  return html`<div class="card card-${theme}">...</div>`;
});
```

---

## Multiple Composables in One Component

You can use as many composables as you like in a single component:

```typescript
component('dashboard', () => {
  const { count } = useCounter();
  const { width } = useWindowSize();
  const { theme } = useTheme();
  const { user } = useCurrentUser();

  return html`
    <p>Theme: ${theme}, width: ${width.value}, count: ${count.value}</p>
    <p>User: ${user.value?.name}</p>
  `;
});
```

---

## Accessing Component Context Inside a Composable

Use `getCurrentComponentContext()` to access the underlying component context from within a composable:

```typescript
import {
  createComposable,
  getCurrentComponentContext,
} from '@jasonshimmy/custom-elements-runtime';

const useSelf = createComposable(() => {
  const ctx = getCurrentComponentContext();
  return { ctx };
});
```

---

## Explicit Context Argument

You can optionally pass a component context explicitly to the factory. This is useful for advanced patterns like testing or when composables are invoked outside the normal render flow:

```typescript
const factory = createComposable(() => ({ value: 42 }));

// Normally called during render
component('my-el', () => {
  const result = factory(); // uses current context automatically
  return html`<div>${result.value}</div>`;
});

// Or with explicit context
factory(existingContext);
```

---

## Rules

- Call the composable factory **inside a component render function**.
- Calling it outside a render context (and without an explicit context argument) throws:
  > `createComposable: no component context available. Pass a context explicitly or call inside a render function.`
- The `fn` passed to `createComposable()` should be a **pure factory** — it should not directly mutate external state outside of reactive refs.
- Composables can call other composables (they nest safely via context save/restore).
