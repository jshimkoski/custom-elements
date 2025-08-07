// Ultra-simple examples showing the new ergonomic API
import { component, html, css, classes } from '../lib/easy.js';

// 1. Dead simple counter - easier than React
type CounterState = {
  count: number;
};

const Counter = component<CounterState>('simple-counter')({
  state: { count: 0 },
  
  template: (state) => html`
    <button>Count: ${state.count}</button>
  `,
  
  events: {
    'button': {
      click: (_e, state) => state.count++
    }
  },
  
  style: css`
    button {
      padding: 1rem 2rem;
      font-size: 1.2rem;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    button:hover {
      background: #0056b3;
      transform: translateY(-1px);
    }
  `
});

// 2. Todo app - simpler than Vue or Svelte
type TodoState = {
  todos: Array<{ id: number; text: string; done: boolean }>;
  newTodo: string;
  filter: 'all' | 'active' | 'completed';
  // Computed properties (will be available at runtime)
  filteredTodos?: Array<{ id: number; text: string; done: boolean }>;
  todoCount?: number;
};

const TodoApp = component<TodoState>('todo-app')({
  state: {
    todos: [],
    newTodo: '',
    filter: 'all'
  },
  
  computed: {
    filteredTodos: (state) => {
      switch (state.filter) {
        case 'active': return state.todos.filter(t => !t.done);
        case 'completed': return state.todos.filter(t => t.done);
        default: return state.todos;
      }
    },
    todoCount: (state) => state.todos.filter(t => !t.done).length
  },

  template: (state) => html`
    <div class="todo-app">
      <h1>Todos</h1>
      
      <form data-ref="form">
        <input 
          type="text" 
          placeholder="What needs to be done?"
          value="${state.newTodo}"
          data-ref="input"
        />
        <button type="submit">Add</button>
      </form>

      <div class="filters">
        ${(['all', 'active', 'completed'] as const).map(filter => `
          <button 
            class="${classes({ active: state.filter === filter })}"
            data-filter="${filter}"
          >
            ${filter}
          </button>
        `).join('')}
      </div>

      <ul class="todo-list">
        ${(state.filteredTodos || []).map(todo => `
          <li class="${classes({ done: todo.done })}">
            <input 
              type="checkbox" 
              ${todo.done ? 'checked' : ''}
              data-todo-id="${todo.id}"
            />
            <span>${todo.text}</span>
            <button data-delete="${todo.id}">×</button>
          </li>
        `).join('')}
      </ul>

      <div class="footer">
        <span>${state.todoCount || 0} items left</span>
        ${state.todos.some(t => t.done) ? `
          <button data-ref="clearCompleted">Clear completed</button>
        ` : ''}
      </div>
    </div>
  `,

  events: {
    'form': {
      submit: (e, state) => {
        e.preventDefault();
        if (state.newTodo.trim()) {
          state.todos.push({
            id: Date.now(),
            text: state.newTodo.trim(),
            done: false
          });
          state.newTodo = '';
        }
      }
    },
    'input': {
      input: (e, state) => {
        state.newTodo = (e.target as HTMLInputElement).value;
      }
    },
    '[data-filter]': {
      click: (e, state) => {
        const filter = (e.target as HTMLElement).dataset.filter;
        if (filter) state.filter = filter as any;
      }
    },
    '[data-todo-id]': {
      change: (e, state) => {
        const id = Number((e.target as HTMLElement).dataset.todoId);
        const todo = state.todos.find(t => t.id === id);
        if (todo) todo.done = !todo.done;
      }
    },
    '[data-delete]': {
      click: (e, state) => {
        const id = Number((e.target as HTMLElement).dataset.delete);
        const index = state.todos.findIndex(t => t.id === id);
        if (index >= 0) state.todos.splice(index, 1);
      }
    },
    '[data-ref="clearCompleted"]': {
      click: (_e, state) => {
        state.todos = state.todos.filter(t => !t.done);
      }
    }
  },

  refs: {
    input: (el) => {
      // Auto-focus input when todos are cleared
      if (el instanceof HTMLInputElement) {
        requestAnimationFrame(() => el.focus());
      }
    }
  },

  style: css`
    .todo-app {
      max-width: 400px;
      margin: 2rem auto;
      padding: 1rem;
      font-family: system-ui, sans-serif;
    }
    
    h1 {
      text-align: center;
      color: #333;
      margin-bottom: 2rem;
    }
    
    form {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    
    input[type="text"] {
      flex: 1;
      padding: 0.75rem;
      border: 2px solid #e1e1e1;
      border-radius: 6px;
      font-size: 1rem;
    }
    
    input[type="text"]:focus {
      outline: none;
      border-color: #007bff;
    }
    
    button {
      padding: 0.75rem 1rem;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1rem;
      transition: background 0.2s;
    }
    
    button:hover {
      background: #0056b3;
    }
    
    .filters {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    
    .filters button {
      padding: 0.5rem 1rem;
      background: white;
      color: #666;
      border: 2px solid #e1e1e1;
      font-size: 0.9rem;
    }
    
    .filters button.active {
      background: #007bff;
      color: white;
      border-color: #007bff;
    }
    
    .todo-list {
      list-style: none;
      padding: 0;
      margin: 0 0 1rem 0;
    }
    
    .todo-list li {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: #f9f9f9;
      border: 1px solid #e1e1e1;
      border-radius: 6px;
      margin-bottom: 0.5rem;
    }
    
    .todo-list li.done {
      opacity: 0.7;
    }
    
    .todo-list li.done span {
      text-decoration: line-through;
    }
    
    .todo-list input[type="checkbox"] {
      width: 1.2rem;
      height: 1.2rem;
    }
    
    .todo-list span {
      flex: 1;
      font-size: 1rem;
    }
    
    .todo-list button {
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 50%;
      width: 2rem;
      height: 2rem;
      font-size: 1.2rem;
      line-height: 1;
      padding: 0;
    }
    
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.9rem;
      color: #666;
      padding: 0.5rem 0;
    }
  `
});

// 3. Theme provider - shows global state management
type ThemeState = {
  mode: 'light' | 'dark';
  primaryColor: string;
};

const ThemeProvider = component<ThemeState>('theme-provider')({
  state: {
    mode: 'light',
    primaryColor: '#007bff'
  },

  template: (state) => html`
    <div class="theme-controls">
      <h3>Theme Settings</h3>
      <button data-ref="toggleMode">
        Switch to ${state.mode === 'light' ? 'dark' : 'light'} mode
      </button>
      
      <div class="color-picker">
        <label>Primary Color:</label>
        <input 
          type="color" 
          value="${state.primaryColor}"
          data-ref="colorPicker"
        />
      </div>
    </div>
    <slot></slot>
  `,

  events: {
    '[data-ref="toggleMode"]': {
      click: (_e, state, api) => {
        state.mode = state.mode === 'light' ? 'dark' : 'light';
        api.emitGlobal('theme-changed', { mode: state.mode, primaryColor: state.primaryColor });
      }
    },
    '[data-ref="colorPicker"]': {
      input: (e, state, api) => {
        state.primaryColor = (e.target as HTMLInputElement).value;
        api.emitGlobal('theme-changed', { mode: state.mode, primaryColor: state.primaryColor });
      }
    }
  },

  hooks: {
    onMounted: (state, api) => {
      // Apply initial theme
      api.emitGlobal('theme-changed', { mode: state.mode, primaryColor: state.primaryColor });
    }
  },

  style: css`
    :host {
      display: block;
      padding: 1rem;
      background: var(--bg-primary, white);
      color: var(--text-primary, #333);
      transition: all 0.3s ease;
    }
    
    .theme-controls {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
      padding: 1rem;
      background: var(--bg-secondary, #f8f9fa);
      border-radius: 8px;
    }
    
    .color-picker {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    input[type="color"] {
      width: 2rem;
      height: 2rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
  `
});

export { Counter, TodoApp, ThemeProvider };
