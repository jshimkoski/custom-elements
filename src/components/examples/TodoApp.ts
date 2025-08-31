/**
 * TodoApp: A classic todo list example.
 * Demonstrates ctx, directives, and input binding.
 */
import { component, html, each } from '../../lib';

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

export const TodoApp = component('todo-app', (ctx) => html`
  <div class="todo-container max-w-[400px] mx-auto my-8 p-8 bg-white dark:bg-black rounded-lg shadow-lg">
    <h2 class="text-2xl font-medium mb-8">Todo List</h2>
    <form
      class="flex gap-2 mb-4"
      @submit="${ctx.submitForm}"
    >
      <input
        #model="input"
        class="grow px-2 py-1 border border-neutral-300 dark:border-neutral-800 rounded"
        type="text"
        placeholder="Add todo"
      >
      <button
        type="submit"
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:bg-blue-700"
      >Add</button>
    </form>
    <ul>
      ${each(ctx.todos, (todo) => html`
        <li class="flex items-center gap-2 py-2 border-b border-neutral-200 dark:border-neutral-800">
          <input
            type="checkbox"
            :checked="${todo.done}" @change="${() => ctx.toggleTodo(ctx, todo.id)}" />
          <span
            class="todo-text grow text-left [data-done=true]:line-through [data-done=true]:text-gray-500"
            :data-done="${todo.done}"
          >${todo.text}</span>
          <button
            class="remove-btn px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:bg-red-700"
            @click="${() => ctx.removeTodo(ctx, todo.id)}"
          >Remove</button>
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
});
