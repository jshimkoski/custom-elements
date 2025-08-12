import { html, css, component } from '../../lib/runtime';

interface MinimalExampleState {
  count: number;
}

component('minimal-example', {
  state: { count: 0 },
  template: ({ count }: MinimalExampleState) => html`
    <button data-on-click="increment">Count: ${count}</button>
  `({ count }),
  style: css`
    button { font-size: 1.2rem; padding: 0.5rem 1rem; }
  `,
  increment(_e: Event, state: MinimalExampleState) {
    state.count++;
  }
});