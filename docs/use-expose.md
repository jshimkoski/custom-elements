# 🎯 useExpose() — Imperative Component Handles

`useExpose()` lets a component publish a stable public API (methods and properties) onto its host element. Parent components or plain JavaScript code can then call those methods or read those properties directly on the element reference — just like `defineExpose()` in Vue 3 or `useImperativeHandle()` in React.

## 📦 Import

```ts
import { useExpose } from '@jasonshimmy/custom-elements-runtime';
```

## 🔤 Signature

```ts
function useExpose<T extends Record<string, unknown>>(exposed: T): void;
```

| Parameter | Type                          | Description                                               |
| --------- | ----------------------------- | --------------------------------------------------------- |
| `exposed` | `Record<string, unknown>` (T) | An object whose own keys are assigned to the host element |

- Must be called during component render (not in a timeout, event handler, or at module top-level).
- Multiple calls within the same render are merged (later calls override earlier ones for the same key).
- Skipped automatically during discovery renders and SSR — safe to call unconditionally.

## ✏️ Basic Example

```ts
import {
  component,
  html,
  ref,
  useExpose,
} from '@jasonshimmy/custom-elements-runtime';

component('my-counter', () => {
  const count = ref(0);

  useExpose({
    increment() {
      count.value++;
    },
    decrement() {
      count.value--;
    },
    reset() {
      count.value = 0;
    },
    get count() {
      return count.value;
    },
  });

  return html`<div>Count: ${count.value}</div>`;
});
```

Calling component from a parent or from plain JS:

```html
<my-counter id="c"></my-counter>
<script>
  const counter = document.querySelector('#c');
  counter.increment();
  counter.increment();
  console.log(counter.count); // 2
  counter.reset();
</script>
```

## 🧪 Accessing from a Parent Component

```ts
import {
  component,
  html,
  ref,
  useOnConnected,
} from '@jasonshimmy/custom-elements-runtime';

component('parent-component', () => {
  const counterRef = ref<HTMLElement | null>(null);

  useOnConnected(() => {
    // After the child has connected, its exposed API is available
    const el = counterRef.value as HTMLElement & {
      increment: () => void;
      count: number;
    };
    el.increment();
    console.log(el.count); // 1
  });

  return html`<my-counter :ref="${counterRef}"></my-counter>`;
});
```

## 🔒 Exposing Reactive Getters

Use getter syntax to keep exposed properties live-readable:

```ts
component('my-input', () => {
  const value = ref('');

  useExpose({
    // A getter — always returns the current reactive value
    get value() {
      return value.value;
    },

    // A setter — allows external code to drive the component
    set value(v: string) {
      value.value = v;
    },

    clear() {
      value.value = '';
    },
    focus() {
      // Perform a side effect on the shadow DOM
    },
  });

  return html`<input
    :value="${value.value}"
    @input="${(e: Event) => {
      value.value = (e.target as HTMLInputElement).value;
    }}"
  />`;
});
```

## 💡 TypeScript Tips

Augment the element type for full IDE support in consuming code:

```ts
// my-counter.types.ts
interface MyCounterElement extends HTMLElement {
  increment(): void;
  decrement(): void;
  reset(): void;
  readonly count: number;
}

declare global {
  interface HTMLElementTagNameMap {
    'my-counter': MyCounterElement;
  }
}
```

Now `document.querySelector('my-counter')` is fully typed.

## ⚠️ Rules & Gotchas

- **Must be called during render.** Calling `useExpose()` outside of a component render function throws an error.
- **Do not expose reactive objects directly.** Passing a reactive `ref` exposes the outer wrapper (`{ value: ... }`). Use getter syntax if you need live property access.
- **Works with `useProps`.** Exposed methods can read from `useProps()` values just like any other render-time code.
- **Not reflected as attributes.** Exposed keys are JavaScript properties only — they do not become HTML attributes. Use `useProps()` for attribute-based communication.

## 🔗 Related

- [Functional API](./functional-api.md) — full hooks reference
- [useSlots()](./use-slots.md) — inspect slotted content from inside a component
- [Bindings](./bindings.md) — `:ref` binding for template refs
