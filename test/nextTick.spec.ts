import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { component, html, ref, nextTick } from '../src/lib';

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

describe('⏭️ nextTick()', () => {
  it('returns a Promise', () => {
    const result = nextTick();
    expect(result).toBeInstanceOf(Promise);
  });

  it('resolves without error when no updates are pending', async () => {
    await expect(nextTick()).resolves.toBeUndefined();
  });

  it('resolves after a pending reactive update is flushed', async () => {
    const count = ref(0);
    const rendered: number[] = [];

    component('nt-flush-test', () => {
      rendered.push(count.value);
      return html`<div>${count.value}</div>`;
    });

    container.innerHTML = '<nt-flush-test></nt-flush-test>';
    await new Promise((r) => setTimeout(r, 50));

    count.value = 99;

    await nextTick();

    expect(rendered.at(-1)).toBe(99);
  });

  it('allows DOM inspection after reactive change', async () => {
    const text = ref('initial');

    component('nt-dom-test', () => {
      return html`<span id="nt-span">${text.value}</span>`;
    });

    container.innerHTML = '<nt-dom-test></nt-dom-test>';
    await new Promise((r) => setTimeout(r, 50));

    text.value = 'updated';
    await nextTick();

    const el = document.querySelector('nt-dom-test')!;
    const shadow = el.shadowRoot!;
    expect(shadow.querySelector('#nt-span')?.textContent).toBe('updated');
  });

  it('resolves even when called multiple times in sequence', async () => {
    await nextTick();
    await nextTick();
    await nextTick();
    // Should not throw or hang
    expect(true).toBe(true);
  });
});
