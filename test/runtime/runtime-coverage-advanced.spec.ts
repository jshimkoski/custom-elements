import { component, useRuntimePlugin } from '../../src/lib/runtime';
import { describe, it, expect, vi } from 'vitest';
import { getTestConfig } from './getTestConfig';

describe('Runtime Error Boundaries', () => {
  it('renders fallback UI when template throws', () => {
    const config = Object.assign(getTestConfig(), {
      template: () => { throw new Error('template error'); },
      state: { foo: 'bar' },
      debug: true
    });
    component('error-template-element', config as any);
    const el = document.createElement('error-template-element');
    document.body.appendChild(el);
    expect(el.shadowRoot!.innerHTML).toContain('Error Boundary');
    expect(el.shadowRoot!.innerHTML).toContain('template error');
    document.body.removeChild(el);
  });

  it('renders fallback UI when computed throws', () => {
    const config = Object.assign(getTestConfig(), {
      template: () => '<div></div>',
      state: { foo: 'bar' },
      computed: {
        bad: () => { throw new Error('computed error'); }
      },
      debug: true
    });
    component('error-computed-element', config as any);
    const el = document.createElement('error-computed-element');
    document.body.appendChild(el);
    expect(el.shadowRoot!.innerHTML).toContain('Error Boundary');
    expect(el.shadowRoot!.innerHTML).toContain('computed error');
    document.body.removeChild(el);
  });

  it('renders fallback UI when lifecycle throws', () => {
    const config = Object.assign(getTestConfig(), {
      template: () => '<div></div>',
      state: { foo: 'bar' },
      onMounted: () => { throw new Error('mounted error'); },
      debug: true
    });
    component('error-lifecycle-element', config as any);
    const el = document.createElement('error-lifecycle-element');
    document.body.appendChild(el);
    expect(el.shadowRoot!.innerHTML).toContain('Error Boundary');
    expect(el.shadowRoot!.innerHTML).toContain('mounted error');
    document.body.removeChild(el);
  });

  it('renders fallback UI when ref handler throws', async () => {
    const config = Object.assign(getTestConfig(), {
      template: () => '<div data-ref="badRef"></div>',
      state: { foo: 'bar' },
      refs: {
        badRef: () => { throw new Error('ref error'); }
      },
      debug: true
    });
    component('error-ref-element', config as any);
    const el = document.createElement('error-ref-element');
    document.body.appendChild(el);
    await new Promise(r => setTimeout(r, 10));
    expect(el.shadowRoot!.innerHTML).toContain('Error Boundary');
    expect(el.shadowRoot!.innerHTML).toContain('ref error');
    document.body.removeChild(el);
  });

  it('renders fallback UI when plugin throws', () => {
    useRuntimePlugin({
      onRender: () => { throw new Error('plugin error'); }
    });
    const config = Object.assign(getTestConfig(), {
      template: () => '<div></div>',
      state: { foo: 'bar' },
      debug: true
    });
    component('error-plugin-element', config as any);
    const el = document.createElement('error-plugin-element');
    document.body.appendChild(el);
    expect(el.shadowRoot!.innerHTML).toContain('Error Boundary');
    expect(el.shadowRoot!.innerHTML).toContain('plugin error');
    document.body.removeChild(el);
  });
});

describe('Runtime SSR Hydration', () => {
  it('calls hydrate function and sets data-hydrated', () => {
    let hydrated = false;
    const config = Object.assign(getTestConfig(), {
      template: () => '<div data-hydrate></div>',
      state: { foo: 'bar' },
      hydrate: () => { hydrated = true; }
    });
    component('ssr-hydrate-test', config as any);
    const el = document.createElement('ssr-hydrate-test');
    el.setAttribute('data-hydrated', 'true');
    document.body.appendChild(el);
    expect(hydrated).toBe(true);
    document.body.removeChild(el);
  });
});

describe('Runtime Plugin System', () => {
  it('calls plugin hooks onInit, onRender, onError', async () => {
    const onInit = vi.fn();
    const onRender = vi.fn();
    const onError = vi.fn();
    useRuntimePlugin({ onInit, onRender, onError });
    const config = Object.assign(getTestConfig(), {
      template: () => { throw new Error('plugin error'); },
      state: { foo: 'bar' },
      debug: true
    });
    component('plugin-hooks-element', config as any);
    const el = document.createElement('plugin-hooks-element');
    document.body.appendChild(el);
    await new Promise(r => setTimeout(r, 10));
    expect(onInit).toHaveBeenCalled();
    expect(onRender).toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
    document.body.removeChild(el);
  });
});
