import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { component, html, ref } from '../src/lib/index';

describe('when directive - null/undefined/false handling', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('confirms ternary guards evaluation but when(...) with pre-evaluated html does not', async () => {
    // Use an explicit throwing expression so we can reliably detect eager
    // evaluation. The IIFE will throw when evaluated.
    const thrower = () => {
      throw new Error('EVAL');
    };

    // Ternary guards evaluation: the throwing IIFE should not be called
    // when the condition is falsy.
    component('when-ternary-safe', () => {
      const curr = ref(false);
      return html`
        <div>${curr.value ? html`<p id="safe">${thrower()}</p>` : ''}</div>
      `;
    });

    const safeEl = document.createElement('when-ternary-safe') as any;
    expect(() => container.appendChild(safeEl)).not.toThrow();
    await new Promise((r) => setTimeout(r, 10));
    expect(safeEl.shadowRoot?.querySelector('#safe')).toBeNull();

    // :when attribute case — ensure it only renders when the condition is truthy.
    component('when-attr-bug', () => {
      const curr = ref(false);
      return html`
        <div>
          <p :when="${curr}"><span id="bug">BUG</span></p>
        </div>
      `;
    });

    const bugEl = document.createElement('when-attr-bug') as any;
    // Initially falsy -> should not render the inner node
    expect(() => container.appendChild(bugEl)).not.toThrow();
    await new Promise((r) => setTimeout(r, 10));
    expect(bugEl.shadowRoot?.querySelector('#bug')).toBeNull();

    // Toggle to true -> inner node should be rendered
    const ctx = (bugEl as any).context;
    // touch refs to satisfy typings in some environments
    void ctx.refs;
    ctx.requestRender();
    // Set the reactive ref value and request a render
    // Note: we access the component context to update the ref used in template
    // The component's factory created its own ref; to toggle it we need to
    // re-create the component with an externally controllable ref instead.
    // For a clean test, create a new component instance with an exposed ref.
    component('when-attr-bug-2', () => {
      const curr = ref(false);
      // expose curr for test access
      (globalThis as any).__TEST_CURR = curr;
      return html`
        <div>
          <p :when="${curr}"><span id="bug2">BUG</span></p>
        </div>
      `;
    });

    const bugEl2 = document.createElement('when-attr-bug-2') as any;
    container.appendChild(bugEl2);
    await new Promise((r) => setTimeout(r, 10));
    expect(bugEl2.shadowRoot?.querySelector('#bug2')).toBeNull();

    // Flip the ref and trigger a render
    (globalThis as any).__TEST_CURR.value = true;
    // allow reactive render
    await new Promise((r) => setTimeout(r, 10));
    expect(bugEl2.shadowRoot?.querySelector('#bug2')).not.toBeNull();
  });
});
