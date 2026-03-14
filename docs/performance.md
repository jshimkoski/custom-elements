# Performance Tuning Guide

> Understanding the update scheduler, avoiding unnecessary re-renders, and profiling component trees

## How the Update Scheduler Works

The runtime batches all reactive updates and flushes them together in a single microtask. When multiple reactive state values change in the same synchronous block, only one DOM update is scheduled per component — not one per change.

```ts
const x = ref(0);
const y = ref(0);

// Both changes are batched: my-chart re-renders once, not twice
x.value = 10;
y.value = 20;
```

### Update priorities

`scheduleWithPriority(fn, priority)` controls when a callback runs relative to other pending work:

| Priority | Behaviour | Use case |
|----------|-----------|----------|
| `'immediate'` | Runs synchronously before the next microtask flush | Critical UI feedback (e.g., hiding a modal on keydown) |
| `'normal'` | Default — runs in the next microtask batch | Typical state-driven re-renders |
| `'idle'` | Runs via `requestIdleCallback` (falls back to `setTimeout(fn, 5)`) | Low-priority background work (analytics, prefetch) |

```ts
import { scheduleWithPriority } from '@jasonshimmy/custom-elements-runtime';

// Run analytics update only when the browser is idle
scheduleWithPriority(() => sendAnalytics(state), 'idle');

// Apply a critical animation frame immediately
scheduleWithPriority(() => applyTransform(), 'immediate');
```

> On Safari < 16, `requestIdleCallback` is not available. The runtime transparently falls back to `setTimeout(fn, 5)`, which provides approximate idle scheduling but is less precise.

---

## Avoiding Unnecessary Re-Renders

### Use `computed` for derived values

`computed()` is memoized — the getter only re-runs when its reactive dependencies change. Use it instead of re-calculating expensive values inside the render function.

```ts
// Without computed: recalculated on every render
component('product-list', () => {
  const items = ref([...]);
  return html`
    <!-- items.value.filter(...) runs every render -->
    ${items.value.filter(i => i.inStock).map(i => html`<li>${i.name}</li>`)}
  `;
});

// With computed: only recalculated when items changes
const items = ref([...]);
const inStock = computed(() => items.value.filter(i => i.inStock));

component('product-list', () => {
  return html`
    ${inStock.value.map(i => html`<li>${i.name}</li>`)}
  `;
});
```

### Lift shared state out of components

Reactive state created with `ref()` inside a component is component-scoped. If many components need the same value, create it at module scope so a single change triggers only the components that actually read it.

```ts
// Module-scope shared state — changes propagate only to subscribing components
const currentUser = ref<User | null>(null);

component('user-avatar', () => {
  return html`<img src="${currentUser.value?.avatar}" />`;
});

component('user-name', () => {
  return html`<span>${currentUser.value?.name}</span>`;
});
```

### Avoid mutations during render

Mutating reactive state while a component is rendering triggers another render cycle. Move mutations into event handlers, `useOnConnected`, or `watchEffect`.

```ts
// ❌ Bad — mutates state during render
component('bad-counter', () => {
  const count = ref(0);
  count.value++; // fires immediately during render → infinite loop risk
  return html`<span>${count.value}</span>`;
});

// ✅ Good — mutation only in event handler
component('good-counter', () => {
  const count = ref(0);
  return html`
    <button @click="${() => count.value++}">${count.value}</button>
  `;
});
```

The runtime emits a dev warning when it detects state mutation during render (throttled to one warning per second per component).

---

## `watch` vs `watchEffect`

| | `watch` | `watchEffect` |
|--|---------|---------------|
| Explicit source | Yes — pass a `ReactiveState` or getter | No — auto-tracks all reactive reads inside `fn` |
| Runs immediately | Optional (`{ immediate: true }`) | Always runs immediately |
| Receives old value | Yes | No |
| Best for | Reacting to a specific value change | Side effects that depend on multiple reactive sources |

```ts
// watch: precise, explicit
watch(count, (newVal, oldVal) => {
  console.log(`count: ${oldVal} → ${newVal}`);
});

// watchEffect: auto-tracks everything read inside
watchEffect(() => {
  document.title = `${firstName.value} ${lastName.value}`;
});
```

---

## Deep Watchers

`watch(source, cb, { deep: true })` deep-clones the watched value on every change to provide stable `newValue` / `oldValue` snapshots. This involves walking the entire object tree and allocating new objects.

Avoid deep watchers on large or frequently-mutating data structures. Prefer watching a scalar field or a computed summary instead.

```ts
// ❌ Expensive for large arrays
watch(largeList, handler, { deep: true });

// ✅ Watch a derived summary instead
watch(() => largeList.value.length, handler);
```

---

## Template Compilation Cache

The template compiler maintains an LRU cache of compiled template functions keyed by the template string. Repeated renders of the same component reuse the cached compiled function. No action is required — the cache is automatic.

This means **template literal strings should be stable** (not dynamically constructed) so the cache can be effective:

```ts
// ✅ Stable template — cache hit on every render
return html`<div class="${cls}">${content}</div>`;

// ❌ Dynamically built template string — cache miss on every render
const tpl = `<div class="${cls}">${content}</div>`;
return html([tpl] as unknown as TemplateStringsArray);
```

---

## Profiling Re-Renders

### Browser DevTools

Use the **Performance** panel in Chrome/Edge/Safari DevTools to record a trace while interacting with your app. Look for:

- Long tasks in the main thread triggered by repeated `scheduleDOMUpdate` calls
- Excessive style recalculations caused by per-render style injections

### Health Monitor

The built-in health monitor tracks render counts and loop detection. Use it in development to catch unexpected high-frequency renders:

```ts
import { getHealthMonitor } from '@jasonshimmy/custom-elements-runtime';

const monitor = getHealthMonitor();
setInterval(() => {
  const report = monitor.getReport();
  console.table(report.metrics);
}, 5000);
```

See [health-monitor.md](./health-monitor.md) for the full API.

### Infinite loop protection

The runtime tracks render frequency per component. If a component re-renders more than the configured threshold in a short window, it throws an error and stops rendering to prevent browser lock-up. This is described in detail in [infinite-loop-protection.md](./infinite-loop-protection.md).

---

## JIT CSS Performance

The JIT CSS engine parses utility class names and generates CSS on demand per shadow root. It uses `CSSStyleSheet` with `replaceSync()` to replace the accumulated stylesheet in one call, and caches parsed rule strings so each unique class name is only parsed once across all renders.

### Shadow DOM vs light DOM

Because each Custom Element has its own **Shadow DOM**, styles must be injected per shadow root — global CSS files cannot penetrate shadow boundaries. This means:

- **For Custom Elements**: `useJITCSS()` or `enableJITCSS()` is the correct approach. There is no build-time static-generation alternative that eliminates the shadow-root injection step, because the injection itself is what puts styles inside the shadow root.
- **For light-DOM contexts** (React, Svelte, Vue, plain HTML): use `createDOMJITCSS()` from `/dom-jit-css` at runtime, or the Vite plugin (`cerJITCSS`) to pre-generate a flat CSS file at build time. See [vite-plugin.md](./vite-plugin.md) and [dom-jit-css.md](./dom-jit-css.md).

### Reducing JIT CSS work per render

The engine is incremental: it tracks which class names have already been processed for each shadow root and only generates CSS for new classes seen since the last render. In practice, most re-renders add no new classes and the `replaceSync()` call is skipped entirely.

---

## Extended Colors

The extended color palette (21 color families × 11 shades) is opt-in. Only include it when you actively use non-semantic colors, as it increases the number of utility classes the JIT engine must process.

```ts
// Only pay for extended colors when you need them
useJITCSS({ extendedColors: true });

// Or limit to specific families
useJITCSS({ extendedColors: ['blue', 'red', 'green'] });
```

---

## Summary Checklist

- Use `computed()` for expensive derived values
- Move shared reactive state to module scope
- Never mutate state during render
- Prefer `watch` over `watchEffect` when the reactive source is known
- Avoid `{ deep: true }` on large data structures
- Use `scheduleWithPriority(..., 'idle')` for non-critical background work
- For light-DOM JIT CSS, use the Vite plugin at build time; for Shadow DOM Custom Elements, use `useJITCSS()` at runtime
- Only opt into extended colors when needed
