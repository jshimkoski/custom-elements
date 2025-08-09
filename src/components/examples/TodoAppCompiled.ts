import { component, css, type ComponentState } from '../../lib/runtime';
import { compile } from '../../lib/runtime';
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

const initialState: TodoAppState = {
  todos: [
    { id: 1, text: 'Learn TypeScript', completed: true },
    { id: 2, text: 'Build awesome components', completed: false },
    { id: 3, text: 'Ship to production', completed: false }
  ],
  newTodo: '',
  filter: 'all'
};

const computedMap = {
  filteredTodos: (state: TodoAppState) => state.todos.filter((todo: Todo) => {
    if (state.filter === 'active') return !todo.completed;
    if (state.filter === 'completed') return todo.completed;
    return true;
  }),
  activeTodos: (state: TodoAppState) => state.todos.filter((todo: Todo) => !todo.completed),
  completedCount: (state: TodoAppState) => state.todos.filter((todo: Todo) => todo.completed).length
};

const compiledTemplate = compile`
  <div class="todo-app">
    <header>
      <h1>📝 Todo App</h1>
      <input 
        data-ref="newTodoInput"
        type="text" 
        value="${(state: TodoAppState) => state.newTodo}"
        placeholder="What needs to be done?"
        class="new-todo"
      >
    </header>
    <main>
      <div class="filters">
        <button 
          data-ref="allFilter"
          class="${(state: TodoAppState) => state.filter === 'all' ? 'active' : ''}"
        >
          All (${(state: TodoAppState) => state.todos.length})
        </button>
        <button 
          data-ref="activeFilter"
          class="${(state: TodoAppState) => state.filter === 'active' ? 'active' : ''}"
        >
          Active (${(state: TodoAppState) => (state.activeTodos as Todo[]).length})
        </button>
        <button 
          data-ref="completedFilter"
          class="${(state: TodoAppState) => state.filter === 'completed' ? 'active' : ''}"
        >
          Completed (${(state: TodoAppState) => state.completedCount})
        </button>
      </div>
      <ul class="todo-list" data-ref="todoList">
  ${(state: TodoAppState) => (state.filteredTodos as Todo[]).map((todo: Todo) => `
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
  ${(state: TodoAppState) => (state.activeTodos as Todo[]).length} items left
      </small>
    </footer>
  </div>
`;

component<TodoAppState, TodoAppComputed>('todo-app-compiled', {
  state: initialState,
  computed: computedMap,
  template: () => compiledTemplate,
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
  refs: {
    newTodoInput: (element: Element, state, api) => {
      const input = element as HTMLInputElement;
      input.addEventListener('input', () => {
        api.updateKey('newTodo', input.value);
      });
      input.addEventListener('keydown', (e: Event) => {
        if ('key' in e && (e as KeyboardEvent).key === 'Enter' && state.newTodo.trim()) {
          const newId = Math.max(0, ...state.todos.map((t: Todo) => t.id)) + 1;
          const todoText = state.newTodo.trim();
          api.update({
            todos: [...state.todos, {
              id: newId,
              text: todoText,
              completed: false
            }],
            newTodo: ''
          });
          input.value = '';
          api.emit('todo-added', { id: newId, text: todoText });
        }
      });
    },
    allFilter: (element: Element, _state, api) => {
      element.addEventListener('click', () => {
        api.updateKey('filter', 'all');
      });
    },
    activeFilter: (element: Element, _state, api) => {
      element.addEventListener('click', () => {
        console.log('Active filter clicked before:', _state, 'state ref:', _state);
        api.updateKey('filter', 'active');
        console.log('Active filter clicked after:', _state, 'state ref:', _state);
      });
    },
    completedFilter: (element: Element, _state, api) => {
      element.addEventListener('click', () => {
        api.updateKey('filter', 'completed');
      });
    },
    todoList: (element: Element, state, api) => {
      element.addEventListener('click', (e: Event) => {
        const target = e.target as HTMLElement;
        const todoId = parseInt(target.getAttribute('data-todo-id') || '0');
        const action = target.getAttribute('data-action');
        if (action === 'delete') {
          api.updateKey('todos', state.todos.filter((t: Todo) => t.id !== todoId));
          api.emit('todo-removed', { id: todoId });
        }
      });
      element.addEventListener('change', (e: Event) => {
        const target = e.target as HTMLInputElement;
        const todoId = parseInt(target.getAttribute('data-todo-id') || '0');
        const action = target.getAttribute('data-action');
        if (action === 'toggle') {
          api.updateKey('todos', state.todos.map((t: Todo) =>
            t.id === todoId ? { ...t, completed: target.checked } : t
          ));
          api.emit('todo-toggled', { id: todoId, completed: target.checked });
        }
      });
    }
  },
  onMounted: (state) => {
    console.log('📝 Todo App mounted', state);
  }
});
