# 🗺️ Improvement Roadmap

> **Scope:** Actionable improvements needed for `@jasonshimmy/custom-elements-runtime` to surpass React 19, Vue 3, and Svelte 5. This document supersedes the resolved portions of `audit.md` and focuses entirely on what remains to be done.
>
> **All items previously listed under "Remaining Open Bugs", "Remaining Dead Code", "Code Style Violations", "Architecture Improvements", and "JIT CSS Priority Improvements" have been independently verified as correctly implemented.** `npm run all:ci` passes with zero warnings or errors.

---

## ✅ Recently Resolved (since last audit — March 2026)

The following items from the previous roadmap version have been fully implemented and verified:

| #   | Item                                            | Resolution                                                                                                                                                                                                                                |
| --- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `GlobalEventBus.once()` Dual-Output API         | Two clean overloads — callback form returns `void`, Promise form takes no handler                                                                                                                                                         |
| 2   | `_styleCallback` Deprecated Path                | All `_styleCallback` references removed from internal interfaces and types                                                                                                                                                                |
| 3   | `devLog` Dead Export                            | Promoted to public API — re-exported from `src/lib/index.ts`                                                                                                                                                                              |
| 4   | `as any` casts in `event-bus.ts`                | Replaced with `unknown` + `Record<PropertyKey, unknown>` narrowing                                                                                                                                                                        |
| 5   | `forEach` in `store.ts` `notify()`              | Converted to `for...of` iteration                                                                                                                                                                                                         |
| 6   | `HealthMonitor` class                           | Converted to `createHealthMonitor()` factory function with closure-based state                                                                                                                                                            |
| 7   | `router.ts` (2,021 lines) file split            | Split into `router/instance.ts`, `router/types.ts`, `router/path-utils.ts`, `router/matcher.ts`, `router/component-loader.ts`, `router/active-proxy.ts`; `router.ts` is now a 27-line barrel                                              |
| 8   | `template-compiler.ts` (1,407 lines) file split | Split into `template-compiler/impl.ts`, `template-compiler/lru-cache.ts`, `template-compiler/props-parser.ts`, `template-compiler/vnode-utils.ts`; `template-compiler.ts` is a 31-line barrel                                             |
| 9   | `component.ts` (1,124 lines) file split         | Split into `component/element-class.ts`, `component/factory.ts`, `component/registry.ts`; `component.ts` is a 3-line barrel                                                                                                               |
| 10  | FLIP list animation (Priority 10)               | Full FLIP move animation implemented in `vdom-patch.ts`; tested in `test/transitiongroup-flip.spec.ts`                                                                                                                                    |
| 11  | All JIT CSS Critical gaps (1–4)                 | CSS-variable-based transform composition, `translate-x/y`/`skew-x/y` statics, `ring-*` utilities, filter/backdrop-filter CSS variable system — all implemented in `src/lib/runtime/style.ts`                                              |
| 12  | All JIT CSS High-Value gaps (5–10)              | Fractional `w-`/`h-` dynamic parsing, `bg-cover`/`center`/`clip-*`, `delay-*`, `motion-reduce:`/`motion-safe:`, `rtl:`/`ltr:`, `divide-x/y-*` — all implemented                                                                           |
| 13  | All JIT CSS Medium gaps (11–19)                 | `text-decoration-color`/style/thickness, `list-disc`/decimal/none, `scroll-smooth`/`snap-*`, `z-auto`, `will-change-*`, `touch-action`, `print:` variant, `columns-*`, extended color palette (`src/lib/css/colors.ts`) — all implemented |

---

## 📊 Feature Gaps vs. React 19, Vue 3, and Svelte 5

The table below shows the current state of capability parity. Items marked ❌ or ⚠️ represent direct gaps that prevent the library from being considered a full-featured framework alternative.

| Capability                           | React 19 | Vue 3 | Svelte 5 | This Library | Action Required      |
| ------------------------------------ | :------: | :---: | :------: | :----------: | -------------------- |
| Reactive state                       |    ✅    |  ✅   |    ✅    |      ✅      | —                    |
| Derived/computed state               |    ✅    |  ✅   |    ✅    |      ✅      | —                    |
| Side-effect hook                     |    ✅    |  ✅   |    ✅    |      ✅      | —                    |
| Shadow DOM isolation                 |    ❌    |  ❌   |    ❌    |      ✅      | **Unique advantage** |
| Zero external deps                   |    ❌    |  ❌   |    ❌    |      ✅      | **Unique advantage** |
| Works without build step             |    ❌    |  ❌   |    ❌    |      ✅      | **Unique advantage** |
| Framework-agnostic                   |    ❌    |  ❌   |    ❌    |      ✅      | **Unique advantage** |
| JIT utility CSS (built-in)           |    ❌    |  ❌   |    ❌    |      ✅      | **Unique advantage** |
| Built-in router                      |    ❌    |  ✅   |    ❌    |      ✅      | —                    |
| Context / provide-inject             |    ✅    |  ✅   |    ✅    |      ✅      | —                    |
| Teleport / Portal                    |    ✅    |  ✅   |    ✅    |      ✅      | —                    |
| KeepAlive                            |    ✅    |  ✅   |    ❌    |      ✅      | —                    |
| nextTick / queue flush               |    ✅    |  ✅   |    ✅    |      ✅      | —                    |
| Composables outside render           |    ✅    |  ✅   |    ✅    |      ✅      | —                    |
| HMR                                  |    ✅    |  ✅   |    ✅    |      ✅      | —                    |
| Health monitoring / metrics          |    ❌    |  ❌   |    ❌    |      ✅      | **Unique advantage** |
| Two-way bind with modifiers          |    ❌    |  ✅   |    ✅    |      ✅      | —                    |
| SSR (renderToString)                 |    ✅    |  ✅   |    ✅    |      ✅      | —                    |
| Animate list reorders (FLIP)         |    ❌    |  ✅   |    ✅    |      ✅      | —                    |
| Extended JIT CSS (ring, filter, etc) |    ❌    |  ❌   |    ❌    |      ✅      | **Unique advantage** |
| **Suspense boundary**                |    ✅    |  ✅   |    ❌    |      ❌      | See Priority 1       |
| **Client-side hydration**            |    ✅    |  ✅   |    ✅    |      ❌      | See Priority 2       |
| **Error boundary component**         |    ✅    |  ✅   |    ❌    |      ❌      | See Priority 3       |
| **Browser DevTools extension**       |    ✅    |  ✅   |    ✅    |      ❌      | See Priority 4       |
| **`defineExpose()` equivalent**      |    ✅    |  ✅   |    ✅    |      ❌      | See Priority 5       |
| **SFC / co-located template**        |    ❌    |  ✅   |    ✅    |      ❌      | See Priority 6       |
| **Compile-time optimization**        |    ✅    |  ✅   |    ✅    |      ❌      | See Priority 7       |
| **Concurrent / priority rendering**  |    ✅    |  ❌   |    ❌    |      ❌      | See Priority 8       |
| **Fine-grained slot API**            |    ✅    |  ✅   |    ✅    |  ⚠️ native   | See Priority 9       |

---

## 🚀 Priority Roadmap to Surpass the Competition

### Priority 1 — `<ce-suspense>` Boundary Component

**Impact:** Closes the gap with React and Vue. Makes async component loading a first-class pattern.

`<ce-suspense>` should catch async render Promises from descendant components and show a fallback slot until all children resolve. This is architecturally sound because components are already custom elements — a parent can observe `Promise`-returning renders from children.

```ts
component('ce-suspense', () => {
  const isPending = ref(false);
  // Intercept async renders from descendants via context
  const handleAsyncChild = (promise: Promise<unknown>) => {
    isPending.value = true;
    promise.finally(() => {
      isPending.value = false;
    });
  };
  provide('__suspense__', handleAsyncChild);
  return html`
    ${when(!isPending.value, () => html`<slot></slot>`)}
    ${when(isPending.value, () => html`<slot name="fallback"></slot>`)}
  `;
});
```

**Effort:** Medium — requires a protocol between child and parent via `provide/inject`.

---

### Priority 2 — Client-Side Hydration

**Impact:** Closes the last major SSR gap. Currently `renderToString` outputs static HTML with no client reactivation path.

Hydration strategy for a Web Components runtime differs from React/Vue because custom elements self-upgrade when registered. The gap is that server-rendered shadow roots (Declarative Shadow DOM) need to be adopted by the client runtime without re-rendering from scratch.

**Approach:**

1. Add a `hydrateComponent(element: HTMLElement)` function that detects an existing shadow root and skips initial DOM creation, only attaching the reactive runtime to the existing nodes.
2. Add `renderToString` support for [Declarative Shadow DOM](https://developer.chrome.com/docs/css-ui/declarative-shadow-dom) (`<template shadowrootmode="open">`) so SSR output is natively hydratable.

**Effort:** High — significant architectural work in `vdom-patch.ts` and `component/element-class.ts`.

---

### Priority 3 — `<ce-error-boundary>` Component

**Impact:** Matches React's `ErrorBoundary` and Vue's `onErrorCaptured`. Currently `_runLogicWithinErrorBoundary` exists as an internal method in `component/element-class.ts` — there is no way to catch errors from an entire subtree via a declarative ancestor component.

```ts
component('ce-error-boundary', () => {
  const hasError = ref(false);
  const errorMessage = ref('');

  useOnError((err) => {
    hasError.value = true;
    errorMessage.value = err.message;
  });

  return html`
    ${when(!hasError.value, () => html`<slot></slot>`)}
    ${when(
      hasError.value,
      () => html`
        <slot name="fallback">
          <p>Something went wrong: ${errorMessage.value}</p>
        </slot>
      `,
    )}
  `;
});
```

The runtime already supports `useOnError` per component. The remaining work is bubbling uncaught errors up through the component tree and allowing an ancestor's `useOnError` to intercept them.

**Effort:** Medium — error propagation via the existing context hierarchy.

---

### Priority 4 — Browser DevTools Extension

**Impact:** This is the single biggest DX differentiator gap vs. React (DevTools), Vue (Devtools), and Svelte (Svelte DevTools). Without it, debugging production issues is significantly harder.

**Minimum viable scope:**

| Panel       | Data                                                                     |
| ----------- | ------------------------------------------------------------------------ |
| Components  | Tree of registered custom elements, current props, reactive state values |
| Performance | Render times per component, update frequency, scheduled/pending updates  |
| Event Bus   | Live feed of `emit`/`on` activity with payload inspection                |
| Store       | Current state snapshots, subscriber count, state diffs over time         |
| Health      | Expose `createHealthMonitor()` metrics to the panel                      |

**Architecture:** A Chrome/Firefox DevTools extension with a content script that reads from a global `window.__CER_DEVTOOLS__` registry populated by the runtime in dev mode.

**Effort:** High — separate deliverable (extension + runtime instrumentation).

---

### Priority 5 — `useExpose()` Hook

**Impact:** Matches Vue's `defineExpose()` and React's `useImperativeHandle()`. Allows component authors to explicitly surface imperative methods and properties for parent access without leaking internal context.

Currently the only way to call a method on a child component is to access `element._context` directly — an undocumented internal API.

```ts
component('my-modal', () => {
  const isOpen = ref(false);
  const open = () => {
    isOpen.value = true;
  };
  const close = () => {
    isOpen.value = false;
  };

  useExpose({ open, close });

  return html`...`;
});

// Parent:
const modal = document.querySelector('my-modal') as ModalElement;
modal.open(); // ← clean, typed, explicit
```

**Implementation:** `useExpose(api)` copies the provided object properties onto the host `HTMLElement`, making them accessible as instance methods.

**Effort:** Low — a few lines in `hooks.ts` + TypeScript interface augmentation.

---

### Priority 6 — Optional `.ce` Single-File Component Vite Plugin

**Impact:** Lowers onboarding friction for developers migrating from Vue or Svelte. A `.ce` SFC compiles to the functional `component()` call at build time.

```vue
<!-- my-counter.ce -->
<script>
import { ref } from '@jasonshimmy/custom-elements-runtime';
const count = ref(0);
</script>

<template>
  <button @click="${() => count.value++}">Count: ${count.value}</button>
</template>

<style scoped>
button { ... }
</style>
```

Compiles to:

```ts
import {
  component,
  ref,
  html,
  css,
} from '@jasonshimmy/custom-elements-runtime';

component('my-counter', () => {
  const count = ref(0);
  useStyle(() => css`button { ... }`);
  return html`<button @click="${() => count.value++}">
    Count: ${count.value}
  </button>`;
});
```

**Effort:** High — separate Vite plugin package (`vite-plugin-custom-elements`).

---

### Priority 7 — Compile-Time Template Pre-Parsing Vite Plugin

**Impact:** This is how Svelte achieves its performance ceiling. Pre-compiling `html\`...\``tagged template literals into direct`h()` VNode calls at build time eliminates the runtime string parsing phase entirely.

The runtime already has `template-compiler/impl.ts` with parse logic. The Vite plugin would run the same parser at build time and replace tagged template usages with pre-computed VNode trees:

```ts
// Before (runtime parsed)
return html`<div class="px-4">${count.value}</div>`;

// After (compiled)
return h('div', { class: 'px-4' }, [count.value]);
```

**Effort:** High — requires extracting and stabilizing the template compiler as a standalone Node.js module.

---

### Priority 8 — Prioritized / Concurrent-Style Rendering

**Impact:** Closes the gap with React Fiber. Large component trees currently block the main thread during a single synchronous render pass.

The scheduler (`src/lib/runtime/scheduler.ts`) already exists. The incremental improvement is to time-slice long render passes using `scheduler.postTask()` (where available) or `MessageChannel` yielding, allowing the browser to handle higher-priority input events between render chunks.

```ts
// Current: synchronous flush
function flushQueue() {
  for (const renderFn of queue) renderFn();
}

// Target: time-sliced flush
async function flushQueue() {
  for (const renderFn of queue) {
    renderFn();
    if (needsYield()) await yieldToMain();
  }
}
```

**Effort:** Medium — changes confined to `scheduler.ts` with fallback to synchronous for environments without `scheduler.postTask()`.

---

### Priority 9 — Named Slots with Typed API

**Impact:** Native Shadow DOM slots are functional but lack the ergonomic typed API that Vue's named slots or React's render props provide.

Currently named slots work via standard `<slot name="...">` HTML — correct and zero-JS — but there is no TypeScript contract that tells component consumers which slot names are available, what content shape is expected, or whether a slot has a fallback.

**Fix:** Add a `useSlots()` hook that:

1. Declares expected slot names for TypeScript autocompletion
2. Optionally detects whether a consumer has filled a slot (for conditional default rendering)

```ts
component('my-card', () => {
  const slots = useSlots<{ header: true; footer?: true }>();

  return html`
    <slot name="header"></slot>
    <slot></slot>
    ${when(slots.has('footer'), () => html`<slot name="footer"></slot>`)}
  `;
});
```

**Effort:** Low-Medium — the detection relies on `slotchange` events already available in Shadow DOM.

---

---

## 📐 Testing Coverage Gaps

### Untested or Under-Tested Areas

| Area                                         | Recommended Test File                         | Status                                                     |
| -------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------- |
| `GlobalEventBus.once()` Promise-only form    | `test/event-bus.spec.ts` — new overload tests | ❌ Missing                                                 |
| `HealthMonitor.stop()` halts the timer chain | `test/health-monitor.spec.ts`                 | ❌ Missing                                                 |
| `useTeleport()` across shadow boundary       | `test/teleport.spec.ts` — shadow root target  | ⚠️ File exists; shadow-boundary case may be missing        |
| `TransitionGroup` FLIP move animations       | `test/transitiongroup-flip.spec.ts`           | ✅ Exists                                                  |
| JIT CSS composable transforms                | `test/jit-css-new-utilities.spec.ts`          | ✅ Exists                                                  |
| `provide/inject` across 3+ nesting levels    | `test/provide-inject.spec.ts`                 | ⚠️ File exists; deep-nesting case needs verification       |
| HMR re-registration preserves reactive state | `test/smoke.native-and-hmr.spec.ts`           | ⚠️ File exists; state-preservation case needs verification |
| `<ce-suspense>` (once implemented)           | `test/suspense.spec.ts`                       | ❌ Not yet — blocked on Priority 1                         |
| `<ce-error-boundary>` (once implemented)     | `test/error-boundary.spec.ts`                 | ❌ Not yet — blocked on Priority 3                         |
| `useExpose()` (once implemented)             | `test/expose.spec.ts`                         | ❌ Not yet — blocked on Priority 5                         |
| `useSlots()` typed detection (once built)    | `test/slots.spec.ts`                          | ❌ Not yet — blocked on Priority 9                         |

---

## 📝 Documentation Gaps

| Gap                                       | Action                                                                     | Status                   |
| ----------------------------------------- | -------------------------------------------------------------------------- | ------------------------ |
| `jit-css-audit.md` not linked in README   | Add link under **Styling** section pointing to the competitive analysis    | ❌ Open                  |
| `src/lib/css/colors.ts` extended palette  | Document opt-in import path in README **Styling** section                  | ❌ Open                  |
| `useExpose()` (once implemented)          | New `docs/expose.md` + entry in README API table                           | ❌ Blocked on Priority 5 |
| `<ce-suspense>` (once implemented)        | New `docs/suspense.md` + entry in README API table                         | ❌ Blocked on Priority 1 |
| `<ce-error-boundary>` (once implemented)  | Extend `docs/troubleshooting.md` + add standalone `docs/error-boundary.md` | ❌ Blocked on Priority 3 |
| `.ce` SFC format (once plugin exists)     | New `docs/sfc.md`                                                          | ❌ Blocked on Priority 6 |
| Client-side hydration (once implemented)  | Extend `docs/ssr.md` with hydration section                                | ❌ Blocked on Priority 2 |
| Compile-time template plugin (once built) | New `docs/vite-plugin.md`                                                  | ❌ Blocked on Priority 7 |

---

## 🎯 Summary: What It Takes to Surpass the Big Three

The library already leads in areas none of React, Vue, or Svelte can match simultaneously: **native Shadow DOM isolation**, **zero-dependency zero-build-step usage**, **built-in JIT CSS** (including ring, filter, backdrop-filter, FLIP animations, full Tailwind-compatible utility set, and extended color palette). All internal code quality issues and architecture splits have been completed.

| Priority | Deliverable                       | Closes Gap Against   | Effort  |
| -------- | --------------------------------- | -------------------- | ------- |
| 1        | `<ce-suspense>` boundary          | React, Vue           | Medium  |
| 2        | Client-side hydration             | React, Vue, Svelte   | High    |
| 3        | `<ce-error-boundary>`             | React, Vue           | Medium  |
| 4        | Browser DevTools extension        | React, Vue, Svelte   | High    |
| 5        | `useExpose()` hook                | React, Vue, Svelte   | Low     |
| 6        | `.ce` SFC Vite plugin             | Vue, Svelte          | High    |
| 7        | Compile-time template plugin      | React, Vue, Svelte   | High    |
| 8        | Concurrent-style rendering        | React                | Medium  |
| 9        | Typed named slot API              | Vue, Svelte          | Medium  |
| 10       | Fill missing test coverage        | Internal code health | Low     |
| 11       | Link `jit-css-audit.md` in README | Internal docs health | Trivial |

Completing priorities 1, 3, 5, and 9 can be achieved without new package dependencies. Priorities 2, 4, 6, and 7 are higher-effort or separate deliverables and do not affect the core runtime bundle.

---

_Roadmap updated: March 2026 — `@jasonshimmy/custom-elements-runtime` based on verified post-v2.5.1 implementation_
