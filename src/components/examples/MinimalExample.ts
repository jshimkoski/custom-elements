/**
 * MinimalExample: A simple counter component using best practices.
 * Demonstrates ctx, event binding, and functional API.
 */
import { component, html, type ComponentContext } from '../../lib';

type State = {
  count: number;
};

type Methods = {
  increase: (event: Event, ctx: ComponentContext<State, {}, Methods>) => void;
};

export const MinimalExample = component<State, {}, {}, Methods>('minimal-example', (ctx) => html`
  <button
    class="bg-primary-600 hover:bg-primary-500 transition-colors text-white rounded-sm py-2 px-4 dark:bg-primary-700 dark:hover:bg-primary-600"
    @click="increase"
  >Count: ${ctx.count}</button>
`, {
  state: { count: 0 },
  increase: (_event, ctx) => ctx.count++
});
