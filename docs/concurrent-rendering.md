# ⚡ Concurrent Rendering & Update Priority

The runtime's update scheduler supports explicit **priority levels** for component updates. This gives you fine-grained control over when work happens — similar to React's concurrent rendering model, but without a virtual DOM or fiber tree.

## 📦 Import

```ts
import {
  scheduleWithPriority,
  flushDOMUpdates,
  nextTick,
} from '@jasonshimmy/custom-elements-runtime';
import type { UpdatePriority } from '@jasonshimmy/custom-elements-runtime';
```

---

## 🔤 `scheduleWithPriority(update, priority?, componentId?)`

```ts
function scheduleWithPriority(
  update: () => void,
  priority?: UpdatePriority, // default: 'normal'
  componentId?: string,
): void;
```

| Parameter     | Type             | Default    | Description                                                                 |
| ------------- | ---------------- | ---------- | --------------------------------------------------------------------------- |
| `update`      | `() => void`     | —          | The function to run                                                         |
| `priority`    | `UpdatePriority` | `'normal'` | Controls when and how the update is executed (see table below)              |
| `componentId` | `string`         | —          | Optional deduplication key. Multiple calls with the same id fire only once. |

### Priority Levels

| Priority      | Execution Timing                                                          | Use Case                                          |
| ------------- | ------------------------------------------------------------------------- | ------------------------------------------------- |
| `'immediate'` | Synchronous — runs before `scheduleWithPriority` returns                  | Critical UI corrections, focus management         |
| `'normal'`    | Microtask-batched — runs after the current call stack, before next paint  | Regular state updates (default behaviour)         |
| `'idle'`      | Browser idle time via `requestIdleCallback` (or `setTimeout(0)` fallback) | Analytics flushes, prefetching, low-priority work |

```ts
export type UpdatePriority = 'immediate' | 'normal' | 'idle';
```

---

## ✏️ Examples

### Immediate — Synchronous Update

```ts
import { scheduleWithPriority } from '@jasonshimmy/custom-elements-runtime';

// Runs synchronously before any other code runs
scheduleWithPriority(() => {
  document.querySelector('my-modal')?.setAttribute('open', '');
}, 'immediate');
```

Use `'immediate'` sparingly — it bypasses batching and can cause layout thrashing if called repeatedly.

### Normal — Batched Microtask Update (Default)

```ts
import { scheduleWithPriority } from '@jasonshimmy/custom-elements-runtime';

// Queue three updates for the same component — fires only once due to deduplication
scheduleWithPriority(() => renderChart(), 'normal', 'chart-component');
scheduleWithPriority(() => renderChart(), 'normal', 'chart-component');
scheduleWithPriority(() => renderChart(), 'normal', 'chart-component');
// renderChart() is called exactly once, after the current call stack drains
```

The `componentId` parameter is the deduplication key. All three calls above collapse to a single execution.

### Idle — Deferred Non-Blocking Work

```ts
import { scheduleWithPriority } from '@jasonshimmy/custom-elements-runtime';

// Flush analytics data when the browser has free time
scheduleWithPriority(() => {
  sendAnalyticsEvents(pendingEvents);
}, 'idle');

// Prefetch data for a route the user hasn't navigated to yet
scheduleWithPriority(
  () => {
    prefetchRouteData('/settings');
  },
  'idle',
  'prefetch-settings',
);
```

Idle updates use `requestIdleCallback` when available (Chrome, Firefox, Edge) and fall back to `setTimeout(5)` in environments that lack `requestIdleCallback` support (e.g. Safari < 16). In test environments the fallback uses `setTimeout(0)` instead.

---

## 🔃 `flushDOMUpdates()`

Force the scheduler to process all currently pending `'normal'` updates synchronously. Useful in test code or when you need to observe rendered state immediately after a state change.

```ts
import { ref, flushDOMUpdates } from '@jasonshimmy/custom-elements-runtime';

const count = ref(0);
count.value = 5;

// Without flushDOMUpdates(), the DOM may not yet reflect count=5
flushDOMUpdates();
// Now the DOM is up to date
```

## ⏱️ `nextTick()`

Returns a `Promise` that resolves after the next render cycle completes. Equivalent to Vue's `nextTick()`.

```ts
import { ref, nextTick } from '@jasonshimmy/custom-elements-runtime';

const label = ref('Hello');
label.value = 'World';

await nextTick();
// The shadow DOM now reflects "World"
console.log(el.shadowRoot?.querySelector('span')?.textContent); // "World"
```

---

## 🧩 Using Inside Components

You can call `scheduleWithPriority` from _outside_ a component render to coordinate cross-component work — for example, batching updates across multiple components when a shared store changes:

```ts
import { scheduleWithPriority } from '@jasonshimmy/custom-elements-runtime';
import { createStore } from '@jasonshimmy/custom-elements-runtime/store';

const store = createStore({ items: [] as string[] });

function addItem(item: string) {
  store.setState((prev) => ({ items: [...prev.items, item] }));

  // Schedule a low-priority analytics ping — won't block the render
  scheduleWithPriority(() => trackItemAdded(item), 'idle');
}
```

---

## ⚙️ How the Scheduler Works

The runtime ships a singleton `UpdateScheduler` that:

1. **Deduplicates** updates by `componentId` — scheduling the same component multiple times within the same tick fires the render function exactly once.
2. **Batches** via `queueMicrotask` for `'normal'` priority — all synchronous state changes in a single event handler flush together in the next microtask.
3. **Time-slices** idle work — `'idle'` updates yield back to the browser when `requestIdleCallback`'s `timeRemaining()` drops to zero, reschedule themselves, and continue when the browser is idle again.

```
State change → scheduleDOMUpdate() → queueMicrotask → flush all pending → DOM updated
                                                                                ↑
                               deduplication by componentId ───────────────────┘
```

---

## 🔗 Related

- [Functional API](./functional-api.md) — component lifecycle reference
- [Reactive API](./reactive-api.md) — `ref`, `computed`, `watch`, `watchEffect`
- [Store](./store.md) — global shared state (`createStore`)
