/**
 * MinimalExample: A simple counter component using best practices.
 * Demonstrates ctx, event binding, and functional API.
 */
import { component, html, css } from '../../lib/runtime';

export const MinimalExample = component('minimal-example', (ctx) => html`
  <div class="flex flex-col items-center justify-center min-h-[120px]">
    <button
      class="bg-blue-600 hover:bg-blue-500 transition-colors text-white rounded py-2 px-4 dark:bg-blue-700 dark:hover:bg-blue-600"
      @click="${() => ctx.count++}"
    >Count: ${ctx.count}</button>
  </div>
`, {
  state: { count: 0 },
});
