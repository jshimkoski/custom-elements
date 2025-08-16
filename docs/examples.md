# 📦 Examples

Quick and readable examples for common patterns.

---

## 👋 Hello World

```ts
component('hello-world', {
  state: { name: 'World' },
  template: (state) => html`<h1>Hello, ${state.name}!</h1>`()
});
```

```html
<hello-world></hello-world>
```

---

## 🚫 Stateless Component

```ts
component('stateless-demo', {
  template: () => html`<div>Pure view, no state!</div>`()
});
```

```html
<stateless-demo></stateless-demo>
```

---

## ➕ Simple Counter

```ts
component('simple-counter', {
  state: { count: 0 },
  template: (state) => html`
    <button data-on-click="increment">Count: ${state.count}</button>
  `(state),
  increment(_, state) {
    state.count++;
  }
});
```

```html
<simple-counter></simple-counter>
```

---

## 🔌 Plugin System

```ts
useRuntimePlugin({
  onInit: (config) => { /* global setup */ },
  onRender: (state, api) => { /* global logic */ },
  onError: (error, state, api) => { /* error handling */ }
});
```

---

## 🧭 Router Setup

```ts
const router = initRouter({
  routes: [
    { path: '/', component: 'home-page' },
    { path: '/about', component: 'about-page' }
  ]
});
```

---

## 🖥️ SSR Example

```ts
const html = renderToString({
  state: { title: 'SSR Example' },
  template: ({ title }) => html`<h1>${title}</h1>`({ title })
});

const matched = matchRouteSSR([
  { path: '/', component: 'home-page' }
], '/');
```

---

## ⚠️ Error Boundary

```ts
component('error-demo', {
  state: { fail: false },
  template: ({ fail }) => fail ? (() => { throw new Error('Oops!'); })() : `<div>All good</div>`,
  onError: (err) => `<div>Error: ${err.message}</div>`
});
```

---

## 📡 Global Store & Event Bus

```ts
const store = Store({ count: 0 });
store.subscribe((state) => { /* react to changes */ });

eventBus.on('my-event', (data) => { /* handle event */ });
```

---

## ✍️ Input Binding

```ts
component('input-demo', {
  state: { message: '' },
  template: ({ message }) => html`<input type="text" data-model="message" />`({ message }),
});
```

---

## ⏳ Async Template

```ts
component('async-demo', {
  state: {},
  template: async () => {
    const data = await fetch('/api/data').then(r => r.json());
    return `<div>Loaded: ${data.value}</div>`;
  }
});
```

---

## ⚡ Selective Hydration

```html
<div data-hydrate>
  <!-- Only this part hydrates -->
</div>
```

---

## 🔒 Focus Preservation

```ts
component('focus-demo', {
  state: { text: '' },
  template: (state) => html`
    <div>
      ${state.text}
      <input data-model="text" />
      <textarea data-model="text"></textarea>
    </div>
  `(state)
});
```

---

## ✅ Todo App (Full Example)

A complete, interactive Todo App using state, computed properties, dynamic styles, and lifecycle hooks.

```ts
component<TodoAppState, TodoAppComputed>('todo-app', {
  state: {
    todos: [
      { id: 1, text: 'Learn TypeScript', completed: true },
      { id: 2, text: 'Build components', completed: false },
      { id: 3, text: 'Deploy', completed: false }
    ],
    newTodo: '',
    filter: 'all'
  },
  computed: {
    filteredTodos: (s) => s.todos.filter(t =>
      s.filter === 'active' ? !t.completed :
      s.filter === 'completed' ? t.completed : true
    ),
    activeTodos: (s) => s.todos.filter(t => !t.completed),
    completedCount: (s) => s.todos.filter(t => t.completed).length
  },
  template: (state, api) => html`
    <div class="todo-app">
      <header>
        <h1>📝 Todo App</h1>
        <input
          class="new-todo"
          type="text"
          data-model="newTodo"
          data-on-keydown="handleKeydown"
          placeholder="What needs to be done?"
        >
      </header>
      <main>
        <div class="filters">
          <button class="${state.filter === 'all' ? 'active' : ''}" data-on-click="handleAllFilter">All (${state.todos.length})</button>
          <button class="${state.filter === 'active' ? 'active' : ''}" data-on-click="handleActiveFilter">Active (${state.activeTodos.length})</button>
          <button class="${state.filter === 'completed' ? 'active' : ''}" data-on-click="handleCompletedFilter">Completed (${state.completedCount})</button>
        </div>
        <ul class="todo-list">
          ${state.filteredTodos.map(todo => html`
            <li class="${todo.completed ? 'completed' : ''}" key="${todo.id}">
              <input type="checkbox" ${todo.completed ? 'checked' : ''} data-todo-id="${todo.id}" data-on-change="handleToggle">
              <span class="text">${todo.text}</span>
              <button class="delete" data-todo-id="${todo.id}" data-on-click="handleDelete">×</button>
            </li>
          `(state, api)).join('')}
        </ul>
      </main>
      <footer><small>${state.activeTodos.length} items left</small></footer>
    </div>
  `(state, api),
  style: css`
    .todo-app { max-width: 400px; margin: 2rem auto; font-family: system-ui; }
    .new-todo { width: 100%; padding: 0.75rem; }
    .filters { display: flex; gap: 0.5rem; margin: 1rem 0; }
    .filters button { flex: 1; padding: 0.5rem; }
    .filters button.active { background: #007bff; color: white; }
    .todo-list li { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 0; }
    .todo-list li.completed .text { text-decoration: line-through; color: #888; }
    .delete { background: #dc3545; color: white; border: none; border-radius: 50%; width: 24px; height: 24px; }
  `,
  handleKeydown(e, state, api) {
    if (e.key === 'Enter' && state.newTodo.trim()) {
      const id = Math.max(0, ...state.todos.map(t => t.id)) + 1;
      state.todos.push({ id, text: state.newTodo.trim(), completed: false });
      state.newTodo = '';
      api.emit('todo-added', { id });
    }
  },
  handleAllFilter(_, state) { state.filter = 'all'; },
  handleActiveFilter(_, state) { state.filter = 'active'; },
  handleCompletedFilter(_, state) { state.filter = 'completed'; },
  handleDelete(e, state, api) {
    const id = Number(e.target.getAttribute('data-todo-id'));
    state.todos = state.todos.filter(t => t.id !== id);
    api.emit('todo-removed', { id });
  },
  handleToggle(e, state, api) {
    const id = Number(e.target.getAttribute('data-todo-id'));
    state.todos = state.todos.map(t =>
      t.id === id ? { ...t, completed: e.target.checked } : t
    );
    api.emit('todo-toggled', { id });
  },
  onMounted(state, api) {
    console.log('📝 Todo App mounted');
    api.onGlobal?.('todo-toggled', (data) => {
      console.log('🔄 Todo toggled:', data);
    });
  }
});
```

---

## 🎨 Static Style

```ts
component('static-style-example', {
  template: () => `<div>Static</div>`,
  style: `div { color: blue; }`
});
```

---

## 🎨 Dynamic Style

```ts
component('dynamic-style-example', {
  state: { active: false },
  template: ({ active }) => html`<div>${active ? 'Active' : 'Inactive'}</div>`({ active }),
  style: (state) => `div { color: ${state.active ? 'green' : 'red'}; }`
});
```
