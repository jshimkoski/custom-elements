# ⚡ Reactive API: `ref`, `watch`, `computed`, `watchEffect`, `nextTick`, and `isReactiveState`

This document covers the core reactive utilities provided by the runtime:

- [`ref()`](#ref) — create a reactive state container
- [`watch()`](#watch) — explicit reactive watcher with old/new value callbacks
- [`computed()`](#computed) — memoized derived state
- [`watchEffect()`](#watcheffect) — automatic side-effect tracking
- [`nextTick()`](#nexttick) — defer work until after DOM updates
- [`isReactiveState()`](#isreactivestate) — type-guard to detect `ref()` objects

---

## `ref()`

Creates a reactive state container. Reading or writing `.value` inside a component render function, `computed()`, or `watchEffect()` automatically tracks and triggers reactive updates.

### Signature

```typescript
// No argument → ReactiveState<null>
function ref(): ReactiveState<null>;

// With initial value
function ref<T>(initialValue: T): ReactiveState<T>;
```

The returned `ReactiveState<T>` object has a single `.value` property with both a getter and a setter. Writing to `.value` schedules a DOM update for every component that read `.value` during its last render.

### Usage

```typescript
import { component, html, ref } from '@jasonshimmy/custom-elements-runtime';

component('click-counter', () => {
  const count = ref(0);

  return html`
    <button @click="${() => count.value++}">
      Clicked ${count.value} times
    </button>
  `;
});
```

**Nullable ref (no argument)**

```typescript
const user = ref<{ name: string } | null>(); // ReactiveState<null>
user.value = { name: 'Alice' }; // later assign a value
```

### Notes

- `ref` works with any value: primitives, objects, arrays, or `null`.
- For objects and arrays, `ref` wraps the value in a **deep** reactive Proxy — nested objects are wrapped recursively — so mutations at any depth (e.g. `user.value.address.city = 'LA'`) also trigger reactive updates.
- **Do not destructure** `ref.value` into a plain variable — the plain variable won't be reactive. Instead, always read `.value` inside the render function or a `computed`.
- `ref` called outside a component's render return is still reactive and can be shared across components (like a micro-store).

---

## `watch()`

Registers a watcher that runs a callback whenever a reactive source changes. Unlike `watchEffect()`, `watch()` tracks dependencies **explicitly** and provides both the new and previous values to the callback.

### Signature

```typescript
interface WatchOptions {
  immediate?: boolean;
  /** When true, track nested object/array mutations (deep-cloned snapshots provided). */
  deep?: boolean;
}

// Watch a ReactiveState (ref)
function watch<T>(
  source: ReactiveState<T>,
  callback: (newValue: T, oldValue?: T) => void,
  options?: WatchOptions,
): () => void;

// Watch a getter function
function watch<T>(
  source: () => T,
  callback: (newValue: T, oldValue?: T) => void,
  options?: WatchOptions,
): () => void;
```

Returns a **stop function** — call it to cancel the watcher.

### Usage

```typescript
import {
  component,
  html,
  ref,
  watch,
  useOnDisconnected,
} from '@jasonshimmy/custom-elements-runtime';

component('search-box', () => {
  const query = ref('');

  // Watch a ref directly
  const stop = watch(query, (newVal, oldVal) => {
    console.log(`Query changed from "${oldVal}" to "${newVal}"`);
  });

  useOnDisconnected(stop);

  // Watch a getter function
  const stop2 = watch(
    () => query.value.trim().toLowerCase(),
    (normalized) => {
      console.log('Normalized query:', normalized);
    },
    { immediate: true }, // run callback immediately with current value
  );

  useOnDisconnected(stop2);

  return html`
    <input
      :value="${query.value}"
      @input="${(e: Event) =>
        (query.value = (e.target as HTMLInputElement).value)}"
    />
  `;
});
```

### Options

| Option      | Type      | Default | Description                                                                                                                                                                   |
| ----------- | --------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `immediate` | `boolean` | `false` | When `true`, invoke the callback immediately with the current value (old value is `undefined`).                                                                               |
| `deep`      | `boolean` | `false` | When `true`, track nested object/array mutations. The callback receives deep-cloned before/after snapshots. Fires on every nested mutation regardless of structural equality. |

### Deep Watching

Use `{ deep: true }` to observe mutations to properties nested inside a reactive object or array. The callback receives independent deep-cloned snapshots so you can safely compare old and new state.

```typescript
import { ref, watch } from '@jasonshimmy/custom-elements-runtime';

const user = ref({ name: 'Alice', address: { city: 'NYC' } });

const stop = watch(
  user,
  (newVal, oldVal) => {
    console.log('Before:', oldVal); // { name: 'Alice', address: { city: 'NYC' } }
    console.log('After: ', newVal); // { name: 'Alice', address: { city: 'LA'  } }
  },
  { deep: true },
);

user.value.address.city = 'LA'; // → callback fires

stop(); // cancel deep watcher
```

Combine `deep` and `immediate`:

```typescript
watch(
  user,
  (newVal, oldVal) => {
    // oldVal is undefined on the first (immediate) call
    console.log('user state:', newVal);
  },
  { deep: true, immediate: true },
);
```

> **Note:** Because deep watching bypasses reference equality the callback fires on every nested mutation even if the resulting plain-object value is structurally identical to the previous snapshot. When you only need to detect top-level `.value` reassignment, use a shallow watcher (the default).

### Comparison with `watchEffect()`

|                         | `watch()`         | `watchEffect()`      |
| ----------------------- | ----------------- | -------------------- |
| Tracks dependencies     | Explicit          | Automatic            |
| Runs immediately        | No (configurable) | Yes                  |
| Receives old+new values | Yes               | No                   |
| Use case                | Targeted tracking | General side effects |

---

## `computed()`

Creates a lazily-evaluated, memoized derived value. The computation function is cached and re-evaluated only when its tracked reactive dependencies change.

### Signature

```typescript
function computed<T>(fn: () => T): { readonly value: T };
```

### Usage

```typescript
import {
  component,
  html,
  ref,
  computed,
} from '@jasonshimmy/custom-elements-runtime';

component('price-display', () => {
  const price = ref(100);
  const tax = ref(0.15);

  const total = computed(() => price.value * (1 + tax.value));

  return html`<p>Total: $${total.value.toFixed(2)}</p>`;
});
```

### How It Works

1. **Initial computation** — `fn()` runs immediately when `computed()` is called to establish reactive dependencies and seed the cache.
2. **Invalidation** — When any tracked dependency changes, the cached value is marked stale (`isDirty = true`).
3. **Re-computation** — On the next `.value` access when stale, `fn()` runs again to update the cache.
4. **Dependency propagation** — On every `.value` access `fn()` is also called in the _calling_ context so the consumer (a component or outer `computed`) directly tracks the same dependencies. This preserves synchronous notification semantics.

### Chaining

`computed()` values can be chained:

```typescript
const base = ref(3);
const doubled = computed(() => base.value * 2);
const quadrupled = computed(() => doubled.value * 2);

quadrupled.value; // 12
base.value = 5;
quadrupled.value; // 20
```

### Notes

- `computed()` must **not** produce side effects — use `watchEffect()` for that.
- The function is called in the calling context on every `.value` access for transparent dependency tracking, so avoid expensive operations inside a `computed()`.

---

## `watchEffect()`

Runs a side-effect function immediately and re-runs it automatically whenever any reactive state read inside it changes.

### Signature

```typescript
function watchEffect(fn: () => void): () => void;
```

Returns a **stop function** — call it to cancel the effect.

### Usage

```typescript
import {
  component,
  html,
  ref,
  watchEffect,
  useOnDisconnected,
} from '@jasonshimmy/custom-elements-runtime';

component('document-title', () => {
  const title = ref('Home');

  // Re-runs whenever `title.value` changes
  const stop = watchEffect(() => {
    document.title = title.value;
  });

  // Stop the effect when the component is removed
  useOnDisconnected(stop);

  return html`
    <input
      :value="${title.value}"
      @input="${(e: Event) =>
        (title.value = (e.target as HTMLInputElement).value)}"
    />
  `;
});
```

### Behaviour

- Runs **immediately** on creation — no need to call it explicitly.
- Automatically tracks every reactive `ref` or `ReactiveState` read during execution.
- Re-runs synchronously whenever any tracked dependency updates.
- Calling the returned stop function is idempotent (safe to call multiple times).

---

## `nextTick()`

Returns a `Promise` that resolves after all pending reactive DOM updates have been flushed. Use it to read updated DOM state after a reactive change.

### Signature

```typescript
function nextTick(): Promise<void>;
```

### Usage

```typescript
import {
  component,
  html,
  ref,
  nextTick,
} from '@jasonshimmy/custom-elements-runtime';

component('counter-el', () => {
  const count = ref(0);

  const increment = async () => {
    count.value++;
    await nextTick();
    // DOM is now up to date
    console.log('DOM updated');
  };

  return html` <button @click="${increment}">${count.value}</button> `;
});
```

### In Tests

`nextTick()` is especially useful in Vitest / jsdom tests:

```typescript
import { nextTick } from '@jasonshimmy/custom-elements-runtime';

it('DOM reflects reactive change', async () => {
  count.value = 42;
  await nextTick();
  expect(el.shadowRoot?.querySelector('span')?.textContent).toBe('42');
});
```

### Notes

- If no DOM updates are pending, `nextTick()` still resolves (via `queueMicrotask`).
- Multiple `await nextTick()` calls in sequence are safe.

---

## `isReactiveState()`

A type-guard that returns `true` when passed a `ReactiveState` object (i.e. a value created by `ref()`). Useful when building composables or utility functions that accept either a plain value or a reactive state.

### Signature

```typescript
function isReactiveState(v: unknown): v is ReactiveState<unknown>;
```

### Usage

```typescript
import { ref, isReactiveState } from '@jasonshimmy/custom-elements-runtime';

const count = ref(0);

isReactiveState(count); // true
isReactiveState(0); // false
isReactiveState('hello'); // false
isReactiveState(null); // false
```

**Building a composable that accepts both forms:**

```typescript
import {
  ref,
  isReactiveState,
  ReactiveState,
} from '@jasonshimmy/custom-elements-runtime';

function useDoubled(
  input: number | ReactiveState<number>,
): ReactiveState<number> {
  const source = isReactiveState(input) ? input : ref(input);
  return ref(source.value * 2);
}
```

### Notes

- This function is a TypeScript type-guard — the compiler narrows the type to `ReactiveState<unknown>` inside the `if` branch.
- Detection uses a global symbol (`Symbol.for('@cer/ReactiveState')`) that is resilient across multiple bundle copies, minifiers, and different JS realms.

---

## Watcher Lifecycle and Manual Cleanup

Watchers and effects created with `watch()` and `watchEffect()` return **stop functions**. You are responsible for calling the stop function when the watcher is no longer needed, to prevent memory leaks and stale updates.

### Inside Components

Watchers created directly in the render function body are **automatically cleaned up** when the component disconnects. The reactive system registers them under the component's ID during render, and `cleanup()` cascades to release them on disconnect:

```typescript
component('search-box', () => {
  const query = ref('');

  // No need to store the stop function — this watcher is automatically
  // released when the component disconnects.
  watch(query, (newVal) => {
    console.log('Query:', newVal);
  });

  return html`<input :value="${query.value}" @input="${(e: Event) =>
    (query.value = (e.target as HTMLInputElement).value)}" />`;
});
```

If you create a watcher inside a lifecycle hook (`useOnConnected`, `useOnDisconnected`) or an event handler — rather than directly in the render function body — it is not registered under the component and must be stopped manually:

```typescript
component('search-box', () => {
  const query = ref('');

  useOnConnected(() => {
    // Created inside useOnConnected, not during render — must stop manually.
    const stop = watch(query, (newVal) => {
      console.log('Query:', newVal);
    });
    useOnDisconnected(stop);
  });

  return html`<input :value="${query.value}" @input="${(e: Event) =>
    (query.value = (e.target as HTMLInputElement).value)}" />`;
});
```

### Outside Components (Module-Level Watchers)

When you create watchers at module scope (e.g., for a shared store), call the stop function explicitly when the store is no longer needed, or use `reactiveSystem.cleanup(componentId)` to remove all reactive subscriptions for a given component ID:

```typescript
import { ref, watch } from '@jasonshimmy/custom-elements-runtime';

// Module-level reactive state shared across components
const theme = ref<'light' | 'dark'>('light');

// Store the stop function and call it to cancel
const stopThemeWatcher = watch(theme, (newTheme) => {
  document.documentElement.setAttribute('data-theme', newTheme);
}, { immediate: true });

// Later, when tearing down:
stopThemeWatcher();
```

### `reactiveSystem.cleanup(componentId)`

The `reactiveSystem` object exposes a `cleanup(componentId: string)` method that removes all reactive dependency records for the given component. This is called automatically by the runtime on `disconnectedCallback` for every component rendered via `component()`. You only need to call it manually if you are building low-level integrations outside the standard component lifecycle.

**Watcher cascade:** `cleanup()` also recursively cleans up all `watch()`, `watchEffect()`, and `computed()` watchers that were registered during the component's last render. This means that watchers created during render are automatically released when the component disconnects — you do **not** need to call `stop()` or `useOnDisconnected(stop)` for watchers created inside the component's render function body.

```typescript
component('auto-cleanup-demo', () => {
  const count = ref(0);

  // This watchEffect is registered under the component.
  // It is automatically stopped when the component disconnects — no manual cleanup needed.
  watchEffect(() => {
    document.title = `Count: ${count.value}`;
  });

  return html`<button @click="${() => count.value++}">Increment</button>`;
});
```

Watchers created **outside** a component render context (e.g., inside `useOnConnected`, inside event handlers, or at module scope) are **not** tracked by the component's registry and must still be stopped manually:

```typescript
component('manual-cleanup-demo', () => {
  const count = ref(0);

  useOnConnected(() => {
    // This watch is created outside the render function body — must be stopped manually.
    const stop = watch(count, (n) => console.log('count changed:', n));
    useOnDisconnected(stop);
  });

  return html`<button @click="${() => count.value++}">Increment</button>`;
});
```

---

## `useOnConnected` Fires Once Per Instance Lifetime

> **Important:** `useOnConnected` fires **exactly once** per component instance — on the first DOM insertion. It does **not** re-fire if a component is removed from the DOM and re-inserted. This differs from the native Web Component `connectedCallback`, which fires on every insertion.

This means:

- Watchers and subscriptions set up inside `useOnConnected` are cancelled by `useOnDisconnected` when the component leaves the DOM.
- If the component is later re-inserted, those subscriptions are **not** automatically re-established, because `useOnConnected` won't run again.

### Pattern: Store Subscriptions That Survive Reconnect

When subscribing to a `createStore()` store, set up the subscription inside the render function body (not inside `useOnConnected`) and clean it up in `useOnDisconnected`. Because the render function re-runs on each attribute change and re-render, subscriptions set up this way will be re-registered when the component reconnects.

The simplest pattern is to subscribe unconditionally in the render function body and always clean up:

```typescript
import { createStore } from '@jasonshimmy/custom-elements-runtime/store';
import { component, html, ref, useOnDisconnected } from '@jasonshimmy/custom-elements-runtime';

const counterStore = createStore({ count: 0 });

component('store-consumer', () => {
  const count = ref(counterStore.getState().count);

  // Subscribe here — outside useOnConnected — so re-renders (including
  // those triggered by reconnection) always have an active subscription.
  const unsubscribe = counterStore.subscribe((state) => {
    count.value = state.count;
  });

  // Always clean up on disconnect.
  useOnDisconnected(unsubscribe);

  return html`<p>Count: ${count.value}</p>`;
});
```

> **Note:** `store.subscribe()` calls the listener immediately with the current state. This is by design — it ensures the component always starts with up-to-date data without needing a separate initial read.
