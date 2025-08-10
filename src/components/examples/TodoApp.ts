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
          value="${state.newTodo}"
          placeholder="What needs to be done?"
          class="new-todo"
          data-on-input="handleInput"
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
  // Event handler methods for automatic binding
  handleInput(e: Event, state: TodoAppState) {
    const input = e.target as HTMLInputElement;
    state.newTodo = input.value;
  },
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
