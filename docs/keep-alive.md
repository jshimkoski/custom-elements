# ♻️ Keep-Alive: `registerKeepAlive` and `<cer-keep-alive>`

`registerKeepAlive()` registers the `<cer-keep-alive>` custom element. Wrap child components inside it to **preserve their JavaScript state** when they are temporarily removed from the DOM.

By default, custom elements lose all JavaScript state (reactive refs, timers, DOM refs) when `disconnectedCallback` fires. `<cer-keep-alive>` intercepts this lifecycle through `slotchange` events and keeps detached elements alive in memory, re-attaching the original instance when the same tag is re-inserted.

---

## Setup

Call `registerKeepAlive()` once at application boot:

```typescript
import { registerKeepAlive } from '@jasonshimmy/custom-elements-runtime';

registerKeepAlive();
```

Alternatively, `registerBuiltinComponents()` registers `<cer-keep-alive>` alongside `<cer-suspense>` and `<cer-error-boundary>` in a single call:

```typescript
import { registerBuiltinComponents } from '@jasonshimmy/custom-elements-runtime';

registerBuiltinComponents();
```

Both approaches are safe to call multiple times — subsequent calls are no-ops.

---

## Basic Usage

Wrap any custom element with `<cer-keep-alive>`:

```html
<cer-keep-alive>
  <my-counter></my-counter>
</cer-keep-alive>
```

Or in a component render function:

```typescript
import {
  component,
  html,
  registerKeepAlive,
} from '@jasonshimmy/custom-elements-runtime';

registerKeepAlive();

component('app-root', () => {
  return html`
    <cer-keep-alive>
      <expensive-chart></expensive-chart>
    </cer-keep-alive>
  `;
});
```

---

## Tab-Switching Pattern

A common use case is preserving tab content state:

```typescript
component('tab-panel', () => {
  const active = ref('tab-a');

  return html`
    <nav>
      <button @click="${() => (active.value = 'tab-a')}">Tab A</button>
      <button @click="${() => (active.value = 'tab-b')}">Tab B</button>
    </nav>

    <cer-keep-alive>
      ${when(active.value === 'tab-a', html`<tab-content-a></tab-content-a>`)}
      ${when(active.value === 'tab-b', html`<tab-content-b></tab-content-b>`)}
    </cer-keep-alive>
  `;
});
```

When switching tabs, the previous tab's component is cached rather than destroyed — its counter state, scroll position, and reactive state are all preserved.

---

## Cache Key Logic

Components are cached by **tag name + `id` attribute** (if present):

| Element                 | Cache key        |
| ----------------------- | ---------------- |
| `<my-card>`             | `my-card`        |
| `<my-card id="card-1">` | `my-card:card-1` |
| `<my-card id="card-2">` | `my-card:card-2` |

This allows multiple instances of the same component to be cached independently when they have unique `id` attributes.

---

## How It Works

1. `<cer-keep-alive>` attaches a `slotchange` listener to its default slot.
2. When a slotted child leaves the DOM (e.g. during a parent re-render), the element is moved into an internal cache Map keyed by tag name (and `id`).
3. When a new element with the same tag is slotted in, `<cer-keep-alive>` replaces it with the cached instance — restoring all JavaScript state.

---

## Limitations

- Only the **first element per cache key** is stored. If you need multiple instances of the same component in the same `<cer-keep-alive>`, give each a unique `id`.
- The cache lives for the lifetime of the `<cer-keep-alive>` element. It is **not** automatically cleared when the keep-alive element is removed from the DOM — call `clearCache()` to evict entries manually.
- Only components registered as custom elements (i.e. `component()` calls) benefit from keep-alive caching. Plain DOM elements are not cached.

---

## Clearing the Cache

The cache is **not** automatically cleared when `<cer-keep-alive>` is disconnected from the document (only the `slotchange` listener is removed). Use the `clearCache()` method to evict entries manually:

```ts
import { registerKeepAlive } from '@jasonshimmy/custom-elements-runtime';

registerKeepAlive();

const keepAliveEl = document.querySelector('cer-keep-alive') as any;

// Evict a specific cache entry by key (tag name, optionally with id)
keepAliveEl.clearCache('my-component');
keepAliveEl.clearCache('my-component:sidebar');

// Evict all cached entries
keepAliveEl.clearCache();
```

---

## TypeScript

`registerKeepAlive()` has no parameters and returns `void`:

```typescript
import { registerKeepAlive } from '@jasonshimmy/custom-elements-runtime';
registerKeepAlive(); // → void
```
