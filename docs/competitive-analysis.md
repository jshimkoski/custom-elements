# 🏆 Competitive Analysis: Surpassing React, Vue, and Svelte

> **Scope:** A deep technical analysis of `@jasonshimmy/custom-elements-runtime` v2.5.1 covering (1) the full npm consumer API surface, (2) actionable paths to outcompete React 19, Vue 3, and Svelte 5, and (3) a targeted JIT CSS improvement plan aligned with Tailwind CSS v4 parity without bundle bloat.
>
> **Date:** March 2026

---

## 📦 What npm Consumers Receive

The package exposes nine tree-shakeable entry points. Consumers can import only what they need.

### Main Entry — `@jasonshimmy/custom-elements-runtime`

The complete reactive component runtime.

| Export                         | Type            | Description                                          |
| ------------------------------ | --------------- | ---------------------------------------------------- |
| `component(tag, fn)`           | Function        | Register a reactive custom element                   |
| `html`                         | Tagged template | Compile an HTML template into a VNode tree           |
| `css`                          | Tagged template | Raw CSS with template literal interpolation          |
| `ref(value)`                   | Function        | Create reactive mutable state                        |
| `computed(fn)`                 | Function        | Create memoized derived state                        |
| `watch(source, cb, opts)`      | Function        | Watch a reactive value for changes                   |
| `watchEffect(fn)`              | Function        | Auto-track reactive reads, re-run on change          |
| `useProps(defaults)`           | Hook            | Declare and read typed component props               |
| `useEmit()`                    | Hook            | Get a typed `emit(event, detail)` function           |
| `useStyle(fn)`                 | Hook            | Inject dynamic component styles                      |
| `useOnConnected(fn)`           | Hook            | Run a callback when the element connects to DOM      |
| `useOnDisconnected(fn)`        | Hook            | Run a callback when the element disconnects          |
| `useOnAttributeChanged(fn)`    | Hook            | Observe raw attribute changes                        |
| `useOnError(fn)`               | Hook            | Catch errors thrown inside the component             |
| `provide(key, value)`          | Hook            | Inject a value into context for descendants          |
| `inject(key)`                  | Hook            | Consume a value from ancestor context                |
| `createComposable(fn)`         | Function        | Composable factory usable outside render             |
| `useTeleport(target)`          | Hook            | Render subtree into a different DOM node             |
| `registerKeepAlive(tag)`       | Function        | Preserve component state on disconnect               |
| `createHealthMonitor()`        | Function        | Create a per-component health metrics tracker        |
| `getHealthMonitor()`           | Function        | Retrieve an existing health monitor                  |
| `getHealthStatus()`            | Function        | Get current health report                            |
| `updateHealthMetric()`         | Function        | Increment a named metric counter                     |
| `setDevMode(bool)`             | Function        | Toggle verbose dev-mode console logging              |
| `devLog(msg)`                  | Function        | Emit a dev-mode log                                  |
| `flushDOMUpdates()`            | Function        | Synchronously flush the pending render queue         |
| `nextTick()`                   | Function        | Returns a Promise that resolves after next render    |
| `decodeEntities(str)`          | Function        | Decode HTML entities (with `entities.json` fallback) |
| `unsafeHTML(str)`              | Function        | Wrap raw HTML for injection into a template          |
| `getCurrentComponentContext()` | Function        | Advanced: read the current render context            |

### Optional Entry Points

| Import Path               | Contents                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| `/ssr`                    | `renderToString()` — server-side rendering                                                  |
| `/transitions`            | `TransitionGroup`, FLIP list animation utilities                                            |
| `/directives`             | `when`, `each`, `match`, `anchorBlock`                                                      |
| `/directive-enhancements` | `model` two-way binding, event modifiers                                                    |
| `/event-bus`              | `GlobalEventBus` — pub/sub cross-component messaging                                        |
| `/store`                  | `createStore()` — lightweight global state                                                  |
| `/router`                 | Full client-side router: `initRouter`, `useRouter`, route matching, guards, lazy components |
| `/css/colors`             | `extendedColors` — full opt-in Tailwind-compatible color palette                            |

### CSS Assets

| Import Path          | Contents                                    |
| -------------------- | ------------------------------------------- |
| `/css`               | Bundled full stylesheet (reset + variables) |
| `/css/reset.css`     | Shadow DOM base reset only                  |
| `/css/variables.css` | CSS custom property design tokens only      |

---

## 📊 Full Feature Gap Table — v2.5.1 vs. the Big Three

| Capability                              | React 19 |      Vue 3      | Svelte 5 |  This Library   |
| --------------------------------------- | :------: | :-------------: | :------: | :-------------: |
| Reactive state (`ref`)                  |    ✅    |       ✅        |    ✅    |       ✅        |
| Derived/computed state                  |    ✅    |       ✅        |    ✅    |       ✅        |
| Watch / side-effect hook                |    ✅    |       ✅        |    ✅    |       ✅        |
| Auto-tracked `watchEffect`              |    ✅    |       ✅        |    ✅    |       ✅        |
| Provide / inject context                |    ✅    |       ✅        |    ✅    |       ✅        |
| Teleport / Portal                       |    ✅    |       ✅        |    ✅    |       ✅        |
| KeepAlive state cache                   |    ✅    |       ✅        |    ❌    |       ✅        |
| `nextTick` / queue flush                |    ✅    |       ✅        |    ✅    |       ✅        |
| Composables outside render              |    ✅    |       ✅        |    ✅    |       ✅        |
| HMR (hot module reload)                 |    ✅    |       ✅        |    ✅    |       ✅        |
| Two-way bind with modifiers             |    ❌    |       ✅        |    ✅    |       ✅        |
| Structural directives (`v-if` / `each`) |    ✅    |       ✅        |    ✅    |       ✅        |
| SSR renderToString                      |    ✅    |       ✅        |    ✅    |       ✅        |
| FLIP list reorder animation             |    ❌    |       ✅        |    ✅    |       ✅        |
| Built-in router                         |    ❌    | ✅ (Vue Router) |    ❌    |       ✅        |
| Cross-component event bus               |    ❌    |       ❌        |    ❌    |       ✅        |
| Health monitoring API                   |    ❌    |       ❌        |    ❌    |       ✅        |
| **Shadow DOM isolation**                |    ❌    |       ❌        |    ❌    |  ✅ **Unique**  |
| **Zero external dependencies**          |    ❌    |       ❌        |    ❌    |  ✅ **Unique**  |
| **Works without a build step**          |    ❌    |       ❌        |    ❌    |  ✅ **Unique**  |
| **Framework-agnostic composition**      |    ❌    |       ❌        |    ❌    |  ✅ **Unique**  |
| **Built-in JIT CSS engine**             |    ❌    |       ❌        |    ❌    |  ✅ **Unique**  |
| **Tailwind-compatible utility set**     |    ❌    |       ❌        |    ❌    |  ✅ **Unique**  |
| **Extended color palette (opt-in)**     |    ❌    |       ❌        |    ❌    |  ✅ **Unique**  |
| Suspense boundary                       |    ✅    |       ✅        |    ❌    |     ❌ Open     |
| Client-side hydration                   |    ✅    |       ✅        |    ✅    |     ❌ Open     |
| Error boundary component                |    ✅    |       ✅        |    ❌    |     ❌ Open     |
| Browser DevTools extension              |    ✅    |       ✅        |    ✅    |     ❌ Open     |
| `useExpose()` / imperative handle       |    ✅    |       ✅        |    ✅    |     ❌ Open     |
| SFC / co-located file format            |    ❌    |       ✅        |    ✅    |     ❌ Open     |
| Compile-time template optimization      |    ✅    |       ✅        |    ✅    |     ❌ Open     |
| Concurrent / prioritized rendering      |    ✅    |       ❌        |    ❌    |     ❌ Open     |
| Typed named slot API                    |    ✅    |       ✅        |    ✅    | ⚠️ Native slots |

---

## 🥇 Where This Library Already Wins

### 1. Native Web Standards — No Lock-In

React, Vue, and Svelte all output proprietary virtual DOM trees or compiled Svelte nodes. Components built with this runtime **are native `HTMLElement` subclasses**, directly readable by the browser's DevTools, accessible from any JavaScript context (`document.querySelector('my-component').someMethod()`), and embeddable in any framework or plain HTML page without adapters.

React's `@lit-labs/react` and Vue's unofficial adapters exist precisely because Web Components are the only true cross-framework component standard. This library targets that standard natively.

### 2. Shadow DOM Isolation is First-Class

React and Vue both require wrapper packages or manual `attachShadow()` calls to use Shadow DOM. This library renders every component into a Shadow Root by default. Consequences:

- CSS is scoped to the component with no class-name collisions
- Internal structure is hidden from parent document CSS
- The JIT CSS engine generates per-shadow-root stylesheets via `CSSStyleSheet.replaceSync()` — a single adopted stylesheet shared by all instances of the same component

### 3. Zero Dependencies, Zero Build Step

The entire runtime ships with no `node_modules` peer dependencies. It can be loaded directly from a CDN as a single ES module:

```html
<script type="module">
  import {
    component,
    ref,
    html,
  } from 'https://cdn.jsdelivr.net/npm/@jasonshimmy/custom-elements-runtime/dist/custom-elements-runtime.es.js';
  component('my-counter', () => {
    const count = ref(0);
    return html`<button @click="${() => count.value++}">
      Count: ${count.value}
    </button>`;
  });
</script>
```

This is something React and Vue fundamentally cannot offer at the sub-10KB level without a build pipeline.

### 4. Built-In JIT CSS

Tailwind CSS requires a separate package, a PostCSS pipeline, a configuration file, and a content scan. This library provides a Tailwind-compatible utility system **at runtime inside Shadow DOM** — no tooling required. The same utility class names (`flex`, `px-4`, `hover:bg-blue-500`, `sm:grid-cols-3`, `dark:text-neutral-100`) generate scoped CSS on demand per component.

### 5. Health Monitoring

No major framework ships built-in observability hooks. `createHealthMonitor()` provides render count tracking, error rate observation, and custom metric counters — directly accessible from application code or a future DevTools panel.

---

## 🔧 Priority Improvements to Beat the Competition

These are ordered by impact-to-effort ratio. Items with "**No new deps**" can be completed without adding any external dependencies.

### Priority 1 — `<ce-suspense>` Boundary _(Medium effort, No new deps)_

Closes the gap with React and Vue. Async `render()` functions are already supported. The remaining work is a `provide/inject` protocol where an ancestor `<ce-suspense>` intercepts in-flight Promises from descendants and swaps a `<slot name="fallback">` into view until they resolve.

This eliminates the most common complaint of "why doesn't this support async data loading boundaries?"

### Priority 2 — `useExpose()` Hook _(Low effort, No new deps)_

Vue's `defineExpose()` and React's `useImperativeHandle()` allow component authors to surface explicit imperative APIs. Currently the only way to call a method on a child component is to access `element._context` — an undocumented internal.

```ts
// Proposed implementation (hooks.ts — ~10 lines)
export function useExpose<T extends Record<string, unknown>>(api: T): void {
  if (!currentComponentContext)
    throw new Error('useExpose must be called during render');
  const host = (currentComponentContext as InternalComponentContext)
    ._host as HTMLElement;
  if (host) Object.assign(host, api);
}
```

The TypeScript interface augmentation to enable typed access on the element requires a small generic helper type added to `types.ts`.

### Priority 3 — `<ce-error-boundary>` Component _(Medium effort, No new deps)_

The internal `_runLogicWithinErrorBoundary` path already exists in `component/element-class.ts`. What's missing is bubbling uncaught errors upward through the component tree so an ancestor's `useOnError` can intercept them. This matches React's `ErrorBoundary` and Vue's `onErrorCaptured`.

### Priority 4 — `useSlots()` Typed Detection Hook _(Low-Medium effort, No new deps)_

Native Shadow DOM slots are functional. The gap is TypeScript autocomplete for which slot names exist and optional detection of whether a consumer has filled a slot:

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

Detection uses `slotchange` events on the shadow root, which are already part of the Shadow DOM spec and require no additional runtime machinery.

### Priority 5 — Client-Side Hydration _(High effort)_

Currently `renderToString` outputs static HTML with no client reactivation path. Hydration would detect existing Declarative Shadow DOM template nodes and skip DOM creation, only attaching the reactive runtime to the existing structure.

This eliminates the "double render" penalty for SSR pages and is the last major SSR gap.

### Priority 6 — Concurrent-Style Rendering _(Medium effort, No new deps)_

The scheduler in `src/lib/runtime/scheduler.ts` already batches DOM updates. Time-slicing long render passes using `scheduler.postTask()` (Chrome 94+) or `MessageChannel` yielding would allow the browser to serve higher-priority user interactions between component renders — matching React Fiber's headline feature:

```ts
async function flushQueue() {
  for (const renderFn of queue) {
    renderFn();
    if (frameDeadlineExceeded()) await yieldToMain(); // MessageChannel trick
  }
}
```

### Priority 7 — Browser DevTools Extension _(High effort, separate package)_

This is the biggest developer experience gap. A Chrome/Firefox extension reading from `window.__CER_DEVTOOLS__` (populated in dev mode by the runtime) could expose:

- Component tree with live prop/state inspection
- Render performance timeline per component
- Event bus live feed with payload inspection
- Store state diffs
- Health monitor metrics

---

## 🎨 JIT CSS: Closing the Tailwind v4 Gap Without Bundle Bloat

### Architecture Recap — Why the Runtime Approach Is Sound

Tailwind CSS operates at **build time**: it scans source files, generates only the CSS that's actually used, and ships a static file. This library operates at **runtime**: it parses class names from each Shadow DOM render and generates CSS on demand, cached per unique class string.

The trade-off is:

- **Tailwind**: zero KBs at runtime, but requires a build pipeline
- **This library**: ~15–20KB for the utility engine, but works without any tooling

The static `utilityMap` object (generated once at module init by `generateUtilities()`) stores hundreds of short CSS property strings. At minified size these cost roughly **8–12KB** before gzip and compress extremely well because CSS property strings have high redundancy. This is the correct architectural choice for a runtime system.

### Current Tailwind v4 Parity Score

| Category                                         | Tailwind v4 | This Library | Gap        |
| ------------------------------------------------ | :---------: | :----------: | ---------- |
| Display / position / overflow                    |     ✅      |      ✅      | None       |
| Flexbox (all axes)                               |     ✅      |      ✅      | None       |
| Grid (12-col, flow, auto-tracks)                 |     ✅      |      ✅      | None       |
| Typography (size, weight, tracking, leading)     |     ✅      |      ✅      | None       |
| Spacing (margin, padding, gap, inset)            |     ✅      |      ✅      | None       |
| Color system with CSS variable theming           |     ✅      |      ✅      | None       |
| Arbitrary values `prop-[value]`                  |     ✅      |      ✅      | None       |
| Arbitrary properties `[property:value]`          |     ✅      |      ✅      | None       |
| State variants (hover, focus, active, etc.)      |     ✅      |      ✅      | None       |
| Responsive breakpoints (sm → 2xl)                |     ✅      |      ✅      | None       |
| Container queries (`@sm:` → `@7xl:`)             |     ✅      |      ✅      | None       |
| Dark mode (media + class)                        |     ✅      |      ✅      | None       |
| Group / peer variants                            |     ✅      |      ✅      | None       |
| Composable CSS-variable transforms               |     ✅      |      ✅      | None       |
| Filter & backdrop-filter (composed)              |     ✅      |      ✅      | None       |
| Ring utilities                                   |     ✅      |      ✅      | None       |
| Gradients (linear, radial, conic)                |     ✅      |      ✅      | None       |
| Prose typography system                          |     ✅      |      ✅      | None       |
| `motion-reduce:` / `motion-safe:`                |     ✅      |      ✅      | None       |
| `rtl:` / `ltr:`                                  |     ✅      |      ✅      | None       |
| `print:`                                         |     ✅      |      ✅      | None       |
| FLIP list animation                              |     ✅      |      ✅      | None       |
| `first:` / `last:` / `odd:` / `even:`            |     ✅      |      ✅      | None       |
| **`size-*`** (w + h shorthand)                   |     ✅      |      ❌      | See Gap 1  |
| **`data-[*]:` variant**                          |     ✅      |      ❌      | See Gap 2  |
| **`has-[*]:` variant**                           |     ✅      |      ❌      | See Gap 3  |
| **`not-[*]:` / `in-[*]:` variants**              |     ✅      |      ❌      | See Gap 4  |
| **`text-balance`, `text-pretty`, `text-nowrap`** |     ✅      |      ❌      | See Gap 5  |
| **`content-*`** (pseudo-element content)         |     ✅      |      ❌      | See Gap 6  |
| **`forced-colors:` variant**                     |     ✅      |      ❌      | See Gap 7  |
| **`supports-[*]:` variant**                      |     ✅      |      ❌      | See Gap 8  |
| **`starting:` (`@starting-style`)**              |     ✅      |      ❌      | See Gap 9  |
| **`placeholder:` variant**                       |     ✅      |      ❌      | See Gap 10 |
| **`file:` variant**                              |     ✅      |      ❌      | See Gap 11 |
| **`marker:` variant**                            |     ✅      |      ❌      | See Gap 12 |
| **`selection:` variant**                         |     ✅      |      ❌      | See Gap 13 |
| **`open:` variant**                              |     ✅      |      ❌      | See Gap 14 |

---

### 🔧 JIT CSS Gaps — Detailed Fix Plan

Every gap below can be closed **without bloating the bundle**. All fixes are pure string additions to `generateUtilities()` or small additions to `selectorVariants` in `style.ts`.

---

#### Gap 1 — `size-*` Shorthand _(Trivial — ~5 lines)_

Tailwind v4's `size-*` sets both `width` and `height` simultaneously. Developers use it constantly for icons, avatars, and square UI elements.

**Fix:** Add `size-*` as a dynamic parser alongside spacing utilities. Since `spacingProps` already handles `w` and `h`, add a `size` entry:

```ts
// In spacingProps:
size: ['width', 'height'],

// Static additions to utilityMap:
'size-full': 'width:100%;height:100%;',
'size-screen': 'width:100dvw;height:100dvh;',
'size-auto': 'width:auto;height:auto;',
'size-fit': 'width:fit-content;height:fit-content;',
'size-min': 'width:min-content;height:min-content;',
'size-max': 'width:max-content;height:max-content;',
```

The dynamic `parseSpacing` function then handles `size-4`, `size-1/2`, etc. automatically since `spacingProps.size` is now defined.

**Bundle cost:** ~200 bytes.

---

#### Gap 2 — `data-[*]:` Arbitrary Data Attribute Variants _(Low effort — ~15 lines)_

Tailwind's `data-[state=active]:bg-blue-500` allows styling on arbitrary `data-*` attribute states. This is heavily used by headless UI libraries (Headless UI, Radix, etc.) where state is communicated via `data-*` attributes.

**Fix:** Add a parser branch in `generateRule()` for the `data-[...]` prefix:

```ts
// In the variant parser, after handling `group-*` and `peer-*`:
const dataMatch = variant.match(/^data-\[(.+)\]$/);
if (dataMatch) {
  const attrSelector = dataMatch[1].replace(/=/g, '="').replace(/\]$/, '"]');
  return (sel: string, body: string) => `${sel}[data-${attrSelector}]{${body}}`;
}
```

This matches how Tailwind handles it: `data-[state=active]:` → `[data-state="active"]`.

**Bundle cost:** ~300 bytes of parser logic.

---

#### Gap 3 — `has-[*]:` CSS `:has()` Variant _(Low effort — ~15 lines)_

CSS `:has()` is now Baseline 2023 (all major browsers). It allows parent-based conditional styling: `has-[input:checked]:bg-blue-100` styles a container blue when it contains a checked input.

**Fix:** Add to the variant parser:

```ts
const hasMatch = variant.match(/^has-\[(.+)\]$/);
if (hasMatch) {
  return (sel: string, body: string) =>
    `${insertPseudoBeforeCombinator(sel, `:has(${hasMatch[1]})`)}{${body}}`;
}
```

**Bundle cost:** ~200 bytes.

---

#### Gap 4 — `not-[*]:` and `in-[*]:` Variants _(Low effort — ~20 lines)_

Tailwind v4 added `not-*` (using `:not()`) and `in-*` (using `:is()` for ancestor matching). Both are now CSS Baseline.

```ts
// not-[.active]: styles element when it does NOT match the selector
const notMatch = variant.match(/^not-\[(.+)\]$/);
if (notMatch) {
  return (sel: string, body: string) =>
    `${insertPseudoBeforeCombinator(sel, `:not(${notMatch[1]})`)}{${body}}`;
}

// in-[.dark]: styles element when inside an ancestor matching the selector
const inMatch = variant.match(/^in-\[(.+)\]$/);
if (inMatch) {
  return (sel: string, body: string) => `${inMatch[1]} ${sel}{${body}}`;
}
```

**Bundle cost:** ~250 bytes.

---

#### Gap 5 — `text-balance`, `text-pretty`, `text-nowrap` _(Trivial — 3 lines)_

Modern CSS `text-wrap` utilities for improved line-breaking. `text-balance` distributes lines evenly (great for headings), `text-pretty` avoids orphaned last words (great for paragraphs), `text-nowrap` prevents wrapping.

**Fix:** Add to `generateUtilities()`:

```ts
'text-wrap': 'text-wrap:wrap;',
'text-nowrap': 'text-wrap:nowrap;',
'text-balance': 'text-wrap:balance;',
'text-pretty': 'text-wrap:pretty;',
```

**Bundle cost:** ~80 bytes. Zero downside.

---

#### Gap 6 — `content-*` Utilities _(Low effort — ~10 lines)_

The CSS `content` property is used with `::before` and `::after` pseudo-elements, combined with the `before:` and `after:` variants this library already supports.

```ts
'content-none': "content:none;",
'content-empty': "content:'';",
```

For arbitrary content values (`content-['hello']`), add to the arbitrary parser:

```ts
if (prop === 'content') return `content:${val};`;
```

**Bundle cost:** ~150 bytes.

---

#### Gap 7 — `forced-colors:` Variant _(Trivial — 1 line)_

`@media (forced-colors: active)` targets Windows High Contrast mode and other accessibility color-forcing displays. Tailwind provides `forced-colors:` as a first-class variant.

**Fix:** Add to `mediaVariants`:

```ts
'forced-colors': '(forced-colors: active)',
```

**Bundle cost:** ~50 bytes.

---

#### Gap 8 — `supports-[*]:` Variant _(Low effort — ~10 lines)_

`@supports` queries allow progressively enhanced styling for CSS features. `supports-[display:grid]:grid` enables a utility only when the browser supports `display:grid`.

**Fix:**

```ts
const supportsMatch = variant.match(/^supports-\[(.+)\]$/);
if (supportsMatch) {
  const cssFeature = supportsMatch[1].replace(/_/g, ' ');
  return (sel: string, body: string) =>
    `@supports (${cssFeature}){${sel}{${body}}}`;
}
```

**Bundle cost:** ~200 bytes.

---

#### Gap 9 — `starting:` (`@starting-style`) _(Low effort — ~10 lines)_

`@starting-style` is a Baseline 2024 feature that enables CSS entry transitions — animating from an initial state when an element first appears in the DOM without JavaScript. It closes the gap where CSS `transition` properties only animate changes to existing elements, not the initial insertion.

```css
/* Example: fade in when inserted */
.starting\:opacity-0 {
  @starting-style {
    opacity: 0;
  }
}
```

**Fix:**

```ts
if (variant === 'starting') {
  return (sel: string, body: string) => `@starting-style{${sel}{${body}}}`;
}
```

**Bundle cost:** ~150 bytes.

---

#### Gap 10–14 — Missing Pseudo-Element/State Variants _(Trivial — 5–10 lines each)_

These are all single-line additions to `selectorVariants`:

| Variant        | CSS Output                   | Use Case                                     |
| -------------- | ---------------------------- | -------------------------------------------- |
| `placeholder:` | `::placeholder`              | Style `<input>` placeholder text             |
| `file:`        | `::file-selector-button`     | Style file input button                      |
| `marker:`      | `::marker`                   | Style list item bullets/numbers              |
| `selection:`   | `::selection`                | Style text selection highlight               |
| `open:`        | `:is([open], :popover-open)` | Style open `<details>`, `<dialog>`, popovers |

```ts
// Additions to selectorVariants:
placeholder: (sel, body) => `${sel}::placeholder{${body}}`,
file: (sel, body) => `${sel}::file-selector-button{${body}}`,
marker: (sel, body) => `${sel}::marker{${body}}`,
selection: (sel, body) => `${sel}::selection{${body}}`,
open: (sel, body) => `${insertPseudoBeforeCombinator(sel, ':is([open],:popover-open)')}{${body}}`,
```

**Bundle cost:** ~200 bytes total for all five.

---

### 🗜️ Bundle Size Analysis — Is the JIT Engine Bloated?

**Short answer: No.** Here is the breakdown:

| Component                                                         | Approx. Minified Size     | Notes                                                     |
| ----------------------------------------------------------------- | ------------------------- | --------------------------------------------------------- |
| `utilityMap` static entries                                       | ~8KB                      | Hundreds of short CSS strings — compresses to ~2.5KB gzip |
| Color system + `colors` object                                    | ~3KB                      | CSS variable references, not raw hex                      |
| Parsing functions (`parseSpacing`, `parseColorWithOpacity`, etc.) | ~4KB                      | All utility parsing logic                                 |
| Base reset (`baseReset`)                                          | ~2KB                      | Shared singleton                                          |
| Variant maps + `generateRule`                                     | ~2KB                      | Selector and media variant logic                          |
| Prose system                                                      | ~8KB                      | Loaded lazily via `getProseSheet()`                       |
| **Total style.ts contribution**                                   | **~27KB raw / ~8KB gzip** |                                                           |

For comparison, Tailwind CSS v4's `@tailwindcss/vite` plugin adds 0KB to the runtime but requires a full build pipeline. For environments where a build step is unavailable, this library's ~8KB gzip JIT engine is the only viable alternative.

**Where size can be reclaimed without losing functionality:**

1. **The prose system** (~8KB) is already lazy-loaded — it only injects CSS when `prose` classes are detected on a component. No action needed.

2. **The color definition object `fallbackHex`** currently lives inside `style.ts`. Moving the full Tailwind-compatible color palette to `css/colors.ts` (already done for the extended palette) and making the core palette reference CSS variables only (already done — `colors` exports `var(--cer-color-*, #fallback)`) keeps the runtime lean.

3. **The `generateUtilities()` function** runs exactly once at module init and stores the result in `utilityMap`. This is correct — calling it per-component or per-render would be wasteful. The current approach is optimal.

4. **Future improvement:** The `selectorVariants` and `mediaVariants` objects and all `parse*` functions are currently unconditionally bundled. Splitting `style.ts` into focused sub-modules (`style-variants.ts`, `style-colors.ts`, `style-spacing.ts`) and re-exporting from a barrel would allow consumers who only use a subset of features to tree-shake the rest — provided the `generateJITCSS` orchestrator is also split.

---

## 🎯 Recommended Immediate Actions

Ordered by impact, effort, and ability to complete without new dependencies:

| #   | Action                                                                 | Effort  | Bundle Δ | Gap Closed Against          |
| --- | ---------------------------------------------------------------------- | ------- | -------- | --------------------------- |
| 1   | Add `size-*` utility                                                   | Trivial | +200B    | Tailwind v4                 |
| 2   | Add `text-balance`, `text-pretty`, `text-nowrap`                       | Trivial | +80B     | Tailwind v4                 |
| 3   | Add `placeholder:`, `file:`, `marker:`, `selection:`, `open:` variants | Trivial | +200B    | Tailwind v4                 |
| 4   | Add `forced-colors:` media variant                                     | Trivial | +50B     | Tailwind v4 + Accessibility |
| 5   | Add `content-none`, `content-empty`, arbitrary `content-[*]`           | Low     | +150B    | Tailwind v4                 |
| 6   | Add `data-[*]:` variant                                                | Low     | +300B    | Tailwind v4 + Headless UI   |
| 7   | Add `has-[*]:` variant                                                 | Low     | +200B    | Tailwind v4                 |
| 8   | Add `not-[*]:` and `in-[*]:` variants                                  | Low     | +250B    | Tailwind v4                 |
| 9   | Add `starting:` (`@starting-style`) variant                            | Low     | +150B    | Tailwind v4                 |
| 10  | Add `supports-[*]:` variant                                            | Low     | +200B    | Tailwind v4                 |
| 11  | Implement `useExpose()` hook                                           | Low     | +~100B   | React, Vue, Svelte          |
| 12  | Implement `useSlots()` typed detection                                 | Medium  | +~300B   | Vue, Svelte                 |
| 13  | Implement `<ce-suspense>` boundary                                     | Medium  | +~500B   | React, Vue                  |
| 14  | Implement `<ce-error-boundary>`                                        | Medium  | +~400B   | React, Vue                  |
| 15  | Implement concurrent-style rendering                                   | Medium  | +~500B   | React                       |

Items 1–10 collectively add under **1.8KB raw** to the bundle (~500B gzip). Every single one is a pure addition — no existing behavior changes.

---

## 🧭 Strategic Summary

This library already leads in areas that no single competitor can match simultaneously:

- **Shadow DOM isolation** — the only correct way to ship truly encapsulated components
- **Zero dependencies** — no `node_modules` footprint
- **No build step required** — usable from a CDN via ESM import
- **Framework-agnostic** — usable inside React, Vue, Angular, Svelte, or plain HTML
- **Built-in JIT utility CSS** — Tailwind-compatible without Tailwind's tooling requirement
- **Composable CSS-variable transforms, filters, backdrop-filters** — on par with Tailwind v4
- **Full FLIP animation** — on par with Vue's `<TransitionGroup>`
- **Built-in router** — React doesn't ship one at all
- **Health monitoring API** — unique in the framework space

The gaps that remain (Suspense, hydration, DevTools, `useExpose`, typed slots) are all well-defined and achievable without architectural rewrites. The JIT CSS gaps vs. Tailwind v4 are individually trivial to close and collectively cost less than 2KB additional bundle weight.

Completing the trivial and low-effort items in the table above — particularly `size-*`, modern text-wrap utilities, the five missing pseudo-element variants, `data-[*]:`, `has-[*]:`, and `useExpose()` — would represent **zero regressions, minimal bundle impact, and substantial developer experience improvements** that no build-time framework can match at runtime.

---

_Analysis compiled: March 2026 — `@jasonshimmy/custom-elements-runtime` v2.5.1_
