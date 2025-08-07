# Custom Elements Runtime

A powerful, modern, and lightweight runtime for creating reactive web components with TypeScript. This library provides an elegant API for building custom elements that are faster than React and simpler than Vue.

## 🚀 Features

### Core Runtime Features
- **Reactive State Management**: Automatic re-rendering when state changes
- **Template Interpolation**: Full expression support with `{{}}` syntax
- **Event Handling**: Inline event handlers and declarative event binding
- **CSS-in-JS Support**: Static, dynamic, and object-based styling
- **Computed Properties**: Automatic dependency tracking and caching
- **Attribute Synchronization**: Bidirectional attribute/property binding
- **Shadow DOM**: Encapsulated styling and DOM structure
- **Global Event Bus**: Component-to-component communication
- **TypeScript First**: Full type safety and IntelliSense support

### Developer Experience
- **Hot Reload Ready**: Development-friendly with change detection
- **Template Helpers**: `html`, `css`, `classes`, `styles` utilities
- **Multiple APIs**: From ultra-simple to full-featured
- **Auto Tag Generation**: Automatic kebab-case tag naming
- **Focus Preservation**: Maintains input focus during re-renders with `data-ref`
- **Error Boundaries**: Built-in error handling

## 📦 Installation

```bash
npm install
npm run dev
```

## 🎯 Quick Start

### Ultra-Simple API

```typescript
import { quickComponent } from './lib/runtime.js';

// Dead simple counter with inline events
const Counter = quickComponent(
  { count: 0 },
  `
    <div>
      <p>Count: {{count}}</p>
      <button @click="count++">+</button>
      <button @click="count--">-</button>
    </div>
  `
);
```

### Component Builder API

```typescript
import { define } from './lib/easy.js';

const TodoApp = define('todo-app')
  .state({ 
    todos: [],
    newTodo: '' 
  })
  .template(state => html`
    <div>
      <input 
        value="${state.newTodo}" 
        @input="newTodo = event.target.value"
        @keydown.enter="addTodo()"
        placeholder="Add todo...">
      <ul>
        ${state.todos.map(todo => html`
          <li class="${classes({ done: todo.done })}">
            <input type="checkbox" 
                   @change="toggleTodo(${todo.id})"
                   ${todo.done ? 'checked' : ''}>
            ${todo.text}
          </li>
        `).join('')}
      </ul>
    </div>
  `)
  .actions({
    addTodo: (state) => {
      if (state.newTodo.trim()) {
        state.todos.push({
          id: Date.now(),
          text: state.newTodo,
          done: false
        });
        state.newTodo = '';
      }
    },
    toggleTodo: (state, api, id) => {
      const todo = state.todos.find(t => t.id === id);
      if (todo) todo.done = !todo.done;
    }
  })
  .build();
```

## 🏗️ API Reference

### Core Functions

#### `createReactiveComponent<TState>(options)`
The main function for creating reactive components.

**Options:**
- `tag?: string` - Custom element tag name (auto-generated if omitted)
- `state: TState` - Initial component state
- `template: string | (state: TState) => string` - HTML template
- `style?: StyleDefinition` - CSS styling (static, dynamic, or object-based)
- `attrs?: AttributeSchema | Array<keyof TState>` - Attribute configuration
- `events?: EventMap` - Event handlers
- `actions?: ActionMap` - State mutation functions
- `computed?: ComputedMap` - Derived state properties
- `watch?: WatchMap` - State change watchers
- `hooks?: HookMap` - Lifecycle hooks

#### `quickComponent<TState>(state, template, actions?)`
Ultra-simple component creation with inline event support.

```typescript
const Component = quickComponent(
  { count: 0 },
  `<button @click="count++">{{count}}</button>`
);
```

#### `component<TState>(tag)`
Fluent API for component creation.

```typescript
const Component = component<StateType>('my-tag')({
  state: { /* ... */ },
  template: state => html`/* ... */`,
  // ... other options
});
```

### Template System

#### Template Interpolation
Support for complex expressions within `{{}}`:

```typescript
template: state => html`
  <div class="{{classes({ active: state.isActive })}}">
    <span>{{state.count * 2}}</span>
    <span>{{format(state.price, 'currency')}}</span>
  </div>
`
```

#### Inline Event Handlers
Multiple event binding syntaxes:

```typescript
// Basic events
@click="count++"
@input="name = event.target.value"

// Event modifiers
@click.prevent="handleClick()"
@keydown.enter="submit()"
@click.stop="handleStop()"

// Action references
@click="incrementCount"
```

### Styling System

#### Static CSS
```typescript
style: css`
  :host {
    display: block;
    padding: 1rem;
  }
  button {
    background: blue;
    color: white;
  }
`
```

#### Dynamic CSS
```typescript
style: {
  static: css`/* base styles */`,
  dynamic: state => css`
    :host {
      --primary-color: ${state.theme === 'dark' ? '#333' : '#fff'};
    }
  `
}
```

#### CSS Object Syntax
```typescript
style: {
  ':host': {
    display: 'block',
    padding: '1rem'
  },
  'button': {
    background: 'blue',
    color: 'white',
    borderRadius: '4px'
  }
}
```

### State Management

#### Reactive State
State changes automatically trigger re-renders:

```typescript
// Direct assignment
state.count = 10;

// Object/array mutations
state.todos.push(newTodo);
state.user.name = 'John';
```

#### Computed Properties
Automatically cached and dependency-tracked:

```typescript
computed: {
  fullName: state => `${state.firstName} ${state.lastName}`,
  filteredItems: state => state.items.filter(item => 
    item.category === state.selectedCategory
  )
}
```

#### Watchers
React to specific state changes:

```typescript
watch: {
  count: (newValue, oldValue, state, api) => {
    console.log(`Count changed from ${oldValue} to ${newValue}`);
  }
}
```

### Event System

#### Local Events
Component-scoped event handling:

```typescript
events: {
  'button': {
    click: (event, state, api) => {
      state.count++;
      api.emit('count-changed', state.count);
    }
  },
  'input[type="text"]': {
    input: (event, state) => {
      state.value = event.target.value;
    }
  }
}
```

#### Global Event Bus
Cross-component communication:

```typescript
// Emit global events
api.emitGlobal('user-login', { userId: 123 });

// Listen to global events
api.onGlobal('theme-changed', (theme) => {
  state.currentTheme = theme;
});

// One-time listeners
const userData = await api.onceGlobal('user-data');
```

### Attribute System

#### Auto-inferred Attributes
```typescript
// Array syntax - auto-infers types from state
attrs: ['count', 'name', 'isActive']
```

#### Detailed Attribute Configuration
```typescript
attrs: {
  count: {
    type: 'number',
    reflect: true,
    serialize: val => String(val),
    deserialize: val => parseInt(val, 10)
  },
  theme: {
    type: 'string',
    reflect: true
  },
  data: {
    type: 'json',
    serialize: val => JSON.stringify(val),
    deserialize: val => JSON.parse(val)
  }
}
```

### Lifecycle Hooks

```typescript
hooks: {
  onMounted: (state, api) => {
    console.log('Component mounted');
    // Setup timers, fetch data, etc.
  },
  
  onUnmounted: (state, api) => {
    console.log('Component unmounted');
    // Cleanup resources
  },
  
  beforeRender: (state, api) => {
    // Return false to skip render
    return state.shouldRender;
  },
  
  onStateChange: (changes, state, api) => {
    console.log('State changed:', changes);
  }
}
```

### Template Helpers

#### HTML Helper
```typescript
import { html } from './lib/template-helpers.js';

template: state => html`
  <div class="container">
    <h1>${state.title}</h1>
    <p>${state.description}</p>
  </div>
`
```

#### CSS Helper
```typescript
import { css } from './lib/template-helpers.js';

style: css`
  :host {
    display: flex;
    gap: 1rem;
  }
`
```

#### Utility Helpers
```typescript
import { classes, styles } from './lib/template-helpers.js';

// Conditional classes
html`<div class="${classes({ 
  active: state.isActive,
  disabled: state.isDisabled 
})}">Content</div>`

// Inline styles
html`<div style="${styles({
  color: state.textColor,
  fontSize: `${state.fontSize}px`
})}">Styled content</div>`
```

## 🌟 Advanced Features

### Focus Preservation
The runtime automatically preserves focus and cursor position for form elements during re-renders. To enable this feature, add a `data-ref` attribute to your input elements:

```typescript
template: state => html`
  <input 
    type="text" 
    value="{{state.name}}" 
    @input="name = event.target.value"
    data-ref="name-input"
    placeholder="Enter name">
  
  <select @change="theme = event.target.value" data-ref="theme-select">
    <option value="light">Light</option>
    <option value="dark">Dark</option>
  </select>
`
```

**Supported elements**: `input`, `textarea`, `select`
**Features preserved**: Focus state, cursor position, selection range

### Error Boundaries
```typescript
onError: (error, state, api) => {
  console.error('Component error:', error);
  state.hasError = true;
  state.errorMessage = error.message;
}
```

### Hot Reload Support
```typescript
hotReload: true, // Development mode only
devtools: true   // Enable browser devtools integration
```

### Custom Element Registration
```typescript
// Auto-registration
const MyComponent = quickComponent({ count: 0 }, template);

// Manual registration
customElements.define('my-component', MyComponent);

// Usage in HTML
<my-component count="5"></my-component>
```

## 🔧 Utilities

### Event Bus
Standalone global event communication:

```typescript
import { eventBus } from './lib/event-bus.js';

// Emit events
eventBus.emit('user-action', { action: 'click', target: 'button' });

// Listen for events
const unsubscribe = eventBus.on('user-action', (data) => {
  console.log('User action:', data);
});

// One-time listener
eventBus.once('app-ready', () => {
  console.log('App is ready!');
});

// Cleanup
unsubscribe();
```

### Store (Global State)
Simple reactive store for global state management:

```typescript
import { Store } from './lib/store.js';

const globalStore = new Store({
  user: null,
  theme: 'light',
  notifications: []
});

// Subscribe to changes
globalStore.subscribe((state) => {
  console.log('Global state changed:', state);
});

// Update state
const state = globalStore.getState();
state.theme = 'dark';
```

## 📚 Examples

The `src/components/` directory contains comprehensive examples:

- **TestComponent.ts** - Debugging and basic usage
- **SuperEasy.ts** - Ultra-simple API examples
- **FancyCounter.ts** - Feature-rich counter with animations
- **ShoppingCart.ts** - Complex state management example
- **DynamicStyling.ts** - Advanced styling techniques

## 🎨 Best Practices

1. **Use TypeScript**: Full type safety and better DX
2. **Keep components small**: Single responsibility principle
3. **Leverage computed properties**: For derived state
4. **Use global events sparingly**: For true cross-component communication
5. **Prefer actions over inline handlers**: For complex logic
6. **Use template helpers**: For better readability
7. **Add data-ref to form elements**: For focus preservation during re-renders

## 🚀 Performance

- **Minimal bundle size**: Core runtime is lightweight
- **Efficient updates**: Only re-renders when necessary
- **Smart diffing**: Preserves focus and form state
- **Computed caching**: Automatic memoization
- **Event delegation**: Efficient event handling

## 🔄 Migration from Other Frameworks

### From React
- Replace `useState` with reactive state objects
- Replace `useEffect` with lifecycle hooks
- Replace JSX with template strings
- Replace props with attributes/state

### From Vue
- Replace `data()` with state objects
- Replace `computed` with computed properties
- Replace `methods` with actions
- Replace templates with template functions

## 📄 License

This project is open source and available under the MIT License.
