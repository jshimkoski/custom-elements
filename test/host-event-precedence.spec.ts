import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { component } from '../src/lib/runtime/component';
import { html } from '../src/lib/runtime/template-compiler';

describe('host event precedence (onHostX)', () => {
  beforeEach(() => {
    // register a tiny test component
    component('test-host-precedence', {
      state: {},
      props: {},
      render: (ctx: any) => html`<button>ok</button>`,
      // default config-level handler is noop; tests will override via _cfg
      onHostClick: (detail: any, ctx: any) => {},
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

    // set config-level handler
    if (el._cfg) el._cfg.onHostClick = configSpy;

    // set context-level handler
    el.context.onHostClick = contextSpy;

    // set element property handler (highest precedence)
    el.onHostClick = elSpy;

    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

    expect(elSpy).toHaveBeenCalled();
    expect(contextSpy).not.toHaveBeenCalled();
    expect(configSpy).not.toHaveBeenCalled();
  });

  it('falls back to context then config when element prop is absent', async () => {
    const configSpy = vi.fn();
    const contextSpy = vi.fn();

    const el = document.createElement('test-host-precedence') as any;
    document.body.appendChild(el);
    await Promise.resolve();
    const btn = el.shadowRoot?.querySelector('button') as HTMLElement;

    if (el._cfg) el._cfg.onHostClick = configSpy;

    // set only context handler
    el.context.onHostClick = contextSpy;

    // ensure no element property handler
    delete (el as any).onHostClick;

    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

    expect(contextSpy).toHaveBeenCalled();
    expect(configSpy).not.toHaveBeenCalled();

    // remove context handler, should hit config
    delete el.context.onHostClick;
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(configSpy).toHaveBeenCalled();
  });

  it('emit() calls onHostX handlers with detail and context', async () => {
    const spy = vi.fn();
    const el = document.createElement('test-host-precedence') as any;
    document.body.appendChild(el);
    await Promise.resolve();

    // element prop handler should be invoked by emit
    el.onHostTestEvent = spy;

    // call emit on the component context
    el.context.emit('testEvent', { foo: 'bar' });

    expect(spy).toHaveBeenCalled();
    const call = spy.mock.calls[0];
    expect(call[0]).toEqual({ foo: 'bar' });
    expect(call[1]).toBe(el.context);
  });
});
