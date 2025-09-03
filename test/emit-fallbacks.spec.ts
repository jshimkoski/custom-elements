import { describe, it, expect, vi } from 'vitest';
import { component } from '../src/lib/runtime/component';
import { html } from '../src/lib/runtime/template-compiler';

function mount(tag: string, cfg: any) {
  component(tag, cfg);
  const el = document.createElement(tag) as any;
  document.body.appendChild(el);
  return el;
}

describe('emit fallback and ordering tests', () => {
  it('stopPropagation on ancestor (capture) prevents host listener and fallback runs once', async () => {
    const handler = vi.fn();
    const cfg = {
      state: {},
      props: { onHostFoo: { type: Function } },
      render(ctx: any) { return html`<div></div>`; }
    };

    const el = mount('test-emit-stop', cfg) as any;
    el.onHostFoo = handler;
    await Promise.resolve();

    // Add a capturing listener on document that stops propagation so the
    // runtime's host listener (attached on the element) will not run.
    const cap = (e: Event) => { e.stopPropagation(); };
    document.addEventListener('foo', cap, true);

    el.context.emit('foo', { x: 1 });

    // handler should still be invoked once via emit fallback
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ x: 1 }, el.context);

    document.removeEventListener('foo', cap, true);
    document.body.removeChild(el);
  });

  it('additional host listener attached after mount does not cause double-calls', async () => {
    const propHandler = vi.fn();
    const cfg = {
      state: {},
      props: { onHostBar: { type: Function } },
      render(ctx: any) { return html`<div></div>`; }
    };

    const el = mount('test-emit-order', cfg) as any;
    el.onHostBar = propHandler;
    await Promise.resolve();

    // Attach another listener manually after mount to vary ordering
    el.addEventListener('bar', (e) => {
      // noop
    });

    el.context.emit('bar', { ok: true });

    expect(propHandler).toHaveBeenCalledTimes(1);
    expect(propHandler).toHaveBeenCalledWith({ ok: true }, el.context);

    document.body.removeChild(el);
  });

  it('when host listener is absent emit still calls element prop handler once', async () => {
    const propHandler = vi.fn();
    const cfg = {
      state: {},
      // No onHostBaz in config -> runtime will not wire a host listener
      render(ctx: any) { return html`<div></div>`; }
    };

    const el = mount('test-emit-nohost', cfg) as any;
    // set element property handler
    el.onHostBaz = propHandler;
    await Promise.resolve();

    el.context.emit('baz', { hi: 'there' });

    expect(propHandler).toHaveBeenCalledTimes(1);
    expect(propHandler).toHaveBeenCalledWith({ hi: 'there' }, el.context);

    document.body.removeChild(el);
  });
});
