# 🗺️ JIT CSS Roadmap

A comprehensive plan for evolving the JIT CSS engine across five key areas: opt-in architecture, extended color support, Tailwind CSS 4 parity, non-Shadow DOM usage, and additional improvements.

---

## 1. 🔌 Make JIT CSS Optional via `useJITCSS()`

### Status: ✅ Implemented

The JIT CSS engine is now exclusively exported from `@jasonshimmy/custom-elements-runtime/jit-css`. It is not present in the root entry (`@jasonshimmy/custom-elements-runtime`) at all. Consumers who never import from the `/jit-css` subpath get zero JIT engine code in their bundle — guaranteed, regardless of bundler tree-shaking support.

### Original rationale

The JIT CSS engine in `src/lib/runtime/style.ts` is the single largest module in the library. For users who only need `useStyle()` (raw CSS strings), the utility map, parser, and variant engine are dead weight. Making JIT CSS opt-in via its own entry point is a clean, principled separation of concerns and enables a dramatically smaller base bundle.

### Original problem (resolved)

`render.ts` called `jitCSS(aggregatedHtml)` on every render cycle, regardless of whether the component author ever wrote a utility class. There was no way to opt out, and `style.ts` shipped in full every time.

### Proposed architecture

**Split `style.ts` into two modules:**

| Module                              | Contents                                                                                                                         | Always bundled?            |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `src/lib/runtime/style-core.ts`     | `css()`, `minifyCSS()`, `sanitizeCSS()`, `baseReset`, `getBaseResetSheet()`, `useStyle()` internals, `colors` export             | ✅ Yes                     |
| `src/lib/runtime/jit-css-engine.ts` | `generateUtilities()`, `generateRule()`, `jitCSS()`, all variant maps, `parseColorClass()`, `parseArbitrary()`, `parseSpacing()` | ❌ Tree-shaken when unused |

**Add a `useJITCSS()` hook:**

```ts
// src/lib/runtime/hooks.ts (new export)
export function useJITCSS(options?: JITCSSOptions): void;
```

`useJITCSS()` registers the component with a module-level `jitCSSEnabledComponents` `WeakSet<ShadowRoot>`. The render engine checks this set before calling `jitCSS()`.

**Add a global opt-in for app-level control:**

```ts
// src/lib/jit-css.ts (dedicated entry — not the root entry)
export function enableJITCSS(options?: JITCSSOptions): void;
```

Calling `enableJITCSS()` once sets a global flag that enables JIT CSS for **all** components — useful for projects that heavily use utilities everywhere and want v2 behaviour without migrating each component.

**`JITCSSOptions` interface:**

```ts
export interface JITCSSOptions {
  /**
   * Include extended Tailwind color families.
   * - `true` — all 21 families
   * - `string[]` — only the listed families, e.g. `['slate', 'blue', 'rose']`
   */
  extendedColors?: boolean | string[];
  /** Custom color palette entries to add to the JIT engine */
  customColors?: Record<string, Record<string, string>>;
  /** Disable specific variant groups for smaller output */
  disableVariants?: Array<
    'responsive' | 'dark' | 'motion' | 'print' | 'container'
  >;
}
```

**New build entry point:**

Add `'jit-css': resolve(__dirname, 'src/lib/jit-css.ts')` to `vite.config.ts`. This entry re-exports the JIT engine + hook so consumers can import it separately:

```ts
import {
  useJITCSS,
  enableJITCSS,
} from '@jasonshimmy/custom-elements-runtime/jit-css';
```

### Migration path

This is a **breaking change** — the migration announcement:

> JIT CSS must now be explicitly imported from `@jasonshimmy/custom-elements-runtime/jit-css`. Importing `useJITCSS`, `enableJITCSS`, or related symbols from the root entry (`@jasonshimmy/custom-elements-runtime`) is no longer supported. Update your imports and add `useJITCSS()` to components that use utility classes, or call `enableJITCSS()` once at your app entry point to enable JIT CSS globally.

Codemods or ESLint rules can assist migration.

### Bundle size impact

| Scenario                             | Estimated gzip size reduction                            |
| ------------------------------------ | -------------------------------------------------------- |
| App uses only `useStyle()`           | ~18–22 KB saved (full utility map + parser removed)      |
| App calls `enableJITCSS()` globally  | No change (identical to current)                         |
| App uses `useJITCSS()` per-component | Same as global, but enables future per-component purging |

---

## 2. 🎨 Extended Color Palette in JIT CSS

### Status: ✅ Implemented

### Original problem

`extendedColors` (`src/lib/css/colors.ts`) exports the full Tailwind palette as hex values for use with TypeScript. However, `parseColorClass()` inside `style.ts` only recognizes the seven semantic palette names (`neutral`, `primary`, `secondary`, `success`, `info`, `warning`, `error`) plus `white`, `black`, `transparent`, `current`. This means writing `bg-violet-500` or `text-rose-300` in a template produces **no CSS output** — silently broken.

### Plan

#### A. Register extended colors in the JIT engine

Expand `parseColorClass()` to include all 21 extended palette names. The cleanest implementation merges `extendedColors` into the existing color lookup map at module initialisation time. No runtime performance cost — it is a one-time map construction.

```ts
// Inside jit-css-engine.ts
import { extendedColors } from '../css/colors';

const ALL_COLOR_PALETTES: Record<string, Record<string, string>> = {
  ...semanticColors, // neutral, primary, secondary, …
  ...extendedColors, // slate, gray, zinc, red, orange, violet, rose, …
};
```

This makes `bg-blue-500`, `text-emerald-700`, `border-rose-300`, `shadow-violet-200`, etc. work identically to semantic colors, including the `/opacity` modifier syntax.

When `useJITCSS()` is used with `extendedColors: false` (the default to minimise bundle size), only the semantic palette is registered. Setting `extendedColors: true` or calling `enableJITCSS({ extendedColors: true })` merges all 21 families in. Passing an array (e.g. `extendedColors: ['slate', 'blue']`) merges only those specific families.

#### B. Extend `variables.css` with extended color CSS variables

Add `--cer-color-{name}-{shade}` CSS variable declarations for all 21 extended color scales to `src/lib/css/variables.css`. This makes extended colors themeable the same way semantic colors are today:

```css
/* variables.css — auto-generated block for extended palette */
:root {
  --cer-color-slate-50: #f8fafc;
  --cer-color-slate-100: #f1f5f9;
  /* … 950 shades × 21 colors … */
}
```

Because `variables.css` is already a separate entry point it can be loaded lazily and does not affect the base bundle.

#### C. `useJITCSS({ customColors })` for user-defined palettes

Allow component authors to register project-specific color scales at the hook call site. These are merged into the per-component (or global) color lookup:

```ts
useJITCSS({
  customColors: {
    brand: { '500': '#e63946', '600': '#c1121f' },
  },
});
// Now bg-brand-500, text-brand-600, etc. all generate CSS
```

---

## 3. 🌊 Closing the Tailwind CSS 4 Feature Gap

### Status: ✅ Mostly Implemented

Sections 3.1–3.10, 3.12, and 3.13 are fully implemented. Section 3.11 (`oklch`/`color-mix()`) is partially implemented: `color-mix()` is used for opacity modifiers and arbitrary `bg-[oklch(...)]` values already work, but `variables.css` still defines color tokens as hex rather than `oklch()`.

The following are the most impactful gaps between the current JIT engine and Tailwind CSS 4, ordered by implementation value.

### 3.1 Logical (flow-relative) properties

Replace physical `margin-left`/`right` with CSS logical properties for better RTL and writing-mode support.

| Utility                      | CSS property                                            |
| ---------------------------- | ------------------------------------------------------- |
| `ms-4`, `me-4`               | `margin-inline-start`, `margin-inline-end`              |
| `ps-4`, `pe-4`               | `padding-inline-start`, `padding-inline-end`            |
| `bs-4`, `be-4`               | `border-block-start`, `border-block-end`                |
| `is-4`, `ie-4`               | `inline-size`, `block-size` or `inset-inline-start/end` |
| `start-4`, `end-4`           | `inset-inline-start`, `inset-inline-end`                |
| `border-s-*`, `border-e-*`   | `border-inline-start/end-width`                         |
| `rounded-s-*`, `rounded-e-*` | logical border-radius                                   |
| `text-start`, `text-end`     | `text-align: start / end`                               |

All of these follow the same spacing scale as their physical equivalents and fit cleanly into the existing `spacingProps` map and `generateUtilities()` loop.

### 3.2 `text-shadow-*` utilities

Tailwind 4 ships `text-shadow-*`. High design value, zero complexity:

```ts
'text-shadow-xs': 'text-shadow:0 1px 1px rgb(0 0 0 / 0.05);',
'text-shadow-sm': 'text-shadow:0 1px 2px rgb(0 0 0 / 0.15);',
'text-shadow':    'text-shadow:0 1px 3px rgb(0 0 0 / 0.3);',
'text-shadow-md': 'text-shadow:0 2px 4px rgb(0 0 0 / 0.3);',
'text-shadow-lg': 'text-shadow:0 4px 8px rgb(0 0 0 / 0.3);',
'text-shadow-xl': 'text-shadow:0 6px 16px rgb(0 0 0 / 0.3);',
'text-shadow-2xl':'text-shadow:0 8px 24px rgb(0 0 0 / 0.3);',
'text-shadow-none':'text-shadow:none;',
```

`text-shadow-{color}` should also be parseable via `parseColorClass()` to allow `text-shadow-primary-500/30`.

### 3.3 `mask-*` utilities

CSS masking is broadly supported and increasingly used for image effects and decorative UI:

```ts
'mask-none':       'mask-image:none;',
'mask-linear-to-b':'mask-image:linear-gradient(to bottom,black,transparent);',
'mask-radial':     'mask-image:radial-gradient(ellipse at center,black,transparent);',
// … directional variants following bg-linear-to-* pattern
'mask-size-contain':'mask-size:contain;',
'mask-size-cover':  'mask-size:cover;',
'mask-no-repeat':   'mask-repeat:no-repeat;',
'mask-alpha':       'mask-mode:alpha;',
'mask-luminance':   'mask-mode:luminance;',
```

### 3.4 `field-sizing-content` utility

```ts
'field-sizing-content': 'field-sizing:content;',
'field-sizing-fixed':   'field-sizing:fixed;',
```

Enables auto-resizing `<textarea>` and `<input>` elements without JavaScript — increasingly used in modern UI.

### 3.5 `color-scheme` / `scheme-*` utilities

```ts
'scheme-light': 'color-scheme:light;',
'scheme-dark':  'color-scheme:dark;',
'scheme-both':  'color-scheme:light dark;',
'scheme-only-light': 'color-scheme:only light;',
'scheme-only-dark':  'color-scheme:only dark;',
```

These control browser-native UI elements (scrollbars, inputs, selects) to match the active color scheme.

### 3.6 `font-stretch-*` utilities

```ts
'font-stretch-ultra-condensed': 'font-stretch:ultra-condensed;',
'font-stretch-extra-condensed': 'font-stretch:extra-condensed;',
'font-stretch-condensed':       'font-stretch:condensed;',
'font-stretch-semi-condensed':  'font-stretch:semi-condensed;',
'font-stretch-normal':          'font-stretch:normal;',
'font-stretch-semi-expanded':   'font-stretch:semi-expanded;',
'font-stretch-expanded':        'font-stretch:expanded;',
'font-stretch-extra-expanded':  'font-stretch:extra-expanded;',
'font-stretch-ultra-expanded':  'font-stretch:ultra-expanded;',
```

### 3.7 `inert:` variant

The `inert` global HTML attribute is widely used for accessibility (modals, drawers). Add an `inert:` state variant:

```ts
variants['inert'] = (sel, body) => `${sel}[inert] { ${body} }`;
```

### 3.8 `flow-root` display

```ts
'flow-root': 'display:flow-root;',
```

Establishes a new block formatting context — commonly used instead of clearfix hacks.

### 3.9 Extend cursor utilities

Add missing Tailwind 4 cursors: `cursor-zoom-in`, `cursor-zoom-out`, `cursor-cell`, `cursor-crosshair`, `cursor-copy`, `cursor-alias`, `cursor-context-menu`, `cursor-vertical-text`, `cursor-no-drop`, `cursor-progress`, `cursor-col-resize`, `cursor-row-resize`, `cursor-ew-resize`, `cursor-ns-resize`, `cursor-nesw-resize`, `cursor-nwse-resize`, `cursor-all-scroll`.

### 3.10 CSS `@layer` integration

Tailwind 4 outputs all styles into named cascade layers (`@layer base`, `@layer utilities`, etc.) for deterministic specificity. Inside Shadow DOM this is less critical (scoping already isolates styles), but it would benefit the non-Shadow DOM path (§4):

```css
@layer cer-base {
  /* baseReset */
}
@layer cer-utilities {
  /* JIT output */
}
@layer cer-user {
  /* useStyle() output */
}
```

Layer order means user styles always win over generated utilities without needing `!important`.

### 3.11 `oklch` / `color-mix()` support

Tailwind 4 uses `oklch` natively and `color-mix()` for opacity modifiers. For the current codebase, this is an incremental improvement:

- Allow arbitrary values like `bg-[oklch(60%_0.15_200)]` — this already works via the arbitrary value parser.
- Replace `rgb(R G B / 0.N)` opacity modifier output with `color-mix(in srgb, color N%, transparent)` — better browser compositing behaviour and consistent with Tailwind 4 output.
- Add `--cer-color-{name}-{shade}` as `oklch(...)` values in `variables.css` as an opt-in override block.

### 3.12 `grid-cols-subgrid` / `grid-rows-subgrid`

```ts
'grid-cols-subgrid': 'grid-template-columns:subgrid;',
'grid-rows-subgrid':  'grid-template-rows:subgrid;',
```

Now broadly supported and commonly needed for aligned grid children.

### 3.13 Additional spacing scale values

Tailwind 4 expands the spacing scale with half-step values (`0.5`, `1.5`, `2.5`, `3.5`) and larger tokens (`72`, `80`, `96`). Current spacing uses `0.25rem` base. Add explicit tokens for `1.5`, `2.5`, `3.5`, `72` (`18rem`), `80` (`20rem`), `96` (`24rem`) in `spacingProps`.

---

## 4. ⚡ Non-Shadow DOM JIT CSS

### Status: ✅ Implemented

Both the runtime DOM scanner (`createDOMJITCSS` in `@jasonshimmy/custom-elements-runtime/dom-jit-css`) and the Vite plugin (`cerJITCSS` in `@jasonshimmy/custom-elements-runtime/vite-plugin`) are shipped. See [DOM JIT CSS docs](./dom-jit-css.md) and [Vite Plugin docs](./vite-plugin.md).

> **Implementation note:** Section 4.1 below describes `insertRule()` as the planned injection strategy, but the actual implementation uses `replaceSync()` instead. `insertRule()` does not support nested at-rules (`@media`, `@container`), which are required for responsive and dark-mode variants. `replaceSync()` replaces the accumulated stylesheet in one call, which correctly handles all at-rule nesting.

Supporting JIT CSS outside of Web Components requires a different injection strategy. Two complementary approaches are recommended.

### 4.1 Runtime DOM scanner (highest priority)

A standalone runtime module that watches real DOM elements for class changes and injects a shared `<style>` element into the host document. **This must be extremely performant** — the design below prioritises this above all else.

#### API

```ts
import { createDOMJITCSS } from '@jasonshimmy/custom-elements-runtime/dom-jit-css';

// Mount on document body (scans all descendants)
const jit = createDOMJITCSS();
jit.mount();

// Mount on a specific container
const jit = createDOMJITCSS({ root: document.getElementById('app')! });
jit.mount();

// Destroy (removes stylesheet, disconnects observer)
jit.destroy();
```

#### `data-jitcss` attribute semantics

| Attribute value                                       | Behaviour                                                        |
| ----------------------------------------------------- | ---------------------------------------------------------------- |
| `data-jitcss` (no value) or `data-jitcss="container"` | Scopes the observer to that element and its subtree              |
| `data-jitcss="self"`                                  | Only processes classes on that exact element, not descendants    |
| `data-jitcss="global"`                                | Observer covers `document.body` (useful on `<html>` or `<body>`) |

When `createDOMJITCSS()` is called with no `root`, it auto-detects all `[data-jitcss]` elements and registers an observer for each.

#### Performance architecture

The key performance decisions:

**1. Incremental class delta processing**

Never reprocess the entire DOM. Maintain a `processedClasses: Set<string>` that grows monotonically. On a MutationObserver callback, extract only the **new** class names added since last update and pass only the delta to the rule generator.

```
MutationObserver callback
  → extract classList from changed nodes
  → diff against processedClasses Set
  → pass delta to jitCSS() (delta string, not full DOM scan)
  → append new rules to shared CSSStyleSheet
  → update processedClasses
```

This means `jitCSS()` is doing minimal work per update — typically 1–3 new classes.

**2. Micro-task batching via `queueMicrotask`**

Multiple DOM mutations in a single tick (e.g., framework rendering a list) are batched into one generator call:

```ts
let pending = new Set<string>();
let scheduled = false;

function scheduleFlush() {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    flushPending();
  });
}
```

`queueMicrotask` is faster than `requestAnimationFrame` for CSS injection because styles need to be present before the browser paints.

**3. CSSStyleSheet.insertRule() for incremental updates**

Instead of calling `replaceSync()` on every update (which forces a full style recalculation), use `insertRule()` to append only new rules to the constructable stylesheet. This is O(new rules), not O(all rules).

```ts
const sheet = new CSSStyleSheet();
document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];

// On update — only insert new rules
for (const rule of newRules) {
  sheet.insertRule(rule, sheet.cssRules.length);
}
```

**4. MutationObserver configuration: minimum viable observation**

```ts
observer.observe(root, {
  subtree: true,
  attributes: true,
  attributeFilter: ['class'], // Only watch class attribute changes
  childList: true, // Watch for new elements
  characterData: false, // Never needed
});
```

On `childList` mutations, only scan the `addedNodes` list (not the full tree).

**5. Initial scan with `TreeWalker`**

`TreeWalker` with `NodeFilter.SHOW_ELEMENT` is the fastest way to do an initial full-tree class extraction — faster than `querySelectorAll('*')` and avoids creating an array of all elements.

**6. No `getComputedStyle` calls**

Zero calls to `getComputedStyle` — the rule generator works purely from class string parsing.

#### Implementation sketch

```
src/lib/dom-jit-css.ts     — createDOMJITCSS() factory
```

New `vite.config.ts` entry:

```ts
'dom-jit-css': resolve(__dirname, 'src/lib/dom-jit-css.ts'),
```

Import path:

```ts
import { createDOMJITCSS } from '@jasonshimmy/custom-elements-runtime/dom-jit-css';
```

#### Scoped stylesheet injection

When `root` is a `ShadowRoot`, inject into `root.adoptedStyleSheets`. When `root` is a regular DOM element or `document.body`, inject into `document.adoptedStyleSheets` with a CSS `:is([data-jitcss]) .utility-name { … }` scope prefix — or more cleanly, use a `@scope` block if available:

```css
@scope ([data-jitcss]) {
  .flex {
    display: flex;
  }
}
```

The `@scope` approach is cleanest for isolation but has limited browser support today. A fallback via attribute-prefixed selectors is needed for Safari < 17.

### 4.2 Vite plugin (static analysis)

A Vite plugin that performs a **build-time** scan of all source files and emits a pre-generated CSS file. This eliminates all runtime parsing cost for users with static class lists.

```ts
// vite.config.ts
import { cerJITCSS } from '@jasonshimmy/custom-elements-runtime/vite-plugin';

export default defineConfig({
  plugins: [
    cerJITCSS({
      // Glob patterns to scan for class names
      content: ['./src/**/*.{ts,tsx,html,svelte,vue}'],
      // Output CSS file path
      output: 'src/generated-jit.css',
      // Optionally include extended colors
      extendedColors: true,
    }),
  ],
});
```

**How it works:**

1. The plugin's `buildStart` hook reads all matched files and runs the same `extractClassesFromHTML()` regex over their content.
2. All discovered classes are passed to `jitCSS()` to generate the full CSS string.
3. The output is written to the specified file (or emitted as a virtual module `virtual:cer-jit-css`).
4. In dev mode, the plugin's `handleHotUpdate` hook re-runs when source files change.

This is the optimal path for frameworks like React, Svelte, Vue, or Lit where templates live in `.tsx`/`.svelte`/`.vue` files — no runtime scanner needed.

**New entry point:**

```
src/lib/vite-plugin.ts
```

---

## 5. ✨ Additional Opportunities

### 5.1 `useDesignTokens()` hook — ✅ Implemented

A hook that sets CSS custom properties on `:host` in one call, typed to the token system:

```ts
useDesignTokens({
  primary: '#6366f1', // → sets --cer-color-primary-500 and all shades
  fontSans: '"Inter", sans-serif',
  radius: '0.5rem', // → sets --cer-rounded-base
});
```

This replaces common `useStyle(() => css\`:host { --cer-color-primary-500: #6366f1 }\`)` boilerplate with a typed, validated API.

### 5.2 `@property` Houdini registration for composition variables — ✅ Implemented

The transform composition variables (`--cer-rotate`, `--cer-translate-x`, `--cer-scale-x`, etc.) and filter variables are registered as plain CSS custom properties (untyped). Browsers cannot animate or interpolate untyped custom properties correctly.

Register them with `@property` in `variables.css`:

```css
@property --cer-rotate {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}
@property --cer-scale-x {
  syntax: '<number>';
  initial-value: 1;
  inherits: false;
}
```

This enables smooth CSS transitions on `rotate-*`, `scale-*`, and `translate-*` utilities — something that currently requires explicit `transition-transform` and can behave unexpectedly at boundary values.

### 5.3 `useGlobalStyle()` hook — ✅ Implemented

Allows components to inject CSS that escapes the Shadow DOM boundary via `document.adoptedStyleSheets`. This is intentionally an escape hatch with a warning in dev mode:

```ts
useGlobalStyle(
  () => css`
    /* Global override — use sparingly */
    body {
      font-family: 'Inter', sans-serif;
    }
  `,
);
```

This is useful for design-system components that need to set `@font-face`, global scroll behaviour, or `:root` variables in a single place.

### 5.4 Static purging / dead-code elimination for JIT utilities

Add a Vite plugin transform that removes utility definitions from `jit-css-engine.ts` that do not appear in project source. This is a compile-time tree-shaking pass on the utility map itself:

1. Scan project files for class names (same as §4.2 plugin).
2. Determine which utility map entries and parser branches are reachable.
3. Emit a replacement `jit-css-engine.ts` with unused entries removed.

Potential savings: a project that only uses layout and spacing utilities could reduce the JIT engine from ~22 KB gzip to ~6–8 KB.

### 5.5 TypeScript class-name autocomplete helper — ✅ Implemented

A typed `cls()` function that provides IDE autocomplete for utility class names:

```ts
import { cls } from '@jasonshimmy/custom-elements-runtime/jit-css';

cls('flex items-center gap-4 bg-primary-500');
// ↑ string literal type with autocomplete from the full utility map
```

Implemented as a no-op at runtime (`return input`) with a `.d.ts` file that maps the string union of all known utility names. Useful for catching typos and enabling rename-refactoring in IDEs.

### 5.6 CSS Cascade Layers for non-Shadow DOM path — ✅ Implemented

When injecting global styles (§4.1, §4.2), use `@layer` to ensure library utilities never overpower user styles without `!important`:

```css
@layer cer-base, cer-utilities, cer-user;

@layer cer-base {
  /* reset */
}

@layer cer-utilities {
  /* JIT-generated utility classes */
}

@layer cer-user {
  /* useStyle() / useGlobalStyle() output */
}
```

This is critical for §4 (non-Shadow DOM) where global CSS specificity is a real concern.

### 5.7 DevTools integration

A browser DevTools panel (via the Chrome DevTools Protocol extension API) that:

- Shows how many JIT rules have been generated and their total size.
- Highlights which classes in the current DOM tree are generating CSS.
- Shows cache hit/miss rates for the JIT memoisation cache.
- Allows real-time design token overrides (§5.1) for rapid design iteration.

This would live in a separate optional `dev-tools` entry point and be tree-shaken in production.

### 5.8 SSR pre-generation — ✅ Implemented

Extend the SSR path (`src/lib/ssr.ts`) to pre-generate JIT CSS during server render and embed it in the `<head>` as a `<style>` element. Currently the SSR path produces a no-op for JIT CSS. Pre-generating eliminates the Flash of Unstyled Content (FOUC) on hydration.

---

## Summary Table

| Item                                    | Status          | Type         | Breaking?     | Complexity | Value   |
| --------------------------------------- | --------------- | ------------ | ------------- | ---------- | ------- |
| `useJITCSS()` opt-in hook               | ✅ Implemented  | Architecture | ✅ Major (v3) | Medium     | 🔥 High |
| Extended colors in JIT parser           | ✅ Implemented  | Feature      | ❌            | Low        | 🔥 High |
| `variables.css` extended vars           | ✅ Implemented  | Feature      | ❌            | Low        | Medium  |
| Logical properties (`ms-`, `me-`, etc.) | ✅ Implemented  | Utilities    | ❌            | Low        | 🔥 High |
| `text-shadow-*`                         | ✅ Implemented  | Utilities    | ❌            | Low        | 🔥 High |
| `mask-*`                                | ✅ Implemented  | Utilities    | ❌            | Medium     | Medium  |
| `field-sizing-*`                        | ✅ Implemented  | Utilities    | ❌            | Low        | Medium  |
| `scheme-*`                              | ✅ Implemented  | Utilities    | ❌            | Low        | Medium  |
| `font-stretch-*`                        | ✅ Implemented  | Utilities    | ❌            | Low        | Low     |
| `inert:` variant                        | ✅ Implemented  | Variant      | ❌            | Low        | Medium  |
| `flow-root` display                     | ✅ Implemented  | Utility      | ❌            | Low        | Low     |
| Extended cursor utilities               | ✅ Implemented  | Utilities    | ❌            | Low        | Low     |
| `@layer` integration                    | ✅ Implemented  | Architecture | ❌            | Medium     | Medium  |
| `oklch` / `color-mix()`                 | 🔲 Partial     | Enhancement  | ❌            | Medium     | Medium  |
| `grid-cols-subgrid`                     | ✅ Implemented  | Utility      | ❌            | Low        | Medium  |
| Runtime DOM scanner                     | ✅ Implemented  | New module   | ❌            | High       | 🔥 High |
| Vite plugin                             | ✅ Implemented  | New module   | ❌            | High       | 🔥 High |
| `useDesignTokens()`                     | ✅ Implemented  | Hook         | ❌            | Low        | 🔥 High |
| `@property` Houdini registration        | ✅ Implemented  | Enhancement  | ❌            | Low        | Medium  |
| `useGlobalStyle()`                      | ✅ Implemented  | Hook         | ❌            | Low        | Medium  |
| Static utility purging                  | 🔲 Planned     | Build        | ❌            | High       | Medium  |
| TypeScript autocomplete helper (`cls`)  | ✅ Implemented  | DX           | ❌            | Medium     | Medium  |
| CSS Cascade Layers (non-ShadowDOM)      | ✅ Implemented  | Architecture | ❌            | Medium     | Medium  |
| SSR pre-generation                      | ✅ Implemented  | Enhancement  | ❌            | Medium     | High    |
| DevTools integration                    | 🔲 Planned     | Tooling      | ❌            | High       | Low     |
