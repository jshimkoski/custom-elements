# Custom Elements Runtime

> **A modern, ultra-lightweight TypeScript runtime for building fast, reactive, and maintainable web components.**

## ✨ Features
- **Smart DOM batching**: State-triggered renders are batched via requestAnimationFrame for optimal performance
- **Error boundaries & diagnostics**: Robust error handling with fallback UI and clear logs
- **Template & computed caching**: Memoization for templates and computed properties
- **Direct DOM performance**: No virtual DOM, no diffing overhead
- **Strict TypeScript**: Type-safe, developer-friendly
- **Zero dependencies**: Pure TypeScript/JavaScript
- **SSR & Hydration**: Universal rendering, seamless client takeover
- **Tree-shakable & modular**: Only ship what you use
- **Functional API**: One function, no classes
- **Automatic event binding**: Declarative event handlers via `data-on-*` attributes
- **Event bus & global store**: Built-in communication and state

## 🚀 Getting Started

1. **Clone this repository**
2. **Run the examples**: `npm run dev`
3. **Create your first component** (see minimal example above)
4. **Build something awesome!**

## 🎯 Use Cases

- **Micro-frontends**: Lightweight, isolated components
- **Progressive Enhancement**: Add reactivity to existing sites
- **Design Systems**: Reusable component libraries
- **SSR Applications**: Universal rendering with hydration
- **Performance-Critical Apps**: When bundle size matters
- **Web Standards**: Future-proof, standards-based development

## ⚠️ SSR Caveats

- SSR only generates HTML and styles; DOM APIs, refs, and event listeners are not available during server rendering.
- Lifecycle hooks (`onMounted`, `onUnmounted`) and refs are ignored during SSR.
- Hydration requires the client bundle to match the server-rendered markup and state exactly.


## 🛡️ Production-Readiness

- Strict TypeScript, modular structure
- Early returns, guard clauses, custom error types
- No external dependencies
- Manual input validation and error handling

## ⚡ Performance Features

- **Batched Updates**: Multiple state changes are batched using RAF
- **Template & Computed Property Caching**: Expensive calculations are cached
- **Memory Management**: Automatic cleanup prevents memory leaks
- **Focus Preservation**: Smart input focus handling during updates

## 🧐 Examples

### Hello World

```typescript
import { component } from './lib/runtime.ts';

component('hello-world', {
  state: { name: 'World' },
  template: (state) => `<h1>Hello, ${state.name}!</h1>`
});
```

```html
<hello-world></hello-world>
```

### Simple Counter

```typescript
import { component } from './lib/runtime.ts';

component('simple-counter', {
  state: { count: 0 },
  template: (state) => `
    <button data-on-click="increment">Count: ${state.count}</button>
  `,
  increment(_e, state, api) {
    api.updateKey('count', state.count + 1);
  }
});
```

```html
<simple-counter></simple-counter>
```

### Todo App with Notifications Example

```typescript
import { component, emit, on } from './lib/runtime.ts';

component('todo-app', {
  state: { todos: [], newTodo: '' },
  template: (state) => `
    <input value="${state.newTodo}" placeholder="Add todo" data-on-input="handleInput" />
    <button data-on-click="handleAdd">Add</button>
    <ul>
      ${state.todos.map((t: string) => `<li>${t}</li>`).join('')}
    </ul>
    <notification-display></notification-display>
  `,
  handleInput(e, state, api) {
    api.updateKey('newTodo', (e.target as HTMLInputElement).value);
  },
  handleAdd(_e, state, api) {
    if (state.newTodo.trim()) {
      api.updateKey('todos', [...state.todos, state.newTodo.trim()]);
      emit('notify', { message: `Added: ${state.newTodo}` });
      api.updateKey('newTodo', '');
    }
  }
});

component('notification-display', {
  state: { notifications: [] },
  template: (state) => `
    <div>
      ${state.notifications.map((n: any) => `<div>${n.message}</div>`).join('')}
    </div>
  `,
  onMounted: (state, api) => {
    on('notify', (n) => {
      api.updateKey('notifications', [...state.notifications, n]);
      setTimeout(() => {
        api.updateKey('notifications', state.notifications.filter(x => x !== n));
      }, 2000);
    });
  }
});
```

```html
<todo-app></todo-app>
```

### 🍳 Kitchen Sink Example

A comprehensive todo app showcasing all features:

```typescript
import { component, html, css, type ComponentState } from '../../lib/runtime';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

interface TodoAppState extends ComponentState {
  todos: Todo[];
  newTodo: string;
  filter: 'all' | 'active' | 'completed';
  filteredTodos?: Todo[];
  activeTodos?: Todo[];
  completedCount?: number;
}

component<TodoAppState>({
  tag: 'todo-app',
  
  state: {
    todos: [
      { id: 1, text: 'Learn TypeScript', completed: true },
      { id: 2, text: 'Build awesome components', completed: false },
      { id: 3, text: 'Ship to production', completed: false }
    ],
    newTodo: '',
    filter: 'all',
    get filteredTodos() {
      switch (this.filter) {
        case 'active': return this.todos.filter(todo => !todo.completed);
        case 'completed': return this.todos.filter(todo => todo.completed);
        default: return this.todos;
      }
    },
    get activeTodos() {
      return this.todos.filter(todo => !todo.completed);
    },
    get completedCount() {
      return this.todos.filter(todo => todo.completed).length;
    }
  },

  template: (state) => compiled`
    <div class="todo-app">
      <header>
        <h1>📝 Todo App</h1>
        <input 
          data-ref="newTodoInput"
          type="text" 
          value="${state => state.newTodo}"
          placeholder="What needs to be done?"
          class="new-todo"
        >
      </header>

      <main>
        <div class="filters">
          <button 
            data-ref="allFilter"
            class="${state => state.filter === 'all' ? 'active' : ''}"
          >
            All (${state => state.todos.length})
          </button>
          <button 
            data-ref="activeFilter"
            class="${state => state.filter === 'active' ? 'active' : ''}"
          >
            Active (${state => state.activeTodos?.length})
          </button>
          <button 
            data-ref="completedFilter"
            class="${state => state.filter === 'completed' ? 'active' : ''}"
          >
            Completed (${state => state.completedCount})
          </button>
        </div>

        <ul class="todo-list" data-ref="todoList">
          ${state => state.filteredTodos?.map((todo: Todo) => html`
            <li key="${todo.id}" class="${todo.completed ? 'completed' : ''}">
              <input 
                type="checkbox" 
                ${todo.completed ? 'checked' : ''}
                data-todo-id="${todo.id}"
                data-action="toggle"
              >
              <span class="text">${todo.text}</span>
              <button 
                class="delete"
                data-todo-id="${todo.id}"
                data-action="delete"
              >
                ×
              </button>
            </li>
          `).join('')}
        </ul>
      </main>

      <footer>
        <small>
          ${state => state.activeTodos?.length} item${state => state.activeTodos?.length !== 1 ? 's' : ''} left
        </small>
      </footer>
    </div>
  `,

  style: css`
    .todo-app {
      max-width: 400px;
      margin: 2rem auto;
      padding: 1rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-family: system-ui, sans-serif;
    }

    header h1 {
      margin: 0 0 1rem 0;
      text-align: center;
      color: #333;
    }

    .new-todo {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
      box-sizing: border-box;
    }

    .filters {
      display: flex;
      gap: 0.5rem;
      margin: 1rem 0;
    }

    .filters button {
      flex: 1;
      padding: 0.5rem;
      border: 1px solid #ddd;
      background: white;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .filters button.active {
      background: #007bff;
      color: white;
      border-color: #007bff;
    }

    .filters button:hover {
      background: #f8f9fa;
    }

    .filters button.active:hover {
      background: #0056b3;
    }

    .todo-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .todo-list li {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 0;
      border-bottom: 1px solid #eee;
    }

    .todo-list li.completed .text {
      text-decoration: line-through;
      color: #888;
    }

    .todo-list .text {
      flex: 1;
    }

    .delete {
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
    }

    .delete:hover {
      background: #c82333;
    }

    footer {
      text-align: center;
      margin-top: 1rem;
      color: #888;
    }
  `,

  refs: {
    newTodoInput: (element, state, api) => {
      const input = element as HTMLInputElement;
      
      // Two-way binding
      input.addEventListener('input', () => {
        api.updateKey('newTodo', input.value);
      });

      // Add todo on Enter
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && state.newTodo.trim()) {
          const newId = Math.max(0, ...state.todos.map(t => t.id)) + 1;
          const todoText = state.newTodo.trim();
          
          api.update({
            todos: [...state.todos, {
              id: newId,
              text: todoText,
              completed: false
            }],
            newTodo: ''
          });
          
          // Manually clear the input to ensure it updates immediately
          input.value = '';
          
          // Emit custom event
          api.emit('todo-added', { id: newId, text: todoText });
        }
      });
    },

    allFilter: (element, _state, api) => {
      element.addEventListener('click', () => {
        api.updateKey('filter', 'all');
      });
    },

    activeFilter: (element, _state, api) => {
      element.addEventListener('click', () => {
        api.updateKey('filter', 'active');
      });
    },

    completedFilter: (element, _state, api) => {
      element.addEventListener('click', () => {
        api.updateKey('filter', 'completed');
      });
    },

    todoList: (element, state, api) => {
      // Event delegation for todo items
      element.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const todoId = parseInt(target.getAttribute('data-todo-id') || '0');
        const action = target.getAttribute('data-action');

        if (action === 'delete') {
          api.updateKey('todos', state.todos.filter(t => t.id !== todoId));
          api.emit('todo-removed', { id: todoId });
        }
      });

      element.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const todoId = parseInt(target.getAttribute('data-todo-id') || '0');
        const action = target.getAttribute('data-action');

        if (action === 'toggle') {
          api.updateKey('todos', state.todos.map(t =>
            t.id === todoId ? { ...t, completed: target.checked } : t
          ));
          api.emit('todo-toggled', { id: todoId, completed: target.checked });
        }
      });
    }
  },

  onMounted: () => {
    console.log('📝 Todo App mounted');
  },

  onUnmounted: () => {
    console.log('📝 Todo App unmounted');
  }
});
```

## 🎯 Framework Comparison Details

| Feature                | Custom Elements Runtime | React   | Vue     | Angular | Svelte  | Lit     |
|------------------------|------------------------|---------|---------|---------|---------|---------|
| **Bundle Size**        | ~8KB                   | ~45KB   | ~35KB   | ~60KB   | ~10KB   | ~7KB    |
| **SSR**                | Built-in               | Yes     | Yes     | Yes     | Yes     | Yes     |
| **TypeScript**         | Strict                 | Opt     | Opt     | Strict  | Opt     | Strict  |
| **State Mgmt**         | Manual/Store           | Redux   | Pinia   | RxJS    | Store   | Manual  |
| **Routing**            | Manual                 | Router  | Router  | Router  | SvelteKit| Manual  |
| **HMR**                | Built-in               | Yes     | Yes     | Yes     | Yes     | Yes     |
| **Error Boundaries**   | Built-in               | Yes     | Yes     | Yes     | Yes     | Manual  |
| **Learning Curve**     | Low                    | Medium  | Medium  | High    | Medium  | Low     |
| **Event Binding**      | Declarative (data-on-*)| JSX     | v-on    | (ng)    | on:     | @event  |
| **Reactivity**         | ES6 Proxy              | setState| Proxy   | Zone.js | Compiler| LitElement|
| **Dependencies**       | None                   | Many    | Some    | Many    | None    | None    |
| **SSR Hydration**      | Seamless               | Yes     | Yes     | Yes     | Yes     | Yes     |
| **Tree-shaking**       | Yes                    | Partial | Partial | Partial | Yes     | Yes     |
| **Custom Elements**    | Native                 | No      | No      | No      | No      | Yes     |
| **DevTools**           | Minimal                | Advanced| Advanced| Advanced| Basic   | Basic   |

### Key Strengths of Custom Elements Runtime
- **Smallest bundle size**: ~8KB, zero dependencies, tree-shakable
- **Direct DOM updates**: No virtual DOM, fastest rendering
- **Strict TypeScript**: Type-safe by default, no config required
- **SSR & Hydration**: Universal rendering, seamless client takeover
- **Declarative event binding**: `data-on-*` attributes, no manual listeners
- **Functional API**: No classes, easy onboarding
- **Built-in error boundaries, HMR, and global event bus**
- **Native Custom Elements**: Standards-based, interoperable

### Weaknesses / Tradeoffs
- Smaller ecosystem, fewer plugins/integrations
- Manual state management (no context API, no built-in store)
- No built-in router, forms, or animation system
- Minimal devtools and CLI support

### When to Choose Custom Elements Runtime
- Micro-frontends, design systems, performance-critical apps, progressive enhancement, SSR sites, web standards projects
- When bundle size, performance, and standards compliance are top priorities

### When to Choose a Major Framework
- Large apps needing advanced routing, forms, context, or extensive ecosystem/tooling
- Teams requiring mature devtools, CLI, and third-party integrations

### Unique Features Compared to Other Frameworks
- **Automatic event binding**: Declarative, type-safe, and cleaned up automatically
- **Native custom elements**: True web standard, interoperable with any framework
- **Zero dependencies**: No external libraries, secure and maintainable
- **Functional, modular API**: No classes, no boilerplate

### Summary Table
Custom Elements Runtime is ideal for modern, lightweight, standards-based web components and micro-frontends, while major frameworks excel in large-scale, feature-rich applications.

## 🧩 Core Concepts

- **Reactive state**: Automatic updates via ES6 Proxy
- **Functional templates**: Just return HTML strings
- **Refs**: Direct DOM access, no selectors
- **Computed properties**: ES6 getters in state, recalculated on access
- **Event bus**: Cross-component communication
- **Global store**: Shared state, subscriptions

### 1. State changes automatically trigger re-renders using ES6 Proxies:

```typescript
state.count++; // Automatically re-renders the component
```

### 2. Template Functions
Templates are just JavaScript functions that return HTML strings:

```typescript
template: (state, api) => `<div>Hello ${state.name}!</div>`
```

### 3. Refs System
Direct DOM access without complex selectors:

```typescript
refs: {
  myButton: (element, state, api) => {
    element.addEventListener('click', () => {
      state.clicks++;
      api.emit('button-clicked', { clicks: state.clicks });
    });
  }
}
```

### 4. Computed Properties

Define computed properties using the `computed` property in `ComponentConfig`. This ensures correct reactivity and separation of state and derived values:

```typescript
component('user-profile', {
  state: {
    firstName: 'Jane',
    lastName: 'Doe',
    email: '',
    password: ''
  },
  computed: {
    fullName: (state) => `${state.firstName} ${state.lastName}`,
    isValid: (state) => state.email.includes('@') && state.password.length >= 8
  },
  template: (state, computed) => `
    <div>Name: ${computed.fullName}</div>
    <div>Valid: ${computed.isValid ? 'Yes' : 'No'}</div>
  `
});
```

### 5. Automatic Event Binding

Define event handlers directly in your component config and use `data-on-*` attributes in your template for declarative, type-safe event handling. The runtime automatically attaches listeners after each render, ensuring no duplicate bindings and robust updates.

**Usage Example:**

```typescript
component('my-form', {
  state: { name: '' },
  template: (state) => `
    <form>
      <input type="text" value="${state.name}" data-on-input="handleInput">
      <button type="submit" data-on-click="handleSubmit">Submit</button>
    </form>
  `,
  handleInput(e, state, api) {
    state.name = (e.target as HTMLInputElement).value;
  },
  handleSubmit(e, state, api) {
    e.preventDefault();
    api.emit('form-submitted', { name: state.name });
  }
});
```

**Benefits:**
- No manual event listener management
- Handlers are type-safe and colocated with component logic
- Works with all native DOM events
- No duplicate listeners after rerender

**Supported Syntax:**
- `data-on-click="handlerName"`
- `data-on-input="handlerName"`
- `data-on-change="handlerName"`
- ...any DOM event type

See the TodoApp example for advanced usage.

## 🌐 Server-Side Rendering (SSR)

Complete SSR example with hydration:

```typescript
// server.ts - Server-side rendering
import { 
  renderToString, 
  renderComponentsToString, 
  generateHydrationScript,
  type SSRComponentConfig 
} from './lib/runtime.ts';

// Define components that work on both server and client
const userCardConfig: SSRComponentConfig<{
  name: string;
  email: string;
  avatar: string;
  isOnline: boolean;
  statusText: string;
  statusClass: string;
}> = {
  tag: 'user-card',
  state: {
    name: 'John Doe',
    email: 'john@example.com',
    avatar: 'https://via.placeholder.com/80x80',
    isOnline: true,
    get statusText() { return this.isOnline ? 'Online' : 'Offline'; },
    get statusClass() { return `status ${this.isOnline ? 'online' : 'offline'}`; }
  },
  template: (state) => `
    <div class="user-card">
      <img src="${state.avatar}" alt="${state.name}" class="avatar" />
      <div class="info">
        <h3>${state.name}</h3>
        <p>${state.email}</p>
        <span class="${state.statusClass}">${state.statusText}</span>
      </div>
    </div>
  `,
  style: `
    .user-card {
      display: flex;
      align-items: center;
      padding: 1rem;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .avatar {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      margin-right: 1rem;
    }
    .info h3 {
      margin: 0 0 0.5rem 0;
      color: #333;
    }
    .info p {
      margin: 0 0 0.5rem 0;
      color: #666;
      font-size: 0.9rem;
    }
    .status {
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: bold;
    }
    .status.online {
      background: #d4edda;
      color: #155724;
    }
    .status.offline {
      background: #f8d7da;
      color: #721c24;
    }
  `
};

const dashboardConfig: SSRComponentConfig<{
  title: string;
  widgets: Array<{ id: number; name: string; value: number }>;
  totalValue: number;
}> = {
  tag: 'dashboard',
  state: {
    title: 'Analytics Dashboard',
    widgets: [
      { id: 1, name: 'Users', value: 1234 },
      { id: 2, name: 'Revenue', value: 56789 },
      { id: 3, name: 'Orders', value: 432 }
    ],
    get totalValue() {
      return this.widgets.reduce((sum, w) => sum + w.value, 0);
    }
  },
  template: (state) => `
    <div class="dashboard">
      <h1>${state.title}</h1>
      <div class="widgets">
        ${state.widgets.map(widget => `
          <div class="widget">
            <h3>${widget.name}</h3>
            <div class="value">${widget.value.toLocaleString()}</div>
          </div>
        `).join('')}
      </div>
      <div class="summary">
        Total: ${state.totalValue.toLocaleString()}
      </div>
    </div>
  `,
  style: `
    .dashboard {
      padding: 2rem;
      font-family: system-ui, sans-serif;
    }
    .widgets {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin: 2rem 0;
    }
    .widget {
      padding: 1.5rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 8px;
      text-align: center;
    }
    .widget h3 {
      margin: 0 0 1rem 0;
      font-size: 1rem;
      opacity: 0.9;
    }
    .value {
      font-size: 2rem;
      font-weight: bold;
    }
    .summary {
      text-align: center;
      font-size: 1.2rem;
      font-weight: bold;
      color: #333;
    }
  `
};

// Render multiple components with shared context
const { html, styles, context } = renderComponentsToString([
  userCardConfig,
  dashboardConfig
], {
  includeStyles: false, // We'll include styles separately
  prettyPrint: true
});

const hydrationScript = generateHydrationScript(context);

// Complete HTML page
const fullPage = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SSR Demo</title>
  <style>
    body {
      margin: 0;
      padding: 2rem;
      background: #f5f5f5;
      font-family: system-ui, sans-serif;
    }
    ${styles}
  </style>
</head>
<body>
  <h1>Server-Side Rendered Components</h1>
  ${html}
  
  <!-- Hydration script for client-side takeover -->
  ${hydrationScript}
  
  <!-- Your client-side JavaScript -->
  <script type="module" src="/main.js"></script>
</body>
</html>
`;

// In a real server (Express, Fastify, etc.)
export function handleSSR(req: any, res: any) {
  res.setHeader('Content-Type', 'text/html');
  res.send(fullPage);
}
```

## 📖 Runtime API Reference

See [`src/lib/runtime.ts`](src/lib/runtime.ts) for full API docs and advanced usage.

### Core Function

```typescript
component<T extends ComponentState>(config: ComponentConfig<T>): void
```

### Component Configuration

```typescript
interface ComponentConfig<T> {
  tag: string;                    // Custom element tag name
  state: T;                       // Initial state object
  template: (state: T, api: ComponentAPI<T>) => string;
  style?: string | ((state: T) => string);     // CSS styles
  refs?: Record<string, RefHandler<T>>;         // DOM element refs
  onMounted?: (state: T, api: ComponentAPI<T>) => void;
  onUnmounted?: (state: T, api: ComponentAPI<T>) => void;
  onError?: (error: Error, state: T, api: ComponentAPI<T>) => void; // Error boundary
}
```

### Component API

```typescript
interface ComponentAPI<T> {
  readonly state: T;              // Reactive state proxy
  emit(eventName: string, detail?: any): void;
  update(changes: Partial<T>): void;
  updateKey<K extends keyof T>(key: K, value: T[K]): void;
  onGlobal<U = any>(eventName: string, handler: (data: U) => void): () => void;
  offGlobal<U = any>(eventName: string, handler: (data: U) => void): void;
  emitGlobal<U = any>(eventName: string, data?: U): void;
}
```

### SSR Functions

```typescript
// Render single component to HTML string
renderToString<T>(config: SSRComponentConfig<T>, options?: SSRRenderOptions): string;

// Render multiple components with shared context
renderComponentsToString(components: SSRComponentConfig<any>[], options?: SSRRenderOptions): {
  html: string;
  styles: string;
  context: SSRContext;
};

// Generate hydration script for client-side takeover
generateHydrationScript(context: SSRContext): string;
```

### Template Helpers

```typescript
// Template literal tags for syntax highlighting
html(strings: TemplateStringsArray, ...values: any[]): string;
css(strings: TemplateStringsArray, ...values: any[]): string;

// Compile-time optimized template literal
compile<T = any>(strings: TemplateStringsArray, ...expressions: Array<(state: T, api: any) => unknown>): CompiledTemplate<T>;

// Utility functions
classes(obj: Record<string, boolean>): string;
styles(obj: Record<string, string | number>): string;
```

### Global State & Events

```typescript
// Event bus
emit<T = any>(eventName: string, data?: T): void;
on<T = any>(eventName: string, handler: (data: T) => void): () => void;
once<T = any>(eventName: string, handler: (data: T) => void): Promise<T>;

// Global store
class Store<T extends object> {
  constructor(initial: T);
  subscribe(listener: (state: T) => void): void;
  getState(): T;
}
```

## How and When to Use Template Helpers

### Template Helper Usage Overview

#### 1. Plain String Literals

Use for very simple, static templates with no dynamic values or logic. Fastest and smallest code.

```typescript
component({
  tag: 'static-banner',
  template: '<div class="banner">Welcome!</div>'
});
```

**Use when:**
- Template is short and static
- No dynamic values or logic
- Absolute minimal code is desired

#### 2. `html` and `css` Helpers

Use for multi-line, readable templates and styles. Provides syntax highlighting and editor support. Ideal for most components.

```typescript
import { html, css } from './lib/template-helpers.ts';

component({
  tag: 'fancy-card',
  state: { title: 'Card Title' },
  template: (state) => html`
    <div class="card">
      <h2>${state.title}</h2>
    </div>
  `,
  styles: css`
    .card { padding: 1rem; border-radius: 8px; background: #fff; }
    h2 { color: #333; }
  `
});
```

**Use when:**
- Template is simple or moderate in complexity
- Readability and maintainability are priorities
- You want editor syntax highlighting

#### 3. `compile` Helper

Use for advanced, performance-critical templates. Parses and optimizes DOM structure at definition time for faster updates and lower runtime overhead.

```typescript
import { compile } from './lib/runtime.ts';

component({
  tag: 'super-list',
  state: { items: ['A', 'B', 'C'] },
  template: (state) => compile`
    <ul>
      ${state.items.map(item => `<li>${item}</li>`).join('')}
    </ul>
  `
});
```

**Use when:**
- Template is large or complex with many dynamic regions
- Maximum runtime performance is needed
- Fine-grained DOM updates and caching are desired

### Comparison & Best Practices

- Use `html` for most templates; it's simple, readable, and flexible.
- Use `compile` only when profiling shows a real performance benefit for large or complex templates.
- Use a plain string literal for static, minimal templates.

#### Why not always use `compile`?
- Adds overhead for template analysis and caching, unnecessary for simple/static templates.
- Less flexible for highly dynamic or programmatically generated templates.
- `html` is easier to debug and more flexible for changing template structures.

### SSR Compatibility

Both `html` and `compile` templates work seamlessly with server-side rendering (SSR) in the runtime. SSR functions like `renderToString` and `renderComponentsToString` will handle either approach correctly.

### Nesting and Composition

You can nest `html` and `compile` calls within template expressions for modularity, but only the outermost helper determines parsing/optimization. Avoid deep nesting for performance-critical templates; prefer a single top-level `compile` for best optimization.

```typescript
const itemTemplate = html`<li>${item}</li>`;
component({
  tag: 'item-list',
  state: { items: ['A', 'B', 'C'] },
  template: (state) => compile`
    <ul>
      ${state.items.map(item => itemTemplate).join('')}
    </ul>
  `
});
```

#### Utility Helpers: `classes` and `styles`

Use for dynamic class and style generation. Conditionally apply classes or inline styles based on component state.

```typescript
import { classes, styles } from './lib/template-helpers.ts';

template: (state) => `
  <button
    class="${classes({ active: state.isActive, disabled: state.isDisabled })}"
    style="${styles({ color: state.color, fontSize: state.size + 'px' })}"
  >Click Me</button>
`
```

**Use when:**
- Clean, maintainable dynamic class/style logic is needed
- Especially useful in interactive or stateful components

## 🔥 Advanced Features

### Global State Management

```typescript
import { Store } from './lib/runtime.ts';

// Create global store
export const appStore = new Store({
  user: null,
  theme: 'light',
  notifications: []
});

// Use in components
component({
  tag: 'theme-toggle',
  state: { currentTheme: 'light' },
  onMount: (state) => {
    appStore.subscribe((globalState) => {
      state.currentTheme = globalState.theme;
    });
  },
  template: (state) => `
    <button data-ref="toggle">
      Current theme: ${state.currentTheme}
    </button>
  `,
  refs: {
    toggle: (el) => {
      el.addEventListener('click', () => {
        const store = appStore.getState();
        store.theme = store.theme === 'light' ? 'dark' : 'light';
      });
    }
  }
});
```

### Event Bus Communication

```typescript
import { emit, on } from './lib/runtime.ts';

// Component A emits events
component({
  tag: 'notification-sender',
  template: () => `<button data-ref="button">Send Notification</button>`,
  refs: {
    button: (el) => {
      el.addEventListener('click', () => {
        emit('show-notification', {
          message: 'Hello from Component A!',
          type: 'success'
        });
      });
    }
  }
});

// Component B listens to events
component({
  tag: 'notification-display',
  state: { notifications: [] },
  template: (state) => `
    <div class="notifications">
      ${state.notifications.map(n => `
        <div class="notification ${n.type}">${n.message}</div>
      `).join('')}
    </div>
  `,
  onMount: (state) => {
    on('show-notification', (notification) => {
      state.notifications.push(notification);
      setTimeout(() => {
        state.notifications = state.notifications.filter(n => n !== notification);
      }, 3000);
    });
  }
});
```

### Development Tools

## Hot Module Replacement (HMR)

The runtime supports hot-module replacement in development environments. When using Vite or similar tools, component definitions will update in place without requiring a full page reload. HMR is automatic and safe—custom elements are only defined once per tag.

## Error Boundaries

You can provide an `onError` handler in your `ComponentConfig` to catch and handle errors during rendering. This allows you to display fallback UI or log errors for diagnostics:

```typescript
component('my-component', {
  state: { ... },
  template: (state) => {
    // ...
    throw new Error('Something went wrong!');
  },
  onError: (error, state, api) => {
    api.emit('component-error', { error });
    // Optionally render fallback UI
  }
});
```
## Performance & Monitoring

```typescript
import { Performance, DevTools } from './lib/dev-tools.ts';

// Performance monitoring
const renderTime = Performance.measureRender('my-component', () => {
  // Component render logic
});

// Component inspection
const element = document.querySelector('my-component');
const inspection = DevTools.inspectComponent(element);
console.log('Component state:', inspection.state);

// State change tracking
DevTools.trackStateChanges(element, (changes) => {
  console.log('State updated:', changes);
});
```

## That's a Wrap!

**Ready to build lightning-fast, universal web components?** 🚀

Start with the minimal example above and gradually explore the advanced features as you need them. The runtime grows with your complexity!
