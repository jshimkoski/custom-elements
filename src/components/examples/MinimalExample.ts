import { html, css, component } from '../../lib/runtime';

interface MinimalExampleState {
  count: number;
}

component('minimal-example', {
  state: { count: 0 },
  template: (state: MinimalExampleState) => html`
    <div>
      Text Node Breaks: ${state.count}
      <span>${state.count}</span>
      <button data-on-click="increment">Count: ${state.count}</button>
    </div>
  `(state),
  style: css`
    button { font-size: 1.5rem; padding: 0.5rem 1rem; }
  `,
  increment(_e: Event, state: MinimalExampleState) {
    state.count++;
  }
});