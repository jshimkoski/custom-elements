import { describe, it, expect } from 'vitest';
import { component, type ComponentConfig } from '../src/lib/runtime';
import { html } from '../src/lib/template-compiler';

// Edge case: missing config
it('should throw error for missing config', () => {
  expect(() => component('missing-config', undefined as any)).toThrow();
});

// Edge case: invalid props
it('should handle invalid props gracefully', () => {
  component('invalid-props', {
    props: { foo: { type: null as any } },
    render: () => html`<div>Invalid</div>`
  });
  const el = document.createElement('invalid-props');
  document.body.appendChild(el);
  expect(el.shadowRoot?.textContent).toContain('Invalid');
  document.body.removeChild(el);
});

// Edge case: SSR fallback
it('should fallback to minimal class in SSR mode', () => {
  const origWindow = globalThis.window;
  // @ts-ignore
  delete globalThis.window;
  expect(() => {
    component('ssr-fallback', { render: () => html`<div>SSR</div>` });
  }).not.toThrow();
  globalThis.window = origWindow;
});

// Edge case: error boundary in lifecycle hook
it('should handle error in lifecycle hook', () => {
  let errorCalled = false;
  component('error-lifecycle', {
    onConnected: () => { throw new Error('fail'); },
    onError: () => { errorCalled = true; },
    errorFallback: () => 'fallback',
    render: () => html`<div>Lifecycle</div>`
  });
  const el = document.createElement('error-lifecycle');
  document.body.appendChild(el);
  expect(errorCalled).toBe(true);
  expect(el.shadowRoot?.textContent).toContain('fallback');
  document.body.removeChild(el);
});

function wait(ms = 10) {
  return new Promise(r => setTimeout(r, ms));
}

describe('component config options', () => {
  it('should support state and render', async () => {
    component('test-state-render', {
      state: { msg: 'hello' },
      render: (state) => html`<div>${state.msg}</div>`
    });
    const el = document.createElement('test-state-render');
    document.body.appendChild(el);
    await wait();
    expect(el.shadowRoot?.textContent).toContain('hello');
    document.body.removeChild(el);
  });

  it('should support computed properties', async () => {
    component('test-computed', {
      state: { a: 2, b: 3 },
      computed: {
        sum: (state) => state.a + state.b
      },
      render: (state) => html`<span>${state.sum}</span>`
    });
    const el = document.createElement('test-computed');
    document.body.appendChild(el);
    await wait();
    expect(el.shadowRoot?.textContent).toBe('5');
    document.body.removeChild(el);
  });

  it('should support props with default values', async () => {
    component('test-props', {
      props: { foo: { type: String, default: 'bar' } },
      render: (state) => html`<span>${state.foo}</span>`
    });
    const el = document.createElement('test-props');
    document.body.appendChild(el);
    await wait();
    expect(el.shadowRoot?.textContent).toBe('bar');
    el.setAttribute('foo', 'baz');
    await wait();
    expect(el.shadowRoot?.textContent).toBe('baz');
    document.body.removeChild(el);
  });

  it('should call watch callbacks on state change', async () => {
    let called = false;
    let elInstance: any = null;
    component('test-watch', {
      state: { val: 1 },
      watch: {
        val(newValue, oldValue) {
          if (newValue === 2 && oldValue === 1) called = true;
        }
      },
      render: (state) => {
        elInstance = state;
        return html`<span>${state.val}</span>`;
      }
    });
    const el = document.createElement('test-watch');
    document.body.appendChild(el);
    await wait();
    // Directly mutate state for test
    elInstance.val = 2;
    await wait();
    expect(called).toBe(true);
    document.body.removeChild(el);
  });

  it('should apply style as string', async () => {
    component('test-style-string', {
      style: 'div { color: red; }',
      render: () => html`<div>Styled</div>`
    });
    const el = document.createElement('test-style-string');
    document.body.appendChild(el);
    await wait();
    const style = el.shadowRoot?.querySelector('style')?.textContent;
    expect(style).toContain('color: red');
    document.body.removeChild(el);
  });

  it('should apply style as function', async () => {
    component('test-style-fn', {
      state: { color: 'blue' },
      style: (state) => `div { color: ${state.color}; }`,
      render: (state) => html`<div>Styled</div>`
    });
    const el = document.createElement('test-style-fn');
    document.body.appendChild(el);
    await wait();
    const style = el.shadowRoot?.querySelector('style')?.textContent;
    expect(style).toContain('color: blue');
    document.body.removeChild(el);
  });

  it('should support styleOptimizations', async () => {
    component('test-style-opt', {
      style: 'div { color: green; }',
      styleOptimizations: { debounceMs: 1 },
      render: () => html`<div>Styled</div>`
    });
    const el = document.createElement('test-style-opt');
    document.body.appendChild(el);
    await wait();
    expect(el.shadowRoot?.querySelector('style')).toBeTruthy();
    document.body.removeChild(el);
  });

  it('should call onConnected and onDisconnected', async () => {
    let connected = false;
    let disconnected = false;
    component('test-lifecycle', {
      onConnected: () => { connected = true; },
      onDisconnected: () => { disconnected = true; },
      render: () => html`<div>Lifecycle</div>`
    });
    const el = document.createElement('test-lifecycle');
    document.body.appendChild(el);
    await wait();
    expect(connected).toBe(true);
    document.body.removeChild(el);
    await wait();
    expect(disconnected).toBe(true);
  });

  it('should call onAttributeChanged', async () => {
    let called = false;
    component('test-attr', {
      props: { foo: { type: String } },
      onAttributeChanged: (name, oldValue, newValue, _ctx) => {
        if (name === 'foo' && oldValue === null && newValue === 'bar') called = true;
      },
      render: () => html`<div>Attr</div>`
    });
    const el = document.createElement('test-attr');
    document.body.appendChild(el);
    el.setAttribute('foo', 'bar');
    await wait();
    expect(called).toBe(true);
    document.body.removeChild(el);
  });

  it('should call onError and errorFallback', async () => {
    let errorCalled = false;
    let fallbackCalled = false;
    component('test-error', {
      render: () => { throw new Error('fail'); },
      onError: () => { errorCalled = true; },
      errorFallback: () => { fallbackCalled = true; return 'fallback'; }
    });
    const el = document.createElement('test-error');
    document.body.appendChild(el);
    await wait();
    expect(errorCalled).toBe(true);
    expect(fallbackCalled).toBe(true);
    document.body.removeChild(el);
  });

  it('should use loadingTemplate and errorTemplate', async () => {
    component('test-templates', {
      state: { loaded: false },
      render: async (state) => {
        if (!state.loaded) throw new Error('not loaded');
        return html`<div>Loaded</div>`;
      },
      loadingTemplate: () => html`<div>Loading...</div>`,
      errorTemplate: (err) => html`<div>Error: ${err.message}</div>`
    });
    const el = document.createElement('test-templates');
    document.body.appendChild(el);
    await wait(20);
    expect(el.shadowRoot?.textContent).toContain('Error: not loaded');
    document.body.removeChild(el);
  });

  it('should inject methods into state', async () => {
    component('test-methods', {
      state: { val: 1 },
      doSomething() { return 'done'; },
      render: (state) => html`<span>${state.doSomething()}</span>`
    });
    const el = document.createElement('test-methods');
    document.body.appendChild(el);
    await wait();
    expect(el.shadowRoot?.textContent).toBe('done');
    document.body.removeChild(el);
  });

  it('should throw if render is missing', () => {
    expect(() => {
      component('test-missing-render', {} as ComponentConfig<{}, {}, {}, any>);
    }).toThrow('Component must have a render function');
  });

  it('should handle missing props/state/style gracefully', async () => {
    component('test-missing', {
      render: () => html`<div>Missing</div>`
    });
    const el = document.createElement('test-missing');
    document.body.appendChild(el);
    await wait();
    expect(el.shadowRoot?.textContent).toContain('Missing');
    document.body.removeChild(el);
  });

  it('should handle error thrown in computed', async () => {
    let errorCalled = false;
    component('test-computed-error', {
      state: { a: 1 },
      computed: {
        fail: () => { throw new Error('computed fail'); }
      },
      onError: () => { errorCalled = true; },
      errorFallback: () => 'fallback',
      render: (state) => html`<div>${state.fail}</div>`
    });
    const el = document.createElement('test-computed-error');
    document.body.appendChild(el);
    await wait();
    expect(errorCalled).toBe(true);
    expect(el.shadowRoot?.textContent).toContain('fallback');
    document.body.removeChild(el);
  });

  it('should handle error thrown in style function', async () => {
    let errorCalled = false;
    component('test-style-error', {
      state: { color: 'red' },
      style: () => { throw new Error('style fail'); },
      onError: () => { errorCalled = true; },
      errorFallback: () => 'fallback',
      render: () => html`<div>Styled</div>`
    });
    const el = document.createElement('test-style-error');
    document.body.appendChild(el);
    await wait();
    expect(errorCalled).toBe(true);
    expect(el.shadowRoot?.textContent).toContain('fallback');
    document.body.removeChild(el);
  });

  it('should handle error thrown in lifecycle hooks', async () => {
    let errorCalled = false;
    component('test-lifecycle-error', {
      onConnected: () => { throw new Error('connected fail'); },
      onError: () => { errorCalled = true; },
      errorFallback: () => 'fallback',
      render: () => html`<div>Lifecycle</div>`
    });
    const el = document.createElement('test-lifecycle-error');
    document.body.appendChild(el);
    await wait();
    expect(errorCalled).toBe(true);
    expect(el.shadowRoot?.textContent).toContain('fallback');
    document.body.removeChild(el);
  });

  it('should allow method override in state', async () => {
    component('test-method-override', {
      state: { val: 1 },
      doSomething() { return 'base'; },
      render: (state) => html`<span>${state.doSomething()}</span>`
    });
    const el = document.createElement('test-method-override');
    document.body.appendChild(el);
    await wait();
    // Override method
    const ctx = (el.shadowRoot?.host as any).context;
    if (ctx) ctx.doSomething = () => 'override';
    el.setAttribute('val', '2');
    await wait();
    expect(el.shadowRoot?.textContent).toBe('override');
    document.body.removeChild(el);
  });

  it('should support multiple renders and reactivity', async () => {
    component('test-multi-render', {
      state: { count: 0 },
      render: (state) => html`<span>${state.count}</span>`
    });
    const el = document.createElement('test-multi-render');
    document.body.appendChild(el);
    await wait();
    expect(el.shadowRoot?.textContent).toBe('0');
    // Simulate state change
    const ctx = (el.shadowRoot?.host as any).context;
    if (ctx) ctx.count = 5;
    await wait();
    expect(el.shadowRoot?.textContent).toBe('5');
    document.body.removeChild(el);
  });

  it('should fallback to minimal class in SSR', () => {
    const origWindow = globalThis.window;
    // @ts-ignore
    delete globalThis.window;
    expect(() => {
      component('test-ssr', { render: () => html`<div>SSR</div>` });
    }).not.toThrow();
    globalThis.window = origWindow;
  });

  // HMR registry update test (simulate hot reload)
  it.skip('should allow re-registering a component with new config', async () => {
    component('test-hmr', {
      render: () => html`<div>HMR1</div>`
    });
    const el = document.createElement('test-hmr');
    document.body.appendChild(el);
    await wait();
    expect(el.shadowRoot?.textContent).toContain('HMR1');
    document.body.removeChild(el);

    // Re-register with new config
    component('test-hmr', {
      render: () => html`<div>HMR2</div>`
    });
    const el2 = document.createElement('test-hmr');
    document.body.appendChild(el2);
    await wait();
    expect(el2.shadowRoot?.textContent).toContain('HMR2');
    document.body.removeChild(el2);
  });

  // Error boundary in render
  it('should handle error in render and call errorFallback', () => {
    let fallbackCalled = false;
    component('error-render', {
      render: () => { throw new Error('fail'); },
      errorFallback: () => { fallbackCalled = true; return 'fallback'; }
    });
    const el = document.createElement('error-render');
    document.body.appendChild(el);
    expect(fallbackCalled).toBe(true);
    expect(el.shadowRoot?.textContent).toContain('fallback');
    document.body.removeChild(el);
  });

  // Style optimizations: minification and deduplication
  it('should apply style optimizations', () => {
    component('style-opt', {
      style: 'div { color: red; } div { color: red; }',
      styleOptimizations: { enableMinification: true, enableDeduplication: true },
      render: () => html`<div>Styled</div>`
    });
    const el = document.createElement('style-opt');
    document.body.appendChild(el);
    const style = el.shadowRoot?.querySelector('style')?.textContent;
    expect(style).toContain('color:red');
    document.body.removeChild(el);
  });

  // Watcher with immediate option
  it('should call watcher immediately if immediate is true', () => {
    let called = false;
    component('immediate-watch', {
      state: { val: 1 },
      watch: {
        val: [(newVal, oldVal) => { called = true; }, { immediate: true }]
      },
      render: (state) => html`<span>${state.val}</span>`
    });
    const el = document.createElement('immediate-watch');
    document.body.appendChild(el);
    expect(called).toBe(true);
    document.body.removeChild(el);
  });

  // SSR fallback for missing window
  it('should fallback to minimal class in SSR', () => {
    const origWindow = globalThis.window;
    // @ts-ignore
    delete globalThis.window;
    expect(() => {
      component('ssr-fallback2', { render: () => html`<div>SSR</div>` });
    }).not.toThrow();
    globalThis.window = origWindow;
  });
});