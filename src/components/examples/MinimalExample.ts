/**
 * MinimalExample: A simple counter component using best practices.
 * Demonstrates ctx, event binding, and functional API.
 */
import { component, html, css } from '../../lib';

export const MinimalExample = component('minimal-example', (ctx) => html`
  <button
    class="bg-blue-600 hover:bg-blue-500 transition-colors text-white rounded py-2 px-4 dark:bg-blue-700 dark:hover:bg-blue-600"
    @click="increase"
  >Count: ${ctx.count}</button>
`, {
  state: { count: 0 },
  increase: (_event, ctx) => ctx.count++
});
