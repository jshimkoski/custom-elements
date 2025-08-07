// Example of the new ultra-simple API
import { component, css, classes } from '../lib/easy.js';

// Define types for better TypeScript support
type CounterState = {
  count: number;
};

type TodoState = {
  todos: Array<{ id: number; text: string; done: boolean }>;
  newTodo: string;
  filter: 'all' | 'active' | 'completed';
  // Computed properties
  filteredTodos?: Array<{ id: number; text: string; done: boolean }>;
  todoCount?: number;
  hasCompleted?: boolean;
};

type ThemeState = {
  theme: 'light' | 'dark';
};

type FocusState = {
  value: string;
};

// 1. Ultra-simple counter
const Counter = component<CounterState>('simple-counter')({
  state: { count: 0 },
  
  template: (state) => `
    <button data-ref="increment">
      Count: ${state.count}
    </button>
  `,
  
  events: {
    '[data-ref="increment"]': {
      click: (_e, state) => {
        state.count++;
      }
    }
  },
  
  style: css`
    button {
      padding: 1rem;
      font-size: 1.2rem;
      background: var(--primary, #007bff);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }
    button:hover {
      background: var(--primary-hover, #0056b3);
      transform: translateY(-1px);
    }
  `
});

// 2. More complex todo app
const TodoApp = component<TodoState>('todo-app')({
  state: {
    todos: [
      { id: 1, text: 'Learn the new API', done: false },
      { id: 2, text: 'Build something awesome', done: false }
    ],
    newTodo: '',
    filter: 'all'
  },
  
  computed: {
    filteredTodos: (state) => {
      switch (state.filter) {
        case 'active': return state.todos.filter((t: any) => !t.done);
        case 'completed': return state.todos.filter((t: any) => t.done);
        default: return state.todos;
      }
    },
    todoCount: (state) => state.todos.filter((t: any) => !t.done).length,
    hasCompleted: (state) => state.todos.some((t: any) => t.done)
  },

  template: (state) => `
    <div class="todo-app">
      <h1>Todos</h1>
      
      <form data-ref="todoForm">
        <input 
          type="text" 
          placeholder="What needs to be done?"
          value="${state.newTodo}"
          data-ref="todoInput"
        />
        <button type="submit">Add</button>
      </form>

      <div class="filters">
        <button 
          class="${classes({ active: state.filter === 'all' })}"
          data-filter="all"
        >all</button>
        <button 
          class="${classes({ active: state.filter === 'active' })}"
          data-filter="active"
        >active</button>
        <button 
          class="${classes({ active: state.filter === 'completed' })}"
          data-filter="completed"
        >completed</button>
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
        ${(state.hasCompleted) ? `
          <button data-ref="clearCompleted">Clear completed</button>
        ` : ''}
      </div>
    </div>
  `,

  events: {
    '[data-ref="todoForm"]': {
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
    '[data-ref="todoInput"]': {
      input: (e, state) => {
        state.newTodo = (e.target as HTMLInputElement).value;
      }
    },
    '[data-filter]': {
      click: (e, state) => {
        const filter = (e.target as HTMLElement).dataset.filter;
        if (filter) {
          state.filter = filter as any;
        }
      }
    },
    '[data-todo-id]': {
      change: (e, state) => {
        const id = Number((e.target as HTMLElement).dataset.todoId);
        const todo = state.todos.find((t: any) => t.id === id);
        if (todo) todo.done = !todo.done;
      }
    },
    '[data-delete]': {
      click: (e, state) => {
        const id = Number((e.target as HTMLElement).dataset.delete);
        const index = state.todos.findIndex((t: any) => t.id === id);
        if (index >= 0) state.todos.splice(index, 1);
      }
    },
    '[data-ref="clearCompleted"]': {
      click: (_e, state) => {
        state.todos = state.todos.filter((t: any) => !t.done);
      }
    }
  },

  style: css`
    .todo-app {
      max-width: 400px;
      margin: 2rem auto;
      padding: 1rem;
      font-family: system-ui, sans-serif;
      border: 1px solid #e1e1e1;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    h1 {
      text-align: center;
      color: #333;
      margin-bottom: 1.5rem;
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

// 3. Theme toggle with external state
const sharedState = { theme: 'light', user: null };

const ThemeToggle = component<ThemeState>('theme-toggle')({
  state: { theme: 'light' },
  
  template: (state) => `
    <button data-ref="toggleTheme">
      Switch to ${state.theme === 'light' ? 'dark' : 'light'} mode
    </button>
  `,

  events: {
    '[data-ref="toggleTheme"]': {
      click: (_e, state, api) => {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
        sharedState.theme = state.theme;
        api.emitGlobal('theme-changed', state.theme);
      }
    }
  },

  style: css`
    button {
      padding: 0.5rem 1rem;
      border: 2px solid currentColor;
      background: transparent;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
    }
    button:hover {
      background: currentColor;
      color: var(--bg-color, white);
    }
  `
});

// 4. Focus input with refs
const FocusInput = component<FocusState>('focus-input')({
  state: { value: '' },
  
  template: (state) => `
    <div>
      <input 
        type="text"
        value="${state.value}"
        data-ref="input"
        placeholder="I auto-focus!"
      />
      <p>Value: ${state.value}</p>
    </div>
  `,

  events: {
    '[data-ref="input"]': {
      input: (e, state) => {
        state.value = (e.target as HTMLInputElement).value;
      }
    }
  },

  refs: {
    input: (el) => {
      // Auto-focus on mount
      if (el instanceof HTMLInputElement) {
        requestAnimationFrame(() => el.focus());
      }
    }
  },

  style: css`
    div {
      padding: 1rem;
    }
    input {
      padding: 0.5rem;
      border: 2px solid #e1e1e1;
      border-radius: 4px;
      font-size: 1rem;
      width: 200px;
    }
    input:focus {
      outline: none;
      border-color: #007bff;
    }
    p {
      margin-top: 0.5rem;
      color: #666;
    }
  `
});

export { Counter, TodoApp, ThemeToggle, FocusInput };
