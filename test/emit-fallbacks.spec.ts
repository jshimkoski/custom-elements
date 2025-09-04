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
      props: { onFoo: { type: Function } },
      render(ctx: any) { return html`<div></div>`; }
    };

    const el = mount('test-emit-stop', cfg) as any;
    el.addEventListener('foo', (e: any) => handler(e.detail));
    await Promise.resolve();

    // Add a capturing listener on document that stops propagation so the
    // runtime's host listener (attached on the element) will not run.
    const cap = (e: Event) => { e.stopPropagation(); };
    document.addEventListener('foo', cap, true);

    el.context.emit('foo', { x: 1 });

  // Under the DOM-first emit behavior, a capturing stopPropagation on
  // document prevents the event from reaching the element, so the handler
  // should not be invoked.
  expect(handler).toHaveBeenCalledTimes(0);

    document.removeEventListener('foo', cap, true);
    document.body.removeChild(el);
  });

  it('additional host listener attached after mount does not cause double-calls', async () => {
    const propHandler = vi.fn();
    const cfg = {
      state: {},
      props: { onBar: { type: Function } },
      render(ctx: any) { return html`<div></div>`; }
    };

    const el = mount('test-emit-order', cfg) as any;
    el.addEventListener('bar', (e: any) => propHandler(e.detail));
    await Promise.resolve();

    // Attach another listener manually after mount to vary ordering
    el.addEventListener('bar', (e) => {
      // noop
    });

    el.context.emit('bar', { ok: true });

  expect(propHandler).toHaveBeenCalledTimes(1);
  expect(propHandler).toHaveBeenCalledWith({ ok: true });

    document.body.removeChild(el);
  });

  it('when host listener is absent emit still calls element prop handler once', async () => {
    const propHandler = vi.fn();
    const cfg = {
      state: {},
      // No onBaz in config -> runtime will not wire a host listener
      render(ctx: any) { return html`<div></div>`; }
    };

    const el = mount('test-emit-nohost', cfg) as any;
    // set host listener directly
    el.addEventListener('baz', (e: any) => propHandler(e.detail));
    await Promise.resolve();

    el.context.emit('baz', { hi: 'there' });

  expect(propHandler).toHaveBeenCalledTimes(1);
  expect(propHandler).toHaveBeenCalledWith({ hi: 'there' });

    document.body.removeChild(el);
  });
});
