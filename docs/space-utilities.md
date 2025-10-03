# 📏 Space Utilities (space-x-* and space-y-*)

Tailwind CSS-style spacing utilities for adding consistent spacing between child elements.

## Overview

The `space-x-*` and `space-y-*` utilities add margin between child elements using the adjacent sibling selector (`> * + *`). This is perfect for stacks of elements where you want consistent spacing without manually adding margins to each child.

## Features

- ✅ **Horizontal spacing** with `space-x-*`
- ✅ **Vertical spacing** with `space-y-*`
- ✅ **Negative values** with `-space-x-*` and `-space-y-*`
- ✅ **Fractional values** like `space-x-1/2` and `space-y-1/4`
- ✅ **Reverse direction** with `space-x-reverse` and `space-y-reverse`
- ✅ **Works with all variants** (hover, focus, responsive breakpoints, etc.)
- ✅ **JIT CSS integration** - generates CSS on-demand

## Usage

### Basic Spacing

```typescript
component('button-group', () => {
  return html`
    <div class="flex space-x-4">
      <button class="px-4 py-2 bg-primary-500 text-white rounded">Button 1</button>
      <button class="px-4 py-2 bg-primary-500 text-white rounded">Button 2</button>
      <button class="px-4 py-2 bg-primary-500 text-white rounded">Button 3</button>
    </div>
  `;
});
```

### Vertical Stacks

```typescript
component('notification-list', () => {
  const notifications = ref([...]);
  
  return html`
    <div class="space-y-2">
      ${each(notifications.value, (notif) => html`
        <div key="${notif.id}" class="p-4 bg-white rounded shadow">
          ${notif.message}
        </div>
      `)}
    </div>
  `;
});
```

### With TransitionGroup

Perfect for animated lists and notification stacks:

```typescript
component('animated-stack', () => {
  const items = ref([...]);
  
  return html`
    ${TransitionGroup({
      tag: 'div',
      class: 'space-y-2',  // Space between items
      appear: true,
      preset: 'slide-down',
      moveClass: 'transition-transform duration-300'
    }, each(items.value, (item) => html`
      <div key="${item.id}" class="p-4 bg-primary-100 rounded">
        ${item.text}
      </div>
    `))}
  `;
});
```

### Reverse Direction

Use `space-x-reverse` or `space-y-reverse` to reverse the spacing direction (useful for RTL layouts or bottom-to-top stacks):

```typescript
// RTL horizontal layout
html`<div class="flex flex-row-reverse space-x-4 space-x-reverse">...</div>`

// Bottom-to-top vertical layout
html`<div class="flex flex-col-reverse space-y-4 space-y-reverse">...</div>`
```

### Negative Spacing

Pull elements closer together with negative values:

```typescript
html`<div class="flex -space-x-2">
  <img src="avatar1.jpg" class="w-10 h-10 rounded-full border-2 border-white">
  <img src="avatar2.jpg" class="w-10 h-10 rounded-full border-2 border-white">
  <img src="avatar3.jpg" class="w-10 h-10 rounded-full border-2 border-white">
</div>`
```

### Fractional Values

Use fractions for percentage-based spacing:

```typescript
html`<div class="space-x-1/2">...</div>  // 50% spacing`
html`<div class="space-y-1/4">...</div>  // 25% spacing`
```

### With Responsive Variants

```typescript
html`<div class="space-y-2 md:space-y-4 lg:space-y-8">...</div>`
```

## How It Works

The utilities use CSS custom properties and the adjacent sibling selector:

```css
.space-x-4 {
  --tw-space-x-reverse: 0;
}

.space-x-4 > :not([hidden]) ~ :not([hidden]) {
  margin-inline-start: calc(calc(0.25rem * 4) * calc(1 - var(--tw-space-x-reverse)));
  margin-inline-end: calc(calc(0.25rem * 4) * var(--tw-space-x-reverse));
}
```

This ensures:
- Only elements after the first get margin
- Hidden elements are skipped
- Reverse direction is supported via CSS variables
- Works with logical properties (LTR/RTL)

## Available Values

All spacing scale values are supported:

- `space-x-0`, `space-y-0` (0rem)
- `space-x-1`, `space-y-1` (0.25rem)
- `space-x-2`, `space-y-2` (0.5rem)
- `space-x-3`, `space-y-3` (0.75rem)
- `space-x-4`, `space-y-4` (1rem)
- `space-x-8`, `space-y-8` (2rem)
- `space-x-12`, `space-y-12` (3rem)
- ... and all other spacing values

## Comparison: space-* vs gap-*

### Use `space-*` when:
- ✅ You want spacing between stacked elements
- ✅ You're using TransitionGroup (preserves animations)
- ✅ You need reverse direction support
- ✅ You're building notification stacks or breadcrumbs

### Use `gap-*` when:
- ✅ You're using CSS Grid
- ✅ You're using flexbox with wrap
- ✅ You want consistent spacing including first/last items

## Example: Notification Stack

```typescript
component('notification-demo', () => {
  const notifications = ref<Array<{ id: number; message: string }>>([]);
  
  const addNotification = () => {
    const id = Date.now();
    notifications.value = [...notifications.value, {
      id,
      message: 'New notification!'
    }];
    
    setTimeout(() => {
      notifications.value = notifications.value.filter(n => n.id !== id);
    }, 3000);
  };
  
  return html`
    <div>
      <button @click="${addNotification}" class="px-4 py-2 bg-primary-500 text-white rounded">
        Add Notification
      </button>
      
      <div class="fixed top-4 right-4 w-80 space-y-2">
        ${TransitionGroup({
          tag: 'div',
          class: 'space-y-2',
          appear: true,
          enterFrom: 'translate-x-[100%] opacity-0',
          enterActive: 'transition-all duration-300',
          enterTo: 'translate-x-0 opacity-100',
          leaveFrom: 'translate-x-0 opacity-100',
          leaveActive: 'transition-all duration-200',
          leaveTo: 'translate-x-[100%] opacity-0',
          moveClass: 'transition-transform duration-300'
        }, each(notifications.value, (notif) => html`
          <div
            key="${notif.id}"
            class="p-4 bg-success-100 text-success-900 rounded-lg shadow-lg"
          >
            ${notif.message}
          </div>
        `))}
      </div>
    </div>
  `;
});
```

## Implementation Details

The `parseSpaceUtility()` function in `style.ts`:
- Parses `space-x-*` and `space-y-*` classes
- Supports numeric values (multiplied by `0.25rem`)
- Supports fractional values (converted to percentages)
- Supports negative values (with `-` prefix)
- Supports `reverse` modifier
- Integrates with the existing JIT CSS pipeline

## See Also

- [JIT CSS Documentation](./jit-css.md)
- [TransitionGroup Documentation](./transitions.md)
- [Tailwind CSS Space Documentation](https://tailwindcss.com/docs/space)
