# 🔍 JIT CSS Competitive Audit

> **Objective:** Assess the current JIT CSS engine against Tailwind CSS and identify high-value improvements that preserve its core constraints — zero-dependency, runtime execution, and minimal footprint.

---

## 📊 Executive Summary

The JIT CSS engine is well-architected for its context: it runs inside Shadow DOM at runtime, generates only the CSS needed per-component render cycle, and uses a singleton `CSSStyleSheet` pattern for efficient style sharing. It covers the majority of day-to-day utility needs.

However, several utility categories that developers expect from a Tailwind-comparable system are absent or incomplete. The gaps fall into distinct tiers: **critical** (blockers to adoption), **high-value** (frequent use cases), and **nice-to-have** (coverage completeness).

The good news: almost every gap can be closed with pure string additions to `generateUtilities()` or small targeted parser functions — no architectural overhaul required.

---

## ✅ What Is Already Strong

| Category                                                     | Status             |
| ------------------------------------------------------------ | ------------------ |
| Display / position / overflow                                | Complete           |
| Flexbox (align, justify, wrap, direction, grow, shrink)      | Complete           |
| Grid (cols, rows, span, flow, auto tracks)                   | Complete           |
| Typography (size, weight, transform, decoration, whitespace) | Complete           |
| Spacing (margin, padding, gap) with negative support         | Complete           |
| Color system with CSS variable theming                       | Complete           |
| Arbitrary values `prop-[value]` and `[property:value]`       | Complete           |
| State variants (`hover:`, `focus:`, `active:`, etc.)         | Complete           |
| Responsive breakpoints (`sm:` → `2xl:`)                      | Complete           |
| Container queries (`@sm:` → `@7xl:`, `@[value]:`)            | Complete           |
| Dark mode (prefers-color-scheme and class-based)             | Complete           |
| Group / peer variants                                        | Complete           |
| Arbitrary variants (`[attr=value]:`, `foo-[bar]:`)           | Complete           |
| Gradients (linear, radial, conic) with color stops           | Complete           |
| Prose typography system                                      | Complete           |
| Shadow / opacity / border / rounded                          | Complete           |
| Transitions (property, duration, easing)                     | Partial (see gaps) |
| Transforms (scale, rotate)                                   | Partial (see gaps) |
| Base reset for Shadow DOM                                    | Complete           |
| CSS variable–based theming                                   | Complete           |

---

## ❌ Critical Gaps

These are utilities that developers reach for constantly and will notice immediately when missing.

### 1. Non-Composable Transforms ⚠️

**Current behavior:** Each `scale-*`, `rotate-*` utility emits a full `transform:` declaration, overwriting any other transform applied in the same class list.

```html
<!-- Intended: scale AND rotate. Actual: only rotate applies -->
<div class="scale-110 rotate-6">...</div>
```

**Root cause:** The utilities are defined as:

```ts
'scale-110': 'transform:scale(1.1);',
'rotate-6': 'transform:rotate(6deg);',
```

**Tailwind's approach (v4):** Each transform axis writes to a CSS custom property. The `transform` property is applied once, composing all parts:

```css
.scale-110 {
  --tw-scale-x: 1.1;
  --tw-scale-y: 1.1;
}
.rotate-6 {
  --tw-rotate: 6deg;
}
* {
  transform: translateX(var(--tw-translate-x, 0))
    translateY(var(--tw-translate-y, 0)) rotate(var(--tw-rotate, 0deg))
    skewX(var(--tw-skew-x, 0)) skewY(var(--tw-skew-y, 0))
    scaleX(var(--tw-scale-x, 1)) scaleY(var(--tw-scale-y, 1));
}
```

**Recommended fix:** Adopt CSS custom property–based transforms. Set the base `transform` composition rule in `baseReset` and emit only the relevant variable from each utility. This is the single biggest quality-of-life improvement possible inside the current architecture.

**Effort:** Medium — requires updating `baseReset` and rewriting all transform utilities in `generateUtilities()`.

---

### 2. Missing Translate and Skew Static Utilities

`translate-x-*`, `translate-y-*`, `skew-x-*`, `skew-y-*` have **zero static utilities**. They exist only as arbitrary values (`translate-x-[value]`), which is cumbersome for common cases.

**Missing examples:**

```html
<!-- These all fail silently today -->
<div class="translate-x-2 translate-y-4"></div>
<div class="skew-x-6 -skew-y-3"></div>
```

**Recommended fix:** Add static utilities covering the most used values (0, 1, 2, 4, 8, full, 1/2) once the CSS variable–based transform system is in place.

---

### 3. No Ring Utilities

Tailwind's `ring-*` system is the standard for accessible focus styles. Many component libraries rely on it exclusively.

**Missing utilities:**

- `ring` / `ring-0` / `ring-1` / `ring-2` / `ring-4` / `ring-8` — `box-shadow` based outline ring
- `ring-inset` — draws ring inside the element
- `ring-{color}` — ring color
- `ring-offset-*` — ring offset width
- `ring-offset-{color}` — ring offset color

```html
<!-- Common focus pattern — not possible today without arbitrary values -->
<button class="focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
  ...
</button>
```

**Recommended fix:** Implement ring utilities using CSS custom properties for color and spread, composing via `box-shadow`. This matches how Tailwind implements them and allows stacking with existing shadows.

**Effort:** Low-Medium — pure string additions with a `--cer-ring-*` variable system.

---

### 4. No CSS Filter Utilities

Filters are used extensively for image effects, UI overlays, and loading states.

**Missing utilities:**

- `blur-none` / `blur-sm` / `blur` / `blur-md` / `blur-lg` / `blur-xl` / `blur-2xl` / `blur-3xl`
- `brightness-0` through `brightness-200`
- `contrast-0` through `contrast-200`
- `grayscale` / `grayscale-0`
- `invert` / `invert-0`
- `sepia` / `sepia-0`
- `saturate-0` through `saturate-200`
- `hue-rotate-0` / `hue-rotate-15` / `hue-rotate-30` / `hue-rotate-60` / `hue-rotate-90` / `hue-rotate-180`
- `drop-shadow-*` (distinct from `box-shadow`)

**Missing backdrop filter utilities:**

- `backdrop-blur-*`
- `backdrop-brightness-*`
- `backdrop-contrast-*`
- `backdrop-grayscale`
- `backdrop-invert`
- `backdrop-opacity-*`
- `backdrop-saturate-*`
- `backdrop-sepia`

```html
<!-- None of these work today -->
<img class="grayscale hover:grayscale-0 transition-all" />
<div class="backdrop-blur-md bg-white/30">Glass card</div>
```

**Recommended fix:** Filters should use CSS variable composition (same pattern as transforms) so multiple filter functions can be stacked. Backdrop filters use the same pattern under `backdrop-filter`.

**Effort:** Low — pure string additions. Variable composition adds moderate effort for correctness.

---

## ⚠️ High-Value Gaps

These are used regularly but developers can work around them with arbitrary values. Filling them significantly improves the authoring experience.

### 5. No Fractional / Numeric Width & Height Scale

Tailwind's numeric sizing scale (`w-0` through `w-96`) and fractional widths (`w-1/2`, `w-1/3`, `w-2/3`, `w-3/4`) are essential for precise layouts.

**Missing:**

```html
<div class="w-8 h-8">Icon</div>
<!-- Fixed 2rem × 2rem box -->
<div class="w-1/2 md:w-1/3">Column</div>
<!-- Fractional width -->
<div class="h-px">Rule</div>
<!-- 1px height -->
```

**Current workaround:** Arbitrary values — `w-[2rem]`, `w-[50%]`. Functional but verbose.

**Recommended fix:** Add the full `0, 0.5, 1, 1.5, 2 ... 96` numeric scale for `w-*`, `h-*`, and the most used fractions (`1/2`, `1/3`, `2/3`, `1/4`, `3/4`, `1/5`, `1/6`). These are generated statically so no runtime cost beyond initial `generateUtilities()` execution (which runs once).

---

### 6. No Transition Delay Utilities

`delay-*` variants require arbitrary values today (`delay-[150ms]`). Static utilities are expected.

**Missing:**

- `delay-0` / `delay-75` / `delay-100` / `delay-150` / `delay-200` / `delay-300` / `delay-500` / `delay-700` / `delay-1000`

**Effort:** Trivial — eight string additions.

---

### 7. No Background Utility Suite

Background positioning, sizing, repeat and attachment are absent.

**Missing:**

```html
<div class="bg-cover bg-center bg-no-repeat"></div>
<div class="bg-fixed">Parallax scroll</div>
<div
  class="bg-clip-text text-transparent bg-linear-to-r from-primary-500 to-secondary-500"
>
  Gradient text
</div>
```

| Subcategory | Missing utilities                                                                               |
| ----------- | ----------------------------------------------------------------------------------------------- |
| Size        | `bg-auto`, `bg-cover`, `bg-contain`                                                             |
| Position    | `bg-center`, `bg-top`, `bg-right`, `bg-bottom`, `bg-left`, `bg-right-top`, etc.                 |
| Repeat      | `bg-no-repeat`, `bg-repeat`, `bg-repeat-x`, `bg-repeat-y`, `bg-repeat-round`, `bg-repeat-space` |
| Attachment  | `bg-fixed`, `bg-local`, `bg-scroll`                                                             |
| Clip        | `bg-clip-border`, `bg-clip-padding`, `bg-clip-content`, `bg-clip-text`                          |
| Origin      | `bg-origin-border`, `bg-origin-padding`, `bg-origin-content`                                    |

**Effort:** Low — all direct property/value mappings.

---

### 8. No Divide Utilities

`divide-x-*` and `divide-y-*` add borders between child elements — extremely common for lists, navigation, and card groups.

```html
<ul class="divide-y divide-neutral-200">
  <li class="py-3">Item 1</li>
  <li class="py-3">Item 2</li>
</ul>
```

These require `>*+*` sibling selectors, which the current variant system does not generate. This one requires a **new selector variant** rather than a simple utility string.

**Effort:** Medium — requires extending `selectorVariants` or adding a dedicated parser for the `divide-` prefix.

---

### 9. Limited Color Palette

The palette is limited to **7 semantic color families** plus white/black. While functional for design systems with CSS variable overrides, developers migrating from Tailwind expect access to its full extended palette (slate, gray, zinc, red, orange, amber, yellow, lime, green, emerald, teal, cyan, sky, blue, indigo, violet, purple, fuchsia, pink, rose).

**Recommended strategy:** Rather than bundling all ~220 color shades (significant size increase), offer them as an **opt-in color pack** — an additional `colors.ts` module that extends `fallbackHex`. Tree-shaking keeps the default bundle lean.

---

### 10. No Motion Preference Variants

Accessibility-driven animation control is a Tailwind staple and a WCAG best practice.

**Missing variants:**

- `motion-reduce:` → wraps rule in `@media (prefers-reduced-motion: reduce)`
- `motion-safe:` → wraps rule in `@media (prefers-reduced-motion: no-preference)`

```html
<div class="transition-transform motion-reduce:transition-none">...</div>
```

**Effort:** Low — two additions to `mediaVariants`.

---

### 11. No RTL / LTR Variants

Applications targeting right-to-left locales have no utility-class solution today.

**Missing variants:**

- `rtl:` → `:host([dir=rtl]) .selector` or `[dir=rtl] .selector`
- `ltr:` → `:host([dir=ltr]) .selector`

**Effort:** Low-Medium — additions to `selectorVariants` with host-attribute targeting.

---

### 12. No `z-auto` and Limited Z-Index Scale

`z-auto` (maps to `z-index: auto`) is absent. The scale jumps in steps of 10 with no intermediate values.

**Missing:**

- `z-auto`
- `z-1` through `z-9` (commonly needed for stacking contexts)

---

## 💡 Nice-To-Have Gaps

Lower priority; arbitrary values cover these today.

### 13. Text Decoration Enhancements

Tailwind's decoration utilities extend basic underline/overline with color, style, thickness, and offset control.

**Missing:**

- `decoration-{color}` — `text-decoration-color`
- `decoration-solid` / `decoration-dashed` / `decoration-dotted` / `decoration-double` / `decoration-wavy`
- `decoration-auto` / `decoration-from-font` / `decoration-0` through `decoration-8`
- `underline-offset-auto` / `underline-offset-0` through `underline-offset-8`

---

### 14. No `will-change` Utilities

Performance-critical animations benefit from `will-change` hints.

**Missing:** `will-change-auto`, `will-change-scroll`, `will-change-contents`, `will-change-transform`

---

### 15. No List Style Utilities

Lists rendered outside `prose` context have no styling helpers today.

**Missing:**

- `list-disc` / `list-decimal` / `list-none`
- `list-inside` / `list-outside`
- `list-image-none`

---

### 16. No Scroll Utilities

**Missing:**

- `scroll-smooth` / `scroll-auto`
- `scroll-p-*` / `scroll-m-*` — scroll padding/margin for anchor links
- `snap-*` — scroll snap alignment and type

---

### 17. No Column Layout Utilities

Multi-column text layout (`columns-*`) is unaddressed.

---

### 18. No `touch-action` Utilities

`touch-auto`, `touch-none`, `touch-pan-x`, `touch-pan-y`, `touch-manipulation` are useful for gesture-heavy components.

---

### 19. No `print:` Variant

Print-specific overrides (`print:hidden`, `print:block`) require the `@media print` query.

---

## 🏗️ Architectural Recommendations

### Priority 1 — CSS Variable Transform Composition

This is the single most impactful structural change. Every transform utility should write to a CSS custom property, not a full `transform:` declaration. The composed `transform` rule lives once in the `:host, *` reset block:

```css
:host,
* {
  --cer-translate-x: 0;
  --cer-translate-y: 0;
  --cer-rotate: 0deg;
  --cer-skew-x: 0;
  --cer-skew-y: 0;
  --cer-scale-x: 1;
  --cer-scale-y: 1;
  transform: translateX(var(--cer-translate-x))
    translateY(var(--cer-translate-y)) rotate(var(--cer-rotate))
    skewX(var(--cer-skew-x)) skewY(var(--cer-skew-y)) scaleX(var(--cer-scale-x))
    scaleY(var(--cer-scale-y));
}
```

Then each utility:

```ts
'scale-110': '--cer-scale-x:1.1;--cer-scale-y:1.1;',
'rotate-6':  '--cer-rotate:6deg;',
'translate-x-2': '--cer-translate-x:0.5rem;',
```

This also enables `scale-x-*` / `scale-y-*` independent axis scaling, which Tailwind supports.

> ⚠️ **Tradeoff:** This adds ~100–120 bytes to `baseReset`. For runtime JIT over Shadow DOM this is negligible and is shared across all component instances via the singleton `CSSStyleSheet`.

---

### Priority 2 — CSS Variable Ring System

Implement focus rings using a `--cer-ring-*` variable system composing into `box-shadow`:

```css
:host,
* {
  --cer-ring-inset: ;
  --cer-ring-width: 0px;
  --cer-ring-color: rgb(59 130 246 / 0.5);
  --cer-ring-offset-width: 0px;
  --cer-ring-offset-color: #fff;
  --cer-ring-offset-shadow: 0 0 #0000;
  --cer-ring-shadow: 0 0 #0000;
}
```

```ts
'ring-2': '--cer-ring-width:2px;--cer-ring-shadow:var(--cer-ring-inset) 0 0 0 calc(2px + var(--cer-ring-offset-width)) var(--cer-ring-color);box-shadow:var(--cer-ring-offset-shadow),var(--cer-ring-shadow),var(--cer-shadow,0 0 #0000);',
```

This stacks rings with existing `shadow-*` utilities without conflicts.

---

### Priority 3 — CSS Variable Filter Composition

Identical pattern to transforms — filters compose via a single `filter:` declaration:

```css
:host,
* {
  --cer-blur: ;
  --cer-brightness: ;
  --cer-contrast: ;
  --cer-grayscale: ;
  --cer-hue-rotate: ;
  --cer-invert: ;
  --cer-saturate: ;
  --cer-sepia: ;
  --cer-drop-shadow: ;
  filter: var(--cer-blur) var(--cer-brightness) var(--cer-contrast)
    var(--cer-grayscale) var(--cer-hue-rotate) var(--cer-invert)
    var(--cer-saturate) var(--cer-sepia) var(--cer-drop-shadow);
}
```

```ts
'blur':    '--cer-blur:blur(8px);',
'blur-sm': '--cer-blur:blur(4px);',
'grayscale': '--cer-grayscale:grayscale(100%);',
```

---

### Priority 4 — Numeric / Fractional Sizing Scale

Add a static generator loop in `generateUtilities()`. Use the same `calc(spacing * n)` pattern already in place for semantic sizes. This adds a predictable, bounded number of entries to `utilityMap` with zero runtime overhead:

```ts
// Numeric scale: 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6 ... 96
const numericScale = [
  0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24,
  28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96,
];
for (const n of numericScale) {
  const val = n === 0 ? '0' : `calc(${spacing} * ${n / 0.25})`;
  utils[`w-${n}`] = `width:${val};`;
  utils[`h-${n}`] = `height:${val};`;
  // ... etc
}

// Fractional widths
const fractions = [
  ['1/2', '50%'],
  ['1/3', '33.333%'],
  ['2/3', '66.667%'],
  ['1/4', '25%'],
  ['3/4', '75%'],
  ['1/5', '20%'],
  ['2/5', '40%'],
  ['3/5', '60%'],
  ['4/5', '80%'],
  ['1/6', '16.667%'],
  ['5/6', '83.333%'],
];
for (const [key, val] of fractions) {
  utils[`w-${key}`] = `width:${val};`;
  utils[`h-${key}`] = `height:${val};`;
}
```

---

## 📋 Prioritized Improvement Roadmap

| #   | Improvement                                             | Impact      | Effort  | Bundle Delta    |
| --- | ------------------------------------------------------- | ----------- | ------- | --------------- |
| 1   | CSS variable–based composable transforms                | 🔴 Critical | Medium  | ~120 bytes      |
| 2   | Translate + skew static utilities                       | 🔴 Critical | Low     | ~200 bytes      |
| 3   | Ring utilities                                          | 🔴 Critical | Medium  | ~300 bytes      |
| 4   | Filter + backdrop-filter utilities                      | 🟠 High     | Medium  | ~400 bytes      |
| 5   | Numeric + fractional sizing scale                       | 🟠 High     | Low     | ~600 bytes      |
| 6   | Background size / position / repeat / attachment / clip | 🟠 High     | Low     | ~250 bytes      |
| 7   | Transition delay static utilities                       | 🟠 High     | Trivial | ~50 bytes       |
| 8   | Motion reduce/safe variants                             | 🟠 High     | Low     | ~20 bytes       |
| 9   | RTL / LTR variants                                      | 🟡 Medium   | Low     | ~20 bytes       |
| 10  | `z-auto` + intermediate z-index values                  | 🟡 Medium   | Trivial | ~20 bytes       |
| 11  | Divide utilities (sibling selector)                     | 🟡 Medium   | Medium  | ~150 bytes      |
| 12  | Text decoration enhancements                            | 🟡 Medium   | Low     | ~150 bytes      |
| 13  | List style utilities                                    | 🟡 Medium   | Trivial | ~40 bytes       |
| 14  | Scroll behavior + snap                                  | 🟡 Medium   | Low     | ~100 bytes      |
| 15  | `will-change` utilities                                 | 🟢 Low      | Trivial | ~30 bytes       |
| 16  | `touch-action` utilities                                | 🟢 Low      | Trivial | ~30 bytes       |
| 17  | `print:` variant                                        | 🟢 Low      | Trivial | ~10 bytes       |
| 18  | Column layout utilities                                 | 🟢 Low      | Low     | ~50 bytes       |
| 19  | Extended color palette (opt-in module)                  | 🟢 Low      | Low     | 0 (tree-shaken) |

**Estimated total bundle increase for items 1–10:** ~2.2 KB unminified, ~900 bytes gzipped — well within an acceptable runtime budget.

---

## 🔄 What Tailwind Does That Should Stay Out of Runtime JIT

Some Tailwind features are intentionally build-time concerns and should **not** be replicated at runtime:

| Feature                                          | Why to exclude                                           |
| ------------------------------------------------ | -------------------------------------------------------- |
| Source file scanning / purging                   | Build-time job; irrelevant in a generate-on-demand model |
| Config-file customization (`tailwind.config.js`) | Replace with CSS variable overrides (already done well)  |
| Plugin-system execution                          | Too heavy for runtime; use `useStyle()` instead          |
| JIT content hashing / cache invalidation         | Already handled by the existing `htmlCache` memoization  |
| PostCSS pipeline                                 | Not applicable in a browser runtime                      |

---

## 🧪 Testing Considerations

Each new utility category should have a corresponding unit test in `test/` that:

1. Verifies the CSS output string for static utilities
2. Confirms variants compose correctly (`hover:blur-sm`, `dark:grayscale`, `md:translate-x-4`)
3. Tests arbitrary value fallback (`blur-[12px]`, `hue-rotate-[270deg]`)
4. For composable systems (transforms, filters, rings), verifies that combining multiple utilities from the same category does not produce duplicate `transform:` / `filter:` / `box-shadow:` declarations

---

## 📁 Files to Modify

| File                                                                         | Changes                                                                 |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [src/lib/runtime/style.ts](../src/lib/runtime/style.ts)                      | Primary file — all utility additions, new parsers, CSS variable updates |
| [src/lib/runtime/style.ts](../src/lib/runtime/style.ts) (`baseReset`)        | Add transform + filter + ring variable defaults                         |
| [src/lib/runtime/style.ts](../src/lib/runtime/style.ts) (`mediaVariants`)    | Add `motion-reduce:`, `motion-safe:`, `print:`                          |
| [src/lib/runtime/style.ts](../src/lib/runtime/style.ts) (`selectorVariants`) | Add `rtl:`, `ltr:`                                                      |
| [docs/jit-css.md](./jit-css.md)                                              | Update documentation as utilities are added                             |
