# 🎯 Functional Component API

The Custom Elements Runtime provides a powerful, intuitive functional component API that emphasizes simplicity, type safety, and developer ergonomics. This API automatically handles reactive props, type inference, and event emission without requiring complex configuration objects.

## ✨ Key Features

- **🔧 Zero Configuration** - No complex setup required
- **⚡ Automatic Reactivity** - All props are automatically reactive
- **🎯 Type Safety** - Full TypeScript inference from function signatures
- **📦 Destructured Props** - Clean destructuring syntax with default values
- **🚀 Strongly Typed Hooks** - React-style hooks with perfect TypeScript inference
- **🔄 Automatic Prop Parsing** - Runtime extracts prop defaults from function signature
- **💡 Intuitive API** - Familiar patterns similar to modern React/Vue components

## 🚀 Basic Component Structure

The new API follows a simple, intuitive pattern using context-based hooks:

```typescript
import { 
  component, 
  html, 
  css,
  useEmit, 
  useOnConnected, 
  useOnDisconnected, 
  useOnAttributeChanged, 
  useOnError,
  useStyle,
  when, 
  each, 
  ref, 
  computed, 
  watch, 
  match, 
  eventBus 
} from '@jasonshimmy/custom-elements-runtime';

component('component-name', ({ prop1 = 'default', prop2 = 0 }) => {
  // Get hooks with perfect TypeScript inference
  const emit = useEmit();
  
  // Set up lifecycle hooks
  useOnConnected(() => console.log('Component connected!'));
  useOnDisconnected(() => console.log('Component disconnected!'));
  useOnAttributeChanged((name, oldValue, newValue) => {
    console.log(`Attribute ${name} changed from ${oldValue} to ${newValue}`);
  });
  useOnError((error) => console.error('Component error:', error));
  
  // Component logic and rendering
  return html`<div>Your template</div>`;
});
```

### Function Signature

```typescript
component<TProps>(
  tag: string,
  renderFn: (props: TProps) => VNode | VNode[] | Promise<VNode | VNode[]>,
  options?: ComponentOptions
)
```

### Available Hooks

All hooks must be called during component render and provide perfect TypeScript inference:

- **`useEmit()`**: Get the emit function for dispatching custom events
- **`useOnConnected(callback)`**: Set up lifecycle hook for when component connects to DOM
- **`useOnDisconnected(callback)`**: Set up lifecycle hook for when component disconnects from DOM  
- **`useOnAttributeChanged(callback)`**: Set up lifecycle hook for when attributes change
- **`useOnError(callback)`**: Set up lifecycle hook for error handling

## 🎯 Props and Type Safety

### Destructured Props with Defaults

Define your component props using destructuring with default values. The runtime automatically extracts these defaults and creates reactive props:

```typescript
component('user-card', ({
  name = 'Anonymous',
  age = 0,
  email = '',
  isActive = true,
  tags = []
}: {
  name?: string;
  age?: number;
  email?: string;
  isActive?: boolean;
  tags?: string[];
}) => {
  return html`
    <div class="user-card">
      <h3>${name}</h3>
      <p>Age: ${age}</p>
      <p>Email: ${email}</p>
      <p>Status: ${isActive ? 'Active' : 'Inactive'}</p>
      <ul>
        ${tags.map(tag => html`<li>${tag}</li>`)}
      </ul>
    </div>
  `;
});
```

### Usage in HTML

```html
<user-card 
  name="John Doe"
  age="30"
  email="john@example.com"
  is-active="true"
  tags='["developer", "typescript"]'
></user-card>
```

### Automatic Type Inference

The runtime automatically:
- ✅ Extracts default values from destructured parameters
- ✅ Infers prop types from TypeScript annotations
- ✅ Creates reactive proxies for all props
- ✅ Converts attribute names (kebab-case) to prop names (camelCase)
- ✅ Handles type conversion (String, Number, Boolean)

## 🚀 Event Emission

Use the `useEmit()` hook to get a strongly typed emit function:

```typescript
component('interactive-button', ({
  label = 'Click me',
  disabled = false
}: {
  label?: string;
  disabled?: boolean;
}) => {
  const emit = useEmit();
  
  const handleClick = () => {
    if (!disabled) {
      // Emit with type safety
      emit('button-clicked', { timestamp: Date.now(), label });
      emit('custom-event', { data: 'some data' });
    }
  };

  return html`
    <button 
      :disabled="${disabled}"
      @click="${handleClick}"
    >
      ${label}
    </button>
  `;
});
```

### Listening to Events

```typescript
// In another component or JavaScript
const button = document.querySelector('interactive-button');
button.addEventListener('button-clicked', (event) => {
  console.log('Button clicked:', event.detail);
});
```

## 🔄 Lifecycle Hooks

The new API provides lifecycle hooks through context-based hooks, allowing you to respond to component lifecycle events:

```typescript
component('lifecycle-demo', ({
  data = []
}: {
  data?: any[];
}) => {
  const emit = useEmit();
  
  // Set up lifecycle hooks
  useOnConnected(() => {
    console.log('Component mounted to DOM');
    // Initialize external resources, start timers, etc.
    emit('component-ready');
  });
  
  useOnDisconnected(() => {
    console.log('Component removed from DOM');
    // Clean up resources, stop timers, etc.
    emit('component-destroyed');
  });
  
  useOnAttributeChanged((name, oldValue, newValue) => {
    console.log(`Attribute '${name}' changed from '${oldValue}' to '${newValue}'`);
    if (name === 'data') {
      emit('data-attribute-changed', { oldValue, newValue });
    }
  });
  
  useOnError((error) => {
    console.error('Component error:', error);
    emit('component-error', { error: error.message });
  });

  return html`
    <div class="lifecycle-demo">
      <h3>Lifecycle Demo</h3>
      <p>Data items: ${data.length}</p>
      <ul>
        ${data.map(item => html`<li>${item}</li>`)}
      </ul>
    </div>
  `;
});
```

### Lifecycle Hook Details

- **`onConnected(fn)`**: Called when the component is inserted into the DOM
- **`onDisconnected(fn)`**: Called when the component is removed from the DOM
- **`onAttributeChanged(fn)`**: Called when any attribute on the element changes
- **`onError(fn)`**: Called when an error occurs during rendering or lifecycle events

```typescript
// Example with external API integration
component('api-data', ({
  endpoint = '/api/data'
}: {
  endpoint?: string;
}) => {
  const emit = useEmit();
  const data = ref(null);
  const loading = ref(false);
  let abortController: AbortController | null = null;

  const fetchData = async () => {
    abortController = new AbortController();
    loading.value = true;
    
    try {
      const response = await fetch(endpoint, {
        signal: abortController.signal
      });
      data.value = await response.json();
      emit('data-loaded', data.value);
    } catch (error) {
      if (error.name !== 'AbortError') {
        emit('data-error', error);
      }
    } finally {
      loading.value = false;
    }
  };

  useOnConnected(() => {
    fetchData();
  });
  
  useOnDisconnected(() => {
    if (abortController) {
      abortController.abort();
    }
  });
  
  useOnError((error) => {
    console.error('API component error:', error);
    loading.value = false;
  });

  return html`
    <div class="api-data">
      ${when(loading.value, html`<p>Loading...</p>`)}
      ${when(data.value, html`
        <pre>${JSON.stringify(data.value, null, 2)}</pre>
      `)}
    </div>
  `;
});
```

## 🔄 Reactive State Management

### External State

Create reactive state outside components that can be shared:

```typescript

// Shared reactive state
const userState = ref({
  name: 'John',
  email: 'john@example.com',
  preferences: {
    theme: 'dark',
    notifications: true
  }
});

// Computed values
const displayName = computed(() => 
  userState.value.name || 'Anonymous'
);

// Watchers
watch(() => userState.value.email, (newEmail, oldEmail) => {
  console.log(`Email changed from ${oldEmail} to ${newEmail}`);
});

// Components can access and modify shared state
component('user-profile', () => {
  const emit = useEmit();
  
  const updateName = (newName: string) => {
    userState.value.name = newName;
    emit('name-updated', { name: newName });
  };

  return html`
    <div>
      <h2>${displayName.value}</h2>
      <input 
        type="text" 
        :value="${userState.value.name}"
        @input="${(e) => updateName(e.target.value)}"
        placeholder="Enter your name"
      />
      <p>Email: ${userState.value.email}</p>
    </div>
  `;
});
```

### Component-Scoped State

For component-specific state, create reactive state within the component:

```typescript
component('counter', ({
  initialValue = 0,
  step = 1
}: {
  initialValue?: number;
  step?: number;
}) => {
  const emit = useEmit();
  
  // Component-scoped reactive state
  const count = ref(initialValue);
  
  const increment = () => {
    count.value += step;
    emit('count-changed', { count: count.value });
  };
  
  const decrement = () => {
    count.value -= step;
    emit('count-changed', { count: count.value });
  };

  return html`
    <div class="counter">
      <button @click="${decrement}">-</button>
      <span class="count">${count.value}</span>
      <button @click="${increment}">+</button>
    </div>
  `;
});
```

## 🎨 Directives and Bindings

The streamlined API works seamlessly with all existing directives and bindings:

### Property Binding (`:prop`)

Bind reactive values to element properties and attributes:

```typescript
component('dynamic-input', ({
  value = '',
  placeholder = 'Enter text...',
  disabled = false,
  type = 'text'
}: {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
}) => {
  const emit = useEmit();
  
  return html`
    <input
      :type="${type}"
      :value="${value}"
      :placeholder="${placeholder}"
      :disabled="${disabled}"
      @input="${(e) => emit('input', e.target.value)}"
    />
  `;
});
```

### Guaranteed Property Assignment (`:bind`)

For complex objects, functions, or when you need to ensure JavaScript property assignment:

```typescript
component('complex-props', ({
  config = {},
  items = [],
  onItemClick = null
}: {
  config?: any;
  items?: any[];
  onItemClick?: Function | null;
}) => {
  const emit = useEmit();
  
  return html`
    <custom-element 
      :bind="${{ 
        config, 
        items, 
        onItemClick: onItemClick || ((item) => emit('item-clicked', item))
      }}"
    ></custom-element>
  `;
});
```

### Class Binding (`:class`)

Dynamic class management with object and array syntax:

```typescript
component('status-card', ({
  status = 'normal',
  size = 'medium',
  interactive = false
}: {
  status?: 'normal' | 'success' | 'warning' | 'error';
  size?: 'small' | 'medium' | 'large';
  interactive?: boolean;
}, { emit }) => {
  return html`
    <div 
      :class="${{
        'status-card': true,
        [`status-${status}`]: true,
        [`size-${size}`]: true,
        'interactive': interactive,
        'clickable': interactive
      }}"
      @click="${interactive ? () => emit('card-clicked') : null}"
    >
      <slot></slot>
    </div>
  `;
});
```

### Style Binding (`:style`)

Dynamic inline styles with object and string syntax:

```typescript
component('progress-bar', ({
  progress = 0,
  color = '#007bff',
  height = '8px',
  animated = false
}: {
  progress?: number;
  color?: string;
  height?: string;
  animated?: boolean;
}, { emit }) => {
  return html`
    <div 
      class="progress-container"
      :style="${{ height }}"
    >
      <div 
        class="progress-bar"
        :class="${{ animated }}"
        :style="${{
          width: `${Math.min(100, Math.max(0, progress))}%`,
          backgroundColor: color,
          transition: animated ? 'width 0.3s ease' : 'none'
        }}"
      ></div>
    </div>
  `;
});
```

### Two-Way Binding (`:model`)

The `:model` directive provides automatic two-way data binding for form elements. With the functional API, you can bind directly to reactive state objects:

```typescript
component('form-field', ({
  initialValue = '',
  label = '',
  type = 'text'
}: {
  initialValue?: string;
  label?: string;
  type?: string;
}) => {
  const emit = useEmit();
  const value = ref(initialValue);
  
  return html`
    <label class="form-field">
      ${label}
      <input
        type="${type}"
        :model="${value}"
        @update:value="${(newValue) => emit('value-changed', newValue)}"
      />
      <p>Current value: ${value.value}</p>
    </label>
  `;
});
```

#### Controlled Component Pattern

For custom elements that need to work with parent components using props:

```typescript
component('controlled-input', ({
  modelValue = '',
  label = ''
}: {
  modelValue?: string;
  label?: string;
}) => {
  const emit = useEmit();
  
  return html`
    <label class="controlled-input">
      ${label}
      <input
        value="${modelValue}"
        @input="${(e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).value)}"
      />
    </label>
  `;
});
```

### Custom Model Binding (`:model:prop`)

Custom property binding for complex components using reactive state:

```typescript
component('multi-select', ({
  options = []
}: {
  options?: Array<{ value: string; label: string }>;
}) => {
  const emit = useEmit();
  const selectedItems = ref<string[]>([]);
  const multiple = ref(true);
  
  const isSelected = (value: string) => selectedItems.value.includes(value);
  
  const toggleSelection = (value: string) => {
    const newSelection = isSelected(value)
      ? selectedItems.value.filter(item => item !== value)
      : [...selectedItems.value, value];
    selectedItems.value = newSelection;
    emit('selection-changed', newSelection);
  };

  return html`
    <div class="multi-select">
      ${each(options, (option) => html`
        <label class="option">
          <input
            type="checkbox"
            checked="${isSelected(option.value)}"
            @change="${() => toggleSelection(option.value)}"
          />
          ${option.label}
        </label>
      `)}
      <p>Selected: ${selectedItems.value.join(', ')}</p>
    </div>
  `;
});
```

### Event Binding (`@event`)

Comprehensive event handling with modifiers:

```typescript
component('event-demo', ({
  disabled = false
}: {
  disabled?: boolean;
}, { emit }) => {
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      emit('enter-pressed', { value: (e.target as HTMLInputElement).value });
    } else if (e.key === 'Escape') {
      emit('escape-pressed');
    }
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (!disabled) {
      const formData = new FormData(e.target as HTMLFormElement);
      emit('form-submitted', Object.fromEntries(formData));
    }
  };

  return html`
    <form @submit="${handleSubmit}">
      <input
        type="text"
        :disabled="${disabled}"
        @keydown="${handleKeydown}"
        @focus="${() => emit('input-focused')}"
        @blur="${() => emit('input-blurred')}"
        @input="${(e) => emit('input-changed', e.target.value)}"
      />
      <button 
        type="submit" 
        :disabled="${disabled}"
        @click="${() => emit('submit-clicked')}"
      >
        Submit
      </button>
    </form>
  `;
});
```

### Reference Binding (`ref`)

Access DOM elements directly:

```typescript
component('focusable-input', ({
  autoFocus = false
}: {
  autoFocus?: boolean;
}, { emit }) => {
  let inputRef: HTMLInputElement | null = null;

  const focusInput = () => {
    if (inputRef) {
      inputRef.focus();
      emit('input-focused');
    }
  };

  const clearInput = () => {
    if (inputRef) {
      inputRef.value = '';
      inputRef.focus();
      emit('input-cleared');
    }
  };

  return html`
    <div class="input-container">
      <input
        ref="${(el) => { 
          inputRef = el;
          if (autoFocus) el.focus();
        }}"
        type="text"
        @input="${(e) => emit('input-changed', e.target.value)}"
      />
      <button @click="${focusInput}">Focus</button>
      <button @click="${clearInput}">Clear</button>
    </div>
  `;
});
```

## 🔄 Conditional Rendering and Lists

### Using `when` for Conditional Rendering

```typescript

component('conditional-content', ({
  isLoggedIn = false,
  userRole = 'guest',
  showAdvanced = false
}: {
  isLoggedIn?: boolean;
  userRole?: string;
  showAdvanced?: boolean;
}, { emit }) => {
  return html`
    <div>
      ${when(isLoggedIn, html`
        <h2>Welcome back!</h2>
        <p>Role: ${userRole}</p>
        ${when(userRole === 'admin', html`
          <button @click="${() => emit('admin-action')}">Admin Panel</button>
        `)}
        ${when(showAdvanced, html`
          <div class="advanced-settings">
            <h3>Advanced Settings</h3>
            <!-- Advanced content -->
          </div>
        `)}
      `)}
      ${when(!isLoggedIn, html`
        <div class="login-prompt">
          <h2>Please log in</h2>
          <button @click="${() => emit('login-requested')}">Login</button>
        </div>
      `)}
    </div>
  `;
});
```

> **Note**: The `when` directive only accepts a condition and content. For if/else logic, use two separate `when` calls or the `match` directive below.

### Using `match` for Complex Conditionals

```typescript

component('status-indicator', ({
  status = 'pending',
  message = ''
}: {
  status?: 'pending' | 'success' | 'error' | 'warning';
  message?: string;
}, { emit }) => {
  return html`
    <div class="status-indicator">
      ${match()
        .when(status === 'pending', html`
          <div class="pending">
            <span class="icon">⏳</span>
            <span>Processing...</span>
          </div>
        `)
        .when(status === 'success', html`
          <div class="success">
            <span class="icon">✅</span>
            <span>Success: ${message}</span>
          </div>
        `)
        .when(status === 'error', html`
          <div class="error">
            <span class="icon">❌</span>
            <span>Error: ${message}</span>
            <button @click="${() => emit('retry')}">Retry</button>
          </div>
        `)
        .when(status === 'warning', html`
          <div class="warning">
            <span class="icon">⚠️</span>
            <span>Warning: ${message}</span>
          </div>
        `)
        .otherwise(html`
          <div class="unknown">
            <span>Unknown status: ${status}</span>
          </div>
        `)
        .done()}
    </div>
  `;
});
```

### Using `each` for List Rendering

```typescript

component('todo-list', ({
  todos = [],
  filter = 'all'
}: {
  todos?: Array<{ id: string; text: string; completed: boolean }>;
  filter?: 'all' | 'active' | 'completed';
}, { emit }) => {
  const filteredTodos = computed(() => {
    switch (filter) {
      case 'active':
        return todos.filter(todo => !todo.completed);
      case 'completed':
        return todos.filter(todo => todo.completed);
      default:
        return todos;
    }
  });

  const toggleTodo = (id: string) => {
    emit('toggle-todo', { id });
  };

  const deleteTodo = (id: string) => {
    emit('delete-todo', { id });
  };

  return html`
    <div class="todo-list">
      <div class="filters">
        <button 
          :class="${{ active: filter === 'all' }}"
          @click="${() => emit('filter-changed', 'all')}"
        >
          All
        </button>
        <button 
          :class="${{ active: filter === 'active' }}"
          @click="${() => emit('filter-changed', 'active')}"
        >
          Active
        </button>
        <button 
          :class="${{ active: filter === 'completed' }}"
          @click="${() => emit('filter-changed', 'completed')}"
        >
          Completed
        </button>
      </div>
      
      <ul class="todo-items">
        ${each(filteredTodos.value, (todo) => html`
          <li 
            key="${todo.id}"
            :class="${{ completed: todo.completed }}"
          >
            <input
              type="checkbox"
              :checked="${todo.completed}"
              @change="${() => toggleTodo(todo.id)}"
            />
            <span class="todo-text">${todo.text}</span>
            <button 
              class="delete-btn"
              @click="${() => deleteTodo(todo.id)}"
            >
              Delete
            </button>
          </li>
        `)}
      </ul>
      
      ${when(filteredTodos.value.length === 0, html`
        <p class="empty-state">No todos found</p>
      `)}
    </div>
  `;
});
```

## 🎨 Styling

### Static Styles

```typescript
import { component, html, css, useStyle } from '@jasonshimmy/custom-elements-runtime';

component('styled-button', ({
  variant = 'primary',
  size = 'medium'
}: {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
}) => {
  const emit = useEmit();
  
  useStyle(() => css`
    :host {
      display: inline-block;
    }
    
    .btn {
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.2s ease;
    }
    
    .btn-small { padding: 4px 8px; font-size: 12px; }
    .btn-medium { padding: 8px 16px; font-size: 14px; }
    .btn-large { padding: 12px 24px; font-size: 16px; }
    
    .btn-primary {
      background: #007bff;
      color: white;
    }
    
    .btn-secondary {
      background: #6c757d;
      color: white;
    }
    
    .btn-danger {
      background: #dc3545;
      color: white;
    }
    
    .btn:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }
  `);
  
  return html`
    <button 
      class="btn btn-${variant} btn-${size}"
      @click="${() => emit('click')}"
    >
      <slot></slot>
    </button>
  `;
});
```

### Dynamic Styles

```typescript
component('themed-card', ({
  theme = 'light',
  accentColor = '#007bff'
}: {
  theme?: 'light' | 'dark';
  accentColor?: string;
}) => {
  const emit = useEmit();
  
  useStyle(() => css`
    :host {
      display: block;
      --accent-color: ${accentColor};
      --bg-color: ${theme === 'dark' ? '#2d3748' : '#ffffff'};
      --text-color: ${theme === 'dark' ? '#e2e8f0' : '#2d3748'};
      --border-color: ${theme === 'dark' ? '#4a5568' : '#e2e8f0'};
    }
    
    .card {
      background: var(--bg-color);
      color: var(--text-color);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .card-header {
      padding: 16px;
      border-bottom: 1px solid var(--border-color);
      background: linear-gradient(135deg, var(--accent-color), color-mix(in srgb, var(--accent-color) 80%, white));
      color: white;
    }
    
    .card-content {
      padding: 16px;
    }
  `);
  
  return html`
    <div class="card">
      <div class="card-header">
        <slot name="header"></slot>
      </div>
      <div class="card-content">
        <slot></slot>
      </div>
    </div>
  `;
});
```

### Using the useStyle Hook

The `useStyle` hook provides a powerful way to apply styles reactively based on component props and state:

#### ✨ Key Features

- **🔄 Reactive Styling**: Styles automatically update when props or state change
- **🎯 Type Safety**: Full TypeScript inference for CSS values
- **⚡ Performance**: Efficient updates only when dependencies change
- **🧹 Scoped**: Styles are automatically scoped to the component
- **💡 Intuitive**: Familiar CSS template literal syntax

#### 📖 Basic Usage

```typescript
component('styled-component', ({ color = 'blue' }) => {
  useStyle(() => css`
    :host {
      background-color: ${color};
      border: 1px solid ${color};
    }
  `);
  
  return html`<div>Styled content</div>`;
});
```

#### 🔄 Reactive Styles with State

```typescript
component('interactive-button', ({ initialColor = 'blue' }) => {
  const buttonState = ref({ color: initialColor, hovered: false });
  
  useStyle(() => css`
    :host {
      --button-color: ${buttonState.color};
      --opacity: ${buttonState.hovered ? '0.8' : '1'};
    }
    
    .button {
      background: var(--button-color);
      opacity: var(--opacity);
      transition: all 0.2s ease;
      border: none;
      padding: 12px 24px;
      border-radius: 4px;
      color: white;
      cursor: pointer;
    }
  `);
  
  return html`
    <button 
      class="button"
      @mouseenter="${() => buttonState.hovered = true}"
      @mouseleave="${() => buttonState.hovered = false}"
      @click="${() => buttonState.color = buttonState.color === 'blue' ? 'green' : 'blue'}"
    >
      Toggle Color
    </button>
  `;
});
```

#### 🎨 Complex Styling Logic

```typescript
component('adaptive-card', ({ 
  theme = 'light', 
  size = 'medium',
  highlighted = false 
}) => {
  const cardState = ref({ expanded: false });
  
  useStyle(() => {
    const isDark = theme === 'dark';
    const isLarge = size === 'large';
    const isHighlighted = highlighted;
    
    return css`
      :host {
        display: block;
        transition: all 0.3s ease;
        transform: ${cardState.expanded ? 'scale(1.02)' : 'scale(1)'};
      }
      
      .card {
        background: ${isDark ? '#2d3748' : '#ffffff'};
        color: ${isDark ? '#e2e8f0' : '#2d3748'};
        border: 2px solid ${isHighlighted ? '#007bff' : (isDark ? '#4a5568' : '#e2e8f0')};
        border-radius: ${isLarge ? '12px' : '8px'};
        padding: ${isLarge ? '24px' : '16px'};
        box-shadow: ${isHighlighted ? '0 4px 12px rgba(0,123,255,0.3)' : '0 2px 4px rgba(0,0,0,0.1)'};
        font-size: ${isLarge ? '18px' : '14px'};
      }
      
      .card:hover {
        box-shadow: ${isHighlighted ? '0 6px 20px rgba(0,123,255,0.4)' : '0 4px 8px rgba(0,0,0,0.2)'};
      }
    `;
  });
  
  return html`
    <div 
      class="card"
      @click="${() => cardState.expanded = !cardState.expanded}"
    >
      <slot></slot>
    </div>
  `;
});
```

#### 🎯 Best Practices

1. **Use CSS Custom Properties**: For complex themes and design tokens
2. **Leverage Template Literals**: For dynamic CSS values
3. **Keep Logic Simple**: Extract complex styling logic to separate functions
4. **Performance**: useStyle is reactive - styles update only when dependencies change

```typescript
// Good: Using CSS custom properties for consistency
component('themed-component', ({ primaryColor = '#007bff' }) => {
  useStyle(() => css`
    :host {
      --primary: ${primaryColor};
      --primary-hover: color-mix(in srgb, var(--primary) 80%, black);
      --primary-light: color-mix(in srgb, var(--primary) 20%, white);
    }
    
    .button { background: var(--primary); }
    .button:hover { background: var(--primary-hover); }
    .badge { background: var(--primary-light); }
  `);
});
```

## 🔗 Component Communication

### Parent-Child Communication

```typescript
// Child component
component('form-input', ({
  label = '',
  value = '',
  type = 'text',
  required = false,
  error = ''
}: {
  label?: string;
  value?: string;
  type?: string;
  required?: boolean;
  error?: string;
}, { emit }) => {
  const handleInput = (e: Event) => {
    const input = e.target as HTMLInputElement;
    emit('update:value', input.value);
    
    // Emit validation event
    if (required && !input.value.trim()) {
      emit('validation-error', 'This field is required');
    } else {
      emit('validation-success');
    }
  };

  return html`
    <div class="form-group">
      <label class="form-label">
        ${label}
        ${when(required, html`<span class="required">*</span>`)}
      </label>
      <input
        :type="${type}"
        :value="${value}"
        :required="${required}"
        :class="${{ error: !!error }}"
        @input="${handleInput}"
        @blur="${handleInput}"
      />
      ${when(error, html`
        <span class="error-message">${error}</span>
      `)}
    </div>
  `;
});

// Parent component
component('contact-form', ({}, { emit }) => {
  const formData = ref({
    name: '',
    email: '',
    message: ''
  });
  
  const errors = ref({
    name: '',
    email: '',
    message: ''
  });

  const handleInputChange = (field: string, value: string) => {
    formData.value[field] = value;
    // Clear error when user starts typing
    if (errors.value[field]) {
      errors.value[field] = '';
    }
  };

  const handleValidationError = (field: string, error: string) => {
    errors.value[field] = error;
  };

  const submitForm = () => {
    // Validate all fields
    const hasErrors = Object.values(errors.value).some(error => error);
    if (!hasErrors) {
      emit('form-submitted', formData.value);
    }
  };

  return html`
    <form @submit="${(e) => { e.preventDefault(); submitForm(); }}">
      <form-input
        label="Name"
        :value="${formData.value.name}"
        required="true"
        :error="${errors.value.name}"
        @update:value="${(value) => handleInputChange('name', value)}"
        @validation-error="${(error) => handleValidationError('name', error)}"
        @validation-success="${() => handleValidationError('name', '')}"
      ></form-input>
      
      <form-input
        label="Email"
        type="email"
        :value="${formData.value.email}"
        required="true"
        :error="${errors.value.email}"
        @update:value="${(value) => handleInputChange('email', value)}"
        @validation-error="${(error) => handleValidationError('email', error)}"
        @validation-success="${() => handleValidationError('email', '')}"
      ></form-input>
      
      <form-input
        label="Message"
        :value="${formData.value.message}"
        required="true"
        :error="${errors.value.message}"
        @update:value="${(value) => handleInputChange('message', value)}"
        @validation-error="${(error) => handleValidationError('message', error)}"
        @validation-success="${() => handleValidationError('message', '')}"
      ></form-input>
      
      <button type="submit">Send Message</button>
    </form>
  `;
});
```

### Global State Management

```typescript

// Global state store
const appState = ref({
  user: null,
  notifications: [],
  theme: 'light'
});

// Global actions
const userActions = {
  login: (userData: any) => {
    appState.value.user = userData;
    eventBus.emit('user:login', userData);
  },
  logout: () => {
    appState.value.user = null;
    eventBus.emit('user:logout');
  },
  addNotification: (notification: any) => {
    appState.value.notifications.push({
      id: Date.now(),
      ...notification
    });
  }
};

// Components can access global state
component('user-avatar', ({}, { emit }) => {
  return html`
    <div class="user-avatar">
      ${when(appState.value.user, html`
        <img 
          src="${appState.value.user.avatar}" 
          alt="${appState.value.user.name}"
          @click="${() => emit('profile-clicked')}"
        />
        <span>${appState.value.user.name}</span>
      `, html`
        <button @click="${() => emit('login-requested')}">
          Login
        </button>
      `)}
    </div>
  `;
});

component('notification-center', ({}, { emit }) => {
  const dismissNotification = (id: number) => {
    appState.value.notifications = appState.value.notifications.filter(
      n => n.id !== id
    );
  };

  return html`
    <div class="notification-center">
      ${when(appState.value.notifications.length > 0, html`
        <div class="notifications">
          ${each(appState.value.notifications, (notification) => html`
            <div 
              key="${notification.id}"
              class="notification notification-${notification.type}"
            >
              <span>${notification.message}</span>
              <button @click="${() => dismissNotification(notification.id)}">
                ×
              </button>
            </div>
          `)}
        </div>
      `)}
    </div>
  `;
});
```

## ⚙️ Advanced Configuration

### Component with Lifecycle Hooks and Styling

The new functional API uses hooks for all component features:

```typescript
component('advanced-component', ({
  data = []
}: {
  data?: any[];
}) => {
  const emit = useEmit();
  
  // Set up lifecycle hooks
  useOnConnected(() => {
    console.log('Component connected to DOM');
  });
  
  useOnDisconnected(() => {
    console.log('Component disconnected from DOM');
  });
  
  useOnError((error: Error) => {
    console.error('Component error:', error);
  });
  
  // Apply custom styling
  useStyle(() => css`
    :host {
      display: block;
      padding: 16px;
    }
  `);

  return html`<div>${data.length} items</div>`;
});
```

## 🔄 Async Components

Handle asynchronous operations seamlessly:

```typescript
component('async-data', ({
  userId = ''
}: {
  userId?: string;
}, { emit }) => {
  const loading = ref(false);
  const data = ref(null);
  const error = ref(null);

  const fetchData = async () => {
    if (!userId) return;
    
    loading.value = true;
    error.value = null;
    
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch user');
      
      data.value = await response.json();
      emit('data-loaded', data.value);
    } catch (err) {
      error.value = err.message;
      emit('data-error', err);
    } finally {
      loading.value = false;
    }
  };

  // Watch for userId changes
  watch(() => userId, fetchData, { immediate: true });

  return html`
    <div class="async-data">
      ${when(loading.value, html`
        <div class="loading-spinner">Loading user data...</div>
      `)}
      
      ${when(error.value, html`
        <div class="error-state">
          <p>Error: ${error.value}</p>
          <button @click="${fetchData}">Retry</button>
        </div>
      `)}
      
      ${when(data.value && !loading.value, html`
        <div class="user-data">
          <h2>${data.value.name}</h2>
          <p>${data.value.email}</p>
          <p>Joined: ${new Date(data.value.createdAt).toLocaleDateString()}</p>
        </div>
      `)}
    </div>
  `;
});
```

## 🧪 Testing Components

The streamlined API makes testing straightforward:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { component, html } from '@jasonshimmy/custom-elements-runtime';

describe('Streamlined Component', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should render with reactive props', async () => {
    component('test-component', ({
      message = 'default',
      count = 0
    }: {
      message?: string;
      count?: number;
    }, { emit }) => {
      return html`
        <div>
          <span class="message">${message}</span>
          <span class="count">${count}</span>
          <button @click="${() => emit('increment')}">+</button>
        </div>
      `;
    });

    const element = document.createElement('test-component');
    element.setAttribute('message', 'Hello World');
    element.setAttribute('count', '5');
    document.body.appendChild(element);

    await new Promise(resolve => setTimeout(resolve, 50));

    const messageEl = element.shadowRoot?.querySelector('.message');
    const countEl = element.shadowRoot?.querySelector('.count');
    
    expect(messageEl?.textContent).toBe('Hello World');
    expect(countEl?.textContent).toBe('5');
  });

  it('should emit events correctly', async () => {
    let emittedData = null;
    
    component('emitter-test', ({}, { emit }) => {
      return html`
        <button @click="${() => emit('test-event', { data: 'test' })}">
          Click
        </button>
      `;
    });

    const element = document.createElement('emitter-test');
    element.addEventListener('test-event', (e) => {
      emittedData = e.detail;
    });
    
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 50));

    const button = element.shadowRoot?.querySelector('button');
    button?.click();

    expect(emittedData).toEqual({ data: 'test' });
  });
});
```

## 🎯 Best Practices

### 1. **Use Descriptive Props with Defaults**
```typescript
// ✅ Good
component('user-badge', ({
  name = 'Anonymous',
  role = 'user',
  showAvatar = true,
  size = 'medium'
}: {
  name?: string;
  role?: 'user' | 'admin' | 'moderator';
  showAvatar?: boolean;
  size?: 'small' | 'medium' | 'large';
}, { emit }) => {
  // ...
});

// ❌ Avoid
component('user-badge', ({ a, b, c }: any, { emit }) => {
  // Hard to understand and no type safety
});
```

### 2. **Prefer External State for Shared Data**
```typescript
// ✅ Good - Shared state
const userPreferences = ref({
  theme: 'light',
  language: 'en'
});

component('theme-switcher', ({}, { emit }) => {
  // Use shared state
});

component('language-selector', ({}, { emit }) => {
  // Use same shared state
});
```

### 3. **Use Computed Values for Derived State**
```typescript
// ✅ Good
const items = ref([]);
const filteredItems = computed(() => 
  items.value.filter(item => item.active)
);
const itemCount = computed(() => 
  filteredItems.value.length
);

// ❌ Avoid - Manual synchronization
const items = ref([]);
const itemCount = ref(0);
// Manually updating itemCount everywhere items changes
```

### 4. **Emit Semantic Events**
```typescript
// ✅ Good - Semantic event names
emit('user-selected', { userId: 123 });
emit('form-submitted', { formData });
emit('validation-failed', { errors });

// ❌ Avoid - Generic event names
emit('click', data);
emit('change', data);
emit('event', data);
```

### 5. **Handle Errors Gracefully**
```typescript
component('data-loader', ({ url = '' }: { url?: string }, { emit }) => {
  const loading = ref(false);
  const error = ref(null);
  
  const loadData = async () => {
    try {
      loading.value = true;
      error.value = null;
      // Load data...
    } catch (err) {
      error.value = err.message;
      emit('load-error', err);
    } finally {
      loading.value = false;
    }
  };

  return html`
    ${when(error.value, html`
      <div class="error">
        Error: ${error.value}
        <button @click="${loadData}">Retry</button>
      </div>
    `)}
    <!-- Rest of template -->
  `;
});
```

## 🔄 Migration from Old API

The old configuration-based API has been completely removed in favor of the new streamlined functional API. Here's how the patterns translate:

### Before (Old Config-Based API - Removed)
```typescript
// ❌ This API no longer exists
component('my-component', {
  props: { message: { type: String, default: 'Hello' } },
  state: { count: 0 },
  render: (ctx) => html`
    <div>${ctx.message} - ${ctx.count}</div>
  `
});
```

### After (New Functional API)
```typescript
// ✅ Current streamlined functional API
component('my-component', ({
  message = 'Hello'
}: {
  message?: string;
}) => {
  const count = ref(0);
  
  return html`
    <div>${message} - ${count.value}</div>
  `;
});
```

## 🎉 Summary

The streamlined functional component API provides:

- **🎯 Zero Configuration** - No complex setup required
- **⚡ Automatic Reactivity** - Props are reactive by default
- **🔒 Type Safety** - Full TypeScript support with inference
- **🚀 Better Performance** - Optimized prop parsing and reactivity
- **💡 Developer Experience** - Intuitive, familiar patterns
- **🔄 Full Feature Support** - All directives, bindings, and state management

This API eliminates the complexity of the previous system while maintaining all the power and flexibility you need to build modern, reactive custom elements.