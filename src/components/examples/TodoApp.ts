import { component, html, css, type ComponentState } from '../../lib/runtime.ts';

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

component<TodoAppState>({
  tag: 'todo-app',
  
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
    filteredTodos: (state) => {
      switch (state.filter) {
        case 'active': return state.todos.filter(todo => !todo.completed);
        case 'completed': return state.todos.filter(todo => todo.completed);
        default: return state.todos;
      }
    },
    
    activeTodos: (state) => state.todos.filter(todo => !todo.completed),
    
    completedCount: (state) => state.todos.filter(todo => todo.completed).length
  },

  template: (state) => {
    // Access computed properties directly from state (they're in the proxy)
    const filteredTodos = (state as any).filteredTodos;
    const activeTodos = (state as any).activeTodos;
    const completedCount = (state as any).completedCount;

    return html`
    <div class="todo-app">
      <header>
        <h1>📝 Todo App</h1>
        <input 
          data-ref="newTodoInput"
          type="text" 
          value="${state.newTodo}"
          placeholder="What needs to be done?"
          class="new-todo"
        >
      </header>

      <main>
        <div class="filters">
          <button 
            data-ref="allFilter"
            class="${state.filter === 'all' ? 'active' : ''}"
          >
            All (${state.todos.length})
          </button>
          <button 
            data-ref="activeFilter"
            class="${state.filter === 'active' ? 'active' : ''}"
          >
            Active (${activeTodos.length})
          </button>
          <button 
            data-ref="completedFilter"
            class="${state.filter === 'completed' ? 'active' : ''}"
          >
            Completed (${completedCount})
          </button>
        </div>

        <ul class="todo-list" data-ref="todoList">
          ${filteredTodos.map((todo: Todo) => html`
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
          ${activeTodos.length} item${activeTodos.length !== 1 ? 's' : ''} left
        </small>
      </footer>
    </div>
    `;
  },

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

  onMount: () => {
    console.log('📝 Todo App mounted');
  }
});
