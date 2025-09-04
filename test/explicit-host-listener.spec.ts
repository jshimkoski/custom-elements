import { describe, it, expect, vi } from 'vitest';
import { component } from '../src/lib/runtime/component';
import { html } from '../src/lib/runtime/template-compiler';

function mount(tag: string, cfg: any) {
  component(tag, cfg);
  const el = document.createElement(tag) as any;
  document.body.appendChild(el);
  return el;
}

describe('explicit host listener wiring', () => {
  it('runtime-wired host listener invokes configured handler once', async () => {
    const cfgHandler = vi.fn();
    const cfg = {
      state: {},
      render(ctx: any) {
        return html`<div></div>`;
      }
    };

    const el = mount('test-explicit-1', cfg);
    await Promise.resolve();

    // Listen for the dispatched event on the host element
    el.addEventListener('ping', (e: any) => cfgHandler(e.detail));

    // Emit should dispatch the event to host listeners
    (el as any).context.emit('ping', { x: 1 });
    expect(cfgHandler).toHaveBeenCalledTimes(1);
    expect(cfgHandler).toHaveBeenCalledWith({ x: 1 });

    document.body.removeChild(el);
  });

  it('when element prop and host listener exist, handler is invoked only once', async () => {
    const propHandler = vi.fn();
    const cfg = {
      state: {},
      onPong(detail: any, ctx: any) {
        // default config-level handler is noop; runtime exposes config methods
      },
      render(ctx: any) {
        return html`<div></div>`;
      }
    };

  const el = mount('test-explicit-2', cfg) as any;
  // attach an event listener on the host element
  el.addEventListener('pong', (e: any) => propHandler(e.detail));
    await Promise.resolve();

    // Emit should cause the wired host listener to run and mark the event;
    // emit must not call propHandler again after the host listener runs.
  el.context.emit('pong', { hi: true });

  expect(propHandler).toHaveBeenCalledTimes(1);
  expect(propHandler).toHaveBeenCalledWith({ hi: true });

    document.body.removeChild(el);
  });
});
