import { describe, it, expect } from 'vitest';
import { component, html, ref, when } from '../src/lib/index';

describe('when lazy overload', () => {
  it('does not evaluate factory when condition is falsy', async () => {
    const thrower = () => { throw new Error('EVAL'); };

    component('when-lazy-test', () => {
      const curr = ref(false);
      return html`
        <div>
          ${when(curr.value, () => html`<p id="lazy">${thrower()}</p>`) }
        </div>
      `;
    });

    const el = document.createElement('when-lazy-test') as any;
    expect(() => document.body.appendChild(el)).not.toThrow();
    await new Promise((r) => setTimeout(r, 10));
    expect(el.shadowRoot?.querySelector('#lazy')).toBeNull();
  });

  it('evaluates factory when condition is truthy', async () => {
    component('when-lazy-test-2', () => {
      const curr = ref(true);
      return html`
        <div>
          ${when(curr.value, () => html`<p id="lazy2">OK</p>`) }
        </div>
      `;
    });

    const el = document.createElement('when-lazy-test-2') as any;
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 10));
    expect(el.shadowRoot?.querySelector('#lazy2')).not.toBeNull();
  });
});
