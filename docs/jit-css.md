# 🎨 Deep Dive: JIT CSS

Custom Elements Runtime provides a high-performance, zero-dependency JIT CSS engine for custom elements. It enables utility-first, variant-rich, and arbitrary-value styling directly from your Shadow DOM.

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

**Semantic Sizes:**
`w-3xs` to `w-7xl`, `h-3xs` to `h-7xl`, `max-w-3xs` to `max-w-7xl`, `max-h-3xs` to `max-h-7xl`, `min-w-3xs` to `min-w-7xl`, `min-h-3xs` to `min-h-7xl`

**Spacing (Margin/Padding):**
`m-auto`, `mx-auto`, `my-auto`, `p-4`, `m-2`, `mx-auto`, `gap-2`, `gap-x-2`, `gap-y-2`, etc. (all axis and negative values supported)

### **Overflow**
`overflow-auto`, `overflow-hidden`, `overflow-visible`, `overflow-scroll`
`overflow-x-auto`, `overflow-x-hidden`, `overflow-x-visible`, `overflow-x-scroll`
`overflow-y-auto`, `overflow-y-hidden`, `overflow-y-visible`, `overflow-y-scroll`

### **Pointer Events & Cursor**
`pointer-events-none`, `pointer-events-auto`
`cursor-auto`, `cursor-default`, `cursor-pointer`, `cursor-wait`, `cursor-text`, `cursor-move`, `cursor-help`, `cursor-not-allowed`, `cursor-grab`, `cursor-grabbing`

### **Accessibility**
`sr-only`, `not-sr-only`

### **Visibility**
`visible`, `invisible`

### **Z-index**
`z-0`, `z-10`, `z-20`, `z-30`, `z-40`, `z-50`

### **Grid**
`grid-cols-1` to `grid-cols-12`, `grid-rows-1` to `grid-rows-12`, `grid-cols-none`, `grid-rows-none`
`col-span-1` to `col-span-12`, `row-span-1` to `row-span-12`, `col-span-full`, `row-span-full`
`col-start-1` to `col-start-12`, `col-end-1` to `col-end-12`, `row-start-1` to `row-start-12`, `row-end-1` to `row-end-12`
`auto-cols-auto`, `auto-cols-min`, `auto-cols-max`, `auto-cols-fr`
`auto-rows-auto`, `auto-rows-min`, `auto-rows-max`, `auto-rows-fr`
`grid-flow-row`, `grid-flow-col`, `grid-flow-row-dense`, `grid-flow-col-dense`

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
**Scale:**
`scale-0`, `scale-50`, `scale-75`, `scale-90`, `scale-95`, `scale-100`, `scale-105`, `scale-110`, `scale-125`, `scale-150`

**Rotate:**
`rotate-0`, `rotate-1`, `rotate-2`, `rotate-3`, `rotate-6`, `rotate-12`, `rotate-45`, `rotate-90`, `rotate-180`
`-rotate-1`, `-rotate-2`, `-rotate-3`, `-rotate-6`, `-rotate-12`, `-rotate-45`, `-rotate-90`, `-rotate-180`

### **Transitions**
**Properties:**
`transition`, `transition-none`, `transition-all`, `transition-colors`, `transition-shadow`, `transition-opacity`, `transition-transform`

**Timing Functions:**
`ease-linear`, `ease-in`, `ease-out`, `ease-in-out`

**Duration:**
`duration-75`, `duration-100`, `duration-150`, `duration-200`, `duration-300`, `duration-500`, `duration-700`, `duration-1000`

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

### **Container Queries**
`@container` - Sets `container-type: inline-size`

### **Colors**
`bg-neutral-100`, `text-primary-500`, `border-error-500`, `shadow-primary-500`, etc. (full palette, semantic, and arbitrary)

For a complete list, see the `utilityMap` in [`src/lib/runtime/style.ts`](../src/lib/runtime/style.ts).

**Note:** Some utilities are parsed at runtime rather than enumerated as literal keys in `utilityMap`. Color utilities (e.g. `bg-<color>-<shade>`), opacity modifiers (`/50`), arbitrary values (`prop-[value]`) and spacing shorthands (`m`, `mx`, `p`, `px`, `gap`, etc.) are handled by the runtime helpers `parseColorClass`, `parseOpacityModifier`, `parseArbitrary`, and `parseSpacing` respectively (see `src/lib/runtime/style.ts`).

## 🧑‍💻 Variants

**State:** `hover:`, `focus:`, `active:`, `disabled:`, `visited:`, `checked:`, `first:`, `last:`, `odd:`, `even:`, `before:`, `after:`, `focus-within:`, `focus-visible:`

**Group:** `group-hover:`, `group-focus:`, `group-active:`, `group-disabled:`

**Peer:** `peer-hover:`, `peer-focus:`, `peer-checked:`, `peer-disabled:`

**Responsive:** `sm:`, `md:`, `lg:`, `xl:`, `2xl:`

**Container Queries:** `@xs:`, `@sm:`, `@md:`, `@lg:`, `@xl:`, `@2xl:`, `@3xl:`, `@4xl:`, `@5xl:`, `@6xl:`, `@7xl:`

**Arbitrary Container Queries:** `@[value]:` (e.g., `@[300px]:`, `@[20rem]:`, `@[50%]:`)

**Dark Mode:** `dark:`

**Example:**
```html
<button class="bg-primary-500 hover:bg-primary-600 focus:shadow-sm">Hover & Focus</button>
<div class="group">
  <span class="group-hover:text-primary-500">Group Hover</span>
</div>
<input type="checkbox" class="peer" />
<label class="peer-checked:text-success-600">Checked!</label>
<div class="p-2 md:p-4 lg:p-8">Responsive Padding</div>
<div class="@container">
  <div class="@lg:p-4 @2xl:p-8">Container Query</div>
</div>
<div class="dark:bg-neutral-900">Dark Mode</div>
```

## 🚀 Arbitrary Values

Arbitrary values let you use any valid CSS value, not just those in the built-in utility map. This is essential for rapid prototyping, advanced design, and one-off tweaks.

### **Syntax Patterns**

**Property-Value:** `prop-[value]`
**CSS Property-Value:** `[property:value]`

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
- `min-w-[value]`, `max-w-[value]`, `min-h-[value]`, `max-h-value]` → size constraints
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
<span class="text-[var(--color-primary-500)]">CSS Variable</span>

<!-- Color with opacity modifier -->
<div class="bg-primary-500/50"></div>
<span class="text-error-500/80">Semi-transparent red</span>
```

**How to Override Colors:**
```css
:root {
  --color-primary-500: #007bff;
  --color-neutral-100: #f0f0f0;
}
```

**Tip:** You can use any palette with `bg-`, `text-`, `border-`, `shadow-`, `outline-`, `caret`, `accent`, `fill`, and `stroke` utilities for full flexibility.

## 🎨 Dynamic Styling with `useStyle`

The `useStyle` hook allows you to inject dynamic CSS-in-JS styles that can react to component props and state. This is perfect for complex styling logic that goes beyond utility classes.

### **Basic Usage**

```typescript
import { component, html, css, useStyle, ref } from '@jasonshimmy/custom-elements-runtime';

component('dynamic-card', ({ theme = 'light', size = 'md' }) => {
  const isExpanded = ref(false);
  
  useStyle(() => css`
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
  `);
  
  return html`
    <div class="card-content" @click="${() => isExpanded.value = !isExpanded.value}">
      <h3>Dynamic Card</h3>
      <p>Click to expand!</p>
    </div>
  `;
});
```

### **Advanced Patterns**

```typescript
component('chart-widget', ({ data, colorScheme = 'blue' }) => {
  const hoveredIndex = ref(-1);
  
  useStyle(() => css`
    .chart-bar {
      transition: all 0.2s ease;
      background: var(--color-${colorScheme}-500);
    }
    
    .chart-bar:hover {
      background: var(--color-${colorScheme}-600);
      transform: translateY(-2px);
    }
    
    ${data.map((item, index) => `
      .bar-${index} {
        height: ${(item.value / Math.max(...data.map(d => d.value))) * 100}%;
        opacity: ${hoveredIndex.value === -1 || hoveredIndex.value === index ? 1 : 0.5};
      }
    `).join('\n')}
  `);
  
  return html`
    <div class="chart-container">
      ${data.map((item, index) => html`
        <div 
          class="chart-bar bar-${index}"
          @mouseenter="${() => hoveredIndex.value = index}"
          @mouseleave="${() => hoveredIndex.value = -1}"
        >
          ${item.label}
        </div>
      `)}
    </div>
  `;
});
```

### **Combining with JIT CSS**

You can mix `useStyle` with utility classes for maximum flexibility:

```typescript
component('hybrid-button', ({ variant = 'primary', loading = false }) => {
  useStyle(() => css`
    .btn-custom {
      position: relative;
      overflow: hidden;
    }
    
    .btn-custom::before {
      content: '';
      position: absolute;
      top: 0;
      left: ${loading ? '0%' : '-100%'};
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      transition: left 0.6s ease;
    }
    
    .loading-spinner {
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `);
  
  return html`
    <button class="btn-custom px-4 py-2 rounded-lg font-medium transition-colors
                   ${variant === 'primary' ? 'bg-primary-500 hover:bg-primary-600 text-white' : 
                     variant === 'secondary' ? 'bg-secondary-500 hover:bg-secondary-600 text-white' :
                     'bg-neutral-200 hover:bg-neutral-300 text-neutral-800'}"
    >
      ${loading ? html`<span class="loading-spinner inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"></span>` : ''}
      <slot></slot>
    </button>
  `;
});
```

## 📚 Real-World Examples

### **Complex Layout with Mixed Approaches**

```typescript
component('dashboard-layout', ({ sidebarWidth = 280, headerHeight = 64 }) => {
  const sidebarCollapsed = ref(false);
  const currentWidth = computed(() => sidebarCollapsed.value ? 80 : sidebarWidth);
  
  useStyle(() => css`
    :host {
      display: grid;
      grid-template-areas: 
        "sidebar header"
        "sidebar main";
      grid-template-columns: ${currentWidth.value}px 1fr;
      grid-template-rows: ${headerHeight}px 1fr;
      height: 100vh;
      transition: grid-template-columns 0.3s ease;
    }
    
    .sidebar {
      grid-area: sidebar;
      background: var(--color-neutral-900);
      transition: all 0.3s ease;
    }
    
    .header {
      grid-area: header;
      background: var(--color-white);
      border-bottom: 1px solid var(--color-neutral-200);
    }
    
    .main {
      grid-area: main;
      overflow-y: auto;
    }
  `);
  
  return html`
    <aside class="sidebar p-4">
      <button 
        class="w-full p-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-md mb-4 transition-colors"
        @click="${() => sidebarCollapsed.value = !sidebarCollapsed.value}"
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
  <div class="grid gap-4 
              grid-cols-1 
              @xs:grid-cols-2 
              @md:grid-cols-3 
              @lg:grid-cols-4 
              @2xl:grid-cols-5">
    <div class="bg-white rounded-lg shadow-md p-4 
                hover:shadow-lg hover:scale-105 
                transition-all duration-200">
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
<div class="bg-radial from-primary-500 to-secondary-900 p-8 text-white rounded-xl">
  <h2 class="text-2xl font-bold text-center">Radial Ellipse</h2>
  <p class="text-center">Fades from center outward</p>
</div>

<!-- Circle from top-right corner -->
<div class="bg-radial-circle-at-tr from-success-400 via-info-500 to-warning-600 p-8 h-64">
  <p class="text-right">Circular burst from corner</p>
</div>
```

**Conic Gradients:**
```html
<!-- Color wheel effect -->
<div class="bg-conic from-error-500 via-warning-500 to-success-500 p-8 rounded-full w-64 h-64">
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
<div class="bg-linear-to-r from-primary-500 via-secondary-400 to-success-500 p-8">
  <h2 class="text-2xl font-bold text-white drop-shadow-lg">
    Beautiful Multi-Color Gradient
  </h2>
  <p class="text-white">Three color stops create smooth transitions</p>
</div>

<!-- Combining gradients with background opacity -->
<div class="relative">
  <div class="absolute inset-0 bg-linear-to-r from-primary-500 to-secondary-900 opacity-80"></div>
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
    >
    <p class="mt-1 text-sm text-error-600 opacity-0 peer-invalid:opacity-100 transition-opacity">
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

## 📚 Tips & Best Practices

- **Utility-first approach:** Start with utility classes, use `useStyle` for complex dynamic logic
- **Arbitrary values:** Use `prop-[value]` for quick customizations and `[property:value]` for complex CSS
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

### **Core Functions**
- `minifyCSS(css: string): string` - Minifies CSS by removing whitespace and comments
- `jitCSS(html: string): string` - Generates CSS from HTML class names
- `css(strings, ...values): string` - Template literal function for CSS-in-JS
- `useStyle(callback: () => string): void` - Hook for dynamic CSS injection

### **Built-in Exports**
- `baseReset: string` - Base CSS reset for Shadow DOM
- `colors: Record<string, Record<string, string>>` - Color palette object
- `utilityMap: CSSMap` - Complete mapping of utility classes to CSS

### **Parser Functions**
- `parseSpacing(className: string): string | null` - Parses spacing utilities
- `parseColorClass(className: string): string | null` - Parses color utilities 
- `parseOpacityModifier(className: string): string | null` - Parses opacity modifiers
- `parseGradientColorStop(className: string): string | null` - Parses gradient color stops (`from-*`, `via-*`, `to-*`)
- `parseArbitrary(className: string): string | null` - Parses arbitrary value utilities
- `parseArbitraryVariant(token: string): string | null` - Parses arbitrary variant selectors

### **Configuration Objects**
- `selectorVariants: SelectorVariantMap` - State and pseudo-class variants
- `mediaVariants: MediaVariantMap` - Responsive breakpoints and media queries
- `containerVariants: MediaVariantMap` - Container query breakpoints
- `spacingProps: Record<string, string[]>` - Property mappings for spacing utilities

For complete implementation details, see [`src/lib/runtime/style.ts`](../src/lib/runtime/style.ts).