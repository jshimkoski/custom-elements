import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  component,
  useRuntimePlugin,
  runtimePlugins,
} from '../src/lib/runtime';
import { getTestConfig } from './runtime/getTestConfig';

describe('runtime.ts', () => {
  beforeEach(() => {
    // Reset plugins
    runtimePlugins.length = 0;
  });

  it('registers a custom element and renders template', () => {
    component('test-element', getTestConfig());
    const el = document.createElement('test-element');
    document.body.appendChild(el);
    expect(el.shadowRoot?.innerHTML).toContain('Hello World');
    document.body.removeChild(el);
  });

  it('calls onMounted and onUnmounted lifecycle hooks', () => {
    const config = getTestConfig();
    component('lifecycle-element', config);
    const el = document.createElement('lifecycle-element');
    document.body.appendChild(el);
    expect(config.onMounted).toHaveBeenCalled();
    document.body.removeChild(el);
    expect(config.onUnmounted).toHaveBeenCalled();
  });

  it('supports computed properties', () => {
    const config = getTestConfig();
    component('computed-element', config);
    const el = document.createElement('computed-element');
    document.body.appendChild(el);
    // @ts-ignore
    expect(el['config'].computed.greeting({ name: 'Test' })).toBe('Hello Test');
    document.body.removeChild(el);
  });

  it('supports refs and calls ref handlers', () => {
    const config = getTestConfig();
    component('ref-element', config);
    const el = document.createElement('ref-element');
    document.body.appendChild(el);
    // Simulate ref element
    const refEl = document.createElement('div');
    refEl.setAttribute('data-ref', 'testRef');
    el.shadowRoot?.appendChild(refEl);
    // @ts-ignore
    el['processRefs']();
    expect(config.refs.testRef).toHaveBeenCalled();
    document.body.removeChild(el);
  });

  it('registers and calls runtime plugins', () => {
    const plugin = {
      onInit: vi.fn(),
      onRender: vi.fn(),
      onError: vi.fn(),
    };
    useRuntimePlugin(plugin);
    const config = getTestConfig();
    component('plugin-element', config);
    const el = document.createElement('plugin-element');
    document.body.appendChild(el);
    // @ts-ignore
    el['render']();
    expect(plugin.onRender).toHaveBeenCalled();
    document.body.removeChild(el);
  });

  it('handles attribute changes and updates state', () => {
    const config = getTestConfig();
    component('attr-element', config);
    const el = document.createElement('attr-element');
    document.body.appendChild(el);
    el.setAttribute('name', 'Changed');
    // @ts-ignore
    expect(el['stateObj'].name).toBe('Changed');
    document.body.removeChild(el);
  });

  it('handles errors and calls error boundaries', () => {
    const config = getTestConfig();
    config.template = () => { throw new Error('Test error'); };
    config.onError = vi.fn();
    component('error-element', config);
    const el = document.createElement('error-element');
    document.body.appendChild(el);
    // @ts-ignore
    el['render']();
    expect(config.onError).toHaveBeenCalled();
    document.body.removeChild(el);
  });
});
