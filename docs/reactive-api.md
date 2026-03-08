# ⚡ Reactive API: `watch`, `computed`, `watchEffect`, and `nextTick`

This document covers the core reactive utilities provided by the runtime:

- [`watch()`](#watch) — explicit reactive watcher with old/new value callbacks
- [`computed()`](#computed) — memoized derived state
- [`watchEffect()`](#watcheffect) — automatic side-effect tracking
- [`nextTick()`](#nexttick) — defer work until after DOM updates

---

## `watch()`

Registers a watcher that runs a callback whenever a reactive source changes. Unlike `watchEffect()`, `watch()` tracks dependencies **explicitly** and provides both the new and previous values to the callback.

### Signature

```typescript
// Watch a ReactiveState (ref)
function watch<T>(
  source: ReactiveState<T>,
  callback: (newValue: T, oldValue?: T) => void,
  options?: { immediate?: boolean },
): () => void;

// Watch a getter function
function watch<T>(
  source: () => T,
  callback: (newValue: T, oldValue?: T) => void,
  options?: { immediate?: boolean },
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
      .value="${query.value}"
      @input="${(e: Event) =>
        (query.value = (e.target as HTMLInputElement).value)}"
    />
  `;
});
```

### Options

| Option      | Type      | Default | Description                                                                                     |
| ----------- | --------- | ------- | ----------------------------------------------------------------------------------------------- |
| `immediate` | `boolean` | `false` | When `true`, invoke the callback immediately with the current value (old value is `undefined`). |

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
      .value="${title.value}"
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
