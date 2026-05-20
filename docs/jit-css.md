# 🎨 Deep Dive: JIT CSS

Custom Elements Runtime provides a high-performance, zero-dependency JIT CSS engine for custom elements. It enables utility-first, variant-rich, and arbitrary-value styling directly from your Shadow DOM.

## 🔌 Opt-in Architecture

JIT CSS is **opt-in** — it is disabled by default and only runs for components that request it. The JIT engine (~20 KB gzip) lives in its own dedicated entry (`@jasonshimmy/custom-elements-runtime/jit-css`) and is **entirely absent** from the main bundle (`@jasonshimmy/custom-elements-runtime`). Importing from the root entry never pulls in the JIT engine.

### `useJITCSS()` — Per-Component Opt-in

Call `useJITCSS()` inside a component's render function to enable JIT CSS for that specific component. This is the recommended approach for most projects.

```ts
import { component, html } from '@jasonshimmy/custom-elements-runtime';
import { useJITCSS } from '@jasonshimmy/custom-elements-runtime/jit-css';

component('my-card', () => {
  useJITCSS(); // Enable JIT CSS for this component only
  return html`<div
    class="flex items-center gap-4 bg-primary-500 text-white p-4 rounded-lg"
  >
    <slot></slot>
  </div>`;
});
```

### `enableJITCSS()` — Global Opt-in

Call `enableJITCSS()` once at your app entry point to enable JIT CSS for **all** components. This is the easiest migration path to preserve v2-style behaviour.

```ts
import { enableJITCSS } from '@jasonshimmy/custom-elements-runtime/jit-css';

// Enable for all components, including extended color palette
enableJITCSS({ extendedColors: true });
```

### `JITCSSOptions`

Both `useJITCSS()` and `enableJITCSS()` accept an optional options object:

```ts
interface JITCSSOptions {
  /**
   * Include extended Tailwind color families.
   * - `true` — all 21 families (slate, gray, zinc, stone, red, orange, amber, yellow,
   *   lime, green, emerald, teal, cyan, sky, blue, indigo, violet, purple, fuchsia, pink, rose)
   * - `string[]` — only the listed families, e.g. `['slate', 'blue', 'rose']`
   */
  extendedColors?: boolean | string[];
  /** Register project-specific color scales */
  customColors?: Record<string, Record<string, string>>;
  /** Disable specific variant groups to reduce output size */
  disableVariants?: Array<
    'responsive' | 'dark' | 'motion' | 'print' | 'container'
  >;
}
```

#### `extendedColors`

Extend the built-in semantic palette with additional Tailwind-compatible color families.

Accepts a **boolean** or an **array of family names**:

```ts
// Include all 21 extended families
enableJITCSS({ extendedColors: true });
// Now bg-blue-500, text-violet-700, border-rose-300, etc. all generate CSS

// Include only specific families — keeps generated CSS smaller
enableJITCSS({ extendedColors: ['slate', 'blue', 'rose'] });
```

Available families: `slate`, `gray`, `zinc`, `stone`, `red`, `orange`, `amber`, `yellow`, `lime`, `green`, `emerald`, `teal`, `cyan`, `sky`, `blue`, `indigo`, `violet`, `purple`, `fuchsia`, `pink`, `rose`.

> **Why are extended colors disabled by default? Performance.**
>
> On each render the JIT engine calls `CSSStyleSheet.replaceSync()` to replace the component's entire accumulated stylesheet in one shot. Every `replaceSync()` call triggers the browser to re-run style matching for all elements in that shadow root — this is called a **style recalculation**. In Shadow DOM, style recalculations are scoped to each component's shadow root, but they still cost CPU time, especially during initial render when many classes are encountered at once.
>
> The extended palette contains **21 families × 11 shades = 231 color tokens**. Each token can appear as `bg-`, `text-`, `border-`, `ring-`, `shadow-`, `outline-`, `from-`, `to-`, or `via-`, giving a theoretical maximum of ~2,000 CSS rules. In a real app the JIT engine only generates rules for classes it actually encounters, but a large component tree with varied color usage can accumulate a substantial stylesheet on that first `replaceSync()` pass.
>
> Each component's shadow root also gets its **own scoped stylesheet**. The rule for `bg-blue-500` inside `<my-card>` is a separate stylesheet from the one inside `<my-button>`. CSS rules are not shared across shadow boundaries. More active color families means more generated CSS per component, multiplied by the number of components using them.
>
> The JIT engine's memoization cache also grows with the number of unique class/shade combinations it has seen. Enabling all 21 families in a large app puts real pressure on that cache and increases memory usage over the lifetime of the page.
>
> **The practical guidance:** leave extended colors off (the default) unless you need them. If you need specific families, use `string[]` — e.g. `extendedColors: ['slate', 'blue', 'rose']` — to expose only the tokens you actually use. This keeps the potential rule count small and style recalculations fast.
>
> **Runtime flag, not a bundle boundary.** The extended color data is statically imported into the JIT engine chunk and is always present in `custom-elements-runtime.jit-css.*.js` once the JIT engine is bundled — regardless of what you pass to `extendedColors`. Setting `extendedColors: false` (or omitting it) prevents those color utilities from generating CSS at runtime, but does not reduce bundle size. The only way to exclude the extended color data from your bundle entirely is to not import from `@jasonshimmy/custom-elements-runtime/jit-css` at all.

#### `customColors`

Register project-specific color scales at the call site:

```ts
useJITCSS({
  customColors: {
    brand: { '500': '#e63946', '600': '#c1121f' },
    accent: { '300': '#a8dadc', '500': '#457b9d' },
  },
});
// Now bg-brand-500, text-accent-300, etc. generate CSS
```

#### `disableVariants`

Suppress entire variant groups to reduce output size:

```ts
enableJITCSS({
  disableVariants: ['dark', 'motion', 'print'],
});
// dark:, motion-reduce:, motion-safe:, and print: variants produce no CSS
```

Available groups:

- `'responsive'` — suppresses `sm:`, `md:`, `lg:`, `xl:`, `2xl:` breakpoints
- `'dark'` — suppresses `dark:` variant
- `'motion'` — suppresses `motion-reduce:` and `motion-safe:` variants
- `'print'` — suppresses `print:` variant
- `'container'` — suppresses `@sm:`, `@md:`, `@lg:`, `@xl:`, `@2xl:` container query variants

### Additional Control Functions

```ts
// Check if JIT CSS is globally enabled
isJITCSSEnabled(): boolean

// Check if JIT CSS is enabled for a specific ShadowRoot (per-component or global)
isJITCSSEnabledFor(root: ShadowRoot): boolean

// Disable JIT CSS globally (useful in tests or opt-out scenarios)
disableJITCSS(): void
```

These are importable from `@jasonshimmy/custom-elements-runtime/jit-css`.

---

## 🏗️ How JIT CSS Works

1. **Base Reset:** Applies a minimal Shadow DOM reset for consistent rendering. This is shared across all components to save space.
2. **Merges User-defined Styles:** Merges in user-defined styles from the component config and `useStyle` hook.
3. **JIT CSS:** Extracts all class names from the Shadow DOM, parses utilities, variants, and arbitrary values, and generates scoped CSS rules on demand.
4. **Minification:** Strips whitespace and comments for fast, small payloads.
5. **Memoization & Throttling:** Caches CSS output for repeated HTML inputs and throttles regeneration for performance.

## 🧩 Built-in Utilities

### **Layout & Display**

`block`, `inline`, `inline-block`, `flex`, `inline-flex`, `grid`, `inline-grid`, `table`, `table-cell`, `table-row`, `hidden`

### **Position**

`absolute`, `relative`, `fixed`, `sticky`, `static`

### **Sizing & Spacing**

`w-full`, `w-screen`, `w-auto`, `w-fit`, `w-min`, `w-max`, `h-full`, `h-screen`, `h-auto`, `h-fit`, `h-min`, `h-max`
`max-w-full`, `max-w-screen`, `max-h-full`, `max-h-screen`, `min-w-0`, `min-h-0`, `min-w-full`, `min-h-full`, `min-w-screen`, `min-h-screen`

**Size Shorthand (width + height simultaneously):**
`size-full`, `size-screen`, `size-auto`, `size-fit`, `size-min`, `size-max`
`size-4`, `size-8`, `size-16`, `size-1/2`, etc. (all numeric, fraction, and named spacing tokens are supported as with `w-*` / `h-*`)

The `size-*` shorthand sets both `width` and `height` in a single utility — ideal for icons, avatars, and any square UI element.

```html
<!-- 40px × 40px icon -->
<img class="size-10 rounded-full" src="avatar.png" />

<!-- Full-screen overlay -->
<div class="size-full absolute inset-0"></div>
```

**Semantic Sizes:**
`w-3xs` to `w-7xl`, `h-3xs` to `h-7xl`, `max-w-3xs` to `max-w-7xl`, `max-h-3xs` to `max-h-7xl`, `min-w-3xs` to `min-w-7xl`, `min-h-3xs` to `min-h-7xl`

### **Spacing (Margin/Padding/Gap/Inset):**

`m-auto`, `mx-auto`, `my-auto`, `p-4`, `m-2`, `mx-auto`, `gap-2`, `gap-x-2`, `gap-y-2`, etc. (all axis and negative values supported)

**Inset (position offset):** `inset-*`, `inset-x-*`, `inset-y-*`, `top-*`, `bottom-*`, `left-*`, `right-*` (all accept the same numeric, fraction, and negative values as margin/padding)

### **Space Between (Tailwind-style)**

`space-x-*`, `space-y-*` - Add consistent spacing between child elements using margin (see [Spacing Utilities](./space-utilities.md) for details)

### **Overflow**

`overflow-auto`, `overflow-hidden`, `overflow-visible`, `overflow-scroll`
`overflow-x-auto`, `overflow-x-hidden`, `overflow-x-visible`, `overflow-x-scroll`
`overflow-y-auto`, `overflow-y-hidden`, `overflow-y-visible`, `overflow-y-scroll`

### **Pointer Events & Cursor**

`pointer-events-none`, `pointer-events-auto`
`cursor-auto`, `cursor-default`, `cursor-pointer`, `cursor-wait`, `cursor-text`, `cursor-move`, `cursor-help`, `cursor-not-allowed`, `cursor-grab`, `cursor-grabbing`

**Extended cursors (Tailwind 4):**
`cursor-zoom-in`, `cursor-zoom-out`, `cursor-cell`, `cursor-crosshair`, `cursor-copy`, `cursor-alias`, `cursor-context-menu`, `cursor-vertical-text`, `cursor-no-drop`, `cursor-progress`, `cursor-col-resize`, `cursor-row-resize`, `cursor-ew-resize`, `cursor-ns-resize`, `cursor-nesw-resize`, `cursor-nwse-resize`, `cursor-all-scroll`

### **Accessibility**

`sr-only`, `not-sr-only`

### **Visibility**

`visible`, `invisible`

### **Float & Clear**

`float-right`, `float-left`, `float-none`, `float-start`, `float-end`
`clear-left`, `clear-right`, `clear-both`, `clear-none`, `clear-start`, `clear-end`, `clearfix`

`float-start` and `float-end` use logical values (`inline-start` / `inline-end`) for RTL-aware layouts. `clearfix` generates the standard `display:table; clear:both` micro-clearfix pattern.

```html
<!-- Text wrapped around an image -->
<img class="float-left mr-4 mb-2" src="avatar.png" />
<p>Text flows around the floated image...</p>
<div class="clear-both"></div>

<!-- RTL-aware float -->
<img class="float-start me-4" src="avatar.png" />
```

### **Z-index**

Z-index accepts **any integer or `auto`** — all values are resolved dynamically at runtime by `parseZIndex`, so you are not limited to a predefined set:

`z-0`, `z-10`, `z-50`, `z-100`, `z-999`, `z-9999` — any non-negative integer
`-z-10`, `-z-100`, `-z-999` — any negative integer
`z-auto` — `z-index: auto`

```html
<!-- Fixed navbar above modal backdrop -->
<div class="z-50 fixed top-0 w-full">Navbar</div>
<div class="z-40 fixed inset-0 bg-black/50">Backdrop</div>

<!-- Custom stack level -->
<div class="z-100">Above everything</div>
<div class="-z-10">Behind the document flow</div>
```

### **Grid**

`grid-cols-1` to `grid-cols-12`, `grid-rows-1` to `grid-rows-12`, `grid-cols-none`, `grid-rows-none`
`col-span-1` to `col-span-12`, `row-span-1` to `row-span-12`, `col-span-full`, `row-span-full`
`col-start-1` to `col-start-12`, `col-end-1` to `col-end-12`, `row-start-1` to `row-start-12`, `row-end-1` to `row-end-12`
`auto-cols-auto`, `auto-cols-min`, `auto-cols-max`, `auto-cols-fr`
`auto-rows-auto`, `auto-rows-min`, `auto-rows-max`, `auto-rows-fr`
`grid-flow-row`, `grid-flow-col`, `grid-flow-row-dense`, `grid-flow-col-dense`

**Subgrid (Tailwind 4):**
`grid-cols-subgrid`, `grid-rows-subgrid` — align children to the parent grid's track definition, enabling perfectly aligned nested layouts.

### **Flexbox**

`items-center`, `items-start`, `items-end`, `items-baseline`, `items-stretch`
`justify-center`, `justify-start`, `justify-between`, `justify-around`, `justify-evenly`, `justify-end`
`flex-wrap`, `flex-nowrap`, `flex-wrap-reverse`
`content-center`, `content-start`, `content-end`, `content-between`, `content-around`, `content-stretch`
`self-auto`, `self-start`, `self-end`, `self-center`, `self-stretch`
`flex-1`, `flex-auto`, `flex-initial`, `flex-none`
`flex-col`, `flex-row`, `flex-col-reverse`, `flex-row-reverse`
`grow`, `shrink`, `grow-0`, `shrink-0`
`grow-0` to `grow-12`, `shrink-0` to `shrink-12`

### **Order**

`order-1` to `order-12`, `order-first`, `order-last`, `order-none`

### **Typography**

`font-thin`, `font-extralight`, `font-light`, `font-normal`, `font-medium`, `font-semibold`, `font-bold`, `font-extrabold`, `font-black`
`italic`, `not-italic`
`uppercase`, `lowercase`, `capitalize`, `normal-case`
`underline`, `overline`, `line-through`, `no-underline`
`text-left`, `text-center`, `text-right`, `text-justify`
`text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-3xl`, `text-4xl`, `text-5xl`, `text-6xl`, `text-7xl`, `text-8xl`, `text-9xl`

**Letter Spacing (Tracking):**
`tracking-tighter`, `tracking-tight`, `tracking-normal`, `tracking-wide`, `tracking-wider`, `tracking-widest`

**Line Height (Leading):**
`leading-3`, `leading-4`, `leading-5`, `leading-6`, `leading-7`, `leading-8`, `leading-9`, `leading-10`
`leading-none`, `leading-tight`, `leading-snug`, `leading-normal`, `leading-relaxed`, `leading-loose`

**Font Family:**
`font-sans`, `font-serif`, `font-mono`

**Text Overflow & Whitespace:**
`truncate`
`whitespace-normal`, `whitespace-nowrap`, `whitespace-pre`, `whitespace-pre-line`, `whitespace-pre-wrap`
`break-normal`, `break-words`, `break-all`

**Text Wrap:**
`text-wrap` — `text-wrap: wrap` (default browser behaviour, explicit)
`text-nowrap` — `text-wrap: nowrap` (prevent line breaks)
`text-balance` — `text-wrap: balance` (evenly distributed lines, great for headings)
`text-pretty` — `text-wrap: pretty` (avoids orphaned last words, great for body text)

```html
<h1 class="text-2xl font-bold text-balance">Perfectly Balanced Heading</h1>
<p class="text-pretty">Long paragraph text without orphaned last words.</p>
<span class="text-nowrap">Never&nbsp;wraps</span>
```

**Line Clamp:**
`line-clamp-1`, `line-clamp-2`, `line-clamp-3`, `line-clamp-4`, `line-clamp-5`, `line-clamp-6`, `line-clamp-none`

### **Borders & Radius**

**Border Widths:**
`border`, `border-0`, `border-1`, `border-2`, `border-4`, `border-6`, `border-8`
`border-t`, `border-t-0`, `border-t-1`, `border-t-2`, `border-t-4`, `border-t-6`, `border-t-8`
`border-r`, `border-r-0`, `border-r-1`, `border-r-2`, `border-r-4`, `border-r-6`, `border-r-8`
`border-b`, `border-b-0`, `border-b-1`, `border-b-2`, `border-b-4`, `border-b-6`, `border-b-8`
`border-l`, `border-l-0`, `border-l-1`, `border-l-2`, `border-l-4`, `border-l-6`, `border-l-8`
`border-x`, `border-x-0`, `border-x-1`, `border-x-2`, `border-x-4`, `border-x-6`, `border-x-8`
`border-y`, `border-y-0`, `border-y-1`, `border-y-2`, `border-y-4`, `border-y-6`, `border-y-8`

**Border Styles:**
`border-solid`, `border-dashed`, `border-dotted`, `border-double`, `border-none`

**Border Radius:**
`rounded`, `rounded-none`, `rounded-xs`, `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-4xl`, `rounded-full`
`rounded-t-*`, `rounded-r-*`, `rounded-b-*`, `rounded-l-*`, `rounded-tl-*`, `rounded-tr-*`, `rounded-br-*`, `rounded-bl-*` (all sizes available)

### **Shadow & Effects**

`shadow-none`, `shadow-xs`, `shadow-sm`, `shadow`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl`, `shadow-inner`

### **Opacity**

`opacity-0`, `opacity-5`, `opacity-10`, `opacity-20`, `opacity-25`, `opacity-30`, `opacity-40`, `opacity-50`, `opacity-60`, `opacity-70`, `opacity-75`, `opacity-80`, `opacity-90`, `opacity-95`, `opacity-100`

### **Transforms**

> All transform utilities (**translate**, **rotate**, **scale**, **skew**) compose via CSS custom properties. Stacking multiple transform utilities on the same element works correctly — e.g., `translate-x-4 rotate-45 scale-110` all apply simultaneously without any conflicts.

**Scale (uniform):**
`scale-0`, `scale-50`, `scale-75`, `scale-90`, `scale-95`, `scale-100`, `scale-105`, `scale-110`, `scale-125`, `scale-150`

**Scale X axis only:**
`scale-x-0`, `scale-x-50`, `scale-x-75`, `scale-x-90`, `scale-x-95`, `scale-x-100`, `scale-x-105`, `scale-x-110`, `scale-x-125`, `scale-x-150`

**Scale Y axis only:**
`scale-y-0`, `scale-y-50`, `scale-y-75`, `scale-y-90`, `scale-y-95`, `scale-y-100`, `scale-y-105`, `scale-y-110`, `scale-y-125`, `scale-y-150`

**Rotate:**
`rotate-0`, `rotate-1`, `rotate-2`, `rotate-3`, `rotate-6`, `rotate-12`, `rotate-45`, `rotate-90`, `rotate-180`
`-rotate-1`, `-rotate-2`, `-rotate-3`, `-rotate-6`, `-rotate-12`, `-rotate-45`, `-rotate-90`, `-rotate-180`

**Translate X:**
`translate-x-0`, `translate-x-px`, `translate-x-0.5`, `translate-x-1`, `translate-x-1.5`, `translate-x-2`, `translate-x-2.5`, `translate-x-3`, `translate-x-4`, `translate-x-5`, `translate-x-6`, `translate-x-8`, `translate-x-10`, `translate-x-12`, `translate-x-16`, `translate-x-20`, `translate-x-24`, `translate-x-32`
`translate-x-1/2`, `translate-x-1/3`, `translate-x-2/3`, `translate-x-1/4`, `translate-x-3/4`, `translate-x-full`
`-translate-x-px`, `-translate-x-0.5`, `-translate-x-1`, `-translate-x-1.5`, `-translate-x-2`, `-translate-x-2.5`, `-translate-x-3`, `-translate-x-4`, `-translate-x-1/2`, `-translate-x-full`

**Translate Y:**
`translate-y-0`, `translate-y-px`, `translate-y-0.5`, `translate-y-1`, `translate-y-1.5`, `translate-y-2`, `translate-y-2.5`, `translate-y-3`, `translate-y-4`, `translate-y-5`, `translate-y-6`, `translate-y-8`, `translate-y-10`, `translate-y-12`, `translate-y-16`, `translate-y-20`, `translate-y-24`, `translate-y-32`
`translate-y-1/2`, `translate-y-full`
`-translate-y-px`, `-translate-y-0.5`, `-translate-y-1`, `-translate-y-2`, `-translate-y-4`, `-translate-y-1/2`, `-translate-y-full`

**Skew:**
`skew-x-0`, `skew-x-1`, `skew-x-2`, `skew-x-3`, `skew-x-6`, `skew-x-12`
`-skew-x-1`, `-skew-x-2`, `-skew-x-3`, `-skew-x-6`, `-skew-x-12`
`skew-y-0`, `skew-y-1`, `skew-y-2`, `skew-y-3`, `skew-y-6`, `skew-y-12`
`-skew-y-1`, `-skew-y-2`, `-skew-y-3`, `-skew-y-6`, `-skew-y-12`

**Arbitrary values** (`translate-x-[value]`, `rotate-[value]`, `scale-[value]`, `skew-x-[value]`, etc.) are also supported.

### **Transitions**

**Properties:**
`transition`, `transition-none`, `transition-all`, `transition-colors`, `transition-shadow`, `transition-opacity`, `transition-transform`

**Timing Functions:**
`ease-linear`, `ease-in`, `ease-out`, `ease-in-out`

**Duration:**
`duration-75`, `duration-100`, `duration-150`, `duration-200`, `duration-300`, `duration-500`, `duration-700`, `duration-1000`

**Delay:**
`delay-0`, `delay-75`, `delay-100`, `delay-150`, `delay-200`, `delay-300`, `delay-500`, `delay-700`, `delay-1000`

Arbitrary values are also supported: `duration-[500ms]`, `delay-[300ms]`.

### **Aspect Ratio**

`aspect-auto`, `aspect-square`, `aspect-video`

### **Object Utilities**

`object-contain`, `object-cover`, `object-fill`, `object-none`, `object-scale-down`
`object-bottom`, `object-center`, `object-left`, `object-left-bottom`, `object-left-top`, `object-right`, `object-right-bottom`, `object-right-top`, `object-top`

### **Gradient Backgrounds**

**Linear Gradients:**
`bg-linear-to-t`, `bg-linear-to-tr`, `bg-linear-to-r`, `bg-linear-to-br`, `bg-linear-to-b`, `bg-linear-to-bl`, `bg-linear-to-l`, `bg-linear-to-tl`

**Radial Gradients (Ellipse):**
`bg-radial`, `bg-radial-at-t`, `bg-radial-at-tr`, `bg-radial-at-r`, `bg-radial-at-br`, `bg-radial-at-b`, `bg-radial-at-bl`, `bg-radial-at-l`, `bg-radial-at-tl`

**Radial Gradients (Circle):**
`bg-radial-circle`, `bg-radial-circle-at-t`, `bg-radial-circle-at-tr`, `bg-radial-circle-at-r`, `bg-radial-circle-at-br`, `bg-radial-circle-at-b`, `bg-radial-circle-at-bl`, `bg-radial-circle-at-l`, `bg-radial-circle-at-tl`

**Conic Gradients:**
`bg-conic`, `bg-conic-at-t`, `bg-conic-at-tr`, `bg-conic-at-r`, `bg-conic-at-br`, `bg-conic-at-b`, `bg-conic-at-bl`, `bg-conic-at-l`, `bg-conic-at-tl`

**Gradient Color Stops:**
`from-{color}`, `to-{color}`, `via-{color}` (works with all color palettes and shades)

Examples: `from-primary-500`, `to-secondary-600`, `via-neutral-300`

### **Background**

**Size:** `bg-cover`, `bg-contain`, `bg-auto`

**Position:** `bg-center`, `bg-top`, `bg-bottom`, `bg-left`, `bg-right`, `bg-left-top`, `bg-left-bottom`, `bg-right-top`, `bg-right-bottom`

**Repeat:** `bg-no-repeat`, `bg-repeat`, `bg-repeat-x`, `bg-repeat-y`, `bg-repeat-round`, `bg-repeat-space`

**Attachment:** `bg-fixed`, `bg-local`, `bg-scroll`

**Origin:** `bg-origin-border`, `bg-origin-padding`, `bg-origin-content`

**Clip:** `bg-clip-border`, `bg-clip-padding`, `bg-clip-content`, `bg-clip-text`

```html
<!-- Gradient text -->
<span
  class="bg-linear-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent"
>
  Gradient text
</span>
```

### **Outline**

`outline`, `outline-0`, `outline-1`, `outline-2`, `outline-4`, `outline-6`, `outline-8`
`outline-offset-0`, `outline-offset-1`, `outline-offset-2`, `outline-offset-4`, `outline-offset-6`, `outline-offset-8`
`outline-solid`, `outline-dashed`, `outline-dotted`, `outline-double`, `outline-none`, `outline-hidden`
`outline-{color}` (e.g., `outline-primary-500`, `outline-error-300`)

```html
<button
  class="focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
>
  Accessible button
</button>
```

### **Container Queries**

`@container` - Sets `container-type: inline-size`

### **Colors**

`bg-neutral-100`, `text-primary-500`, `border-error-500`, `shadow-primary-500`, etc. (full palette, semantic, and arbitrary)

For a complete list, see the `utilityMap` in [`src/lib/runtime/style.ts`](../src/lib/runtime/style.ts).

**Note:** Some utilities are parsed at runtime rather than enumerated as literal keys in `utilityMap`. Color utilities (e.g. `bg-<color>-<shade>`), opacity modifiers (`/50`), arbitrary values (`prop-[value]`), spacing shorthands (`m`, `mx`, `p`, `px`, `gap`, etc.), and unbounded z-index integers (`z-<n>`, `-z-<n>`) are handled by the runtime helpers `parseColorClass`, `parseOpacityModifier`, `parseArbitrary`, `parseSpacing`, and `parseZIndex` respectively (see `src/lib/runtime/style.ts`).

### **Divide / Sibling Borders**

Apply borders between direct children. Pair with `divide-{color}` to set the border color.

`divide-x`, `divide-x-0`, `divide-x-2`, `divide-x-4`, `divide-x-8`
`divide-y`, `divide-y-0`, `divide-y-2`, `divide-y-4`, `divide-y-8`
`divide-solid`, `divide-dashed`, `divide-dotted`, `divide-double`, `divide-none`
`divide-{color}` (e.g., `divide-neutral-200`, `divide-primary-500`)

```html
<ul class="divide-y divide-neutral-200">
  <li class="py-2">Item one</li>
  <li class="py-2">Item two</li>
</ul>
```

### **Ring Focus Utilities**

CSS-variable–based focus rings rendered via `box-shadow`. Stack with `ring-{color}` to customize ring color.

`ring`, `ring-0`, `ring-1`, `ring-2`, `ring-4`, `ring-8`, `ring-inset`
`ring-offset-0`, `ring-offset-1`, `ring-offset-2`, `ring-offset-4`, `ring-offset-8`
`ring-{color}` (e.g., `ring-primary-500`, `ring-error-300`)

```html
<input class="focus:ring-2 focus:ring-primary-500 rounded" />
<button class="focus:ring-4 focus:ring-primary-200 focus:ring-offset-2">
  Save
</button>
```

### **CSS Filters**

All filter utilities compose via CSS custom properties — stacking multiple filter utilities on the same element works correctly.

**Blur:** `blur-none`, `blur-sm`, `blur`, `blur-md`, `blur-lg`, `blur-xl`, `blur-2xl`, `blur-3xl`

**Brightness:** `brightness-0`, `brightness-50`, `brightness-75`, `brightness-90`, `brightness-95`, `brightness-100`, `brightness-105`, `brightness-110`, `brightness-125`, `brightness-150`, `brightness-200`

**Contrast:** `contrast-0`, `contrast-50`, `contrast-75`, `contrast-100`, `contrast-125`, `contrast-150`, `contrast-200`

**Grayscale:** `grayscale-0`, `grayscale`

**Hue Rotate:** `hue-rotate-0`, `hue-rotate-15`, `hue-rotate-30`, `hue-rotate-60`, `hue-rotate-90`, `hue-rotate-180` (and negative `-hue-rotate-*` variants)

**Invert:** `invert-0`, `invert`

**Saturate:** `saturate-0`, `saturate-50`, `saturate-100`, `saturate-150`, `saturate-200`

**Sepia:** `sepia-0`, `sepia`

**Drop Shadow (filter-based):** `drop-shadow-none`, `drop-shadow-sm`, `drop-shadow`, `drop-shadow-md`, `drop-shadow-lg`, `drop-shadow-xl`, `drop-shadow-2xl`

```html
<!-- Multiple filters compose correctly — all three apply at once -->
<img class="blur-sm grayscale brightness-75" src="photo.jpg" />
```

### **Backdrop Filters**

Apply filter effects to the area **behind** an element (e.g., frosted glass). Use with a semi-transparent background.

`backdrop-blur-none`, `backdrop-blur-sm`, `backdrop-blur`, `backdrop-blur-md`, `backdrop-blur-lg`, `backdrop-blur-xl`, `backdrop-blur-2xl`, `backdrop-blur-3xl`

```html
<div class="backdrop-blur bg-white/30 rounded-lg p-4">Frosted glass panel</div>
```

### **Text Decoration**

**Style:** `decoration-solid`, `decoration-dashed`, `decoration-dotted`, `decoration-double`, `decoration-wavy`

**Thickness:** `decoration-auto`, `decoration-from-font`, `decoration-1`, `decoration-2`, `decoration-4`, `decoration-8`

**Color:** `decoration-{color}` (e.g., `decoration-primary-500`, `decoration-error-600`)

**Underline Offset:** `underline-offset-auto`, `underline-offset-1`, `underline-offset-2`, `underline-offset-4`, `underline-offset-8`

```html
<span
  class="underline decoration-wavy decoration-2 decoration-primary-500 underline-offset-4"
>
  Styled underline
</span>
```

### **List Style**

`list-none`, `list-disc`, `list-decimal`
`list-inside`, `list-outside`

```html
<ul class="list-disc list-inside">
  <li>Item one</li>
  <li>Item two</li>
</ul>
```

### **Scroll & Snap**

**Scroll Behavior:** `scroll-smooth`, `scroll-auto`

**Scroll Margin / Padding:** `scroll-m-0`, `scroll-p-0`

**Snap Type:** `snap-none`, `snap-x`, `snap-y`, `snap-both`, `snap-mandatory`, `snap-proximity`

**Snap Align:** `snap-start`, `snap-end`, `snap-center`, `snap-align-none`

**Snap Stop:** `snap-normal`, `snap-always`

```html
<div class="snap-x snap-mandatory overflow-x-scroll flex">
  <div class="snap-start shrink-0 w-full">Slide 1</div>
  <div class="snap-start shrink-0 w-full">Slide 2</div>
</div>
```

### **Multi-Column Layout**

`columns-auto`, `columns-1` through `columns-12`

```html
<div class="columns-3 gap-4">
  <p>Column text automatically flows across columns.</p>
</div>
```

### **Miscellaneous Utilities**

**Will Change:** `will-change-auto`, `will-change-scroll`, `will-change-contents`, `will-change-transform`, `will-change-opacity`

**Touch Action:** `touch-auto`, `touch-none`, `touch-pan-x`, `touch-pan-left`, `touch-pan-right`, `touch-pan-y`, `touch-pan-up`, `touch-pan-down`, `touch-pinch-zoom`, `touch-manipulation`

**Z-Index:** See the Z-Index section in Built-in Utilities above (any integer: `z-0`, `z-10`, `z-100`, `z-999`, `-z-10`, `-z-999`, etc., plus `z-auto`)

**Display:** `flow-root` — establishes a new block formatting context (replaces clearfix hacks).

**Field Sizing (Tailwind 4):**
`field-sizing-content` — auto-resize `<textarea>` and `<input>` to fit their content without JavaScript.
`field-sizing-fixed` — revert to fixed-size sizing.

```html
<!-- Auto-growing textarea -->
<textarea
  class="field-sizing-content w-full min-h-[2.5rem] p-2 border rounded"
></textarea>
```

**Color Scheme (Tailwind 4):**
`scheme-light`, `scheme-dark`, `scheme-both`, `scheme-only-light`, `scheme-only-dark` — control browser-native UI elements (scrollbars, form controls) to match the active color scheme.

```html
<html class="scheme-dark">
  <!-- Dark-mode native controls everywhere -->
</html>
<section class="scheme-light">
  <!-- Force light native controls in this section -->
</section>
```

**Font Stretch (Tailwind 4):**
`font-stretch-ultra-condensed`, `font-stretch-extra-condensed`, `font-stretch-condensed`, `font-stretch-semi-condensed`, `font-stretch-normal`, `font-stretch-semi-expanded`, `font-stretch-expanded`, `font-stretch-extra-expanded`, `font-stretch-ultra-expanded`

**Logical (flow-relative) Properties (Tailwind 4):**

Logical properties improve RTL and vertical writing-mode support by using flow-relative directions instead of physical left/right/top/bottom.

| Utility            | CSS property                                            |
| ------------------ | ------------------------------------------------------- |
| `ms-4`, `me-4`     | `margin-inline-start`, `margin-inline-end`              |
| `ps-4`, `pe-4`     | `padding-inline-start`, `padding-inline-end`            |
| `bs-4`, `be-4`     | `border-block-start-width`, `border-block-end-width`    |
| `start-4`, `end-4` | `inset-inline-start`, `inset-inline-end`                |
| `border-s-*`       | `border-inline-start-width`                             |
| `border-e-*`       | `border-inline-end-width`                               |
| `rounded-s-*`      | `border-start-start-radius` + `border-end-start-radius` |
| `rounded-e-*`      | `border-start-end-radius` + `border-end-end-radius`     |
| `text-start`       | `text-align: start`                                     |
| `text-end`         | `text-align: end`                                       |

```html
<!-- RTL-aware padding and margin -->
<div dir="rtl" class="ps-4 me-2">Logical padding + margin</div>

<!-- Logical border radius (rounded on the start side) -->
<div class="rounded-s-lg">Rounded on the inline-start side</div>
```

All logical spacing utilities accept the same numeric, fraction, and negative values as their physical equivalents.

**Text Shadow (Tailwind 4):**

`text-shadow-xs`, `text-shadow-sm`, `text-shadow`, `text-shadow-md`, `text-shadow-lg`, `text-shadow-xl`, `text-shadow-2xl`, `text-shadow-none`

Pair with a color utility to tint the shadow:

```html
<h1 class="text-shadow-lg text-shadow-primary-500/30 text-2xl font-bold">
  Primary shadow
</h1>
<span class="text-shadow text-shadow-error-700">Error state heading</span>
```

Color utilities follow the standard palette pattern: `text-shadow-{palette}-{shade}` and support the `/opacity` modifier.

**CSS Masking (Tailwind 4):**

`mask-none`, `mask-linear-to-t`, `mask-linear-to-b`, `mask-linear-to-l`, `mask-linear-to-r`, `mask-linear-to-tl`, `mask-linear-to-tr`, `mask-linear-to-bl`, `mask-linear-to-br`
`mask-radial`, `mask-radial-circle`, `mask-radial-from-t`, `mask-radial-from-b`, `mask-radial-from-l`, `mask-radial-from-r`
`mask-conic`, `mask-size-contain`, `mask-size-cover`, `mask-no-repeat`
`mask-alpha`, `mask-luminance`

```html
<!-- Fade image out towards the bottom -->
<img class="mask-linear-to-b w-full" src="hero.jpg" />

<!-- Radial mask for a spotlight effect -->
<div class="mask-radial bg-primary-500 p-8">Spotlight content</div>
```

### **Pseudo-Element Content**

`content-none` — `content: none`
`content-empty` — `content: ''` (empty string, makes a pseudo-element visible without text)
`content-['text']` — arbitrary content string via the `content-[value]` pattern

Used exclusively with the `before:` and `after:` variants to add decorative content.

```html
<!-- Decorative leading dash -->
<li class="before:content-['-_'] before:text-neutral-400">List item</li>

<!-- Clear pseudo-element content -->
<div class="before:content-none">No decoration</div>

<!-- Custom badge via ::before -->
<span
  class="relative before:content-['NEW'] before:absolute before:-top-3 before:text-xs before:bg-primary-500 before:text-white before:px-1 before:rounded"
>
  Feature
</span>
```

## 🧑‍💻 Variants

**State:** `hover:`, `focus:`, `active:`, `disabled:`, `visited:`, `checked:`, `first:`, `last:`, `odd:`, `even:`, `before:`, `after:`, `focus-within:`, `focus-visible:`

**Pseudo-Element:** `placeholder:`, `file:`, `marker:`, `selection:`, `open:`

| Variant        | CSS Selector Applied         | Use Case                                                |
| -------------- | ---------------------------- | ------------------------------------------------------- |
| `placeholder:` | `::placeholder`              | Style `<input>` and `<textarea>` placeholder text       |
| `file:`        | `::file-selector-button`     | Style the button inside `<input type="file">`           |
| `marker:`      | `::marker`                   | Style list item bullet points and numbers               |
| `selection:`   | `::selection`                | Style highlighted / selected text                       |
| `open:`        | `:is([open], :popover-open)` | Style open `<details>`, `<dialog>`, or popover elements |

```html
<input
  class="placeholder:text-neutral-400 placeholder:italic"
  placeholder="Search…"
/>
<input
  type="file"
  class="file:rounded file:border-0 file:bg-primary-500 file:text-white file:px-3 file:py-1 file:cursor-pointer"
/>
<ul class="list-disc marker:text-primary-500">
  <li>Colored bullet</li>
</ul>
<p class="selection:bg-primary-200">Select this text to see the highlight.</p>
<details class="open:bg-neutral-50 border rounded p-2">
  <summary>Toggle</summary>
  <p>Content shown when open.</p>
</details>
```

**Group:** `group-hover:`, `group-focus:`, `group-active:`, `group-disabled:`

**Peer:** `peer-hover:`, `peer-focus:`, `peer-checked:`, `peer-disabled:`

**Responsive:** `sm:`, `md:`, `lg:`, `xl:`, `2xl:`

**Container Queries:** `@xs:`, `@sm:`, `@md:`, `@lg:`, `@xl:`, `@2xl:`, `@3xl:`, `@4xl:`, `@5xl:`, `@6xl:`, `@7xl:`

**Arbitrary Container Queries:** `@[value]:` (e.g., `@[300px]:`, `@[20rem]:`, `@[50%]:`)

**Dark Mode (Prefers-color-scheme):** `dark:`

**Dark Mode (Class-based, e.g.; `.dark` on host element):** `dark-class:`

**Motion:** `motion-reduce:`, `motion-safe:` (map to `prefers-reduced-motion`)

**Text Direction:** `rtl:`, `ltr:` (require a `dir="rtl"` or `dir="ltr"` ancestor)

**Print:** `print:` (applies inside a `@media print` context)

**Accessibility:** `forced-colors:` (applies inside `@media (forced-colors: active)` — targets Windows High Contrast mode and other accessibility color-forcing displays)

```html
<!-- Hide decorative elements in high contrast mode -->
<div class="bg-primary-500 forced-colors:bg-transparent">Important content</div>
```

**Inert (Tailwind 4):** `inert:` — style elements that carry the `inert` global HTML attribute (useful for modals, drawers, and off-screen content):

```html
<!-- Dim content while a modal is open -->
<main
  inert
  class="inert:opacity-50 inert:pointer-events-none transition-opacity"
>
  Page content (dimmed when inert)
</main>
```

**Dynamic (Relational) Variants:**

| Variant                             | CSS Output                                   | Use Case                                                           |
| ----------------------------------- | -------------------------------------------- | ------------------------------------------------------------------ |
| `data-[attr]:` / `data-[attr=val]:` | `[data-attr]` / `[data-attr="val"]` selector | Style based on `data-*` attribute state (headless UI, Radix, etc.) |
| `has-[selector]:`                   | `:has(selector)` on the element              | Parent-conditional styling when a descendant matches               |
| `not-[selector]:`                   | `:not(selector)` on the element              | Style when the element does NOT match the selector                 |
| `in-[selector]:`                    | Ancestor `selector` scope                    | Style when inside an ancestor matching the selector                |
| `starting:`                         | `@starting-style` wrapper                    | CSS entry transitions when an element first appears in DOM         |
| `supports-[feat]:`                  | `@supports (feat)` wrapper                   | Progressive enhancement based on CSS feature support               |

```html
<!-- data-[*]: — commonly used with headless UI libraries -->
<button
  data-state="active"
  class="data-[state=active]:bg-primary-500 data-[state=active]:text-white"
>
  Active Tab
</button>

<!-- has-[*]: — style a container based on its contents -->
<label class="has-[input:checked]:font-bold">
  <input type="checkbox" /> Check me
</label>

<!-- not-[*]: — style when element does NOT match -->
<button class="not-[.primary]:border not-[.primary]:border-neutral-300">
  Secondary
</button>

<!-- in-[*]: — style inside a specific ancestor context -->
<span class="in-[.sidebar]:text-sm">Smaller in sidebar</span>

<!-- starting: — fade in when element is first inserted -->
<div class="opacity-100 transition-opacity duration-300 starting:opacity-0">
  Fades in on mount
</div>

<!-- supports-[*]: — progressively enhance with grid -->
<div
  class="flex supports-[display:grid]:grid supports-[display:grid]:grid-cols-3"
>
  Flex, or grid when supported
</div>
```

**Example:**

```html
<button class="bg-primary-500 hover:bg-primary-600 focus:shadow-sm">
  Hover & Focus
</button>
<div class="group">
  <span class="group-hover:text-primary-500">Group Hover</span>
</div>
<input type="checkbox" class="peer" />
<label class="peer-checked:text-success-600">Checked!</label>
<div class="p-2 md:p-4 lg:p-8">Responsive Padding</div>
<div class="@container">
  <div class="@lg:p-4 @2xl:p-8">Container Query</div>
</div>
<div class="dark:bg-neutral-900">Dark Mode (Prefers-color-scheme)</div>
<div class="dark-class:bg-neutral-900">Dark Mode (Class-based)</div>
```

## 🚀 Arbitrary Values

Arbitrary values let you use any valid CSS value, not just those in the built-in utility map. This is essential for rapid prototyping, advanced design, and one-off tweaks.

### **Syntax Patterns**

**Property-Value:** `prop-[value]`
**CSS Property-Value:** `[property:value]`
**CSS Variable Shorthand:** `prop-(--custom-property)` (Tailwind 4)

### **Supported Properties for `prop-[value]` Format**

Based on the enhanced property mappings in the implementation:

- `bg-[value]` → `background-color`
- `text-[value]` → `color` (or `font-size` if value ends with px/rem/em/etc.)
- `border-[value]` → `border`
- `shadow-[value]` → `box-shadow`
- `z-[value]` → `z-index`
- `p-[value]`, `px-[value]`, `py-[value]` → padding variants
- `m-[value]`, `mx-[value]`, `my-[value]` → margin variants
- `w-[value]`, `h-[value]` → width, height
- `size-[value]` → width **and** height simultaneously (e.g. `size-[40px]`)
- `min-w-[value]`, `max-w-[value]`, `min-h-[value]`, `max-h-[value]` → size constraints
- `content-[value]` → CSS `content` property for `::before`/`::after` pseudo-elements (e.g. `before:content-['→']`)
- `border-t-[value]`, `border-r-[value]`, `border-b-[value]`, `border-l-[value]` → directional borders
- `border-x-[value]`, `border-y-[value]` → axis borders
- `grid-cols-[value]`, `grid-rows-[value]` → grid templates
- `duration-[value]`, `delay-[value]` → transition properties
- `basis-[value]` → flex-basis
- `tracking-[value]` → letter-spacing
- `leading-[value]` → line-height
- `opacity-[value]` → opacity
- `rotate-[value]` → transform rotate
- `scale-[value]` → transform scale
- `translate-x-[value]`, `translate-y-[value]` → transform translate
- Plus any other CSS property using underscore-to-dash conversion

### **Examples**

```html
<!-- Property-value format -->
<div class="bg-[#f00] text-[rgba(0,0,0,0.5)] border-[2px_solid_#333]"></div>
<div class="shadow-[0_2px_8px_rgba(0,0,0,0.15)]"></div>
<div class="z-[22]"></div>
<div class="duration-[500ms] delay-[300ms]"></div>
<div class="min-w-[320px] font-weight-[700]"></div>
<div class="gap-[4rem] p-[2em] m-[-1em]"></div>
<div class="tracking-[0.1em] leading-[1.6]"></div>
<div class="basis-[50%]"></div>
<div class="rotate-[45deg] scale-[1.2]"></div>

<!-- CSS property format -->
<div class="[background:linear-gradient(45deg,red,blue)]"></div>
<div class="[box-shadow:0_4px_8px_rgba(0,0,0,0.2)]"></div>
<div class="[transform:translateX(50px)_rotate(45deg)]"></div>

<!-- Arbitrary container queries -->
<div class="@[300px]:p-4 @[500px]:grid-cols-2"></div>
```

**Variants + Arbitrary:**

```html
<button class="hover:bg-[#09f] focus:[box-shadow:0_0_0_2px_#09f]"></button>
<div class="md:p-[2rem] dark:bg-[#222] @lg:gap-[3rem]"></div>
```

### **CSS Variable Shorthand — `prop-(--custom-property)`**

The `prop-(--custom-property)` syntax is a shorthand borrowed from Tailwind CSS 4. It is equivalent to writing `prop-[var(--custom-property)]` and is normalized to that form before parsing.

```html
<!-- Shorthand form (Tailwind 4 style) -->
<div class="bg-(--brand-color)"></div>
<div class="text-(--md-sys-color-on-surface)"></div>
<div class="w-(--sidebar-width) h-(--header-height)"></div>

<!-- Equivalent explicit form -->
<div class="bg-[var(--brand-color)]"></div>
<div class="text-[var(--md-sys-color-on-surface)]"></div>
```

Multi-segment variable names (e.g. `--md-sys-color-primary`) work without any extra escaping:

```html
<div class="bg-(--md-sys-color-primary)"></div>
<div class="p-(--spacing-comfortable)"></div>
```

Variants compose with the shorthand normally:

```html
<button class="hover:bg-(--color-interactive) focus:outline-(--color-focus-ring)">
  Themed button
</button>
<div class="dark:text-(--on-dark-surface) sm:p-(--layout-gutter)">
  Responsive + dark-mode
</div>
```

Any property that accepts `prop-[value]` also accepts `prop-(--custom-property)`.

> **Implementation note:** Normalization happens at the top of `parseArbitrary()` — `bg-(--x)` is rewritten to `bg-[var(--x)]` before the rest of the parsing pipeline runs. CSS selector escaping (`\(`, `\)`) is handled automatically, so the generated class name selector is always valid.

## 🧪 Arbitrary Variants

Arbitrary variants allow you to target custom selectors, attributes, or states directly in your utility classes. This enables advanced styling scenarios, such as targeting specific attributes, custom states, or deeply nested elements, all with utility-first syntax.

**Syntax:**

- `[attr=value]:utility` — targets elements with a specific attribute value
- `foo-[bar]:utility` — targets custom selectors or pseudo-classes

**Examples:**

```html
<!-- Attribute variant: style when aria-selected is true -->
<div class="[aria-selected=true]:bg-primary-500"></div>

<!-- Custom selector variant: style when .foo-[bar] matches -->
<div class="foo-[bar]:text-error-500"></div>

<!-- Multiple variants: combine arbitrary with state or responsive -->
<button class="hover:[box-shadow:0_0_0_2px_#09f]"></button>
<div class="md:[data-open=true]:bg-success-100"></div>
```

- **How It Works:**
- Arbitrary variants are parsed before the base utility.
- The variant is prepended to the generated CSS selector.
- You can combine arbitrary variants with built-in variants (e.g., `hover:`, `md:`, `dark:`).

**Supported Patterns:**

- `[attr=value]:utility`
- `foo-[bar]:utility`
- Any valid selector or attribute inside brackets

**Best Practices:**

- Use arbitrary variants for advanced targeting needs, such as custom attributes, states, or deep selectors.
- Combine with responsive and state variants for dynamic, context-aware styling.
- Keep selectors concise and valid for optimal performance.

**Reference:**

- See `parseArbitraryVariant` and variant handling in [`src/lib/runtime/style.ts`](../src/lib/runtime/style.ts).

## 🎨 Color Palettes & Usage

JIT CSS provides a rich set of built-in color palettes, all accessible via utility classes and arbitrary values. Each palette uses CSS variables for easy theming and overrides.

**Available Palettes:**

- `neutral` (50-950)
- `primary` (50-950)
- `secondary` (50-950)
- `success` (50-950)
- `info` (50-950)
- `warning` (50-950)
- `error` (50-950)
- `white` (DEFAULT)
- `black` (DEFAULT)
- `transparent` (DEFAULT)
- `current` (DEFAULT, maps to `currentColor`)

**Extended Color Palette (opt-in):**

For a full Tailwind-compatible color palette (`slate`, `gray`, `zinc`, `stone`, `red`, `orange`, `amber`, `yellow`, `lime`, `green`, `emerald`, `teal`, `cyan`, `sky`, `blue`, `indigo`, `violet`, `purple`, `fuchsia`, `pink`, `rose`), import the opt-in module:

```ts
import { extendedColors } from '@jasonshimmy/custom-elements-runtime/css/colors';

// Use in a component
useStyle(
  () => css`
    :host {
      --accent: ${extendedColors.violet['500']};
    }
  `,
);
```

See the [Extended Color Palette section](#-extended-color-palette-typescript) in the API reference for full details.

**Opacity Modifiers:**

`bg-primary-500/50`, `text-error-500/80`, etc. (any palette color supports `/[0-100]` for opacity)

**Usage Examples:**

```html
<!-- Background colors -->
<div class="bg-neutral-100"></div>
<div class="bg-primary-300"></div>
<div class="bg-secondary-200"></div>
<div class="bg-success-800"></div>
<div class="bg-info-600"></div>
<div class="bg-warning-400"></div>
<div class="bg-error-500"></div>
<div class="bg-white"></div>
<div class="bg-black"></div>

<!-- Text colors -->
<span class="text-neutral-700">Neutral text</span>
<span class="text-primary-500">Primary text</span>
<span class="text-secondary-600">Secondary text</span>

<!-- Border colors -->
<div class="border border-error-400"></div>
<div class="border border-neutral-900"></div>

<!-- Shadow colors (with palette) -->
<div class="shadow shadow-primary-500"></div>

<!-- Arbitrary color values -->
<div class="bg-[#ff00ff]"></div>
<span class="text-[rgba(0,0,0,0.5)]">Custom RGBA</span>
<span class="text-[var(--cer-color-primary-500)]">CSS Variable</span>

<!-- Color with opacity modifier -->
<div class="bg-primary-500/50"></div>
<span class="text-error-500/80">Semi-transparent red</span>
```

**How to Override Colors:**

```css
:root {
  --cer-color-primary-500: #007bff;
  --cer-color-neutral-100: #f0f0f0;
}
```

**Tip:** You can use any palette with `bg-`, `text-`, `border-`, `shadow-`, `outline-`, `caret`, `accent`, `fill`, and `stroke` utilities for full flexibility.

## 📝 Prose Typography

The Prose typography system provides beautiful, professional typography defaults for long-form content like blog posts, articles, and documentation. Simply add the `prose` class to your content container:

```html
<article class="prose">
  <h1>My Blog Post</h1>
  <p class="lead">Beautiful typography with zero configuration.</p>
  <p>All HTML elements are automatically styled for optimal readability.</p>
  <ul>
    <li>Styled lists</li>
    <li>Proper spacing</li>
  </ul>
</article>
```

**Size Variants:**

- `prose-sm` - Compact content (0.875rem)
- `prose` - Default body text (1rem)
- `prose-lg` - Prominent content (1.125rem)
- `prose-xl` - Large displays (1.25rem)
- `prose-2xl` - Extra large (1.5rem)

**Dark Mode with `prose-invert`:**

```html
<!-- Automatic dark mode inversion -->
<article class="prose prose-invert bg-neutral-900">
  <h1>Dark Mode Article</h1>
  <p>All colors automatically optimized for dark backgrounds.</p>
</article>

<!-- Responsive dark mode -->
<article class="prose dark:prose-invert">
  <p>Adapts to system dark mode preference.</p>
</article>
```

**Color Schemes:**

Apply semantic color schemes with automatic dark mode support:

```html
<!-- Primary colored links (adapts to light/dark) -->
<article class="prose prose-primary">
  <p><a href="#">Primary colored link</a></p>
</article>

<!-- Available: prose-primary, prose-secondary, prose-success, 
     prose-info, prose-warning, prose-error -->
```

**Element Modifiers:**

Customize specific elements within prose content:

```html
<article
  class="prose prose-a:text-primary-600 prose-headings:font-black prose-code:text-secondary-700"
>
  <h1>Custom styled heading</h1>
  <p><a href="#">Custom styled link</a></p>
  <code>Custom styled code</code>
</article>
```

**Available modifiers:** `prose-headings`, `prose-h1`, `prose-h2`, `prose-h3`, `prose-h4`, `prose-h5`, `prose-h6`, `prose-p`, `prose-a`, `prose-blockquote`, `prose-figure`, `prose-figcaption`, `prose-strong`, `prose-em`, `prose-kbd`, `prose-code`, `prose-pre`, `prose-ol`, `prose-ul`, `prose-li`, `prose-dl`, `prose-dt`, `prose-dd`, `prose-table`, `prose-thead`, `prose-tbody`, `prose-tr`, `prose-th`, `prose-td`, `prose-img`, `prose-picture`, `prose-video`, `prose-hr`, `prose-lead`.

**Opt-out with `.not-prose`:**

```html
<article class="prose">
  <p>This paragraph has prose styling.</p>
  <div class="not-prose">
    <button class="px-4 py-2 bg-primary-500">Custom styled button</button>
  </div>
</article>
```

**Responsive Typography:**

```html
<article class="prose sm:prose-lg lg:prose-xl">
  Scales up on larger screens for better readability.
</article>
```

For complete documentation, see the [Prose Typography Guide](./prose.md).

## 🎨 Dynamic Styling with `useStyle`

The `useStyle` hook allows you to inject dynamic CSS-in-JS styles that can react to component props and state. This is perfect for complex styling logic that goes beyond utility classes.

### **Basic Usage**

```typescript
import {
  component,
  html,
  css,
  useStyle,
  ref,
  useProps,
} from '@jasonshimmy/custom-elements-runtime';

component('dynamic-card', () => {
  const { theme, size } = useProps({ theme: 'light', size: 'md' });
  const isExpanded = ref(false);

  useStyle(
    () => css`
      :host {
        background: ${theme === 'light' ? 'white' : 'black'};
        color: ${theme === 'light' ? 'black' : 'white'};
        padding: ${size === 'sm' ? '0.5rem' : size === 'lg' ? '2rem' : '1rem'};
        border-radius: 8px;
        transition: all 0.3s ease;
        transform: ${isExpanded.value ? 'scale(1.05)' : 'scale(1)'};
      }

      .card-content {
        opacity: ${isExpanded.value ? 1 : 0.8};
        transition: opacity 0.2s ease;
      }

      @media (prefers-color-scheme: dark) {
        :host {
          background: #111;
          color: #fff;
        }
      }
    `,
  );

  return html`
    <div
      class="card-content"
      @click="${() => (isExpanded.value = !isExpanded.value)}"
    >
      <h3>Dynamic Card</h3>
      <p>Click to expand!</p>
    </div>
  `;
});
```

### **Advanced Patterns**

```typescript
component('chart-widget', () => {
  const { data, colorScheme } = useProps({ data: [], colorScheme: 'blue' });
  const hoveredIndex = ref(-1);

  useStyle(
    () => css`
      .chart-bar {
        transition: all 0.2s ease;
        background: var(--cer-color-${colorScheme}-500);
      }

      .chart-bar:hover {
        background: var(--cer-color-${colorScheme}-600);
        transform: translateY(-2px);
      }

      ${data
        .map(
          (item, index) => `
      .bar-${index} {
        height: ${(item.value / Math.max(...data.map((d) => d.value))) * 100}%;
        opacity: ${hoveredIndex.value === -1 || hoveredIndex.value === index ? 1 : 0.5};
      }
    `,
        )
        .join('\n')}
    `,
  );

  return html`
    <div class="chart-container">
      ${data.map(
        (item, index) => html`
          <div
            class="chart-bar bar-${index}"
            @mouseenter="${() => (hoveredIndex.value = index)}"
            @mouseleave="${() => (hoveredIndex.value = -1)}"
          >
            ${item.label}
          </div>
        `,
      )}
    </div>
  `;
});
```

### **Combining with JIT CSS**

You can mix `useStyle` with utility classes for maximum flexibility:

```typescript
component('hybrid-button', () => {
  const props = useProps({ variant: 'primary', loading: false });
  useStyle(
    () => css`
      .btn-custom {
        position: relative;
        overflow: hidden;
      }

      .btn-custom::before {
        content: '';
        position: absolute;
        top: 0;
        left: ${props.loading ? '0%' : '-100%'};
        width: 100%;
        height: 100%;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255, 255, 255, 0.2),
          transparent
        );
        transition: left 0.6s ease;
      }

      .loading-spinner {
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  );

  return html`
    <button
      class="btn-custom px-4 py-2 rounded-lg font-medium transition-colors
                   ${props.variant === 'primary'
        ? 'bg-primary-500 hover:bg-primary-600 text-white'
        : props.variant === 'secondary'
          ? 'bg-secondary-500 hover:bg-secondary-600 text-white'
          : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-800'}"
    >
      ${props.loading
        ? html`<span
            class="loading-spinner inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"
          ></span>`
        : ''}
      <slot></slot>
    </button>
  `;
});
```

## 📚 Real-World Examples

### **Complex Layout with Mixed Approaches**

```typescript
component('dashboard-layout', () => {
  const props = useProps({ sidebarWidth: 280, headerHeight: 64 });
  const sidebarCollapsed = ref(false);
  const currentWidth = computed(() =>
    sidebarCollapsed.value ? 80 : props.sidebarWidth,
  );

  useStyle(
    () => css`
      :host {
        display: grid;
        grid-template-areas:
          'sidebar header'
          'sidebar main';
        grid-template-columns: ${currentWidth.value}px 1fr;
        grid-template-rows: ${props.headerHeight}px 1fr;
        height: 100vh;
        transition: grid-template-columns 0.3s ease;
      }

      .sidebar {
        grid-area: sidebar;
        background: var(--cer-color-neutral-900);
        transition: all 0.3s ease;
      }

      .header {
        grid-area: header;
        background: var(--cer-color-white);
        border-bottom: 1px solid var(--cer-color-neutral-200);
      }

      .main {
        grid-area: main;
        overflow-y: auto;
      }
    `,
  );

  return html`
    <aside class="sidebar p-4">
      <button
        class="w-full p-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-md mb-4 transition-colors"
        @click="${() => (sidebarCollapsed.value = !sidebarCollapsed.value)}"
      >
        ${sidebarCollapsed.value ? '→' : '←'}
      </button>
      <slot name="sidebar"></slot>
    </aside>

    <header class="header flex items-center justify-between px-6">
      <slot name="header"></slot>
    </header>

    <main class="main p-6 bg-neutral-50">
      <slot></slot>
    </main>
  `;
});
```

### **Responsive Card Grid with Container Queries**

```html
<div class="@container">
  <div
    class="grid gap-4 
              grid-cols-1 
              @xs:grid-cols-2 
              @md:grid-cols-3 
              @lg:grid-cols-4 
              @2xl:grid-cols-5"
  >
    <div
      class="bg-white rounded-lg shadow-md p-4 
                hover:shadow-lg hover:scale-105 
                transition-all duration-200"
    >
      <h3 class="font-semibold text-lg mb-2 text-neutral-800">Card Title</h3>
      <p class="text-neutral-600 text-sm leading-relaxed">
        This card uses container queries for responsive behavior.
      </p>
    </div>
  </div>
</div>
```

### **Gradient Background Examples**

**Linear Gradients:**

```html
<!-- Top to bottom -->
<div class="bg-linear-to-b from-primary-500 to-secondary-900 p-8 text-white">
  <h2 class="text-2xl font-bold">Linear Gradient</h2>
  <p>From top to bottom with two color stops</p>
</div>

<!-- Diagonal with via -->
<div class="bg-linear-to-br from-success-400 via-info-500 to-warning-600 p-8">
  <h2 class="text-2xl font-bold">Rainbow Diagonal</h2>
  <p>Three color stops create smooth transitions</p>
</div>
```

**Radial Gradients:**

```html
<!-- Ellipse from center -->
<div
  class="bg-radial from-primary-500 to-secondary-900 p-8 text-white rounded-xl"
>
  <h2 class="text-2xl font-bold text-center">Radial Ellipse</h2>
  <p class="text-center">Fades from center outward</p>
</div>

<!-- Circle from top-right corner -->
<div
  class="bg-radial-circle-at-tr from-success-400 via-info-500 to-warning-600 p-8 h-64"
>
  <p class="text-right">Circular burst from corner</p>
</div>
```

**Conic Gradients:**

```html
<!-- Color wheel effect -->
<div
  class="bg-conic from-error-500 via-warning-500 to-success-500 p-8 rounded-full w-64 h-64"
>
  <div class="flex items-center justify-center h-full">
    <span class="text-white font-bold">360° Gradient</span>
  </div>
</div>

<!-- Corner spotlight -->
<div class="bg-conic-at-bl from-neutral-900 to-primary-500 p-8 h-64">
  <p class="text-white">Conic from bottom-left</p>
</div>
```

**Complex Multi-stop Gradients:**

```html
<div
  class="bg-linear-to-r from-primary-500 via-secondary-400 to-success-500 p-8"
>
  <h2 class="text-2xl font-bold text-white drop-shadow-lg">
    Beautiful Multi-Color Gradient
  </h2>
  <p class="text-white">Three color stops create smooth transitions</p>
</div>

<!-- Combining gradients with background opacity -->
<div class="relative">
  <div
    class="absolute inset-0 bg-linear-to-r from-primary-500 to-secondary-900 opacity-80"
  ></div>
  <div class="relative p-8 text-white">
    <h2 class="text-2xl font-bold">Layered gradient effect</h2>
  </div>
</div>
```

### **Interactive Form with States**

```html
<form class="max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg">
  <div class="group mb-6">
    <label class="block text-sm font-medium text-neutral-700 mb-2">
      Email Address
    </label>
    <input
      type="email"
      class="w-full px-3 py-2 
             border border-neutral-300 rounded-md
             focus:border-primary-500 focus:ring-2 focus:ring-primary-200
             peer-invalid:border-error-500 peer-invalid:ring-error-200
             transition-colors duration-200"
      required
    />
    <p
      class="mt-1 text-sm text-error-600 opacity-0 peer-invalid:opacity-100 transition-opacity"
    >
      Please enter a valid email address
    </p>
  </div>

  <button
    type="submit"
    class="w-full bg-primary-500 hover:bg-primary-600 
           focus:bg-primary-600 focus:ring-4 focus:ring-primary-200
           disabled:bg-neutral-300 disabled:cursor-not-allowed
           text-white font-medium py-2 px-4 rounded-md
           transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
  >
    Submit Form
  </button>
</form>
```

## 🎨 Design Tokens (`useDesignTokens`)

Apply design tokens to `:host` as typed CSS custom property overrides. This is a concise, validated alternative to writing `useStyle(() => css\`:host { ... }\`)` by hand.

```ts
import {
  component,
  html,
  useDesignTokens,
} from '@jasonshimmy/custom-elements-runtime';

component('app-root', () => {
  useDesignTokens({
    primary: '#6366f1', // → --cer-color-primary-500
    fontSans: '"Inter", sans-serif',
    '--cer-color-neutral-900': '#0a0a0a', // arbitrary CSS var override
  });
  return html`<slot></slot>`;
});
```

### Supported Token Keys

| Key         | CSS property set            |
| ----------- | --------------------------- |
| `primary`   | `--cer-color-primary-500`   |
| `secondary` | `--cer-color-secondary-500` |
| `neutral`   | `--cer-color-neutral-500`   |
| `success`   | `--cer-color-success-500`   |
| `info`      | `--cer-color-info-500`      |
| `warning`   | `--cer-color-warning-500`   |
| `error`     | `--cer-color-error-500`     |
| `fontSans`  | `--cer-font-sans`           |
| `fontSerif` | `--cer-font-serif`          |
| `fontMono`  | `--cer-font-mono`           |
| `--cer-*`   | any arbitrary CSS variable  |

`useDesignTokens()` must be called during component render. It appends a `:host { … }` style block for only the tokens you provide — unspecified tokens retain their defaults from `variables.css`.

---

## 🌐 Global Styles (`useGlobalStyle`)

Inject CSS that escapes the Shadow DOM boundary into `document.adoptedStyleSheets`. Suitable for `@font-face` declarations, `:root` variable overrides, and global scroll styling. Deduplicated by CSS content so calling it in multiple component instances is safe.

> **Use sparingly** — this intentionally breaks Shadow DOM encapsulation. A dev-mode warning is emitted to keep the escape hatch visible.

```ts
import {
  component,
  html,
  css,
  useGlobalStyle,
} from '@jasonshimmy/custom-elements-runtime';

component('app-root', () => {
  useGlobalStyle(
    () => css`
      @font-face {
        font-family: 'Inter';
        src: url('/fonts/inter.woff2') format('woff2');
      }
      :root {
        --app-font: 'Inter', sans-serif;
        scroll-behavior: smooth;
      }
    `,
  );
  return html`<slot></slot>`;
});
```

The CSS is minified, sanitized, and deduplicated before injection. In environments without `CSSStyleSheet` support (older Safari, SSR), the function is a no-op.

---

## ✅ Class Name Helper (`cls`)

`cls()` is a **no-op identity function** that returns its input unchanged at runtime. Its purpose is to signal to development tools — IDEs, linters, and static analysis scanners — that a string contains JIT CSS utility class names.

```ts
import { cls } from '@jasonshimmy/custom-elements-runtime/jit-css';

const buttonClasses = cls(
  'flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600',
);

component('my-button', () => {
  return html`<button class="${buttonClasses}"><slot></slot></button>`;
});
```

Use `cls()` when you store class name strings outside template literals — for example in configuration objects, constants files, or computed class name logic — so that build-time tooling (the [Vite plugin](./vite-plugin.md)) can discover them during static analysis.

---

## 📚 Tips & Best Practices

- **Utility-first approach:** Start with utility classes, use `useStyle` for complex dynamic logic
- **Arbitrary values:** Use `prop-[value]` for quick customizations, `[property:value]` for complex CSS, and `prop-(--custom-property)` as a shorthand for CSS variable references
- **Combine variants** for powerful, dynamic styling (e.g., `hover:focus:bg-primary-600`)
- **Use semantic colors** and CSS variables for easy theming
- **Container queries** provide more precise responsive design than viewport-based breakpoints
- **Performance:** Arbitrary values are cached, so don't hesitate to use them
- **All utilities are mobile-first** and responsive
- **Extend the utility map** or property map for project-specific needs
- **Gradient tips:**
  - Use `from-`, `via-`, and `to-` with any color palette for consistent theming
  - Apply opacity to the entire gradient container (e.g., `bg-linear-to-r from-primary-500 to-secondary-900 opacity-80`)
  - Linear gradients work great for backgrounds and overlays
  - Radial gradients are perfect for spotlight effects and hero sections
  - Conic gradients create unique color wheel and pie chart effects
  - All gradient utilities use CSS variables (--tw-gradient-stops) for dynamic control
  - Combine gradient backgrounds with utilities like `rounded-xl`, `shadow-lg`, and responsive variants

## 🔍 API Reference

### **Opt-in Hooks & Global Control**

All of the following are exported from `@jasonshimmy/custom-elements-runtime/jit-css`:

- `useJITCSS(options?: JITCSSOptions): void` — Enable JIT CSS for the current component (or globally if called outside a component)
- `enableJITCSS(options?: JITCSSOptions): void` — Enable JIT CSS globally for all components
- `disableJITCSS(): void` — Disable JIT CSS globally
- `isJITCSSEnabled(): boolean` — Check whether JIT CSS is globally active
- `isJITCSSEnabledFor(root: ShadowRoot): boolean` — Check whether JIT CSS is active for a specific component

The following are exported from the root entry (`@jasonshimmy/custom-elements-runtime`):

- `useDesignTokens(tokens: DesignTokens): void` — Set typed CSS custom property overrides on `:host`
- `useGlobalStyle(factory: () => string): void` — Inject CSS into `document.adoptedStyleSheets`, escaping Shadow DOM

### **Core Functions**

- `jitCSS(html: string): string` — Generates JIT CSS from an HTML string containing utility class names
- `extractClassesFromHTML(html: string): Set<string>` — Extracts unique class names from an HTML string
- `css(strings, ...values): string` — Template literal function for CSS-in-JS (re-exported from root package)
- `useStyle(callback: () => string): void` — Hook for dynamic CSS injection (re-exported from root package)

### **Built-in Exports**

- `colors: Record<string, Record<string, string>>` - Semantic color palette object (neutral, primary, secondary, etc.)
- `utilityMap: CSSMap` - Complete mapping of all static utility class names to CSS declarations

### **Utility Helpers**

- `cls(className: string): string` — Identity function for IDE tooling and static analysis (no-op at runtime; signals JIT class names to scanners)

### **Parser Functions**

All of the following are exported from `@jasonshimmy/custom-elements-runtime/jit-css`:

- `parseSpacing(className: string): string | null` — Parses spacing utilities (`w-4`, `p-2`, `m-auto`, etc.)
- `parseZIndex(className: string): string | null` — Parses any integer z-index utility (`z-100`, `-z-50`, etc.)
- `parseColorClass(className: string): string | null` — Parses color utility classes (`bg-primary-500`, `text-neutral-700`, etc.)
- `parseColorWithOpacity(className: string): string | null` — Parses a color class with an optional `/opacity` modifier
- `parseGradientColorStop(className: string): string | null` — Parses gradient color stop utilities (`from-*`, `via-*`, `to-*`)
- `parseArbitrary(className: string): string | null` — Parses arbitrary value utilities (`w-[200px]`, `bg-[#ff0000]`, `bg-(--my-var)`, etc.). CSS variable shorthand (`prop-(--x)`) is normalized to `prop-[var(--x)]` before parsing.

### **Configuration Objects**

- `selectorVariants: SelectorVariantMap` — State and pseudo-class variants (`hover:`, `focus:`, `disabled:`, `inert:`, etc.)
- `mediaVariants: MediaVariantMap` — Responsive breakpoint media queries (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`, `dark:`)
- `containerVariants: MediaVariantMap` — Container query breakpoints (`@sm:`, `@md:`, `@lg:`, `@xl:`, `@2xl:`)

> **Note:** Lower-level helpers such as `spacingProps`, `parseOpacityModifier`, and `parseArbitraryVariant` are available from `src/lib/runtime/style.ts` for library authors but are not re-exported from any public entry point. Pure CSS utilities (`minifyCSS`, `sanitizeCSS`, `baseReset`, `cssEscape`, `escapeClassName`, `css`) live in `src/lib/runtime/css-utils.ts`; `css` is re-exported from the root package entry.

### **Types**

- `JITCSSOptions` — Options for `useJITCSS()` / `enableJITCSS()` / `createDOMJITCSS()` / `cerJITCSS()`
- `DesignTokens` — Token keys accepted by `useDesignTokens()`

---

## Known Limitations

- **No arbitrary value syntax for all properties.** Classes like `w-[42px]` or `mt-[1.5rem]` are supported for spacing and a subset of layout properties, but not every CSS property has arbitrary-value support. If you need a value not covered by a static utility, use `useStyle()` with the `css` tag instead.
- **CSS is regenerated on every render.** The JIT engine scans the rendered HTML for class names and rebuilds the component's stylesheet on each render pass. There is no render-to-render diffing of generated CSS rules. For components that re-render frequently with a large, stable set of classes, the overhead is minimal in practice (the generated CSS string is the same and browser style application is idempotent), but it is not zero. If this is a bottleneck, measure with `updateHealthMetric('averageRenderTime', …)` and consider moving stable base styles to `useStyle()`.
- **No design-time Intellisense.** Because classes are resolved at runtime from string literals, editor autocomplete for class names (like Tailwind's VS Code extension) does not work out of the box. Use the `cls()` helper or configure your editor's Tailwind plugin to scan the relevant file patterns.
- **Shadow DOM isolation applies.** JIT CSS rules are injected into each component's shadow root, not into the global document stylesheet. Classes set on elements outside the shadow root (e.g., on the host element itself via `:host`) must be handled with `useDesignTokens()` or explicit `:host` rules in `useStyle()`.
- **`dark:` variant requires a `prefers-color-scheme` media query.** The JIT engine's `dark:` variant is implemented via `@media (prefers-color-scheme: dark)`. Class-based dark mode toggling (e.g., `document.documentElement.classList.add('dark')`) is not supported out of the box.

For complete implementation details, see [`src/lib/runtime/style.ts`](../src/lib/runtime/style.ts).
