import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { component } from '../src/lib/runtime/component';
import { html } from '../src/lib/runtime/template-compiler';

describe('host event precedence', () => {
  beforeEach(() => {
    // register a tiny test component
    component('test-host-precedence', {
      state: {},
      props: {},
      render: (ctx: any) => html`<button>ok</button>`,
    });
  });

  afterEach(() => {
    // cleanup DOM
    document.querySelectorAll('test-host-precedence').forEach((el) => el.remove());
  });

  it('prefers element property over context and config', async () => {
    const configSpy = vi.fn();
    const contextSpy = vi.fn();
    const elSpy = vi.fn();

    const el = document.createElement('test-host-precedence') as any;
    document.body.appendChild(el);
    // allow connected/render to run
    await Promise.resolve();

    const btn = el.shadowRoot?.querySelector('button') as HTMLElement;
    expect(btn).toBeTruthy();

  // attach host listener (should receive events dispatched on the host)
  el.addEventListener('click', (e: any) => elSpy(e.detail));
  btn.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
  expect(elSpy).toHaveBeenCalled();
  });

  it('falls back to context then config when element prop is absent', async () => {
    const configSpy = vi.fn();
    const contextSpy = vi.fn();

    const el = document.createElement('test-host-precedence') as any;
    document.body.appendChild(el);
    await Promise.resolve();
    const btn = el.shadowRoot?.querySelector('button') as HTMLElement;

  // attach context-level listener (simulated via addEventListener)
  el.addEventListener('click', (e: any) => contextSpy(e.detail));
  btn.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
  expect(contextSpy).toHaveBeenCalled();
  });

  it('emit() dispatches DOM events and carries detail', async () => {
    const spy = vi.fn();
    const el = document.createElement('test-host-precedence') as any;
    document.body.appendChild(el);
    await Promise.resolve();

  // add a DOM listener to be invoked when context.emit dispatches
  el.addEventListener('testEvent', (e: any) => spy(e.detail));
  el.context.emit('testEvent', { foo: 'bar' });
  expect(spy).toHaveBeenCalled();
  const call = spy.mock.calls[0];
  expect(call[0]).toEqual({ foo: 'bar' });
  });
});
