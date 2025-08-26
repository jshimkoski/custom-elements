# 🎨 Deep Dive: JIT CSS

Custom Elements Runtime provides a high-performance, zero-dependency JIT CSS engine for custom elements. It enables utility-first, variant-rich, and arbitrary-value styling directly from your HTML templates.

## 🏗️ How JIT CSS Works

- **Base Reset:** Applies a minimal Shadow DOM reset for consistent rendering.
- **JIT CSS:** Extracts all class names from your HTML, parses utilities, variants, and arbitrary values, and generates scoped CSS rules on demand.
- **Minification:** Strips whitespace and comments for fast, small payloads.
- **Memoization & Throttling:** Caches CSS output for repeated HTML inputs and throttles regeneration for performance.

## 🧩 Built-in Utilities

**Layout:** `block`, `inline`, `inline-block`, `flex`, `inline-flex`, `grid`, `hidden`

**Grid:** `grid-cols-1` to `grid-cols-12`, `grid-rows-1` to `grid-rows-12`, `col-span-*`, `row-span-*`

**Position:** `absolute`, `relative`, `fixed`, `sticky`

**Typography:** `font-bold`, `font-semibold`, `font-medium`, `font-light`, `italic`, `underline`, `uppercase`, `text-left`, `text-center`, `text-right`, `text-xs` to `text-8xl`, `truncate`, `line-clamp-*`

**Borders & Radius:** `border`, `rounded-none`, `rounded-xs`, `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-full`

**Shadow & Effects:** `shadow-none`, `shadow-xs`, `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl`

**Transitions:** `transition`, `transition-colors`, `transition-opacity`, `transition-transform`, `duration-[value]`, `delay-[value]`

**Visibility:** `visible`, `invisible`

**Flex:** `grow`, `shrink`, `grow-0`, `shrink-0`, `basis-[value]`, `items-[value]`, `justify-[value]`, `self-[value]`

**Font Family:** `font-sans`, `font-serif`, `font-mono`

**Spacing:** `p-4`, `m-2`, `mx-auto`, `gap-2`, `gap-x-2`, `gap-y-2`, etc. (all axis and negative values supported)

**Colors:** `bg-gray-100`, `text-blue-500`, `border-red-500`, `shadow-blue-500`, etc. (full palette, semantic, and arbitrary)

## 🧑‍💻 Variants

**State:** `hover:`, `focus:`, `active:`, `disabled:`, `visited:`, `checked:`, `first:`, `last:`, `odd:`, `even:`, `before:`, `after:`, `focus-within:`, `focus-visible:`

**Group:** `group-hover:`, `group-focus:`, `group-active:`, `group-disabled:`

**Peer:** `peer-hover:`, `peer-focus:`, `peer-checked:`, `peer-disabled:`

**Responsive:** `sm:`, `md:`, `lg:`, `xl:`, `2xl:`

**Dark Mode:** `dark:`

**Example:**
```html
<button class="bg-blue-500 hover:bg-blue-600 focus:ring-2">Hover & Focus</button>
<div class="group">
  <span class="group-hover:text-blue-500">Group Hover</span>
</div>
<input type="checkbox" class="peer" />
<label class="peer-checked:text-green-600">Checked!</label>
<div class="p-2 md:p-4 lg:p-8">Responsive Padding</div>
<div class="dark:bg-gray-900">Dark Mode</div>
```

## 🚀 Arbitrary Values: The Power Feature

Arbitrary values let you use any valid CSS value, not just those in the built-in utility map. This is essential for rapid prototyping, advanced design, and one-off tweaks.

**Syntax:** `prop-[value]`

**Supported Properties:**
- `bg-[value]`, `text-[value]`, `border-[value]`, `shadow-[value]`, `z-[value]`, `duration-[value]`, `delay-[value]`, `min-w-[value]`, `max-w-[value]`, `font-weight-[value]`, `basis-[value]`, `items-[value]`, `justify-[value]`, `self-[value]`, `tracking-[value]`, `gap-[value]`, `p-[value]`, `m-[value]`, etc.

**Examples:**
```html
<div class="bg-[#f00] text-[rgba(0,0,0,0.5)] border-[2px_solid_#333]"></div>
<div class="shadow-[0_2px_8px_rgba(0,0,0,0.15)]"></div>
<div class="z-[22]"></div>
<div class="duration-[500ms] delay-[300ms]"></div>
<div class="min-w-[320px] font-weight-[700]"></div>
<div class="gap-[4rem] p-[2em] m-[-1em]"></div>
<div class="tracking-[0.1em]"></div>
<div class="basis-[50%]"></div>
<div class="items-[center] justify-[space-between]"></div>
```

**Variants + Arbitrary:**
```html
<button class="hover:bg-[#09f] focus:[box-shadow:0_0_0_2px_#09f]"></button>
<div class="md:p-[2rem] dark:bg-[#222]"></div>
```

## 🎨 Color Palettes & Usage

JIT CSS provides a rich set of built-in color palettes, all accessible via utility classes and arbitrary values. Each palette uses CSS variables for easy theming and overrides.

**Available Palettes:**

- `gray` (50-900)
- `slate` (50-900)
- `zinc` (50-900)
- `red` (50-900)
- `blue` (50-900)
- `green` (50-900)
- `amber` (50-900)
- `indigo` (50-900)
- `emerald` (50-900)
- `rose` (50-900)
- `white` (DEFAULT)
- `black` (DEFAULT)

**Usage Examples:**

```html
<!-- Background colors -->
<div class="bg-gray-100"></div>
<div class="bg-slate-700"></div>
<div class="bg-zinc-900"></div>
<div class="bg-red-500"></div>
<div class="bg-blue-300"></div>
<div class="bg-green-800"></div>
<div class="bg-amber-400"></div>
<div class="bg-indigo-600"></div>
<div class="bg-emerald-200"></div>
<div class="bg-rose-900"></div>
<div class="bg-white"></div>
<div class="bg-black"></div>

<!-- Text colors -->
<span class="text-gray-700">Gray text</span>
<span class="text-blue-500">Blue text</span>
<span class="text-emerald-600">Emerald text</span>

<!-- Border colors -->
<div class="border border-red-400"></div>
<div class="border border-slate-900"></div>

<!-- Shadow colors (with palette) -->
<div class="shadow shadow-blue-500"></div>

<!-- Arbitrary color values -->
<div class="bg-[#ff00ff]"></div>
<span class="text-[rgba(0,0,0,0.5)]">Custom RGBA</span>

<!-- Color with opacity modifier -->
<div class="bg-blue-500/50"></div>
<span class="text-red-500/80">Semi-transparent red</span>
```

**How to Override Colors:**
```css
:root {
  --color-blue-500: #007bff;
  --color-gray-100: #f0f0f0;
}
```

**Tip:** You can use any palette with `bg-`, `text-`, `border-`, `shadow-`, `outline-`, `caret`, `accent`, and arbitrary value syntax for full flexibility.

## 📚 Tips & Best Practices

- Use arbitrary values for advanced design and rapid prototyping.
- Arbitrary values: use `prop-[value]` syntax
- Combine variants for powerful, dynamic styling.
- Use semantic colors and CSS variables for theming.
- All utilities are mobile-first and responsive.
- Extend the utility map or property map for custom needs.

## 🔍 Reference

- `minifyCSS(css: string): string`
- `baseReset: string`
- `jitCSS(html: string): string`
- Utility classes: see `utilityMap` in `style-utils.ts`
- Variants: see `selectorVariants` and `mediaVariants`

For full details, see the source in [`src/lib/style-utils.ts`](src/lib/style-utils.ts).
