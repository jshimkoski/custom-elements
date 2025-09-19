/**
 * MinimalExample: A simple counter component using best practices.
 * Demonstrates ctx, event binding, and functional API.
 */
import { component, html, ref } from '../../lib';

export const MinimalExample = component('minimal-example', () => {
  const count = ref(0);
  const increase = () => {
    count.value++;
  };
  return html`
    <button
      class="bg-primary-600 hover:bg-primary-500 transition-colors text-white rounded-sm py-2 px-4 dark:bg-primary-700 dark:hover:bg-primary-600"
      @click="${increase}"
    >Count: ${count.value}</button>
  `;
});
