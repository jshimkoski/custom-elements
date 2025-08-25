/**
 * MinimalExample: A simple counter component using best practices.
 * Demonstrates ctx, event binding, and functional API.
 */
import { component, html, css } from '../../lib/runtime';

export const MinimalExample = component('minimal-example', (ctx) => html`
  <div class="counter-container">
    <button @click="${() => ctx.count++}">Count: ${ctx.count}</button>
  </div>
`, {
  state: { count: 0 },
  style: css`
    .counter-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 120px;
      font-family: system-ui, sans-serif;
    }
    button {
      background: #0078d4;
      color: #fff;
      border: none;
      border-radius: 4px;
      padding: 0.6rem 1.2rem;
      font-size: 1.1rem;
      cursor: pointer;
      margin-top: 0.5rem;
      transition: background 0.2s;
    }
    button:hover {
      background: #005fa3;
    }
  `
});
