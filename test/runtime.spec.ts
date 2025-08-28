import { describe, it, expect, vi } from 'vitest';
import { component } from '../src/lib/runtime';
import { html } from '../src/lib/template-compiler';

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

  it('emit calls onCustomEvent and dispatches event', async () => {
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
    (el as any).onCustomEvent = onCustomEvent;
    document.body.appendChild(el);
    await Promise.resolve();
    // Listen for event
    const eventSpy = vi.fn();
    el.addEventListener('customEvent', eventSpy);
    // Call emit
    (el as any).context.emit('customEvent', { foo: 'bar' });
    expect(onCustomEvent).toHaveBeenCalledWith({ foo: 'bar' }, (el as any).context);
    expect(eventSpy).toHaveBeenCalled();
    expect(eventSpy.mock.calls[0][0].detail).toEqual({ foo: 'bar' });
    document.body.removeChild(el);
  });

  it('onCustomEvent works via config and emit', async () => {
    let called = false;
    const config = {
      state: {},
      onCustomEvent(detail: any) {
        called = true;
        expect(detail).toEqual({ test: 123 });
      },
      render(ctx: any) {
        return html`<div></div>`;
      },
    };
    const el = mount('test-oncustom', config);
    await Promise.resolve();
    (el as any).context.emit('customEvent', { test: 123 });
    expect(called).toBe(true);
    document.body.removeChild(el);
  });
});
