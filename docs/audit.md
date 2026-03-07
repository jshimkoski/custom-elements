# 🔍 Project Audit & Competitive Analysis

> **Scope:** Full source audit of `@jasonshimmy/custom-elements-runtime` v2.5.1 covering bugs, dead code, deprecations, code-style violations, and a feature gap comparison against React 19, Vue 3, and Svelte 5.

---

## 🐛 Bugs

### 1. `computed()` — no memoization, dead state allocation ✅ RESOLVED

**Status:** Fixed. The current implementation uses `cachedValue` / `isDirty` caching and only re-evaluates `fn()` when tracked dependencies change. The original dead `computedState` allocation has been removed. See current source in `src/lib/runtime/reactive.ts`.

---

### 2. `useOnConnected` / lifecycle hooks — only one callback allowed ✅ RESOLVED

**Status:** Fixed. All lifecycle hook registrations (`useOnConnected`, `useOnDisconnected`, `useOnAttributeChanged`, `useOnError`) now push callbacks onto arrays. All registered callbacks are invoked in sequence. Multiple composables can each safely register their own lifecycle callbacks.

---

### 3. Discovery render executes the render function twice ✅ RESOLVED

**Status:** Fixed. All side-effectful hooks (`watchEffect`, `watch`, `useOnConnected`, `useOnDisconnected`, `useOnAttributeChanged`, `useOnError`, `useEmit`, `useStyle`, `provide`, `inject`) now check `isDiscoveryRender()` and return early / return no-ops during the discovery pass. The `html` tagged template already short-circuited. Only `useProps()` executes real work during discovery, preventing double-execution of API calls, watchers, and lifecycle callbacks.

---

### 4. `HealthMonitor` has no `destroy()` / `stop()` method ✅ RESOLVED

**Status:** Fixed. A `stop()` method has been added to `HealthMonitor` that clears the recursive `setTimeout` chain.

---

### 5. `GlobalEventBus.once()` — dual-output API

**File:** `src/lib/event-bus.ts` — line ~135

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

The method both calls a side-effect handler **and** returns a Promise, forcing users to either duplicate logic or pass a no-op handler just to get the Promise. Standard practice picks one: a callback-only overload or a Promise-only overload.

**Fix:** Offer two separate signatures — `once(event, handler): void` for the callback form and `once(event): Promise<T>` (no handler argument) for the Promise form.

---

### 6. Redundant `import.meta` check in HMR block ✅ RESOLVED

**Status:** Fixed. The HMR block now uses a clean single check: `const hmrHot = (import.meta as HMRImportMeta).hot; if (hmrHot) { ... }` with no redundant conditions.

---

## ⚰️ Dead Code

### 7. `computedState` variable in `computed()` ✅ RESOLVED

**Status:** Fixed as part of the `computed()` memoization fix (Bug #1). The dead `ReactiveState` allocation no longer exists in the current implementation.

---

### 8. `_styleCallback` deprecated path

**File:** `src/lib/runtime/component.ts` — line 904 (comment)

The internal comment explicitly states that the `_styleCallback` path (a hook taking an `HTMLElement`) is deprecated and intentionally no longer invoked. Any code external to this project that once stored a function under `_styleCallback` on the context will silently do nothing. This deprecated path is undocumented and should be formally removed.

---

### 9. `devLog` — exported but never used internally

**File:** `src/lib/runtime/logger.ts` — line 86

`devLog` is exported and tested but is never called from within any `src/lib` file. It is fine as a public utility, but its absence from internal use suggests either it was removed from call-sites or was always intended only for consumer debugging. Either clarify this in the public API docs or annotate it as a consumer-facing utility.

---

## ⚠️ Deprecations

### 10. `String.prototype.substr()` — deprecated per MDN / ECMAScript

**Files & Lines:**

- `src/lib/runtime/component.ts` — lines 73, 199, 845
- `src/lib/runtime/reactive.ts` — line 417

All four call sites use the pattern `Math.random().toString(36).substr(2, 9)`.

`substr()` is a legacy function removed from the ECMAScript standard (annex B) and flagged as deprecated in TypeScript's strict-null and ES2024 target configs.

**Fix:** Replace with `substring(2, 11)` (same semantics — start index 2, extract 9 characters to index 11).

```ts
// Before
Math.random().toString(36).substr(2, 9);

// After
Math.random().toString(36).substring(2, 11);
```

---

## 🚨 Code-Style Violations (vs. project guidelines)

### 11. `as any` in `event-bus.ts`

**File:** `src/lib/event-bus.ts` — lines 210, 220

The guidelines explicitly state: _"Never use `any` type; always prefer strongly typed definitions."_

```ts
const val = (inst as any)[prop as any]; // ← line 210
return (inst as any).apply(thisArg, args); // ← line 220
```

**Fix:** Use `unknown` with type-safe narrowing or an explicit interface.

---

### 12. Very large files — split into focused modules

| File                                    | Lines | Status                       |
| --------------------------------------- | ----- | -----------------------------|
| `src/lib/runtime/vdom.ts`               | 3,562 | ✅ Resolved — barrel (36 ln) |
| `src/lib/runtime/vdom-directives.ts`    | —     | ✅ New — ~990 lines          |
| `src/lib/runtime/vdom-patch.ts`         | —     | ✅ New — ~2,440 lines        |
| `src/lib/runtime/vdom-helpers.ts`       | —     | ✅ New — ~175 lines          |
| `src/lib/router.ts`                     | 2,021 | Pending                      |
| `src/lib/runtime/template-compiler.ts` | 1,407 | Pending                      |
| `src/lib/runtime/component.ts`         | 1,037 | Pending                      |

`vdom.ts` has been fully decomposed. The remaining large files (`router.ts`, `template-compiler.ts`, `component.ts`) are candidates for future splits but are not yet addressed.

Suggested remaining splits:
- `router.ts` → `router-core.ts`, `router-link.ts`, `router-view.ts`, `router-guard.ts`
- `template-compiler.ts` → `template-parser.ts`, `template-expression.ts`, `template-cache.ts`
- `component.ts` → `component-factory.ts`, `component-init.ts`, `component-hmr.ts`

---

### 13. `forEach` in `store.ts`

**File:** `src/lib/store.ts`

```ts
function notify() {
  listeners.forEach((fn) => fn(state)); // ← prefer for...of
}
```

The guidelines prefer iteration patterns. `for (const fn of listeners) fn(state)` is also faster in V8 and avoids creating an implicit function scope.

---

### 14. `Math.random()` for component/watcher IDs

Used in 5 places for constructing component and watcher IDs. `Math.random()` can theoretically produce collisions. Prefer `crypto.randomUUID()` (available in all modern browsers and Node 14.17+) or at minimum use `performance.now()` as part of the seed.

```ts
// Before
`${tag}-${Math.random().toString(36).substr(2, 9)}`
// After
`${tag}-${crypto.randomUUID()}`;
```

---

### 15. `HealthMonitor` is a class

**File:** `src/lib/runtime/monitoring/health-monitor.ts`

The guidelines state: _"Use functional and declarative programming patterns; avoid classes."_ `HealthMonitor` is a class with mutable instance state. Convert to a factory function that returns a plain object with the same interface.

---

## 📊 Comparison: React 19, Vue 3, Svelte 5

The following table grades each framework on capabilities the custom-elements runtime either matches, partially implements, or is missing entirely.

| Capability                        |   React 19   |         Vue 3          |    Svelte 5    |        This Library        |
| --------------------------------- | :----------: | :--------------------: | :------------: | :------------------------: |
| Reactive state                    | ✅ useState  |    ✅ ref/reactive     | ✅ $state rune |           ✅ ref           |
| Derived/computed state            |  ✅ useMemo  |      ✅ computed       |  ✅ $derived   |   ✅ computed (memoized)   |
| Side-effect hook                  | ✅ useEffect |     ✅ watchEffect     |   ✅ $effect   |       ✅ watchEffect       |
| Template syntax                   |     JSX      | Template + directives  |  Compiled SFC  |      Tagged html\`\`       |
| Shadow DOM isolation              |  ❌ opt-in   |       ❌ opt-in        |   ❌ opt-in    |        ✅ always-on        |
| Zero external deps                |      ❌      |           ❌           |       ❌       |             ✅             |
| Works without build step          |      ❌      |           ❌           |       ❌       |             ✅             |
| Framework-agnostic                |      ❌      |           ❌           |       ❌       |             ✅             |
| JIT utility CSS (built-in)        |      ❌      |           ❌           |       ❌       |             ✅             |
| Built-in router                   |      ❌      |     ✅ vue-router      |       ❌       |             ✅             |
| Context / provide-inject          |      ✅      |           ✅           |   ✅ context   |     ✅ provide/inject      |
| Teleport / Portal                 |      ✅      |           ✅           |       ✅       |             ✅             |
| KeepAlive (cached components)     |      ✅      |           ✅           |       ❌       |             ✅             |
| Suspense boundary                 |      ✅      |           ✅           |       ❌       |             ❌             |
| Concurrent / priority rendering   |   ✅ Fiber   |           ❌           |       ❌       |             ❌             |
| Server components                 |    ✅ RSC    |           ❌           |       ❌       |             ❌             |
| SSR (renderToString)              |      ✅      |           ✅           |       ✅       |             ✅             |
| Client-side hydration             |      ✅      |           ✅           |       ✅       |             ❌             |
| Browser DevTools extension        |      ✅      |           ✅           |       ✅       |             ❌             |
| watchEffect (auto source)         | ❌ useEffect |           ✅           |   ✅ $effect   |             ✅             |
| Multiple lifecycle hooks per type |      ✅      |           ✅           |       ✅       |      ✅ (array-based)      |
| nextTick / queue flush            |      ✅      |      ✅ nextTick       |   ✅ tick()    |        ✅ nextTick         |
| Composables from outside render   |      ✅      |           ✅           |       ✅       |    ✅ createComposable     |
| SFC / co-located template         | ❌ JSX file  |        ✅ .vue         |   ✅ .svelte   |             ❌             |
| Compile-time optimization         |      ✅      |           ✅           |       ✅       |      ❌ runtime only       |
| Two-way bind with modifiers       |      ❌      | ✅ v-model.trim/number |    ✅ bind:    | ✅ :model.trim/number/lazy |
| Fine-grained slot API             | ✅ children  |     ✅ named slots     | ✅ named slots | ⚠️ native Shadow DOM slots |
| Animate list reorders (FLIP)      |      ❌      |   ✅ TransitionGroup   |  ✅ animate:   |         ⚠️ partial         |
| Error boundary component          |      ✅      |   ✅ onErrorCaptured   |       ❌       |   ❌ element-level only    |
| Strict/dev mode warnings          |      ✅      |           ✅           |       ❌       |    ✅ devWarn/devError     |
| HMR (hot module reload)           |      ✅      |           ✅           |       ✅       |             ✅             |
| Health monitoring / metrics       |      ❌      |           ❌           |       ❌       |             ✅             |

✦ Vue's `computed` is properly lazy and cached. This library's `computed` is also memoized with `cachedValue`/`isDirty` tracking; note that on every `.value` access the factory `fn()` is also called once in the consuming context to maintain synchronous dependency propagation (the result is discarded; only the cached value is returned).

---

## 🚀 What It Would Take to Surpass React, Vue, and Svelte

The library already has a **unique and defensible differentiator**: it produces real Web Components with native Shadow DOM that work in any environment — something none of the Big Three can claim out of the box. The roadmap below builds on that strength while closing the capability gap.

### Priority 1 — Fix Correctness Issues ✅ All Resolved

1. **~~Fix `computed()` memoization~~** ✅ Done — caching with `cachedValue`/`isDirty` is implemented.
2. **~~Fix lifecycle hook composition~~** ✅ Done — callbacks are stored in arrays and all are invoked.
3. **~~Remove the discovery render double-execution~~** ✅ Done — all side-effectful hooks (`watchEffect`, `watch`, `useOnConnected`, `useOnDisconnected`, `useOnAttributeChanged`, `useOnError`, `useEmit`, `useStyle`, `provide`, `inject`) now guard with `isDiscoveryRender()` and return early / return no-ops. The discovery render flag is isolated in `discovery-state.ts` to avoid the circular dependency between `hooks.ts` and `reactive.ts`.

### Priority 2 — Close the Critical API Gaps ✅ All Resolved

4. **~~Add `watchEffect(fn)`~~** ✅ Done — exported from `@jasonshimmy/custom-elements-runtime`.
5. **~~Add `provide()` / `inject()`~~** ✅ Done — exported from `@jasonshimmy/custom-elements-runtime`; uses `ShadowRoot` traversal.
6. **~~Add `nextTick()`~~** ✅ Done — exported from `@jasonshimmy/custom-elements-runtime`.
7. **~~Composable hooks outside render~~** ✅ Done — `createComposable()` is exported and allows hooks to be called from composable factories.

### Priority 3 — Runtime Architecture ✅ All Complete

8. **~~Split `vdom.ts`~~** ✅ Done — `vdom.ts` (3 562 lines) has been fully decomposed into four focused modules:
   - `vdom-helpers.ts` — private utilities (`hasValueProp`, `unwrapValue`, `writebackAttr`, `isNativeControl`, `coerceBooleanForNative`, `eventNameFromKey`, `isBooleanishForProps`) and shared internal types (`PropsMap`, `DirectiveSpec`, `VNodePropBag`, `VDomGlobal`)
   - `vdom-directives.ts` — all directive processors (`processModelDirective`, `processBindDirective`, `processShowDirective`, `processClassDirective`, `processStyleDirective`, `processRefDirective`, `processDirectives`)
   - `vdom-patch.ts` — core patching engine (`cleanupRefs`, `assignKeysDeep`, `patchProps`, `createElement`, `patchChildren`, `patch`, `vdomRenderer`)
   - `vdom.ts` — thin barrel re-exporter (36 lines) for backwards compatibility
   - `vdom-ssr.ts` — `renderToString` (previously extracted)
9. **~~Teleport~~** ✅ Done — `useTeleport()` is exported from `@jasonshimmy/custom-elements-runtime`.
10. **~~`KeepAlive` wrapper~~** ✅ Done — `registerKeepAlive()` / `<ce-keep-alive>` is exported from `@jasonshimmy/custom-elements-runtime`.

### Priority 4 — Developer Experience

11. **Browser DevTools extension** — a Chrome/Firefox panel that lists registered components, their current reactive state, render times, and event bus activity. This is the single biggest DX gap vs. React and Vue.
12. **`defineExpose()`-equivalent** — a hook to explicitly surface component methods and state for imperative access from parent contexts, avoiding the current pattern of accessing `element.context` directly.
13. **Optional SFC-style loader** — a Vite plugin that transforms `.ce` single-file component files (co-located template/script/style) into the `component()` call. This lowers onboarding friction for developers migrating from Vue or Svelte.
14. **`Suspense` boundary component** — a built-in `<ce-suspense>` custom element that catches async render Promises from descendants and shows a fallback until all children resolve.

### Priority 5 — Performance

15. **Compile-time template pre-parsing** — an optional Vite plugin that pre-compiles `html\`...\``tagged literals at build time into direct`h()` calls, eliminating the runtime string-parsing phase entirely. This is how Svelte achieves its size advantage.
16. **Shallow reactivity options** — expose `shallowRef()` that wraps only the top-level object without deep Proxy wrapping, for large data structures where deep reactivity is expensive.

---

## ✅ Strengths Worth Preserving

Despite the gaps above, the library has genuine architectural advantages that none of React, Vue, or Svelte can claim simultaneously:

- **True framework-agnostic components.** A component built with this library runs inside a React app, a Vue page, a plain HTML file, or a CMS template with zero adaptation. This is not a convenience — it solves a real enterprise problem.
- **Zero build-step for simple usage.** ESM imports from a CDN with tagged template literals and no JSX compiler required.
- **JIT CSS (built-in Tailwind-compatible utilities).** No separate PostCSS pipeline, no CSS file to maintain, utility classes are generated on demand from the template strings at runtime.
- **Native Shadow DOM isolation.** Component styles cannot bleed. No CSS Modules, no `:deep()`, no `scoped` attributes.
- **Full stack in one package.** Router, event bus, store, transitions, SSR, health monitoring — all without dependencies.
- **Health monitoring.** No major framework ships runtime health metrics. This is a genuine DX differentiator, especially for production debugging.

---

_Audit performed: March 2026 — `@jasonshimmy/custom-elements-runtime` v2.5.1 (updated to reflect resolved items)_
