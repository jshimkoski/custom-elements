## 🧩 Extensibility: Plugin System

You can extend the runtime with plugins for logging, analytics, debugging, or custom lifecycle hooks:

```typescript
import { useRuntimePlugin } from './lib/runtime';

useRuntimePlugin({
  onRender(state, api) {
    // Custom logic on every render
    console.log('Component rendered:', state);
  },
  onError(error, state, api) {
    // Custom error handling
    alert('Component error: ' + error.message);
  }
});
```

## 📝 State Management: Direct Assignment

Update state directly for reactivity and ease of use:

```typescript
state.count += 1;
state.name = 'Alice';
```
No need to use `api.update` or `api.updateKey`—just assign to state properties.

## 🛠️ Error Boundaries & Diagnostics

Error boundaries catch render errors and allow fallback UI or custom handling:

```typescript
component('my-component', {
  // ...
  onError(error, state, api) {
    // Custom fallback logic
    state.hasError = true;
  }
});
```

## 🪶 Modularization & Tree-Shaking

Import only the features you need. SSR, hydration, and DOM diffing are modular and tree-shakable.

## ✅ Best Practices

- Use direct assignment for state updates
- Use plugins for extensibility (`useRuntimePlugin`)
- Modularize SSR, hydration, and DOM diffing for tree-shaking
- Remove unused legacy APIs for minimal footprint
- Use error boundaries and plugin hooks for robust error handling
# Custom Elements Runtime

> **A modern, ultra-lightweight TypeScript runtime for building fast, reactive, and maintainable web components.**

## ✨ Features
- **Reactive State:** ES6 Proxy-based state triggers automatic re-renders; direct assignment is fully supported.
- **Template Functions:** Use plain functions, tagged helpers (`html`, `compile`), or async Promises for templates.
- **Refs System:** Direct DOM access via `refs` with single-attach event logic; no complex selectors needed.
- **Computed Properties:** Use the `computed` property for derived, reactive values.
- **Automatic Event Binding:** Declarative event handlers via `data-on-*` attributes; only one handler per event type per element, with automatic cleanup on rerender.
- **Controlled Input Sync:** Inputs with `data-model` stay in sync with state, supporting modifiers like `trim` and `number`; user typing always wins over state updates.
- **SSR & Hydration:** Universal rendering and opt-in hydration via the `hydrate` property; templates must match for hydration.
- **Error Boundaries:** Optional `onError` handler for fallback UI and diagnostics.
- **Global State & Event Bus:** Built-in store and event bus for cross-component communication and shared state.
- **Devtools & Performance Monitoring:** Inspect components, track state changes, and measure render performance in development.
- **Focus Preservation:** Input, textarea, and select fields retain focus and selection during updates.
- **Smart DOM Batching:** State-triggered renders are batched via requestAnimationFrame for optimal performance.
- **Strict TypeScript:** Type-safe, developer-friendly, zero dependencies.
- **Tree-shakable & Modular:** Import only what you use; no external dependencies.
- **Functional API:** One function, no classes.

### Limitations & Edge Cases
- Templates must have a single root node.
- Fragment templates are supported, but reconciliation is strict and positional; use keys for robust updates.
- Only one event handler per event type per element is attached; previous handlers are removed on rerender.
- Controlled input sync prioritizes user typing (focused/dirty inputs) over state updates.
- SSR hydration is opt-in via the `hydrate` property; fallback hydrates the entire shadow root if no region is marked.
- All user-generated content is escaped in templates using `html` and `compile` helpers; static HTML is not escaped.
- Only features documented here and in `src/lib/runtime.ts` are supported; undocumented features may not work as expected.

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
- **Fine-grained DOM diffing**: Only changed DOM nodes are updated, not replaced, for optimal performance and UX
- **Async rendering**: Supports Promises in templates for async data and UI
- **Selective hydration**: Hydrate only regions marked with `data-hydrate` for efficient SSR

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
  increment(_e, state) {
    state.count++;
  }
});
```

```html
<simple-counter></simple-counter>
```

### Async Rendering Example

```typescript
import { component } from './lib/runtime.ts';

component('async-demo', {
  state: {},
  template: async () => {
    const data = await fetch('/api/data').then(r => r.json());
    return `<div>Loaded: ${data.value}</div>`;
  }
});
```

### Selective Hydration Example

```html
<div data-hydrate>
  <!-- Only this region will be hydrated on the client -->
</div>
```

### Focus Preservation Example

```typescript
// Typing in either field will preserve focus and cursor position
component('focus-demo', {
  state: { text: '' },
  template: (state) => `
    ${state.text}
    <input type="text" data-model="text" />
    <textarea data-model="text"></textarea>
  `
});
```

### Todo App Example

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
}

interface TodoAppComputed {
  filteredTodos: Todo[];
  activeTodos: Todo[];
  completedCount: number;
}

component<TodoAppState, TodoAppComputed>('todo-app', {
  state: {
    todos: [
      { id: 1, text: 'Learn TypeScript', completed: true },
      { id: 2, text: 'Build awesome components', completed: false },
      { id: 3, text: 'Ship to production', completed: false }
    ],
    newTodo: '',
    filter: 'all'
  },
  computed: {
    filteredTodos: (state: TodoAppState) => state.todos.filter((todo: Todo) => {
      if (state.filter === 'active') return !todo.completed;
      if (state.filter === 'completed') return todo.completed;
      return true;
    }),
    activeTodos: (state: TodoAppState) => state.todos.filter((todo: Todo) => !todo.completed),
    completedCount: (state: TodoAppState) => state.todos.filter((todo: Todo) => todo.completed).length
  },
  template: (state, api) => html`
    <div class="todo-app">
      <header>
        <h1>📝 Todo App</h1>
        <input 
          type="text" 
          data-model="newTodo"
          placeholder="What needs to be done?"
          class="new-todo"
          data-on-keydown="handleKeydown"
        >
      </header>
      <main>
        <div class="filters">
          <button
            class="${state.filter === 'all' ? 'active' : ''}"
            data-on-click="handleAllFilter"
          >
            All (${state.todos.length})
          </button>
          <button 
            class="${state.filter === 'active' ? 'active' : ''}"
            data-on-click="handleActiveFilter"
          >
            Active (${state.activeTodos.length})
          </button>
          <button 
            class="${state.filter === 'completed' ? 'active' : ''}"
            data-on-click="handleCompletedFilter"
          >
            Completed (${state.completedCount})
          </button>
        </div>
        <ul class="todo-list">
          ${state.filteredTodos.map((todo: Todo) => html`
            <li key="${todo.id}" class="${todo.completed ? 'completed' : ''}">
              <input 
                type="checkbox" 
                ${todo.completed ? 'checked' : ''}
                data-todo-id="${todo.id}"
                data-action="toggle"
                data-on-change="handleToggle"
              >
              <span class="text">${todo.text}</span>
              <button 
                class="delete"
                data-todo-id="${todo.id}"
                data-action="delete"
                data-on-click="handleDelete"
              >
                ×
              </button>
            </li>
          `(state, api)).join('')}
        </ul>
      </main>
      <footer>
        <small>
          ${state.activeTodos.length} items left
        </small>
      </footer>
    </div>
  `(state, api),
  style: css`
    .todo-app {
      max-width: 400px;
      margin: 2rem auto;
      padding: 1rem;
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
  handleKeydown(e: Event, state: TodoAppState, api: any) {
    if ('key' in e && (e as KeyboardEvent).key === 'Enter' && state.newTodo.trim()) {
      const newId = Math.max(0, ...state.todos.map((t: Todo) => t.id)) + 1;
      const todoText = state.newTodo.trim();
      state.newTodo = ''; // Clear input after adding
      state.todos.push({
        id: newId,
        text: todoText,
        completed: false
      });
      api.emit('todo-added', { id: newId, text: todoText });
    }
  },
  handleAllFilter(_e: Event, state: TodoAppState) {
    state.filter = 'all';
  },
  handleActiveFilter(_e: Event, state: TodoAppState) {
    state.filter = 'active';
  },
  handleCompletedFilter(_e: Event, state: TodoAppState) {
    state.filter = 'completed';
  },
  handleDelete(e: Event, state: TodoAppState, api: any) {
    const target = e.target as HTMLElement;
    const todoId = parseInt(target.getAttribute('data-todo-id') || '0');
    state.todos = state.todos.filter((t: Todo) => t.id !== todoId);
    api.emit('todo-removed', { id: todoId });
  },
  handleToggle(e: Event, state: TodoAppState, api: any) {
    const target = e.target as HTMLInputElement;
    const todoId = parseInt(target.getAttribute('data-todo-id') || '0');
    state.todos = state.todos.map((t: Todo) =>
      t.id === todoId ? { ...t, completed: target.checked } : t
    );
    api.emit('todo-toggled', { id: todoId, completed: target.checked });
  },
  onMounted: (state, api) => {
    console.log('📝 Todo App mounted', state);
    // Subscribe to global event using runtime API
    api.onGlobal?.('todo-toggled', (data: any) => {
      console.log('🔄 Todo toggled:', data);
    });
  }
});
```

## 🎯 Framework Comparison Details

| Feature                | Custom Elements Runtime | React   | Vue     | Angular | Svelte  | Lit     |
|------------------------|------------------------|---------|---------|---------|---------|---------|
| **Bundle Size**        | ~8KB (runtime only)    | ~45KB+  | ~35KB+  | ~60KB+  | ~10KB+  | ~7KB+   |
| **SSR**                | Built-in (HTML, styles, hydration) | Yes     | Yes     | Yes     | Yes     | Yes     |
| **TypeScript**         | Strict, enforced       | Optional| Optional| Strict  | Optional| Strict  |
| **State Mgmt**         | Direct assignment, Store, Event Bus | Redux   | Pinia   | RxJS    | Store   | Manual  |
| **Routing**            | Manual (userland)      | React Router | Vue Router | Angular Router | SvelteKit| Manual  |
| **HMR**                | Built-in (Vite, etc.)  | Yes     | Yes     | Yes     | Yes     | Yes     |
| **Error Boundaries**   | Built-in (onError)     | Yes     | Yes     | Yes     | Yes     | Manual  |
| **Learning Curve**     | Low                    | Medium  | Medium  | High    | Medium  | Low     |
| **Event Binding**      | Declarative (`data-on-*`) | JSX     | v-on    | (ng)    | on:     | @event  |
| **Reactivity**         | ES6 Proxy, computed, direct assignment | setState| Proxy   | Zone.js | Compiler| LitElement|
| **Dependencies**       | None                   | Many    | Some    | Many    | None    | None    |
| **SSR Hydration**      | Opt-in, seamless if templates match | Yes     | Yes     | Yes     | Yes     | Yes     |
| **Tree-shaking**       | Yes (modular)          | Partial | Partial | Partial | Yes     | Yes     |
| **Custom Elements**    | Native, standards-based| No      | No      | No      | No      | Yes     |
| **DevTools**           | Minimal (runtime only) | Advanced| Advanced| Advanced| Basic   | Basic   |

### Key Strengths of Custom Elements Runtime
- **Smallest bundle size**: ~8KB, zero dependencies, tree-shakable
- **Direct DOM updates**: No virtual DOM, fastest rendering
- **Strict TypeScript**: Type-safe by default, no config required
- **SSR & Hydration**: Universal rendering, opt-in hydration, seamless client takeover if templates match
- **Declarative event binding**: `data-on-*` attributes, no manual listeners
- **Functional API**: No classes, easy onboarding
- **Built-in error boundaries, HMR, and global event bus**
- **Native Custom Elements**: Standards-based, interoperable

### Weaknesses / Tradeoffs
- Smaller ecosystem, fewer plugins/integrations
- Manual state management (no context API, no built-in router, forms, or animation system)
- Minimal devtools and CLI support
- SSR does not support refs, event listeners, or lifecycle hooks during server rendering

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
    fullName: (state: ComponentState) => `${state.firstName} ${state.lastName}`,
    isValid: (state: ComponentState) => state.email.includes('@') && state.password.length >= 8
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
      <input data-model="name" type="text">
      <button type="submit" data-on-click="handleSubmit">Submit</button>
    </form>
  `,
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

**SSR Support:**
- Use `renderToString`, `renderComponentsToString`, and `generateHydrationScript` from `src/lib/runtime.ts` for server-side rendering and hydration.
- Hydration is opt-in via the `hydrate` property in your component config. If no region is marked, the entire shadow root is hydrated.
- SSR templates must match client templates for correct hydration.

Complete SSR example with hydration (using helpers):

```typescript
// server-example.js (or .ts)
import {
  renderToString,
  renderComponentsToString,
  generateHydrationScript,
  compile,
  css,
  type SSRComponentConfig
} from './src/lib/runtime.ts';

const userCardConfig: SSRComponentConfig<{ name: string; email: string; avatar: string; isOnline: boolean }> = {
  state: {
    name: 'John Doe',
    email: 'john@example.com',
    avatar: 'https://via.placeholder.com/80x80',
    isOnline: true
  },
  template: compile(({ name, email, avatar, isOnline }) => `
    <div class="user-card">
      <img src="${avatar}" alt="${name}" class="avatar" />
      <div class="info">
        <h3>${name}</h3>
        <p>${email}</p>
        <span class="status ${isOnline ? 'online' : 'offline'}">
          ${isOnline ? 'Online' : 'Offline'}
        </span>
      </div>
    </div>
  `),
  style: css`
    .user-card { display: flex; align-items: center; padding: 1rem; border: 1px solid #e0e0e0; border-radius: 8px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .avatar { width: 60px; height: 60px; border-radius: 50%; margin-right: 1rem; }
    .info h3 { margin: 0 0 1rem 0; color: #333; }
    .info p { margin: 0 0 0.5rem 0; color: #666; font-size: 0.9rem; }
    .status { padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.8rem; font-weight: bold; }
    .status.online { background: #d4edda; color: #155724; }
    .status.offline { background: #f8d7da; color: #721c24; }
  `
};

const dashboardConfig: SSRComponentConfig<{ title: string; widgets: Array<{ id: number; name: string; value: number }> }> = {
  state: {
    title: 'Analytics Dashboard',
    widgets: [
      { id: 1, name: 'Users', value: 1234 },
      { id: 2, name: 'Revenue', value: 56789 },
      { id: 3, name: 'Orders', value: 432 }
    ]
  },
  template: compile(({ title, widgets }) => `
    <div class="dashboard">
      <h1>${title}</h1>
      <div class="widgets">
        ${widgets.map(widget => `
          <div class="widget">
            <h3>${widget.name}</h3>
            <div class="value">${widget.value.toLocaleString()}</div>
          </div>
        `).join('')}
      </div>
      <div class="summary">
        Total: ${widgets.reduce((sum, w) => sum + w.value, 0).toLocaleString()}
      </div>
    </div>
  `),
  style: css`
    .dashboard { padding: 2rem; font-family: system-ui, sans-serif; }
    .widgets { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 2rem 0; }
    .widget { padding: 1.5rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px; text-align: center; }
    .widget h3 { margin: 0 0 1rem 0; font-size: 1rem; opacity: 0.9; }
    .value { font-size: 2rem; font-weight: bold; }
    .summary { text-align: center; font-size: 1.2rem; font-weight: bold; color: #333; }
  `
};

const { html, styles, context } = renderComponentsToString([
  userCardConfig,
  dashboardConfig
], {
  includeStyles: false,
  prettyPrint: true
});

const hydrationScript = generateHydrationScript(context);

const fullPage = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SSR Demo</title>
  <style>
    body { margin: 0; padding: 2rem; background: #f5f5f5; font-family: system-ui, sans-serif; }
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

// Example server handler (Express, Fastify, etc.)
export function handleSSR(req: any, res: any) {
  res.setHeader('Content-Type', 'text/html');
  res.send(fullPage);
}
```

## 📖 Runtime API Reference

See [`src/lib/runtime.ts`](src/lib/runtime.ts) for full API docs and advanced usage.

**Only the documented API is supported. If a feature is not listed here or in `src/lib/runtime.ts`, it is not guaranteed to work.**

### Component Configuration

```typescript
export interface ComponentConfig<S extends ComponentState, C extends Record<string, any> = {}> {
  template: (state: S & C, api: ComponentAPI<S & C>) => string | Promise<string> | CompiledTemplate<S & C>;
  state: S;
  computed?: { [K in keyof C]: (state: S) => C[K] };
  style?: string | ((state: S & C) => string);
  refs?: Record<string, RefHandler<S & C>>;
  onMounted?: LifecycleHandler<S & C>;
  onUnmounted?: LifecycleHandler<S & C>;
  onError?: (error: Error, state: S & C, api: ComponentAPI<S & C>) => void;
  [handler: string]: any; // Event handlers for data-on-*
}
```

**Notes:**
- All event handlers (for `data-on-*` and `refs`) must be defined on the config object.
- Only one event handler per event type per element is attached; previous handlers are removed on rerender.
- `computed` is for derived, reactive values.

### Component API

```typescript
export interface ComponentAPI<T extends ComponentState = ComponentState> {
  readonly state: T;
  emit(eventName: string, detail?: unknown): void;
  onGlobal<U = any>(eventName: string, handler: (data: U) => void): () => void;
  offGlobal<U = any>(eventName: string, handler: (data: U) => void): void;
  emitGlobal<U = any>(eventName: string, data?: U): void;
}
```

### Plugin System

```typescript
export function useRuntimePlugin<S extends ComponentState, C extends Record<string, any>>(
  plugin: {
    onInit?: (config: ComponentConfig<S, C>) => void;
    onRender?: (state: S & C, api: ComponentAPI<S & C>) => void;
    onError?: (error: Error, state: S & C, api: ComponentAPI<S & C>) => void;
  }
): void;
```

### SSR Functions

```typescript
renderToString<T>(config: SSRComponentConfig<T>, options?: SSRRenderOptions): string;
renderComponentsToString(components: SSRComponentConfig<any>[], options?: SSRRenderOptions): {
  html: string;
  styles: string;
  context: SSRContext;
};
generateHydrationScript(context: SSRContext): string;
```

### Template Helpers

```typescript
html(strings: TemplateStringsArray, ...values: any[]): string;
css(strings: TemplateStringsArray, ...values: any[]): string;
compile<T = any>(strings: TemplateStringsArray, ...expressions: Array<(state: T, api: any) => unknown>): CompiledTemplate<T>;
classes(obj: Record<string, boolean>): string;
styles(obj: Record<string, string | number>): string;
```

### Event Bus & Store

```typescript
emit<T = any>(eventName: string, data?: T): void;
on<T = any>(eventName: string, handler: (data: T) => void): () => void;
once<T = any>(eventName: string, handler: (data: T) => void): Promise<T>;

class Store<T extends object> {
  constructor(initial: T);
  subscribe(listener: (state: T) => void): void;
  getState(): T;
}
```

### Types

```typescript
export interface ComponentState extends Record<string, unknown> {}
export type RefHandler<T extends ComponentState> = (
  element: Element,
  state: T,
  api: ComponentAPI<T>
) => void;
export type LifecycleHandler<T extends ComponentState> = (
  state: T,
  api: ComponentAPI<T>
) => void;
export type CompiledTemplate<S extends ComponentState = ComponentState> = {
  id: string;
  render: (state: S, api: ComponentAPI<S>) => DocumentFragment;
};
```

## 🧩 Advanced Use Cases

The runtime supports advanced component patterns for scalable, maintainable apps:

- **Computed Properties**: Use the `computed` field for derived, reactive state.
- **Refs**: Attach refs via the `refs` field for direct DOM access and imperative logic.
- **Lifecycle Hooks**: Use `onMounted` and `onUnmounted` for setup/teardown logic.
- **Error Boundaries**: Handle errors with `onError` for robust components.
- **Async Templates**: Return a Promise from `template` for async rendering.
- **Plugin System**: Extend runtime behavior with `useRuntimePlugin`.
- **Custom Event Handlers**: Define any number of event handlers directly on the config object, mapped to `data-on-*` attributes.

### Example: Advanced Component

```typescript
import { component, html, css, compile, type ComponentAPI } from './lib/runtime.ts';

component('advanced-demo', {
  state: { count: 0 },
  computed: {
    doubled: (state) => state.count * 2
  },
  template: compile(({ count, doubled }, api) => html`
    <div>
      <button data-on-click="increment">
        Count: ${count} (Doubled: ${doubled})
      </button>
    </div>
  `),
  style: css`
    button { font-size: 1.2rem; padding: 0.5rem 1rem; }
  `,
  increment(_e, state) {
    state.count++;
  },
  onMounted(state, api) {
    console.log('Mounted!', state);
  },
  onUnmounted(state, api) {
    console.log('Unmounted!', state);
  },
  onError(error, state, api) {
    console.error('Component error:', error);
  }
});
```

### Example: Async Template

```typescript
component('async-advanced', {
  state: { loading: true, data: null },
  template: async (state) => {
    if (state.loading) {
      const data = await fetch('/api/data').then(r => r.json());
      state.data = data;
      state.loading = false;
    }
    return `<div>Loaded: ${state.data ? state.data.value : '...'}</div>`;
  }
});
```

### Example: Plugin Usage

```typescript
import { useRuntimePlugin } from './lib/runtime.ts';

useRuntimePlugin({
  onInit: (config) => {
    // Add analytics, logging, etc.
  },
  onRender: (state, api) => {
    // Custom render logic
  },
  onError: (error, state, api) => {
    // Global error handling
  }
});
```

**See [`src/lib/runtime.ts`](src/lib/runtime.ts) for full API docs and advanced usage.**
