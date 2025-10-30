/**
 * TodoApp: A classic todo list example.
 * Demonstrates ctx, directives, and input binding.
 */
import { component, html, ref } from '../../lib';
import { each } from '../../lib/directives';

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
    todos.value = todos.value.map((todo) =>
      todo.id === id ? { ...todo, done: !todo.done } : todo,
    );
  };

  const removeTodo = (id: number) => {
    todos.value = todos.value.filter((todo) => todo.id !== id);
  };

  return html`
    <div
      class="max-w-[400px] mx-auto my-8 p-8 bg-white dark:bg-black text-black dark:text-white rounded-lg shadow-lg"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        class="w-12 h-12 text-black dark:text-white"
      >
        <path
          fill="currentColor"
          d="m19.485 20.154l-6.262-6.262q-.75.639-1.725.989t-1.96.35q-2.402 0-4.066-1.663T3.808 9.503T5.47 5.436t4.064-1.667t4.068 1.664T15.268 9.5q0 1.042-.369 2.017t-.97 1.668l6.262 6.261zM9.539 14.23q1.99 0 3.36-1.37t1.37-3.361t-1.37-3.36t-3.36-1.37t-3.361 1.37t-1.37 3.36t1.37 3.36t3.36 1.37"
        />
      </svg>
      <h2 class="text-2xl font-medium mb-8">Todo List</h2>
      <form class="flex gap-2 mb-4" @submit=${submitForm}>
        <input
          :model=${input}
          class="grow px-2 py-1 border border-neutral-300 dark:border-neutral-700 rounded-sm"
          :class=${{
            'border-error-600 dark:border-error-400': input.value === 'test',
          }}
          type="text"
          placeholder="Add todo"
        />
        <button
          type="submit"
          class="px-4 py-2 bg-primary-600 text-white rounded-sm hover:bg-primary-700 focus:bg-primary-700"
        >
          Add
        </button>
      </form>
      <ul>
        ${each(
          todos.value,
          (todo) => html`
            <li
              class="flex items-center gap-2 py-2 border-b border-neutral-200 last:border-b-0 dark:border-neutral-800"
            >
              <input
                type="checkbox"
                :checked=${todo.done}
                @change=${() => toggleTodo(todo.id)}
              />
              <span
                :class="${{
                  'grow text-left': true,
                  'line-through text-neutral-500': todo.done,
                }}"
                class="grow text-left"
                >${todo.text}</span
              >
              <button
                class="px-4 py-2 bg-error-600 text-white rounded-sm hover:bg-error-700 focus:bg-error-700 disabled:pointer-events-none disabled:opacity-50"
                :disabled=${!todo.done}
                @click=${() => removeTodo(todo.id)}
              >
                Remove
              </button>
            </li>
          `,
        )}
      </ul>
    </div>
  `;
});
