# 🎯 Functional Component API

## Table of Contents

- [✨ Key Features](#-key-features)
- [🏗️ Basic Component Structure](#-basic-component-structure)
- [🔒 Props and Type Safety](#-props-and-type-safety)
- [🚀 Event Emission](#-event-emission)
- [🔁 Lifecycle Hooks](#-lifecycle-hooks)
- [🧾 Working with HTML entities and raw HTML](#-working-with-html-entities-and-raw-html)
- [🧬 Reactive State Management](#-reactive-state-management)
- [🎛️ Directives and Bindings](#-directives-and-bindings)
- [🔀 Conditional Rendering and Lists](#-conditional-rendering-and-lists)
- [🎨 Styling](#-styling)
- [🔗 Component Communication](#-component-communication)
- [⚙️ Advanced Configuration](#-advanced-configuration)
- [⏳ Async Components](#-async-components)
- [🧪 Testing Components](#-testing-components)
- [🎯 Best Practices](#-best-practices)
- [🎉 Summary](#-summary)

The Custom Elements Runtime provides a powerful, intuitive functional component API that emphasizes simplicity, type safety, and developer ergonomics. This API automatically handles reactive props, type inference, and event emission without requiring complex configuration objects.

## ✨ Key Features

- **🔧 Zero Configuration** - No complex setup required
- **⚡ Automatic Reactivity** - All props are automatically reactive
- **🎯 Type Safety** - Full TypeScript inference from function signatures
- **📦 Props (avoid destructuring)** - Props are provided via `useProps()` with defaults and type inference. Avoid destructuring into local variables if you need reactivity — read from the `props` object or use `computed`/`watch` for derived reactive values.
- **🚀 Strongly Typed Hooks** - React-style hooks with perfect TypeScript inference
- **🔄 Automatic Prop Parsing** - Runtime extracts prop defaults from function signature
- **🔄 Automatic Prop Parsing** - Runtime extracts prop defaults from your `useProps()` calls (via a short discovery render in the browser) and uses them to infer prop types and observed attributes
- **💡 Intuitive API** - Familiar patterns similar to modern React/Vue components

## 🏗️ Basic Component Structure

The functional API follows a simple, intuitive pattern using context-based hooks:

```typescript
import {
  component,
  html,
  css,
  useProps,
  useEmit,
  useOnConnected,
  useOnDisconnected,
  useOnAttributeChanged,
  useOnError,
  useStyle,
  ref,
  computed,
  watch,
} from '@jasonshimmy/custom-elements-runtime';

import {
  when,
  each,
  match,
} from '@jasonshimmy/custom-elements-runtime/directives';
import { eventBus } from '@jasonshimmy/custom-elements-runtime/event-bus';

component('component-name', () => {
  // Access reactive props via useProps hook
  const props = useProps({ prop1: 'default', prop2: 0 });

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
component(
  tag: string,
  renderFn: () => VNode | VNode[] | Promise<VNode | VNode[]>,
)
```

### Available Hooks

All hooks must be called during component render and provide perfect TypeScript inference:

- **`useProps(defaults)`**: Get reactive props with default values and type inference
- **`useEmit()`**: Get the emit function for dispatching custom events
- **`useOnConnected(callback)`**: Set up lifecycle hook for when component connects to DOM
- **`useOnDisconnected(callback)`**: Set up lifecycle hook for when component disconnects from DOM
- **`useOnAttributeChanged(callback)`**: Set up lifecycle hook for when attributes change
- **`useOnError(callback)`**: Set up lifecycle hook for error handling

## 🔒 Props and Type Safety

### Props with useProps Hook

Define your component props using the `useProps()` hook with default values. The runtime automatically creates reactive props with type inference:

```typescript
component('user-card', () => {
  const props = useProps({
    name: 'Anonymous',
    age: 0,
    email: '',
    isActive: true,
    tags: [] as string[],
  });

  return html`
    <div class="user-card">
      <h3>${props.name}</h3>
      <p>Age: ${props.age}</p>
      <p>Email: ${props.email}</p>
      <p>Status: ${props.isActive ? 'Active' : 'Inactive'}</p>
      <ul>
        ${props.tags.map((tag) => html`<li>${tag}</li>`)}
      </ul>
    </div>
  `;
});
```

> Implementation note: The runtime performs a lightweight "discovery render" in browser environments to detect `useProps()` default values and populate the component config (including `observedAttributes`). This discovery step is skipped during SSR (no `window`), so defaults may be discovered on the first real render server-side. Always call `useProps()` during the component render (not at module top-level) so the runtime can pick up defaults correctly.

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

- ✅ Extracts default values from useProps defaults object
- ✅ Infers prop types from default values and TypeScript annotations
- ✅ Creates reactive Proxy for all props with automatic dependency tracking
- ✅ Converts attribute names (kebab-case) to prop names (camelCase)
- ✅ Handles type conversion (String, Number, Boolean)

Note about destructuring props

- ⚠️ If you destructure props (for example `const { foo } = useProps({ foo: 0 })`) you receive a copy of the current value. That local variable will not stay reactive — updates to the prop will not update the previously-destructured variable. To keep reactivity, access props via the returned `props` object (for example `props.foo`) or use `computed`/`watch` to derive reactive values.

## 🚀 Event Emission

Use the `useEmit()` hook to get a strongly typed emit function:

```typescript
component('interactive-button', () => {
  const props = useProps({ label: 'Click me', disabled: false });
  const emit = useEmit();

  const handleClick = () => {
    if (!props.disabled) {
      // Emit with type safety
      emit('button-clicked', { timestamp: Date.now(), label: props.label });
      emit('custom-event', { data: 'some data' });
    }
  };

  return html`
    <button :disabled="${props.disabled}" @click="${handleClick}">
      ${props.label}
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

## 🔁 Lifecycle Hooks

The functional API provides lifecycle hooks through context-based hooks, allowing you to respond to component lifecycle events:

```typescript
component('lifecycle-demo', () => {
  const emit = useEmit();

  const props = useProps({ data: [] });

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
    console.log(
      `Attribute '${name}' changed from '${oldValue}' to '${newValue}'`,
    );
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
      <p>Data items: ${props.data.length}</p>
      <ul>
        ${props.data.map((item) => html`<li>${item}</li>`)}
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
component('api-data', () => {
  const props = useProps({ endpoint: '/api/data' });
  const emit = useEmit();
  const data = ref(null);
  const loading = ref(false);
  let abortController: AbortController | null = null;

  const fetchData = async () => {
    abortController = new AbortController();
    loading.value = true;

    try {
      const response = await fetch(props.endpoint, {
        signal: abortController.signal,
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
      ${when(
        data.value,
        html` <pre>${JSON.stringify(data.value, null, 2)}</pre> `,
      )}
    </div>
  `;
});
```

## 🧾 Working with HTML entities and raw HTML

The runtime escapes interpolated values by default to keep the DOM safe from XSS. Two utilities are available when you need finer control:

- `decodeEntities(str)` — a small helper to decode common HTML entities (e.g. `&lt;`, `&gt;`, `&amp;`, numeric references) into their character equivalents.
- `unsafeHTML(htmlString)` — an opt-in marker for inserting raw HTML into the template. Use this only with trusted HTML.

### When to use each

- Use `decodeEntities` when you receive encoded HTML-like strings from a trusted source and want to display the decoded text in a text node (without interpreting it as markup).
- Use `unsafeHTML` only when you control or sanitize the HTML yourself and intentionally want the runtime to parse and insert DOM nodes from an HTML string.

### Examples

```ts
import {
  html,
  unsafeHTML,
  decodeEntities,
} from '@jasonshimmy/custom-elements-runtime';

// Literal entity decoding inside template text (the compiler decodes literal template text automatically)
const vnode = html`<p>This template literal contains &lt;escaped&gt; text</p>`;

// Interpolated values are preserved as-is. If you receive an encoded string, decode explicitly:
const encoded = '&lt;3 &amp; hi';
const decoded = decodeEntities(encoded); // '<3 & hi'
const vnode2 = html`<p>${decoded}</p>`; // renders text '<3 & hi'

// Insert raw HTML (opt-in):
const raw = '<b>Important</b> <i>note</i>';
const vnode3 = html`<div>${unsafeHTML(raw)}</div>`; // inserts <b> and <i> elements as nodes
```

### Security note ⚠️

Inserting or rendering raw HTML can open your application to XSS vulnerabilities. The runtime never inserts raw HTML unless you explicitly opt into it using `unsafeHTML`. Always sanitize or otherwise validate any HTML that originates from users or untrusted sources before passing it to `unsafeHTML`.

If you only want to display encoded HTML-like text (for example, to show `<script>` literally in UI), prefer decoding with `decodeEntities` and rendering as plain text nodes, not raw HTML.

## 🧬 Reactive State Management

### External State

Create reactive state outside components that can be shared:

```typescript
// Shared reactive state
const userState = ref({
  name: 'John',
  email: 'john@example.com',
  preferences: {
    theme: 'dark',
    notifications: true,
  },
});

// Computed values
const displayName = computed(() => userState.value.name || 'Anonymous');

// Watchers
watch(
  () => userState.value.email,
  (newEmail, oldEmail) => {
    console.log(`Email changed from ${oldEmail} to ${newEmail}`);
  },
);

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
component('counter', () => {
  const props = useProps({ initialValue: 0, step: 1 });
  const emit = useEmit();

  // Component-scoped reactive state
  const count = ref(props.initialValue);
  const increment = () => {
    count.value += props.step;
    emit('count-changed', { count: count.value });
  };

  const decrement = () => {
    count.value -= props.step;
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

## 🎛️ Directives and Bindings

The streamlined API works seamlessly with all existing directives and bindings:

### Property Binding (`:prop`)

Bind reactive values to element properties and attributes:

```typescript
component('dynamic-input', () => {
  const emit = useEmit();
  const props = useProps({
    type: 'text',
    value: '',
    placeholder: 'Enter text...',
    disabled: false,
  });

  return html`
    <input
      :type="${props.type}"
      :value="${props.value}"
      :placeholder="${props.placeholder}"
      :disabled="${props.disabled}"
      @input="${(e) => emit('input', e.target.value)}"
    />
  `;
});
```

### Guaranteed Property Assignment (`:bind`)

For complex objects, functions, or when you need to ensure JavaScript property assignment:

```typescript
component('complex-props', () => {
  const emit = useEmit();
  const props = useProps({
    config: {},
    items: [] as any[],
    onItemClick: null as ((item: any) => void) | null,
  });

  return html`
    <custom-element
      :bind="${{
        config: props.config,
        items: props.items,
        onItemClick:
          props.onItemClick || ((item) => emit('item-clicked', item)),
      }}"
    ></custom-element>
  `;
});
```

### Class Binding (`:class`)

Dynamic class management with object and array syntax:

```typescript
component('status-card', () => {
  const props = useProps({
    status: 'normal',
    size: 'medium',
    interactive: false,
  });
  const emit = useEmit();
  return html`
    <div
      :class="${{
        'status-card': true,
        [`status-${props.status}`]: true,
        [`size-${props.size}`]: true,
        interactive: props.interactive,
        clickable: props.interactive,
      }}"
      @click="${props.interactive ? () => emit('card-clicked') : null}"
    >
      <slot></slot>
    </div>
  `;
});
```

### Style Binding (`:style`)

Dynamic inline styles with object and string syntax:

```typescript
component('progress-bar', () => {
  const props = useProps({
    progress: 0,
    color: '#007bff',
    height: '8px',
    animated: false,
  });
  return html`
    <div class="progress-container" :style="${{ height: props.height }}">
      <div
        class="progress-bar"
        :class="${{ animated: props.animated }}"
        :style="${{
          width: `${Math.min(100, Math.max(0, props.progress))}%`,
          backgroundColor: props.color,
          transition: props.animated ? 'width 0.3s ease' : 'none',
        }}"
      ></div>
    </div>
  `;
});
```

### Two-Way Binding (`:model`)

The `:model` directive provides automatic two-way data binding for form elements. With the functional API, you can bind directly to reactive state objects:

```typescript
component('form-field', () => {
  const emit = useEmit();
  const props = useProps({
    label: 'Name',
    type: 'text',
    initialValue: '',
  });
  const value = ref(props.initialValue);

  return html`
    <label class="form-field">
      ${props.label}
      <input
        type="${props.type}"
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
component('controlled-input', () => {
  const emit = useEmit();
  const props = useProps({
    modelValue: '',
    label: '',
  });

  return html`
    <label class="controlled-input">
      ${props.label}
      <input
        value="${props.modelValue}"
        @input="${(e: Event) =>
          emit('update:modelValue', (e.target as HTMLInputElement).value)}"
      />
    </label>
  `;
});
```

### Custom Model Binding (`:model:prop`)

Custom property binding for complex components using reactive state:

```typescript
component('multi-select', () => {
  const emit = useEmit();
  const props = useProps({
    options: [] as { label: string; value: string }[],
    selectedValues: [] as string[],
  });
  const selectedItems = ref<string[]>([]);
  const multiple = ref(true);

  const isSelected = (value: string) => props.selectedValues.includes(value);
  const toggleSelection = (value: string) => {
    const newSelection = isSelected(value)
      ? props.selectedValues.filter((item) => item !== value)
      : [...props.selectedValues, value];
    props.selectedValues = newSelection;
    emit('selection-changed', newSelection);
  };

  return html`
    <div class="multi-select">
      ${each(
        props.options,
        (option) => html`
          <label class="option">
            <input
              type="checkbox"
              checked="${isSelected(option.value)}"
              @change="${() => toggleSelection(option.value)}"
            />
            ${option.label}
          </label>
        `,
      )}
      <p>Selected: ${props.selectedValues.join(', ')}</p>
    </div>
  `;
});
```

### Event Binding (`@event`)

Comprehensive event handling with modifiers:

```typescript
component('event-demo', () => {
  const props = useProps({ disabled: false });
  const emit = useEmit();

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      emit('enter-pressed', { value: (e.target as HTMLInputElement).value });
    } else if (e.key === 'Escape') {
      emit('escape-pressed');
    }
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (!props.disabled) {
      const formData = new FormData(e.target as HTMLFormElement);
      emit('form-submitted', Object.fromEntries(formData));
    }
  };

  return html`
    <form @submit="${handleSubmit}">
      <input
        type="text"
        :disabled="${props.disabled}"
        @keydown="${handleKeydown}"
        @focus="${() => emit('input-focused')}"
        @blur="${() => emit('input-blurred')}"
        @input="${(e) => emit('input-changed', e.target.value)}"
      />
      <button
        type="submit"
        :disabled="${props.disabled}"
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
component('focusable-input', () => {
  const props = useProps({ autoFocus: false });
  const emit = useEmit();
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
        :ref="${(el) => {
          inputRef = el;
          if (props.autoFocus) el.focus();
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

## 🔀 Conditional Rendering and Lists

### Using `when` for Conditional Rendering

```typescript
component('conditional-content', () => {
  const props = useProps({
    isLoggedIn: false,
    userRole: 'guest',
    showAdvanced: false,
  });
  const emit = useEmit();

  return html`
    <div>
      ${when(
        props.isLoggedIn,
        html`
          <h2>Welcome back!</h2>
          <p>Role: ${props.userRole}</p>
          ${when(
            props.userRole === 'admin',
            html`
              <button @click="${() => emit('admin-action')}">
                Admin Panel
              </button>
            `,
          )}
          ${when(
            props.showAdvanced,
            html`
              <div class="advanced-settings">
                <h3>Advanced Settings</h3>
                <!-- Advanced content -->
              </div>
            `,
          )}
        `,
      )}
      ${when(
        !props.isLoggedIn,
        html`
          <div class="login-prompt">
            <h2>Please log in</h2>
            <button @click="${() => emit('login-requested')}">Login</button>
          </div>
        `,
      )}
    </div>
  `;
});
```

> **Note**: The `when` directive only accepts a condition and content. For if/else logic, use two separate `when` calls or the `match` directive below.

#### 💤 Lazy `when` (runtime-only)

If your conditional content includes expressions that are expensive or that may throw when evaluated, prefer the lazy factory overload which defers building the child VNode(s) until the condition becomes truthy:

```ts
// Use a factory to avoid evaluating `expensive()` while `isVisible` is falsy
${when(isVisible, () => html`<div>${expensive()}</div>`) }
```

Key points:

- This behavior is implemented entirely at runtime. There is no compile-time transform required or used.
- Existing code using `when(cond, html`...`)` continues to work. Switch to the factory form when you need guarded evaluation.
- The factory will only be executed when the condition is truthy. The runtime ensures stable anchor blocks so DOM updates remain predictable.

##### Practical example: guarding a parse

```ts
component('safe-render', () => {
  const props = useProps({ jsonText: '' });

  return html`
    ${when(props.jsonText, () => {
      // parse may throw — run only when jsonText is present
      const data = JSON.parse(props.jsonText);
      return html`<pre>${JSON.stringify(data, null, 2)}</pre>`;
    })}
  `;
});
```

##### Anchor normalization and falsy children

The runtime preserves intentional falsy children inside conditional blocks. Values like `0`, `false`, and `''` are valid child nodes and will be rendered. Only `null` and `undefined` are treated as absent children and are filtered out when normalizing anchor block children.

### Using `match` for Complex Conditionals

```typescript
component('status-indicator', () => {
  const props = useProps({
    status: 'pending' as 'pending' | 'success' | 'error' | 'warning',
    message: '',
  });
  const emit = useEmit();

  return html`
    <div class="status-indicator">
      ${match()
        .when(
          props.status === 'pending',
          html`
            <div class="pending">
              <span class="icon">⏳</span>
              <span>Processing...</span>
            </div>
          `,
        )
        .when(
          props.status === 'success',
          html`
            <div class="success">
              <span class="icon">✅</span>
              <span>Success: ${props.message}</span>
            </div>
          `,
        )
        .when(
          props.status === 'error',
          html`
            <div class="error">
              <span class="icon">❌</span>
              <span>Error: ${props.message}</span>
              <button @click="${() => emit('retry')}">Retry</button>
            </div>
          `,
        )
        .when(
          props.status === 'warning',
          html`
            <div class="warning">
              <span class="icon">⚠️</span>
              <span>Warning: ${props.message}</span>
            </div>
          `,
        )
        .otherwise(html`
          <div class="unknown">
            <span>Unknown status: ${props.status}</span>
          </div>
        `)
        .done()}
    </div>
  `;
});
```

#### Lazy `match` branches

`match()` supports the same runtime factory pattern as `when`. Provide a factory to defer creating branch content until the branch is selected:

```ts
const node = match()
  .when(condA, () => html`<div>${expensiveA()}</div>`) // not called until condA is truthy
  .when(condB, html`<div>simple</div>`) // pre-built
  .done();
```

### Using `each` for List Rendering

```typescript
component('todo-list', () => {
  const props = useProps({
    todos: [] as Array<{ id: string; text: string; completed: boolean }>,
    filter: 'all' as 'all' | 'active' | 'completed',
  });
  const emit = useEmit();

  const filteredTodos = computed(() => {
    switch (props.filter) {
      case 'active':
        return props.todos.filter((todo) => !todo.completed);
      case 'completed':
        return props.todos.filter((todo) => todo.completed);
      default:
        return props.todos;
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
          :class="${{ active: props.filter === 'all' }}"
          @click="${() => emit('filter-changed', 'all')}"
        >
          All
        </button>
        <button
          :class="${{ active: props.filter === 'active' }}"
          @click="${() => emit('filter-changed', 'active')}"
        >
          Active
        </button>
        <button
          :class="${{ active: props.filter === 'completed' }}"
          @click="${() => emit('filter-changed', 'completed')}"
        >
          Completed
        </button>
      </div>

      <ul class="todo-items">
        ${each(
          filteredTodos.value,
          (todo) => html`
            <li key="${todo.id}" :class="${{ completed: todo.completed }}">
              <input
                type="checkbox"
                :checked="${todo.completed}"
                @change="${() => toggleTodo(todo.id)}"
              />
              <span class="todo-text">${todo.text}</span>
              <button class="delete-btn" @click="${() => deleteTodo(todo.id)}">
                Delete
              </button>
            </li>
          `,
        )}
      </ul>

      ${when(
        filteredTodos.value.length === 0,
        html` <p class="empty-state">No todos found</p> `,
      )}
    </div>
  `;
});
```

## 🎨 Styling

### Static Styles

```typescript
import {
  component,
  html,
  css,
  useStyle,
} from '@jasonshimmy/custom-elements-runtime';

component('styled-button', () => {
  const props = useProps({
    variant: 'primary' as 'primary' | 'secondary' | 'danger',
    size: 'medium' as 'small' | 'medium' | 'large',
  });
  const emit = useEmit();

  useStyle(
    () => css`
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

      .btn-small {
        padding: 4px 8px;
        font-size: 12px;
      }
      .btn-medium {
        padding: 8px 16px;
        font-size: 14px;
      }
      .btn-large {
        padding: 12px 24px;
        font-size: 16px;
      }

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
    `,
  );

  return html`
    <button
      class="btn btn-${props.variant} btn-${props.size}"
      @click="${() => emit('click')}"
    >
      <slot></slot>
    </button>
  `;
});
```

### Dynamic Styles

```typescript
component('themed-card', () => {
  const props = useProps({
    theme: 'light' as 'light' | 'dark',
    accentColor: '#007bff',
  });
  const emit = useEmit();

  useStyle(
    () => css`
      :host {
        display: block;
        --accent-color: ${props.accentColor};
        --bg-color: ${props.theme === 'dark' ? '#2d3748' : '#ffffff'};
        --text-color: ${props.theme === 'dark' ? '#e2e8f0' : '#2d3748'};
        --border-color: ${props.theme === 'dark' ? '#4a5568' : '#e2e8f0'};
      }

      .card {
        background: var(--bg-color);
        color: var(--text-color);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .card-header {
        padding: 16px;
        border-bottom: 1px solid var(--border-color);
        background: linear-gradient(
          135deg,
          var(--accent-color),
          color-mix(in srgb, var(--accent-color) 80%, white)
        );
        color: white;
      }

      .card-content {
        padding: 16px;
      }
    `,
  );

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
component('styled-component', () => {
  const props = useProps({ color: 'blue' });

  useStyle(
    () => css`
      :host {
        background-color: ${props.color};
        border: 1px solid ${props.color};
      }
    `,
  );

  return html`<div>Styled content</div>`;
});
```

#### 🔄 Reactive Styles with State

```typescript
component('interactive-button', () => {
  const props = useProps({ initialColor: 'blue' });
  const buttonState = ref({ color: props.initialColor, hovered: false });

  useStyle(
    () => css`
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
    `,
  );

  return html`
    <button
      class="button"
      @mouseenter="${() => (buttonState.hovered = true)}"
      @mouseleave="${() => (buttonState.hovered = false)}"
      @click="${() =>
        (buttonState.color = buttonState.color === 'blue' ? 'green' : 'blue')}"
    >
      Toggle Color
    </button>
  `;
});
```

#### 🎨 Complex Styling Logic

```typescript
component('adaptive-card', () => {
  const props = useProps({
    theme: 'light' as 'light' | 'dark',
    size: 'medium' as 'small' | 'medium' | 'large',
    highlighted: false,
  });
  const cardState = ref({ expanded: false });

  useStyle(() => {
    const isDark = props.theme === 'dark';
    const isLarge = props.size === 'large';
    const isHighlighted = props.highlighted;

    return css`
      :host {
        display: block;
        transition: all 0.3s ease;
        transform: ${cardState.expanded ? 'scale(1.02)' : 'scale(1)'};
      }

      .card {
        background: ${isDark ? '#2d3748' : '#ffffff'};
        color: ${isDark ? '#e2e8f0' : '#2d3748'};
        border: 2px solid
          ${isHighlighted ? '#007bff' : isDark ? '#4a5568' : '#e2e8f0'};
        border-radius: ${isLarge ? '12px' : '8px'};
        padding: ${isLarge ? '24px' : '16px'};
        box-shadow: ${isHighlighted
          ? '0 4px 12px rgba(0,123,255,0.3)'
          : '0 2px 4px rgba(0,0,0,0.1)'};
        font-size: ${isLarge ? '18px' : '14px'};
      }

      .card:hover {
        box-shadow: ${isHighlighted
          ? '0 6px 20px rgba(0,123,255,0.4)'
          : '0 4px 8px rgba(0,0,0,0.2)'};
      }
    `;
  });

  return html`
    <div
      class="card"
      @click="${() => (cardState.expanded = !cardState.expanded)}"
    >
      <slot></slot>
    </div>
  `;
});
```

#### Styling Best Practices

1. **Use CSS Custom Properties**: For complex themes and design tokens
2. **Leverage Template Literals**: For dynamic CSS values
3. **Keep Logic Simple**: Extract complex styling logic to separate functions
4. **Performance**: useStyle is reactive - styles update only when dependencies change

```typescript
// Good: Using CSS custom properties for consistency
component('themed-component', () => {
  const props = useProps({ primaryColor: '#007bff' });

  useStyle(
    () => css`
      :host {
        --primary: ${props.primaryColor};
        --primary-hover: color-mix(in srgb, var(--primary) 80%, black);
        --primary-light: color-mix(in srgb, var(--primary) 20%, white);
      }

      .button {
        background: var(--primary);
      }
      .button:hover {
        background: var(--primary-hover);
      }
      .badge {
        background: var(--primary-light);
      }
    `,
  );
});
```

## 🔗 Component Communication

### Parent-Child Communication

```typescript
// Child component
component('form-input', () => {
  const props = useProps({
    label: '',
    value: '',
    type: 'text',
    required: false,
    error: '',
  });
  const emit = useEmit();

  const handleInput = (e: Event) => {
    const input = e.target as HTMLInputElement;
    emit('update:value', input.value);

    // Emit validation event
    if (props.required && !input.value.trim()) {
      emit('validation-error', 'This field is required');
    } else {
      emit('validation-success');
    }
  };

  return html`
    <div class="form-group">
      <label class="form-label">
        ${props.label}
        ${when(props.required, html`<span class="required">*</span>`)}
      </label>
      <input
        :type="${props.type}"
        :value="${props.value}"
        :required="${props.required}"
        :class="${{ error: !!props.error }}"
        @input="${handleInput}"
        @blur="${handleInput}"
      />
      ${when(
        props.error,
        html` <span class="error-message">${props.error}</span> `,
      )}
    </div>
  `;
});

// Parent component
component('contact-form', () => {
  const emit = useEmit();
  const formData = ref({
    name: '',
    email: '',
    message: '',
  });

  const errors = ref({
    name: '',
    email: '',
    message: '',
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
    const hasErrors = Object.values(errors.value).some((error) => error);
    if (!hasErrors) {
      emit('form-submitted', formData.value);
    }
  };

  return html`
    <form
      @submit="${(e) => {
        e.preventDefault();
        submitForm();
      }}"
    >
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
        @validation-error="${(error) =>
          handleValidationError('message', error)}"
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
  theme: 'light',
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
      ...notification,
    });
  },
};

// Components can access global state
component('user-avatar', () => {
  const emit = useEmit();

  return html`
    <div class="user-avatar">
      ${when(
        appState.value.user,
        html`
          <img
            src="${appState.value.user.avatar}"
            alt="${appState.value.user.name}"
            @click="${() => emit('profile-clicked')}"
          />
          <span>${appState.value.user.name}</span>
        `,
        html`
          <button @click="${() => emit('login-requested')}">Login</button>
        `,
      )}
    </div>
  `;
});

component('notification-center', () => {
  const emit = useEmit();

  const dismissNotification = (id: number) => {
    appState.value.notifications = appState.value.notifications.filter(
      (n) => n.id !== id,
    );
  };

  return html`
    <div class="notification-center">
      ${when(
        appState.value.notifications.length > 0,
        html`
          <div class="notifications">
            ${each(
              appState.value.notifications,
              (notification) => html`
                <div
                  key="${notification.id}"
                  class="notification notification-${notification.type}"
                >
                  <span>${notification.message}</span>
                  <button
                    @click="${() => dismissNotification(notification.id)}"
                  >
                    ×
                  </button>
                </div>
              `,
            )}
          </div>
        `,
      )}
    </div>
  `;
});
```

## ⚙️ Advanced Configuration

### Component with Lifecycle Hooks and Styling

The functional API uses hooks for all component features:

```typescript
component('advanced-component', () => {
  const props = useProps({ data: [] as any[] });
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
  useStyle(
    () => css`
      :host {
        display: block;
        padding: 16px;
      }
    `,
  );

  return html`<div>${props.data.length} items</div>`;
});
```

## ⏳ Async Components

Handle asynchronous operations seamlessly:

```typescript
component('async-data', () => {
  const props = useProps({ userId: '' });
  const emit = useEmit();
  const loading = ref(false);
  const data = ref(null);
  const error = ref(null);

  const fetchData = async () => {
    if (!props.userId) return;

    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(`/api/users/${props.userId}`);
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
  watch(() => props.userId, fetchData, { immediate: true });

  return html`
    <div class="async-data">
      ${when(
        loading.value,
        html` <div class="loading-spinner">Loading user data...</div> `,
      )}
      ${when(
        error.value,
        html`
          <div class="error-state">
            <p>Error: ${error.value}</p>
            <button @click="${fetchData}">Retry</button>
          </div>
        `,
      )}
      ${when(
        data.value && !loading.value,
        html`
          <div class="user-data">
            <h2>${data.value.name}</h2>
            <p>${data.value.email}</p>
            <p>
              Joined: ${new Date(data.value.createdAt).toLocaleDateString()}
            </p>
          </div>
        `,
      )}
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
    component('test-component', () => {
      const props = useProps({
        message: 'default',
        count: 0,
      });
      const emit = useEmit();

      return html`
        <div>
          <span class="message">${props.message}</span>
          <span class="count">${props.count}</span>
          <button @click="${() => emit('increment')}">+</button>
        </div>
      `;
    });

    const element = document.createElement('test-component');
    element.setAttribute('message', 'Hello World');
    element.setAttribute('count', '5');
    document.body.appendChild(element);

    await new Promise((resolve) => setTimeout(resolve, 50));

    const messageEl = element.shadowRoot?.querySelector('.message');
    const countEl = element.shadowRoot?.querySelector('.count');

    expect(messageEl?.textContent).toBe('Hello World');
    expect(countEl?.textContent).toBe('5');
  });

  it('should emit events correctly', async () => {
    let emittedData = null;

    component('emitter-test', () => {
      const emit = useEmit();

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
    await new Promise((resolve) => setTimeout(resolve, 50));

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
component('user-badge', () => {
  const props = useProps({
    name: 'Anonymous',
    role: 'user' as 'user' | 'admin' | 'moderator',
    showAvatar: true,
    size: 'medium' as 'small' | 'medium' | 'large',
  });
  const emit = useEmit();

  // ...
});

// ❌ Avoid
component('user-badge', () => {
  // Hard to understand
  const props = useProps({ a: '', b: '', c: '' });
});
```

### 2. **Prefer External State for Shared Data**

```typescript
// ✅ Good - Shared state
const userPreferences = ref({
  theme: 'light',
  language: 'en',
});

component('theme-switcher', () => {
  const emit = useEmit();
  // Use shared state
});

component('language-selector', () => {
  const emit = useEmit();
  // Use same shared state
});
```

### 3. **Use Computed Values for Derived State**

```typescript
// ✅ Good
const items = ref([]);
const filteredItems = computed(() => items.value.filter((item) => item.active));
const itemCount = computed(() => filteredItems.value.length);

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
component('data-loader', () => {
  const props = useProps({ url: '' });
  const emit = useEmit();
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
    ${when(
      error.value,
      html`
        <div class="error">
          Error: ${error.value}
          <button @click="${loadData}">Retry</button>
        </div>
      `,
    )}
    <!-- Rest of template -->
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
