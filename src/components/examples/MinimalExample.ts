/**
 * MinimalExample: A simple counter component using best practices.
 * Demonstrates ctx, event binding, and functional API.
 */
import { component, html, css } from '../../lib/runtime';

export const MinimalExample = component('minimal-example', (ctx) => html`
  <div class="flex flex-col items-center justify-center min-h-[120px]">
    <button
      class="cursor-[pointer] text-base bg-blue-500 hover:bg-blue-700 transition-colors text-white rounded py-2 px-4 dark:hover:bg-blue-400"
      @click="${() => ctx.count++}"
    >Count: ${ctx.count}</button>
  </div>
`, {
  state: { count: 0 },
});
