# 🗺️ Improvement Roadmap

> **Scope:** Actionable improvements needed for `@jasonshimmy/custom-elements-runtime` to surpass React 19, Vue 3, and Svelte 5. This document supersedes the resolved portions of `audit.md` and focuses entirely on what remains to be done.
>
> **All items from `audit.md` marked ✅ RESOLVED have been independently verified as correctly implemented.** `npm run all:ci` passes with zero warnings or errors.

---

## 🐛 Remaining Open Bugs

### 1. `GlobalEventBus.once()` — Dual-Output API

**File:** `src/lib/event-bus.ts` — line ~134

```ts
once<T>(eventName: string, handler: EventHandler<T>): Promise<T> {
  return new Promise((resolve) => {
    const unsubscribe = this.on(eventName, (data: T) => {
      unsubscribe();
      handler(data);   // ← calls the handler
      resolve(data);   // ← AND resolves the promise
    });
  });
}
```

The method both invokes a callback **and** returns a Promise, forcing callers to pass a no-op handler just to use the Promise form. Standard practice picks one output channel per overload.

**Fix:** Two clean overloads:

```ts
// Callback form — no return value
once<T>(eventName: string, handler: EventHandler<T>): void;
// Promise form — no handler argument
once<T>(eventName: string): Promise<T>;
```

**Impact:** API ergonomics, eliminates confusing dual-path behavior.

---

## ⚰️ Remaining Dead Code

### 2. `_styleCallback` Deprecated Path

**File:** `src/lib/runtime/component.ts` — line ~980

A comment explicitly explains that the `_styleCallback` path (a hook accepting an `HTMLElement`) is deprecated and not invoked. The comment documents the deliberate non-use but the associated legacy typing still appears in internal interfaces.

**Fix:** Remove any residual `_styleCallback` field from internal contextual interfaces and types to ensure no external code can accidentally rely on the old contract.

---

### 3. `devLog` — Exported But Never Used Internally

**File:** `src/lib/runtime/logger.ts` — line ~86

`devLog` is defined and exported from the module but is never called from any `src/lib` file and is not re-exported from the public `src/lib/index.ts`. It exists as dead internal code.

**Fix (choose one):**

- **Option A — Remove it:** Delete `devLog` from `logger.ts` and clean up any test references.
- **Option B — Promote it:** Export it from `src/lib/index.ts` as a deliberate consumer-facing debug utility and document it in the API reference table in `README.md`.

---

## 🚨 Remaining Code-Style Violations

### 4. `as any` in `event-bus.ts`

**File:** `src/lib/event-bus.ts` — lines 210, 220

```ts
const val = (inst as any)[prop as any]; // ← line 210
return (inst as any).apply(thisArg, args); // ← line 220
```

Project guidelines state: _"Never use `any` type; always prefer strongly typed definitions."_

**Fix:** Use `unknown` with type-safe narrowing or a typed `Record<string, unknown>` interface for the proxy target.

---

### 5. Large Files — Pending Splits

The `vdom.ts` decomposition established the pattern. These three files exceed the maintainability threshold:

| File                                   | Lines | Suggested modules                                                       |
| -------------------------------------- | ----- | ----------------------------------------------------------------------- |
| `src/lib/router.ts`                    | 2,021 | `router-core.ts`, `router-link.ts`, `router-view.ts`, `router-guard.ts` |
| `src/lib/runtime/template-compiler.ts` | 1,407 | `template-parser.ts`, `template-expression.ts`, `template-cache.ts`     |
| `src/lib/runtime/component.ts`         | 1,124 | `component-factory.ts`, `component-init.ts`, `component-hmr.ts`         |

Each split should follow the `vdom.ts` convention: a thin barrel `export { ... } from './sub-module'` for backwards compatibility.

---

### 6. `forEach` in `store.ts`

**File:** `src/lib/store.ts` — line ~40

```ts
function notify() {
  listeners.forEach((fn) => fn(state)); // ← prefer for...of
}
```

Project guidelines prefer `for...of` iteration over `forEach`. The `for...of` form is also faster in V8 and avoids creating an implicit closure scope.

**Fix:**

```ts
function notify() {
  for (const fn of listeners) fn(state);
}
```

---

### 7. `HealthMonitor` is a Class

**File:** `src/lib/runtime/monitoring/health-monitor.ts` — line ~24

Project guidelines state: _"Use functional and declarative programming patterns; avoid classes."_ `HealthMonitor` is a class with mutable instance state. The `stop()` method is already implemented (Bug #4 from the original audit), so the interface contract is stable.

**Fix:** Convert to a factory function returning a plain object:

```ts
export interface HealthMonitorInstance {
  start(): void;
  stop(): void;
  getMetrics(): HealthReport;
  updateMetric(name: string, value: number): void;
}

export function createHealthMonitor(): HealthMonitorInstance {
  let timerId: ReturnType<typeof setTimeout> | null = null;
  // ... internal state as closures
  return { start, stop, getMetrics, updateMetric };
}
```

---

## 📊 Feature Gaps vs. React 19, Vue 3, and Svelte 5

The table below shows the current state of capability parity. Items marked ❌ or ⚠️ represent direct gaps that prevent the library from being considered a full-featured framework alternative.

| Capability                          | React 19 | Vue 3 | Svelte 5 | This Library | Action Required      |
| ----------------------------------- | :------: | :---: | :------: | :----------: | -------------------- |
| Reactive state                      |    ✅    |  ✅   |    ✅    |      ✅      | —                    |
| Derived/computed state              |    ✅    |  ✅   |    ✅    |      ✅      | —                    |
| Side-effect hook                    |    ✅    |  ✅   |    ✅    |      ✅      | —                    |
| Shadow DOM isolation                |    ❌    |  ❌   |    ❌    |      ✅      | **Unique advantage** |
| Zero external deps                  |    ❌    |  ❌   |    ❌    |      ✅      | **Unique advantage** |
| Works without build step            |    ❌    |  ❌   |    ❌    |      ✅      | **Unique advantage** |
| Framework-agnostic                  |    ❌    |  ❌   |    ❌    |      ✅      | **Unique advantage** |
| JIT utility CSS (built-in)          |    ❌    |  ❌   |    ❌    |      ✅      | **Unique advantage** |
| Built-in router                     |    ❌    |  ✅   |    ❌    |      ✅      | —                    |
| Context / provide-inject            |    ✅    |  ✅   |    ✅    |      ✅      | —                    |
| Teleport / Portal                   |    ✅    |  ✅   |    ✅    |      ✅      | —                    |
| KeepAlive                           |    ✅    |  ✅   |    ❌    |      ✅      | —                    |
| nextTick / queue flush              |    ✅    |  ✅   |    ✅    |      ✅      | —                    |
| Composables outside render          |    ✅    |  ✅   |    ✅    |      ✅      | —                    |
| HMR                                 |    ✅    |  ✅   |    ✅    |      ✅      | —                    |
| Health monitoring / metrics         |    ❌    |  ❌   |    ❌    |      ✅      | **Unique advantage** |
| Two-way bind with modifiers         |    ❌    |  ✅   |    ✅    |      ✅      | —                    |
| SSR (renderToString)                |    ✅    |  ✅   |    ✅    |      ✅      | —                    |
| **Suspense boundary**               |    ✅    |  ✅   |    ❌    |      ❌      | See Priority 1       |
| **Client-side hydration**           |    ✅    |  ✅   |    ✅    |      ❌      | See Priority 2       |
| **Error boundary component**        |    ✅    |  ✅   |    ❌    |      ❌      | See Priority 3       |
| **Browser DevTools extension**      |    ✅    |  ✅   |    ✅    |      ❌      | See Priority 4       |
| **`defineExpose()` equivalent**     |    ✅    |  ✅   |    ✅    |      ❌      | See Priority 5       |
| **SFC / co-located template**       |    ❌    |  ✅   |    ✅    |      ❌      | See Priority 6       |
| **Compile-time optimization**       |    ✅    |  ✅   |    ✅    |      ❌      | See Priority 7       |
| **Concurrent / priority rendering** |    ✅    |  ❌   |    ❌    |      ❌      | See Priority 8       |
| **Fine-grained slot API**           |    ✅    |  ✅   |    ✅    |  ⚠️ native   | See Priority 9       |
| **Animate list reorders (FLIP)**    |    ❌    |  ✅   |    ✅    |  ⚠️ partial  | See Priority 10      |

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

**Effort:** High — significant architectural work in `vdom-patch.ts` and `component.ts`.

---

### Priority 3 — `<ce-error-boundary>` Component

**Impact:** Matches React's `ErrorBoundary` and Vue's `onErrorCaptured`. Currently errors bubble to `useOnError` on the individual component only — there is no way to catch errors from an entire subtree.

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
| Health      | Expose `HealthMonitor` metrics to the panel                              |

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

The runtime already has a `template-compiler.ts` with parse logic. The Vite plugin would run the same parser at build time and replace tagged template usages with pre-computed VNode trees:

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

### Priority 10 — Complete FLIP List Animation

**Impact:** Matches Vue's `<TransitionGroup>` and Svelte's `animate:flip`. The current `TransitionGroup` implementation handles enter/leave but FLIP (First, Last, Invert, Play) move animations for reordering are incomplete.

FLIP move animations are triggered when a list item changes position in the DOM (e.g., after a sort). The algorithm:

1. **First:** Record current bounding rect for each keyed child
2. **Last:** Apply DOM update (items reorder)
3. **Invert:** Calculate the delta and apply a CSS `transform` to put items back at their old position instantly (no visual jump)
4. **Play:** Animate the transform back to `0` using a CSS transition

**Effort:** Medium — changes in `transition-group-handler.ts` and `vdom-patch.ts`.

---

## 🎨 JIT CSS Priority Improvements

The following gaps prevent the built-in JIT CSS engine from being a full Tailwind replacement. See [docs/jit-css-audit.md](./jit-css-audit.md) for the complete analysis.

### Critical (Adoption Blockers)

| #   | Gap                                              | Fix Location                            | Effort |
| --- | ------------------------------------------------ | --------------------------------------- | ------ |
| 1   | Non-composable transforms (scale + rotate clash) | `style.ts` — CSS variable rewrite       | Medium |
| 2   | No `translate-x/y-*` / `skew-x/y-*` statics      | `style.ts` — `generateUtilities()`      | Low    |
| 3   | No `ring-*` focus ring utilities                 | `style.ts` — CSS variable ring system   | Medium |
| 4   | No CSS filter / backdrop-filter utilities        | `style.ts` — CSS variable filter system | Medium |

### High-Value (Frequent Developer Needs)

| #   | Gap                                           | Fix Location                            | Effort  |
| --- | --------------------------------------------- | --------------------------------------- | ------- |
| 5   | No numeric + fractional width/height scale    | `style.ts` — `generateUtilities()` loop | Low     |
| 6   | No `bg-cover`, `bg-center`, `bg-clip-*`       | `style.ts` — background suite           | Low     |
| 7   | No `delay-*` transition delay statics         | `style.ts`                              | Trivial |
| 8   | No `motion-reduce:` / `motion-safe:` variants | `style.ts` — `mediaVariants`            | Low     |
| 9   | No `rtl:` / `ltr:` variants                   | `style.ts` — `selectorVariants`         | Low     |
| 10  | No `divide-x/y-*` sibling border utilities    | `style.ts` — new sibling selector path  | Medium  |

### Medium (Quality of Life)

| #   | Gap                                         | Fix Location                 | Effort  |
| --- | ------------------------------------------- | ---------------------------- | ------- |
| 11  | No `text-decoration-color/style/thickness`  | `style.ts`                   | Low     |
| 12  | No `list-disc`, `list-decimal`, `list-none` | `style.ts`                   | Trivial |
| 13  | No `scroll-smooth`, `scroll-snap-*`         | `style.ts`                   | Low     |
| 14  | No `z-auto` / intermediate z-index values   | `style.ts`                   | Trivial |
| 15  | No `will-change-*` utilities                | `style.ts`                   | Trivial |
| 16  | No `touch-action` utilities                 | `style.ts`                   | Trivial |
| 17  | No `print:` variant                         | `style.ts` — `mediaVariants` | Trivial |
| 18  | No `columns-*` multi-column layout          | `style.ts`                   | Low     |
| 19  | Extended color palette (opt-in module)      | New `src/lib/css/colors.ts`  | Low     |

The **architectural prerequisite** for items 1–4 is CSS custom property–based composition for transforms, filters, and rings. This must land first before the static utility additions for those categories.

---

## 🏗️ Architecture Improvements

### File Splits (from Code Violation #5)

Apply the `vdom.ts` barrel pattern to the remaining oversized files:

**`router.ts` (2,021 lines) → 4 modules:**

```
router-core.ts        # useRouter, initRouter, matchRoute, matchRouteSSR, parseQuery
router-link.ts        # RouterLink component registration + RouterLinkProps types
router-view.ts        # RouterView component registration
router-guard.ts       # Guard evaluation, resolveRouteComponent
router.ts             # Barrel re-export (backwards compat)
```

**`template-compiler.ts` (1,407 lines) → 3 modules:**

```
template-parser.ts      # HTML tokenizer, node tree construction
template-expression.ts  # Expression extraction, binding detection
template-cache.ts       # Compiled template caching (htmlCache)
template-compiler.ts    # Barrel re-export
```

**`component.ts` (1,124 lines) → 3 modules:**

```
component-factory.ts  # component() definition, customElements.define
component-init.ts     # Shadow DOM setup, prop wiring, lifecycle dispatch
component-hmr.ts      # HMR accept / re-register logic
component.ts          # Barrel re-export
```

---

## 📐 Testing Coverage Gaps

### Untested or Under-Tested Areas

| Area                                         | Recommended Test File                         |
| -------------------------------------------- | --------------------------------------------- |
| `GlobalEventBus.once()` Promise-only form    | `test/event-bus.spec.ts` — new overload tests |
| `HealthMonitor.stop()` halts the timer chain | `test/health-monitor.spec.ts`                 |
| `useTeleport()` across shadow boundary       | `test/teleport.spec.ts` — shadow root target  |
| `TransitionGroup` FLIP move animations       | `cypress/e2e/transition-group-flip.cy.ts`     |
| JIT CSS composable transforms                | `test/jit-css-transform-compose.spec.ts`      |
| `provide/inject` across 3+ nesting levels    | `test/provide-inject-deep.spec.ts`            |
| HMR re-registration preserves reactive state | `test/hmr-state.spec.ts`                      |
| `<ce-suspense>` (once implemented)           | `test/suspense.spec.ts`                       |
| `<ce-error-boundary>` (once implemented)     | `test/error-boundary.spec.ts`                 |

---

## 📝 Documentation Gaps

| Gap                                       | Action                                                                     |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| `jit-css-audit.md` not linked in README   | Add link under **Styling** section pointing to the competitive analysis    |
| `devLog` function has no public docs      | Either remove or add to API reference table in `README.md`                 |
| `useExpose()` (once implemented)          | New `docs/expose.md` + entry in README API table                           |
| `<ce-suspense>` (once implemented)        | New `docs/suspense.md` + entry in README API table                         |
| `<ce-error-boundary>` (once implemented)  | Extend `docs/troubleshooting.md` + add standalone `docs/error-boundary.md` |
| `.ce` SFC format (once plugin exists)     | New `docs/sfc.md`                                                          |
| Client-side hydration (once implemented)  | Extend `docs/ssr.md` with hydration section                                |
| Compile-time template plugin (once built) | New `docs/vite-plugin.md`                                                  |

---

## 🎯 Summary: What It Takes to Surpass the Big Three

The library already leads in three areas that none of React, Vue, or Svelte can match simultaneously: **native Shadow DOM isolation**, **zero-dependency zero-build-step usage**, and **built-in JIT CSS**. Closing the remaining gaps transforms it from a strong Web Components solution into the definitive full-stack component framework.

| Priority | Deliverable                     | Closes Gap Against   | Effort |
| -------- | ------------------------------- | -------------------- | ------ |
| 1        | `<ce-suspense>` boundary        | React, Vue           | Medium |
| 2        | Client-side hydration           | React, Vue, Svelte   | High   |
| 3        | `<ce-error-boundary>`           | React, Vue           | Medium |
| 4        | Browser DevTools extension      | React, Vue, Svelte   | High   |
| 5        | `useExpose()` hook              | React, Vue, Svelte   | Low    |
| 6        | `.ce` SFC Vite plugin           | Vue, Svelte          | High   |
| 7        | Compile-time template plugin    | React, Vue, Svelte   | High   |
| 8        | Concurrent-style rendering      | React                | Medium |
| 9        | Typed named slot API            | Vue, Svelte          | Medium |
| 10       | Complete FLIP list animation    | Vue, Svelte          | Medium |
| 11       | JIT CSS transform composition   | Tailwind CSS         | Medium |
| 12       | JIT CSS ring + filter utilities | Tailwind CSS         | Medium |
| 13       | Fix open code violations (1–7)  | Internal code health | Low    |

Completing priorities 1–5 and 11–13 can be achieved without new package dependencies and without breaking the zero-dependency guarantee. Priorities 6, 7, and 4 are separate deliverables (Vite plugins and a browser extension) and do not affect the core runtime bundle.

---

_Roadmap created: March 2026 — `@jasonshimmy/custom-elements-runtime` based on verified v2.5.1 implementation_
