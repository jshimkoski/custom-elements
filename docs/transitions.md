# 🎬 Transitions Guide

Vue-like transition system integrated with JIT CSS for smooth enter/leave animations.

## 📖 Overview

The transitions module provides powerful, declarative animation capabilities using your JIT CSS utilities. Create smooth enter/leave transitions with minimal code and maximum flexibility.

### Key Features

- ✨ **JIT CSS Integration** - Use utility classes for all animations
- 🎯 **Pre-defined Presets** - Ready-to-use transition patterns
- 🎨 **Fully Customizable** - Mix and match JIT utilities
- 🔄 **Enter/Leave Lifecycle** - Complete control over animation phases
- 📋 **List Animations** - TransitionGroup for list items
- 🎭 **Multiple Modes** - Default, out-in, in-out transitions
- ⚡ **Performance Optimized** - Leverages native CSS transitions
- 🪝 **Lifecycle Hooks** - JavaScript callbacks for animation events

## 🚀 Quick Start

```typescript
import { component, html, ref } from '@jasonshimmy/custom-elements-runtime';
import { Transition } from '@jasonshimmy/custom-elements-runtime/transitions';

component('fade-demo', () => {
  const show = ref(true);

  return html`
    <button @click="${() => (show.value = !show.value)}">Toggle</button>

    ${Transition(
      {
        preset: 'fade',
        show: show.value,
      },
      html`
        <div class="card p-4 bg-primary-100 rounded-lg">
          Hello, Transitions!
        </div>
      `,
    )}
  `;
});
```

## 🎨 Transition Presets

Pre-built animation patterns using JIT CSS utilities:

### Fade

Simple opacity transition:

```typescript
${Transition({ preset: 'fade', show: isVisible.value }, content)}
```

### Slide

Slide in from any direction:

```typescript
// Slide from right
${Transition({ preset: 'slide-right', show: isVisible.value }, content)}

// Slide from left
${Transition({ preset: 'slide-left', show: isVisible.value }, content)}

// Slide up from bottom
${Transition({ preset: 'slide-up', show: isVisible.value }, content)}

// Slide down from top
${Transition({ preset: 'slide-down', show: isVisible.value }, content)}
```

### Scale

Scale transitions:

```typescript
// Scale up from center
${Transition({ preset: 'scale', show: isVisible.value }, content)}

// Scale down to center
${Transition({ preset: 'scale-down', show: isVisible.value }, content)}

// Zoom effect (scale from 0)
${Transition({ preset: 'zoom', show: isVisible.value }, content)}
```

### Special Effects

```typescript
// Bounce effect
${Transition({ preset: 'bounce', show: isVisible.value }, content)}

// Flip effect
${Transition({ preset: 'flip', show: isVisible.value }, content)}
```

## 🛠️ Custom Transitions with JIT CSS

Create custom animations using any JIT utility classes:

```typescript
component('custom-transition', () => {
  const show = ref(true);

  return html`
    ${Transition(
      {
        show: show.value,
        // Start state
        enterFrom: 'opacity-0 translate-y-4 scale-95',
        // Active transition
        enterActive: 'transition-all duration-300 ease-out',
        // End state
        enterTo: 'opacity-100 translate-y-0 scale-100',
        // Leave transitions
        leaveFrom: 'opacity-100 translate-y-0 scale-100',
        leaveActive: 'transition-all duration-200 ease-in',
        leaveTo: 'opacity-0 -translate-y-4 scale-95',
      },
      html` <div>Custom animated content</div> `,
    )}
  `;
});
```

### Animation Phases

Each transition has 6 phases:

1. **enterFrom** - Initial state when element appears
2. **enterActive** - Transition properties during enter
3. **enterTo** - Final state after enter completes
4. **leaveFrom** - Initial state when element disappears
5. **leaveActive** - Transition properties during leave
6. **leaveTo** - Final state after leave completes

## 🎯 Responsive Transitions

Use responsive JIT variants for adaptive animations:

```typescript
${Transition({
  show: show.value,
  // Different animations at different breakpoints
  enterFrom: 'opacity-0 translate-y-4 sm:translate-x-full md:scale-95',
  enterActive: 'transition-all duration-300 sm:duration-500 md:duration-700',
  enterTo: 'opacity-100 translate-y-0 sm:translate-x-0 md:scale-100'
}, content)}
```

## 🎪 TransitionGroup

Animate lists with enter/leave/move transitions:

```typescript
import { TransitionGroup } from '@jasonshimmy/custom-elements-runtime/transitions';
import { each } from '@jasonshimmy/custom-elements-runtime/directives';

component('todo-list', () => {
  const todos = ref([
    { id: 1, text: 'Learn transitions' },
    { id: 2, text: 'Build something awesome' },
  ]);

  const addTodo = () => {
    const id = Date.now();
    todos.value = [...todos.value, { id, text: `Todo ${id}` }];
  };

  const removeTodo = (id: number) => {
    todos.value = todos.value.filter((t) => t.id !== id);
  };

  return html`
    <button @click="${addTodo}">Add Todo</button>

    ${TransitionGroup(
      {
        preset: 'slide-right',
        tag: 'ul',
        moveClass: 'transition-transform duration-300',
      },
      each(
        todos.value,
        (todo) => html`
          <li
            key="${todo.id}"
            class="p-2 bg-neutral-100 rounded mb-2 flex justify-between items-center"
          >
            <span>${todo.text}</span>
            <button @click="${() => removeTodo(todo.id)}">×</button>
          </li>
        `,
      ),
    )}
  `;
});
```

### Flex and Grid Layouts

Use the `class` prop to apply flex or grid layouts to the wrapper element:

```typescript
// Flex layout
${TransitionGroup({
  preset: 'fade',
  class: 'flex gap-4 flex-wrap',
  tag: 'div'
}, each(items.value, (item) => html`
  <div key="${item.id}" class="shrink-0 p-4 bg-blue-100 rounded">
    ${item.text}
  </div>
`))}

// Grid layout
${TransitionGroup({
  preset: 'scale',
  class: 'grid grid-cols-3 gap-4',
  tag: 'div'
}, each(items.value, (item) => html`
  <div key="${item.id}" class="p-4 bg-purple-100 rounded">
    ${item.text}
  </div>
`))}

// Custom inline styles
${TransitionGroup({
  preset: 'slide-up',
  style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;',
  tag: 'div'
}, each(items.value, (item) => html`
  <div key="${item.id}">${item.text}</div>
`))}
```

### Move Transitions

The `moveClass` applies to items that change position:

```typescript
${TransitionGroup({
  preset: 'fade',
  moveClass: 'transition-transform duration-500 ease-out'
}, items)}
```

### TransitionGroup Options

Complete list of available options:

| Option          | Type                                | Default                               | Description                                  |
| --------------- | ----------------------------------- | ------------------------------------- | -------------------------------------------- |
| `preset`        | `string`                            | -                                     | Preset name (fade, slide-right, scale, etc.) |
| `show`          | `boolean`                           | `true`                                | Whether to show the group                    |
| `tag`           | `string`                            | `'div'`                               | HTML tag for wrapper element                 |
| `class`         | `string`                            | -                                     | CSS classes for wrapper (e.g., 'flex gap-4') |
| `style`         | `string \| object`                  | -                                     | Inline styles for wrapper                    |
| `moveClass`     | `string`                            | `'transition-transform duration-300'` | Classes applied during move transitions      |
| `mode`          | `'default' \| 'out-in' \| 'in-out'` | `'default'`                           | Transition timing mode                       |
| `duration`      | `number \| {enter, leave}`          | -                                     | Override transition duration (ms)            |
| `appear`        | `boolean`                           | `false`                               | Apply transition on initial render           |
| `css`           | `boolean`                           | `true`                                | Use CSS transitions (false = JS-only)        |
| `name`          | `string`                            | -                                     | Optional name for debugging                  |
| `enterFrom`     | `string`                            | -                                     | Classes at start of enter                    |
| `enterActive`   | `string`                            | -                                     | Classes during enter                         |
| `enterTo`       | `string`                            | -                                     | Classes at end of enter                      |
| `leaveFrom`     | `string`                            | -                                     | Classes at start of leave                    |
| `leaveActive`   | `string`                            | -                                     | Classes during leave                         |
| `leaveTo`       | `string`                            | -                                     | Classes at end of leave                      |
| Lifecycle Hooks | -                                   | -                                     | All 8 hooks (see below)                      |

## 🪝 Lifecycle Hooks

Execute JavaScript during animation phases:

```typescript
${Transition({
  show: show.value,
  preset: 'fade',

  // Before enter
  onBeforeEnter: (el) => {
    console.log('About to enter:', el);
  },

  // During enter (with manual control)
  onEnter: (el, done) => {
    // Perform custom animation
    anime({
      targets: el,
      opacity: [0, 1],
      duration: 300,
      complete: done
    });
  },

  // After enter completes
  onAfterEnter: (el) => {
    console.log('Enter completed:', el);
  },

  // If enter is cancelled
  onEnterCancelled: (el) => {
    console.log('Enter cancelled:', el);
  },

  // Leave hooks work the same way
  onBeforeLeave: (el) => { /* ... */ },
  onLeave: (el, done) => { /* ... */ },
  onAfterLeave: (el) => { /* ... */ },
  onLeaveCancelled: (el) => { /* ... */ }
}, content)}
```

## ⚙️ Advanced Options

### Transition Modes

Control timing of enter/leave animations:

```typescript
// Default: Enter and leave happen simultaneously
${Transition({ show: show.value, preset: 'fade', mode: 'default' }, content)}

// Out-in: Wait for leave to finish before entering
${Transition({ show: show.value, preset: 'fade', mode: 'out-in' }, content)}

// In-out: Start entering before leave finishes
${Transition({ show: show.value, preset: 'fade', mode: 'in-out' }, content)}
```

### Custom Duration

Override JIT CSS durations:

```typescript
// Single duration for both enter and leave
${Transition({
  show: show.value,
  preset: 'fade',
  duration: 1000 // milliseconds
}, content)}

// Separate durations
${Transition({
  show: show.value,
  preset: 'fade',
  duration: {
    enter: 500,
    leave: 200
  }
}, content)}
```

### Appear Transition

Animate on initial mount:

```typescript
${Transition({
  show: true,
  preset: 'scale',
  appear: true // Apply transition on first render
}, content)}
```

### JavaScript-Only Transitions

Disable CSS transitions and use only hooks:

```typescript
${Transition({
  show: show.value,
  css: false,
  onEnter: (el, done) => {
    // Use your favorite animation library
    gsap.to(el, {
      opacity: 1,
      duration: 0.3,
      onComplete: done
    });
  },
  onLeave: (el, done) => {
    gsap.to(el, {
      opacity: 0,
      duration: 0.2,
      onComplete: done
    });
  }
}, content)}
```

## 🎨 JIT CSS Examples

### Complex Animations

Combine multiple JIT utilities for rich effects:

```typescript
${Transition({
  show: show.value,
  enterFrom: 'opacity-0 translate-y-8 scale-90 rotate-3',
  enterActive: 'transition-all duration-500 ease-out delay-100',
  enterTo: 'opacity-100 translate-y-0 scale-100 rotate-0',
  leaveFrom: 'opacity-100',
  leaveActive: 'transition-opacity duration-200',
  leaveTo: 'opacity-0'
}, content)}
```

### Arbitrary Values

Use arbitrary JIT values for precise control:

```typescript
${Transition({
  show: show.value,
  enterFrom: '[opacity:0] [transform:perspective(1000px)_rotateX(90deg)]',
  enterActive: 'duration-700 ease-out',
  enterTo: '[opacity:1] [transform:perspective(1000px)_rotateX(0deg)]'
}, content)}
```

### State-Based Classes

Use variants for interaction states:

```typescript
${Transition({
  show: show.value,
  enterFrom: 'opacity-0 scale-95',
  enterActive: 'transition-all duration-300 hover:duration-500',
  enterTo: 'opacity-100 scale-100',
}, html`
  <div class="group">
    <!-- Content that responds to interactions -->
  </div>
`)}
```

## � Utility Functions

### createTransitionPreset

Create reusable custom transition presets:

```typescript
import { createTransitionPreset, Transition } from '@jasonshimmy/custom-elements-runtime/transitions';

// Define a custom preset
const myCustomFade = createTransitionPreset({
  enterFrom: 'opacity-0',
  enterActive: 'transition-opacity duration-500 ease-out',
  enterTo: 'opacity-100',
  leaveFrom: 'opacity-100',
  leaveActive: 'transition-opacity duration-300 ease-in',
  leaveTo: 'opacity-0'
});

// Use it with Transition
${Transition({
  ...myCustomFade,
  show: visible.value
}, content)}

// Or share across your application
export const appTransitions = {
  slideIn: createTransitionPreset({
    enterFrom: 'translate-x-full opacity-0',
    enterActive: 'transition-all duration-400 ease-out',
    enterTo: 'translate-x-0 opacity-100',
    leaveFrom: 'translate-x-0 opacity-100',
    leaveActive: 'transition-all duration-300 ease-in',
    leaveTo: '-translate-x-full opacity-0'
  }),
  popIn: createTransitionPreset({
    enterFrom: 'scale-0 opacity-0',
    enterActive: 'transition-all duration-300 ease-out',
    enterTo: 'scale-100 opacity-100',
    leaveFrom: 'scale-100 opacity-100',
    leaveActive: 'transition-all duration-200 ease-in',
    leaveTo: 'scale-0 opacity-0'
  })
};
```

### getTransitionStyleSheet

Get the pre-generated stylesheet for all transition presets (automatically initialized on module load):

```typescript
import { getTransitionStyleSheet } from '@jasonshimmy/custom-elements-runtime/transitions';

// Get the global transition stylesheet
const stylesheet = getTransitionStyleSheet();

// All preset classes are pre-generated and ready to use
// This happens automatically - you typically don't need to call this
```

**Note:** The transition CSS is automatically initialized when the module loads, ensuring all preset classes are available immediately.

## �💡 Tips & Best Practices

### 1. Keep Transitions Short

```typescript
// ✅ Good - Quick and snappy
enterActive: 'transition-all duration-200 ease-out';

// ❌ Too slow
enterActive: 'transition-all duration-1000';
```

### 2. Use Appropriate Easing

```typescript
// Enter: Ease out (fast start, slow end)
enterActive: 'transition-all duration-300 ease-out';

// Leave: Ease in (slow start, fast end)
leaveActive: 'transition-all duration-200 ease-in';
```

### 3. Combine Opacity with Transform

```typescript
// ✅ Smooth and performant
enterFrom: 'opacity-0 translate-y-4';
enterTo: 'opacity-100 translate-y-0';

// ❌ Jarring
enterFrom: 'translate-y-4'; // No opacity change
```

### 4. Test with Reduced Motion

```typescript
// Respect user preferences
enterActive: 'transition-all duration-300 [@media(prefers-reduced-motion:reduce)]:duration-0';
```

### 5. Use `will-change` for Complex Animations

```typescript
enterActive: 'transition-all duration-300 [will-change:transform,opacity]';
```

## 🔧 Available JIT Utilities for Transitions

### Transform

- `translate-x-{n}`, `translate-y-{n}` - Move elements
- `translate-x-full`, `-translate-x-full` - Full width translations
- `scale-{n}` - Scale from 0 to 150
- `rotate-{deg}` - Rotation

### Opacity

- `opacity-{n}` - 0 to 100 in increments of 5/10

### Transition Properties

- `transition-all` - All properties
- `transition-opacity` - Opacity only
- `transition-transform` - Transforms only
- `transition-colors` - Colors only

### Duration

- `duration-75` through `duration-1000`
- `delay-75` through `delay-1000`

### Easing

- `ease-linear` - Linear timing (constant speed)
- `ease-in` - Slow start, fast end
- `ease-out` - Fast start, slow end (recommended for enter)
- `ease-in-out` - Slow start and end

## 📚 Complete Example

```typescript
import { component, html, ref } from '@jasonshimmy/custom-elements-runtime';
import {
  Transition,
  TransitionGroup,
} from '@jasonshimmy/custom-elements-runtime/transitions';
import { each } from '@jasonshimmy/custom-elements-runtime/directives';

component('notification-center', () => {
  const notifications = ref<
    Array<{ id: number; message: string; type: string }>
  >([]);

  const addNotification = (message: string, type = 'info') => {
    const id = Date.now();
    notifications.value = [...notifications.value, { id, message, type }];

    // Auto-remove after 3 seconds
    setTimeout(() => removeNotification(id), 3000);
  };

  const removeNotification = (id: number) => {
    notifications.value = notifications.value.filter((n) => n.id !== id);
  };

  return html`
    <div class="fixed top-4 right-4 w-80 space-y-2">
      ${TransitionGroup(
        {
          tag: 'div',
          enterFrom: 'translate-x-full opacity-0',
          enterActive: 'transition-all duration-300 ease-out',
          enterTo: 'translate-x-0 opacity-100',
          leaveFrom: 'translate-x-0 opacity-100 scale-100',
          leaveActive: 'transition-all duration-200 ease-in',
          leaveTo: 'translate-x-full opacity-0 scale-95',
          moveClass: 'transition-transform duration-300',
        },
        each(
          notifications.value,
          (notif) => html`
            <div
              key="${notif.id}"
              class="p-4 rounded-lg shadow-lg
                 ${notif.type === 'success'
                ? 'bg-success-100'
                : notif.type === 'error'
                  ? 'bg-error-100'
                  : 'bg-info-100'}
                 flex justify-between items-start"
            >
              <p class="flex-1">${notif.message}</p>
              <button
                @click="${() => removeNotification(notif.id)}"
                class="ml-2 text-neutral-500 hover:text-neutral-700"
              >
                ×
              </button>
            </div>
          `,
        ),
      )}
    </div>

    <div class="p-4 space-x-2">
      <button
        @click="${() => addNotification('Success!', 'success')}"
        class="px-4 py-2 bg-success-500 text-white rounded"
      >
        Show Success
      </button>
      <button
        @click="${() => addNotification('Error occurred', 'error')}"
        class="px-4 py-2 bg-error-500 text-white rounded"
      >
        Show Error
      </button>
      <button
        @click="${() => addNotification('Info message', 'info')}"
        class="px-4 py-2 bg-info-500 text-white rounded"
      >
        Show Info
      </button>
    </div>
  `;
});
```

## 🏁 Summary

The transitions system provides powerful animation capabilities with:

- **Seamless JIT CSS integration** for utility-first animations
- **Pre-built presets** for common patterns (fade, slide-right, slide-left, slide-up, slide-down, scale, scale-down, bounce, zoom, flip)
- **Full customization** with JIT utilities
- **Responsive animations** with breakpoint variants
- **List animations** with TransitionGroup
- **Flex/Grid support** via `class` and `style` props on TransitionGroup
- **Lifecycle hooks** for JavaScript control (8 hooks total)
- **Multiple modes** for timing control (default, out-in, in-out)
- **Performance optimized** with native CSS transitions
- **Utility functions** for creating custom presets

### API Reference

**Components:**

- `Transition(options, content)` - Single element transitions
- `TransitionGroup(options, children)` - List transitions with move support

**Utility Functions:**

- `createTransitionPreset(classes)` - Create reusable custom presets
- `getTransitionStyleSheet()` - Get pre-generated transition stylesheet

**Presets:**

- `fade` - Simple opacity transition
- `slide-right`, `slide-left`, `slide-up`, `slide-down` - Directional slides
- `scale`, `scale-down` - Scale animations
- `bounce` - Bounce effect
- `zoom` - Zoom from zero
- `flip` - Rotation effect

**Lifecycle Hooks:**

- `onBeforeEnter`, `onEnter`, `onAfterEnter`, `onEnterCancelled`
- `onBeforeLeave`, `onLeave`, `onAfterLeave`, `onLeaveCancelled`

Create beautiful, smooth animations with minimal code! 🎬✨

## 📖 See Also

- [JIT CSS Guide](./jit-css.md)
- [Directives Guide](./directives.md)
- [Functional API](./functional-api.md)
