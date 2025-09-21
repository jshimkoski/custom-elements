/**
 * TodoApp: A classic todo list example.
 * Demonstrates ctx, directives, and input binding.
 */
import { component, html, each, ref } from '../../lib';

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

export const TodoApp = component('todo-app', () => {
  const todos = ref<Todo[]>([]);
  const input = ref('');

  const submitForm = (event: Event) => {
    event.preventDefault();
    addTodo();
  };

  const addTodo = () => {
    if (!input.value.trim()) return;
    todos.value.push({ id: Date.now(), text: input.value, done: false });
    input.value = '';
  };

  const toggleTodo = (id: number) => {
    todos.value = todos.value.map(todo => todo.id === id ? { ...todo, done: !todo.done } : todo);
  };

  const removeTodo = (id: number) => {
    todos.value = todos.value.filter(todo => todo.id !== id);
  };

  return html`
    <div class="max-w-[400px] mx-auto my-8 p-8 bg-white dark:bg-black text-black dark:text-white rounded-lg shadow-lg">
      <h2 class="text-2xl font-medium mb-8">Todo List</h2>
      <form
        class="flex gap-2 mb-4"
        @submit="${submitForm}"
      >
        <input
          :model="${input}"
          class="grow px-2 py-1 border border-neutral-300 dark:border-neutral-700 rounded-sm"
          type="text"
          placeholder="Add todo"
        >
        <button
          type="submit"
          class="px-4 py-2 bg-primary-600 text-white rounded-sm hover:bg-primary-700 focus:bg-primary-700"
        >Add</button>
      </form>
      <ul>
        ${each(todos.value, (todo) => html`
          <li class="flex items-center gap-2 py-2 border-b border-neutral-200 last:border-b-0 dark:border-neutral-800">
            <input
              type="checkbox"
              :checked="${todo.done}"
              @change="${() => toggleTodo(todo.id)}"
            >
            <span
              :class="${{
                'grow text-left': true,
                'line-through text-neutral-500': todo.done
              }}"
              class="grow text-left"
            >${todo.text}</span>
            <button
              class="px-4 py-2 bg-error-600 text-white rounded-sm hover:bg-error-700 focus:bg-error-700 disabled:pointer-events-none disabled:opacity-50"
              :disabled="${!todo.done}"
              @click="${() => removeTodo(todo.id)}"
            >Remove</button>
          </li>
        `)}
      </ul>
    </div>
  `;
});
