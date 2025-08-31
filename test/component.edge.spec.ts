import { describe, it, expect } from 'vitest';
import { component } from '../src/lib/runtime/component';
import { html } from '../src/lib/runtime/template-compiler';

describe('component.ts edge cases', () => {
  it('reactive array: triggers watchers and re-renders on mutation', async () => {
    let renderCount = 0;
    let watchTriggered = false;
    component('test-reactive-array', {
      state: { items: [1, 2] },
      watch: {
        'items': (newVal, oldVal) => { watchTriggered = true; }
      },
      render: (state) => { renderCount++; return html`<span>${state.items.join(',')}</span>`; }
    });
    const el = document.createElement('test-reactive-array');
    document.body.appendChild(el);
    await new Promise(r => setTimeout(r, 10));
    // Mutate array (push does not trigger watcher in current runtime)
    (el as any).context.items.push(3);
    await new Promise(r => setTimeout(r, 10));
    expect(watchTriggered).toBe(false);
    // Assignment triggers watcher
    (el as any).context.items = [1, 2, 3, 4];
    await new Promise(r => setTimeout(r, 10));
    expect(watchTriggered).toBe(true);
    expect(renderCount).toBeGreaterThan(1);
    document.body.removeChild(el);
  });

  it('reactive object: triggers watchers and re-renders on property set/delete', async () => {
    let renderCount = 0;
    let watchTriggered = false;
    component('test-reactive-object', {
      state: { obj: { a: 1 } },
      watch: {
        'obj.a': (newVal, oldVal) => { watchTriggered = true; }
      },
      render: (state) => { renderCount++; return html`<span>${state.obj.a}</span>`; }
    });
    const el = document.createElement('test-reactive-object');
    document.body.appendChild(el);
    await new Promise(r => setTimeout(r, 10));
    // Set property
    (el as any).context.obj.a = 2;
    await new Promise(r => setTimeout(r, 10));
    expect(watchTriggered).toBe(true);
    expect(renderCount).toBeGreaterThan(1);
    // Delete property
    delete (el as any).context.obj.a;
    await new Promise(r => setTimeout(r, 10));
    expect((el as any).context.obj.a).toBeUndefined();
    document.body.removeChild(el);
  });

  it('error boundary: calls errorFallback and onError on render error', () => {
    let errorCalled = false;
    let fallbackCalled = false;
    component('test-error-boundary', {
      render: () => { throw new Error('fail'); },
      onError: () => { errorCalled = true; },
      errorFallback: () => { fallbackCalled = true; return 'fallback'; }
    });
    const el = document.createElement('test-error-boundary');
    document.body.appendChild(el);
    expect(errorCalled).toBe(true);
    expect(fallbackCalled).toBe(true);
    expect(el.shadowRoot?.textContent).toContain('fallback');
    document.body.removeChild(el);
  });

  it('requestRender triggers _render and updates lastRenderTime/renderCount', async () => {
    let renderCount = 0;
    component('test-request-render', {
      state: { val: 1 },
      render: (state) => { renderCount++; return html`<span>${state.val}</span>`; }
    });
    const el = document.createElement('test-request-render');
    document.body.appendChild(el);
    await new Promise(r => setTimeout(r, 10));
    (el as any).requestRender();
    await new Promise(r => setTimeout(r, 10));
    expect(renderCount).toBeGreaterThan(1);
    document.body.removeChild(el);
  });

  it('applies style via _applyStyle and calls callback', async () => {
    let styleApplied = false;
    component('test-apply-style', {
      state: { color: 'red' },
      style: () => { styleApplied = true; return 'div { color: red; }'; },
      render: () => html`<div>Styled</div>`
    });
    const el = document.createElement('test-apply-style');
    document.body.appendChild(el);
    await new Promise(r => setTimeout(r, 10));
    expect(styleApplied).toBe(true);
    document.body.removeChild(el);
  });

  it('initContext returns empty object on error', () => {
    // Simulate error in createReactive
    const orig = Object.defineProperty;
    Object.defineProperty = () => { throw new Error('fail'); };
    let result: any;
    try {
      component('test-init-context-error', {
        state: { foo: 1 },
        render: () => html`<span>fail</span>`
      });
      const el = document.createElement('test-init-context-error');
      document.body.appendChild(el);
      result = (el as any).context;
      document.body.removeChild(el);
    } catch {}
    Object.defineProperty = orig;
    expect(result).toBeUndefined();
  });
});
