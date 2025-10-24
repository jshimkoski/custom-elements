import { describe, it, expect, vi } from 'vitest';
import { component } from '../src/lib/runtime/component';
import { html } from '../src/lib/runtime/template-compiler';

function mount(tag: string, config: any) {
  component(tag, config);
  const el = document.createElement(tag);
  document.body.appendChild(el);
  return el;
}

describe('emit host-handled marker', () => {
  it('does not double-call handlers when host listener ran', async () => {
    const propHandler = vi.fn();

    const config = {
      state: {},
      props: {
        onFoobar: { type: Function },
      },
      render() {
        return html`<div></div>`;
      },
    };

    const el = mount('test-emit-host', config);
    // set the element property handler via host listener
    el.addEventListener('foobar', (e: any) => propHandler(e.detail));

    // Add a host listener via addEventListener which will be the "host listener"
    // that our runtime wires; the runtime should mark the event when invoking
    // its resolved host handler. We simulate a listener that forwards to the
    // configured handler to mimic typical behavior.
    el.addEventListener('foobar', () => {
      // Nothing here; the runtime's own host listener will run and mark the event.
    });

    await Promise.resolve();

    // Call emit; before the fix this could cause the same logical handler to
    // be invoked twice (once via the host listener and once directly from emit).
    (el as any).context.emit('foobar', { a: 1 });

    // The prop handler should be invoked exactly once via the dispatched event.
    expect(propHandler).toHaveBeenCalledTimes(1);
    expect(propHandler).toHaveBeenCalledWith({ a: 1 });

    document.body.removeChild(el);
  });
});
