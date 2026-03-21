import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { component, html, useProps } from '../src/lib';
import type { VNode } from '../src/lib/runtime/types';

// Produces a render fn that intentionally returns nothing, typed to satisfy
// the component() overload without inline `as any` casts.
function noReturnFn(): () => VNode {
  return () => undefined as unknown as VNode;
}

const wait = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

let container: HTMLElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  document.body.removeChild(container);
});

describe('component missing return', () => {
  it('sets lastError with a friendly message when render has no return', async () => {
    component('missing-return-a', noReturnFn());
    container.innerHTML = '<missing-return-a></missing-return-a>';
    await wait();

    const el = container.querySelector('missing-return-a') as HTMLElement & { lastError: Error | null };
    expect(el.lastError).toBeInstanceOf(Error);
    expect(el.lastError?.message).toMatch(/missing-return-a/i);
    expect(el.lastError?.message).toMatch(/did not return a value/i);
  });

  it('includes the component tag name in the error message', async () => {
    component('missing-return-b', noReturnFn());
    container.innerHTML = '<missing-return-b></missing-return-b>';
    await wait();

    const el = container.querySelector('missing-return-b') as HTMLElement & { lastError: Error | null };
    expect(el.lastError?.message).toContain('missing-return-b');
  });

  it('includes a hint to use an html template in the error message', async () => {
    component('missing-return-c', noReturnFn());
    container.innerHTML = '<missing-return-c></missing-return-c>';
    await wait();

    const el = container.querySelector('missing-return-c') as HTMLElement & { lastError: Error | null };
    expect(el.lastError?.message).toMatch(/html`\.\.\.`/i);
  });

  it('does not set lastError when render returns a valid template', async () => {
    component('missing-return-d', () => html`<span>hello</span>`);
    container.innerHTML = '<missing-return-d></missing-return-d>';
    await wait();

    const el = container.querySelector('missing-return-d') as HTMLElement & { lastError: Error | null };
    expect(el.lastError).toBeNull();
    expect(el.shadowRoot?.querySelector('span')?.textContent).toBe('hello');
  });

  it('renders normally when return is present with props', async () => {
    component('missing-return-e', () => {
      const props = useProps({ label: 'ok' });
      return html`<div>${props.label}</div>`;
    });

    container.innerHTML = '<missing-return-e label="works"></missing-return-e>';
    await wait();

    const el = container.querySelector('missing-return-e') as HTMLElement & { lastError: Error | null };
    expect(el.lastError).toBeNull();
    expect(el.shadowRoot?.querySelector('div')?.textContent?.trim()).toBe('works');
  });
});
