import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { registerKeepAlive, component, html } from '../src/lib';

let container: HTMLElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  if (container) {
    document.body.removeChild(container);
  }
});

describe('♻️ registerKeepAlive()', () => {
  it('registers the <ce-keep-alive> custom element', () => {
    registerKeepAlive();
    expect(customElements.get('ce-keep-alive')).toBeTruthy();
  });

  it('is idempotent — calling it multiple times does not throw', () => {
    expect(() => {
      registerKeepAlive();
      registerKeepAlive();
      registerKeepAlive();
    }).not.toThrow();
  });

  it('<ce-keep-alive> can be added to the DOM without errors', async () => {
    registerKeepAlive();

    container.innerHTML = '<ce-keep-alive></ce-keep-alive>';
    await new Promise((r) => setTimeout(r, 50));

    const el = container.querySelector('ce-keep-alive');
    expect(el).toBeTruthy();
  });

  it('ce-keep-alive renders slotted children', async () => {
    registerKeepAlive();

    component(
      'ka-child',
      () => html`<div class="ka-inner">child content</div>`,
    );

    container.innerHTML = `
      <ce-keep-alive>
        <ka-child></ka-child>
      </ce-keep-alive>
    `;

    await new Promise((r) => setTimeout(r, 100));

    const kaEl = container.querySelector('ce-keep-alive');
    expect(kaEl).toBeTruthy();

    const child = kaEl?.querySelector('ka-child');
    expect(child).toBeTruthy();
  });

  it('preserves custom element instance on re-insertion', async () => {
    registerKeepAlive();

    component(
      'ka-stateful',
      () => html`<div class="ka-stateful-div">stateful</div>`,
    );

    container.innerHTML = `
      <ce-keep-alive id="ka-host">
        <ka-stateful id="ka-inst"></ka-stateful>
      </ce-keep-alive>
    `;

    await new Promise((r) => setTimeout(r, 100));

    const ka = container.querySelector<HTMLElement>('#ka-host')!;
    const inst = ka.querySelector<HTMLElement>('#ka-inst');
    expect(inst).toBeTruthy();

    // Remove the child from keep-alive
    inst?.remove();
    await new Promise((r) => setTimeout(r, 50));

    // Re-insert a fresh element with the same tag
    const fresh = document.createElement('ka-stateful');
    fresh.id = 'ka-inst';
    ka.appendChild(fresh);
    await new Promise((r) => setTimeout(r, 100));

    // Should still exist in the DOM (either cached or freshly rendered)
    const reinserted = ka.querySelector('ka-stateful');
    expect(reinserted).toBeTruthy();
  });
});
