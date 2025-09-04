import { describe, it, expect, vi } from 'vitest';
import { component } from '../src/lib/runtime/component';
import { html } from '../src/lib/runtime/template-compiler';

// Helper to mount a custom element and return instance
function mount(tag: string, config: any, props: Record<string, any> = {}) {
  component(tag, config);
  const el = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    el.setAttribute(k, v);
  });
  document.body.appendChild(el);
  return el;
}

describe('Custom Element Runtime', () => {
  it('binds refs correctly', async () => {
    const config = {
      state: {},
      render(ctx: any) {
        return html`<button ref="myBtn">Click</button>`;
      },
    };
    const el = mount('test-ref', config);
    await Promise.resolve(); // allow render
    expect((el as any).context.refs.myBtn).toBeInstanceOf(HTMLElement);
    expect((el as any).context.refs.myBtn?.tagName).toBe('BUTTON');
    document.body.removeChild(el);
  });

  it('emit dispatches a CustomEvent', async () => {
    const onCustomEvent = vi.fn();
    const config = {
      state: {},
      props: {
        onCustomEvent: { type: Function },
      },
      render(ctx: any) {
        return html`<button ref="btn">Emit</button>`;
      },
    };
    const el = mount('test-emit', config);
    // listen for dispatched event
    el.addEventListener('customEvent', onCustomEvent);
    document.body.appendChild(el);
    await Promise.resolve();
    // Listen for event
    // Call emit and assert event dispatched
    (el as any).context.emit('customEvent', { foo: 'bar' });
    expect(onCustomEvent).toHaveBeenCalled();
    expect(onCustomEvent.mock.calls[0][0].detail).toEqual({ foo: 'bar' });
    document.body.removeChild(el);
  });

  it('dispatches events even when config contains handlers', async () => {
    const config = {
      state: {},
      // config handler names are ignored for host-callback semantics
      onCustomEvent(detail: any) {
        // should not be called by emit fallback
        throw new Error('config handler should not be invoked');
      },
      render(ctx: any) {
        return html`<div></div>`;
      },
    };
    const el = mount('test-oncustom', config);
    const spy = vi.fn();
    el.addEventListener('customEvent', spy);
    await Promise.resolve();
    (el as any).context.emit('customEvent', { test: 123 });
    expect(spy).toHaveBeenCalled();
    document.body.removeChild(el);
  });
});
