/**
 * TodoApp: A classic todo list example.
 * Demonstrates ctx, directives, and input binding.
 */
import { component, html, css, each } from '../../lib';

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

export const TodoApp = component('todo-app', (ctx) => html`
  <div class="todo-container">
    <h2>Todo List</h2>
    <form @submit="${ctx.submitForm}">
      <input #model="input" type="text" placeholder="Add todo" />
      <button type="submit">Add</button>
    </form>
    <ul>
      ${each(ctx.todos, (todo) => html`
        <li>
          <input type="checkbox" :checked="${todo.done}" @change="${() => ctx.toggleTodo(ctx, todo.id)}" />
          <span class="todo-text" data-done="${todo.done}">${todo.text}</span>
          <button class="remove-btn" @click="${() => ctx.removeTodo(ctx, todo.id)}">Remove</button>
        </li>
      `)}
    </ul>
  </div>
`, {
  state: {
    todos: [] as Todo[],
    input: '',
  },
  submitForm(event, ctx) {
    event.preventDefault();
    ctx.addTodo();
  },
  addTodo(ctx) {
    if (!ctx.input.trim()) return;
    ctx.todos = [...ctx.todos, { id: Date.now(), text: ctx.input, done: false }];
    ctx.input = '';
  },
  toggleTodo(ctx, id: number) {
    ctx.todos = ctx.todos.map(todo => todo.id === id ? { ...todo, done: !todo.done } : todo);
  },
  removeTodo(ctx, id: number) {
    ctx.todos = ctx.todos.filter(todo => todo.id !== id);
  },
  style: css`
    .todo-container {
      max-width: 400px;
      margin: 2rem auto;
      padding: 2rem;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.07);
      font-family: system-ui, sans-serif;
    }
    h2 {
      margin-bottom: 1rem;
      font-size: 1.3rem;
      font-weight: 600;
    }
    form {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    input[type="text"] {
      flex: 1;
      padding: 0.5rem;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 1rem;
    }
    button[type="submit"] {
      background: #0078d4;
      color: #fff;
      border: none;
      border-radius: 4px;
      padding: 0.6rem 1.2rem;
      font-size: 1rem;
      cursor: pointer;
      transition: background 0.2s;
    }
    button[type="submit"]:hover {
      background: #005fa3;
    }
    ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    li {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0;
      border-bottom: 1px solid #eee;
    }
    .todo-text {
      flex-grow: 1;
      text-align: left;
    }
    li:hover {
      background: #f9f9f9;
    }
    .todo-text[data-done="true"] {
      text-decoration: line-through;
      color: #888;
    }
    .remove-btn {
      background: #e53e3e;
      color: #fff;
      border: none;
      border-radius: 4px;
      padding: 0.3rem 0.8rem;
      font-size: 0.95rem;
      cursor: pointer;
      transition: background 0.2s;
    }
    .remove-btn:hover {
      background: #c53030;
    }
  `
});
