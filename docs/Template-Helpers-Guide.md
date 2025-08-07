# Template Helpers Documentation

Template helpers are utility functions that enhance the developer experience when writing component templates. They provide better IDE support, type safety, and convenient utilities for common template tasks.

## Quick Start

```typescript
import { html, css, classes, styles, ref, on } from '../lib/template-helpers.js';

const MyComponent = component<State>('my-component')({
  template: (state) => html`
    <div class="${classes({ active: state.isActive })}">
      <h1 style="${styles({ color: state.color, fontSize: '2rem' })}">
        Hello World
      </h1>
    </div>
  `,
  style: css`
    .active { opacity: 1; }
  `
});
```

## Available Helpers

### 1. `html`` Template Literal

Enhanced template literal for HTML with better IDE support and syntax highlighting. **Note: This does not provide built-in event handling - use the component's `events` configuration instead.**

```typescript
html`<div>Hello ${name}</div>`
```

**Features:**
- Enhanced syntax highlighting in compatible IDEs
- Better autocomplete for HTML elements and attributes
- Automatic handling of dynamic values
- Type safety for interpolated values
- **Does NOT handle events** - use `data-action` attributes with the `events` config

**Example:**
```typescript
template: (state) => html`
  <div class="container">
    <h1>${state.title}</h1>
    <p>Count: ${state.count}</p>
    <button data-action="increment">Click me</button>
  </div>
`,

events: {
  '[data-action="increment"]': {
    click: (e, state, api) => {
      state.count++;
    }
  }
}
```

### 2. `css`` Template Literal

Template literal for CSS with syntax highlighting support.

```typescript
css`
  .button {
    background: blue;
    color: white;
  }
`
```

**Features:**
- CSS syntax highlighting in compatible IDEs
- Better autocomplete for CSS properties
- Support for dynamic values
- Cleaner CSS-in-JS experience

**Example:**
```typescript
style: css`
  .container {
    display: flex;
    gap: 1rem;
    padding: 2rem;
  }
  
  .button {
    background: var(--primary-color);
    border: none;
    border-radius: 4px;
  }
`
```

### 3. `classes()` Function

Conditionally apply CSS classes based on object properties. Similar to popular libraries like clsx or classnames.

```typescript
classes({ active: true, disabled: false, 'custom-class': condition })
// Returns: "active custom-class"
```

**Parameters:**
- `obj: Record<string, boolean>` - Object where keys are class names and values are conditions

**Features:**
- Conditional class application
- Clean and readable syntax
- Automatic filtering of falsy conditions
- Type-safe class names

**Examples:**
```typescript
// Basic usage
classes({
  'btn': true,
  'btn-primary': state.variant === 'primary',
  'btn-disabled': state.disabled,
  'btn-large': state.size === 'large'
})

// In templates
template: (state) => html`
  <button class="${classes({
    'button': true,
    'active': state.isActive,
    'loading': state.isLoading,
    'disabled': state.disabled
  })}">
    ${state.label}
  </button>
`

// Complex conditions
classes({
  'card': true,
  'card-elevated': state.elevation > 0,
  'card-interactive': state.onClick && !state.disabled,
  'card-error': state.status === 'error'
})
```

### 4. `styles()` Function

Generate inline style strings from JavaScript objects. Converts property-value pairs into CSS style declarations.

```typescript
styles({ color: 'red', fontSize: '16px', marginTop: '1rem' })
// Returns: "color: red; font-size: 16px; margin-top: 1rem"
```

**Parameters:**
- `obj: Record<string, string | number>` - Object where keys are CSS properties and values are CSS values

**Features:**
- Automatic camelCase to kebab-case conversion
- Support for numeric values (automatically converts to strings)
- Clean object-based syntax
- Type-safe property names

**Examples:**
```typescript
// Basic usage
styles({
  backgroundColor: state.bgColor,
  color: state.textColor,
  fontSize: state.fontSize + 'px',
  padding: '1rem',
  borderRadius: '4px'
})

// In templates
template: (state) => html`
  <div style="${styles({
    width: state.width + 'px',
    height: state.height + 'px',
    backgroundColor: state.color,
    transform: `scale(${state.scale})`,
    transition: 'all 0.3s ease'
  })}">
    Dynamic content
  </div>
`

// Conditional styles
styles({
  opacity: state.visible ? '1' : '0',
  pointerEvents: state.disabled ? 'none' : 'auto',
  cursor: state.clickable ? 'pointer' : 'default'
})
```

### 5. `ref()` Function

Create typed element references with better TypeScript support. Simplifies DOM element access within component callbacks.

```typescript
ref<HTMLButtonElement>((el) => {
  el.focus();
  el.addEventListener('click', handler);
})
```

**Parameters:**
- `callback: (el: T) => void` - Callback function that receives the element

**Features:**
- Full TypeScript support with element type inference
- Better type safety for DOM operations
- Cleaner ref callback syntax
- Automatic type casting

**Examples:**
```typescript
// Basic usage
template: (state) => html`
  <input data-ref="nameInput" type="text" />
`,

refs: {
  nameInput: ref<HTMLInputElement>((el) => {
    if (state.shouldFocus) {
      el.focus();
    }
    el.value = state.defaultValue;
  })
}

// Complex ref usage
refs: {
  canvas: ref<HTMLCanvasElement>((el) => {
    const ctx = el.getContext('2d');
    if (ctx) {
      // TypeScript knows ctx is CanvasRenderingContext2D
      ctx.fillStyle = state.color;
      ctx.fillRect(0, 0, el.width, el.height);
    }
  })
}
```

### 6. `on()` Function

Create event handlers with enhanced typing and better development experience.

```typescript
on('click', (event, state, api) => {
  // Handle click event
})
```

**Parameters:**
- `eventType: K` - The event type (with full autocomplete)
- `handler: (event, state, api) => void` - The event handler function

**Features:**
- Full TypeScript support for event types
- Autocomplete for all standard DOM events
- Type-safe event objects
- Clean handler definition syntax

**Examples:**
```typescript
// Basic usage
events: {
  'button': on('click', (event, state, api) => {
    event.preventDefault();
    state.count++;
    api.emit('count-changed', state.count);
  })
}

// Multiple event types
events: {
  'input': {
    ...on('input', (event, state) => {
      const target = event.target as HTMLInputElement;
      state.value = target.value;
    }),
    ...on('focus', (event, state) => {
      state.focused = true;
    }),
    ...on('blur', (event, state) => {
      state.focused = false;
    })
  }
}
```

## Best Practices

### 1. Always Use Template Helpers

```typescript
// ✅ Good: Using template helpers
template: (state) => html`
  <div class="${classes({ active: state.isActive })}">
    <span style="${styles({ color: state.color })}">
      ${state.text}
    </span>
  </div>
`

// ❌ Avoid: Manual string concatenation
template: (state) => `
  <div class="${state.isActive ? 'active' : ''}">
    <span style="color: ${state.color}">
      ${state.text}
    </span>
  </div>
`
```

### 2. Combine Helpers for Complex Scenarios

```typescript
template: (state) => html`
  <div class="${classes({
    'card': true,
    'card-elevated': state.elevation > 0,
    'card-loading': state.loading
  })}" style="${styles({
    '--elevation': state.elevation,
    '--primary-color': state.theme.primary,
    transform: state.loading ? 'scale(0.98)' : 'scale(1)'
  })}">
    <h3>${state.title}</h3>
    <p>${state.description}</p>
  </div>
`
```

### 3. Use TypeScript Types

```typescript
// Define interfaces for better type safety
interface CardProps {
  title: string;
  description: string;
  variant: 'primary' | 'secondary' | 'danger';
  size: 'small' | 'medium' | 'large';
}

// Use typed refs
refs: {
  titleInput: ref<HTMLInputElement>((el) => {
    // TypeScript knows this is an input element
    el.placeholder = 'Enter title...';
    el.focus();
  })
}
```

### 4. Keep Templates Clean

```typescript
// ✅ Good: Extract complex logic to computed properties
computed: {
  cardClasses: (state) => classes({
    'card': true,
    'card-primary': state.variant === 'primary',
    'card-large': state.size === 'large',
    'card-disabled': state.disabled
  }),
  
  cardStyles: (state) => styles({
    '--card-color': state.color,
    '--card-padding': state.size === 'large' ? '2rem' : '1rem'
  })
},

template: (state) => html`
  <div class="${state.cardClasses}" style="${state.cardStyles}">
    ${state.content}
  </div>
`
```

## IDE Support

For the best development experience, ensure your IDE supports:

1. **TypeScript Language Service** - For type checking and autocomplete
2. **Template Literal Syntax Highlighting** - Many IDEs support this for tagged template literals
3. **CSS-in-JS Extensions** - For better CSS syntax highlighting within JavaScript

### VS Code Extensions

Recommended VS Code extensions for enhanced template helper experience:

- `ms-vscode.vscode-typescript-next` - Latest TypeScript features
- `bradlc.vscode-tailwindcss` - CSS class autocomplete (if using Tailwind)
- `styled-components.vscode-styled-components` - Enhanced CSS-in-JS support

## Migration Guide

### From String Templates

```typescript
// Before
template: (state) => `
  <div class="container ${state.theme} ${state.size}">
    <h1 style="color: ${state.color}; font-size: ${state.fontSize}px">
      ${state.title}
    </h1>
  </div>
`

// After
template: (state) => html`
  <div class="${classes({
    'container': true,
    [state.theme]: true,
    [state.size]: true
  })}">
    <h1 style="${styles({
      color: state.color,
      fontSize: state.fontSize + 'px'
    })}">
      ${state.title}
    </h1>
  </div>
`
```

### From Manual Class Logic

```typescript
// Before
template: (state) => {
  let classes = 'btn';
  if (state.variant === 'primary') classes += ' btn-primary';
  if (state.disabled) classes += ' btn-disabled';
  if (state.loading) classes += ' btn-loading';
  
  return `<button class="${classes}">${state.label}</button>`;
}

// After
template: (state) => html`
  <button class="${classes({
    'btn': true,
    'btn-primary': state.variant === 'primary',
    'btn-disabled': state.disabled,
    'btn-loading': state.loading
  })}">
    ${state.label}
  </button>
`
```

This template helper system provides a robust foundation for building clean, maintainable, and type-safe component templates while maintaining excellent performance and developer experience.
