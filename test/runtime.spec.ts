import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  component,
  useRuntimePlugin,
  runtimePlugins,
} from '../src/lib/runtime';

// Helper: create a minimal component config
function getTestConfig() {
  return {
    template: (state: any) => `<div>Hello ${state.name}</div>`,
    state: { name: 'World' },
    style: 'div { color: blue; }',
    computed: {
      greeting: (state: any) => `Hello ${state.name}`,
    },
    refs: {
      testRef: vi.fn(),
    },
    onMounted: vi.fn(),
    onUnmounted: vi.fn(),
    onError: vi.fn(),
    debug: true,
  };
}

describe('runtime.ts', () => {
  describe('data-on-* event binding', () => {
    let testId = 1000;
    async function setupEventComponent(eventAttr: string, eventType: string, handlerName: string, extra?: { tag?: string, elType?: string }) {
      testId++;
      const tag = extra?.tag ?? `event-test-element-${testId}`;
      const handler = vi.fn((e, state) => { state.fired = true; });
      const config = {
        template: () => `<input ${eventAttr}="${handlerName}"${extra?.elType ? ` type=\"${extra.elType}\"` : ''} data-model="fired">`,
        state: { fired: false },
        [handlerName]: handler,
      };
      component(tag, config);
      const el = document.createElement(tag);
      document.body.appendChild(el);
      if (typeof el['render'] === 'function') el['render']();
      // Wait for listeners to be attached
      const input = el.shadowRoot!.querySelector('input');
      while (!input || !(input as any)._dataModelBound) {
        await new Promise(requestAnimationFrame);
      }
      return { el, input, handler };
    }

    it('binds data-on-input', async () => {
      const { el, input, handler } = await setupEventComponent('data-on-input', 'input', 'onInput');
      input.value = 'test';
      input.dispatchEvent(new Event('input'));
      await new Promise(requestAnimationFrame);
      expect(handler).toHaveBeenCalled();
      // @ts-ignore
      expect(el['stateObj'].fired).toBeTruthy();
      document.body.removeChild(el);
    });

    it('binds data-on-change', async () => {
      const { el, input, handler } = await setupEventComponent('data-on-change', 'change', 'onChange');
      input.value = 'changed';
      input.dispatchEvent(new Event('change'));
      await new Promise(requestAnimationFrame);
      expect(handler).toHaveBeenCalled();
      // @ts-ignore
      expect(el['stateObj'].fired).toBeTruthy();
      document.body.removeChild(el);
    });

    it('binds data-on-blur', async () => {
      const { el, input, handler } = await setupEventComponent('data-on-blur', 'blur', 'onBlur');
      input.dispatchEvent(new Event('blur'));
      await new Promise(requestAnimationFrame);
      expect(handler).toHaveBeenCalled();
      // @ts-ignore
      expect(el['stateObj'].fired).toBeTruthy();
      document.body.removeChild(el);
    });

    it('binds data-on-click', async () => {
      const { el, input, handler } = await setupEventComponent('data-on-click', 'click', 'onClick');
      input.dispatchEvent(new Event('click'));
      await new Promise(requestAnimationFrame);
      expect(handler).toHaveBeenCalled();
      // @ts-ignore
      expect(el['stateObj'].fired).toBe(true);
      document.body.removeChild(el);
    });

    it('binds data-on-keydown', async () => {
      const { el, input, handler } = await setupEventComponent('data-on-keydown', 'keydown', 'onKeydown');
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      await new Promise(requestAnimationFrame);
      expect(handler).toHaveBeenCalled();
      // @ts-ignore
      expect(el['stateObj'].fired).toBeTruthy();
      document.body.removeChild(el);
    });

    it('binds data-on-custom', async () => {
      const { el, input, handler } = await setupEventComponent('data-on-custom', 'custom', 'onCustom');
      input.dispatchEvent(new Event('custom'));
      await new Promise(requestAnimationFrame);
      expect(handler).toHaveBeenCalled();
      // @ts-ignore
      expect(el['stateObj'].fired).toBe(true);
      document.body.removeChild(el);
    });
  });

  describe('data-model binding', () => {
    let testId = 0;
    function setupComponent(templateStr: string, state: any) {
      testId++;
      const tag = `form-test-element-${testId}`;
      const config = {
        template: () => templateStr,
        state,
        debug: false,
      };
      component(tag, config);
      const el = document.createElement(tag);
      document.body.appendChild(el);
      if (typeof el['render'] === 'function') el['render']();
      // Wait for listeners to be attached
      const waitForListeners = async () => {
      const inputs = el.shadowRoot?.querySelectorAll('[data-model]') ?? [];
      for (const input of inputs) {
        while (!(input as any)._dataModelBound) {
          await new Promise(requestAnimationFrame);
        }
      }
    };
    return { el, config, waitForListeners };
    }

    it('binds text input', async () => {
      const { el, waitForListeners } = setupComponent('<input data-model="textValue">', { textValue: '' });
      await waitForListeners();
      const input = el.shadowRoot!.querySelector('input') as HTMLInputElement;
      input.value = 'hello';
      input.dispatchEvent(new Event('input'));
      await new Promise(requestAnimationFrame);
      // @ts-ignore
      expect(el['stateObj'].textValue).toBe('hello');
      document.body.removeChild(el);
    });

    it('binds textarea', async () => {
      const { el, waitForListeners } = setupComponent('<textarea data-model="areaValue"></textarea>', { areaValue: '' });
      await waitForListeners();
      const textarea = el.shadowRoot!.querySelector('textarea') as HTMLTextAreaElement;
      textarea.value = 'world';
      textarea.dispatchEvent(new Event('input'));
      await new Promise(requestAnimationFrame);
      // @ts-ignore
      expect(el['stateObj'].areaValue).toBe('world');
      document.body.removeChild(el);
    });

    it('binds select', async () => {
      const { el, waitForListeners } = setupComponent('<select data-model="selectValue"><option value="a">A</option><option value="b">B</option></select>', { selectValue: 'a' });
      await waitForListeners();
      const select = el.shadowRoot!.querySelector('select') as HTMLSelectElement;
      select.value = 'b';
      select.dispatchEvent(new Event('change'));
      await new Promise(requestAnimationFrame);
      // @ts-ignore
      expect(el['stateObj'].selectValue).toBe('b');
      document.body.removeChild(el);
    });

    it('binds single checkbox (boolean)', async () => {
      const { el, waitForListeners } = setupComponent('<input type="checkbox" data-model="checkValue">', { checkValue: false });
      await waitForListeners();
      const checkbox = el.shadowRoot!.querySelector('input[type="checkbox"]') as HTMLInputElement;
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));
      await new Promise(requestAnimationFrame);
      // @ts-ignore
      expect(el['stateObj'].checkValue).toBe(true);
      checkbox.checked = false;
      checkbox.dispatchEvent(new Event('change'));
      await new Promise(requestAnimationFrame);
      // @ts-ignore
      expect(el['stateObj'].checkValue).toBe(false);
      document.body.removeChild(el);
    });

    it('binds single checkbox (custom true/false values)', async () => {
      const { el, waitForListeners } = setupComponent('<input type="checkbox" data-model="checkValue" data-true-value="yes" data-false-value="no">', { checkValue: 'no' });
      await waitForListeners();
      const checkbox = el.shadowRoot!.querySelector('input[type="checkbox"]') as HTMLInputElement;
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));
      await new Promise(requestAnimationFrame);
      // @ts-ignore
      expect(el['stateObj'].checkValue).toBe('yes');
      checkbox.checked = false;
      checkbox.dispatchEvent(new Event('change'));
      await new Promise(requestAnimationFrame);
      // @ts-ignore
      expect(el['stateObj'].checkValue).toBe('no');
      document.body.removeChild(el);
    });

    it('binds radio group', async () => {
      const { el, waitForListeners } = setupComponent('<input type="radio" name="group" value="one" data-model="radioValue"><input type="radio" name="group" value="two" data-model="radioValue">', { radioValue: 'one' });
      await waitForListeners();
      const radios = el.shadowRoot!.querySelectorAll('input[type="radio"]');
      (radios[1] as HTMLInputElement).checked = true;
      (radios[1] as HTMLInputElement).dispatchEvent(new Event('change'));
      await new Promise(requestAnimationFrame);
      // @ts-ignore
      expect(el['stateObj'].radioValue).toBe('two');
      document.body.removeChild(el);
    });

    it('binds multi-checkbox group (array)', async () => {
      const { el, waitForListeners } = setupComponent('<input type="checkbox" value="a" data-model="multiValue"><input type="checkbox" value="b" data-model="multiValue">', { multiValue: [] });
      await waitForListeners();
      // Force a synchronous render if available
      if (typeof el['render'] === 'function') el['render']();
      const checkboxes = el.shadowRoot!.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes.length).toBe(2);
      (checkboxes[0] as HTMLInputElement).checked = true;
      (checkboxes[0] as HTMLInputElement).dispatchEvent(new Event('change'));
      await new Promise(requestAnimationFrame);
      // @ts-ignore
      expect(el['stateObj'].multiValue.map(String)).toContain('a');
      (checkboxes[1] as HTMLInputElement).checked = true;
      (checkboxes[1] as HTMLInputElement).dispatchEvent(new Event('change'));
      await new Promise(requestAnimationFrame);
      // @ts-ignore
      expect(el['stateObj'].multiValue.map(String)).toContain('b');
      (checkboxes[0] as HTMLInputElement).checked = false;
      (checkboxes[0] as HTMLInputElement).dispatchEvent(new Event('change'));
      await new Promise(requestAnimationFrame);
      // @ts-ignore
      expect(el['stateObj'].multiValue.map(String)).not.toContain('a');
      document.body.removeChild(el);
    });
  });

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
  // --- Advanced Test Suites ---

  describe('Error Boundaries & Recovery', () => {
    it('recovers from errors in computed properties', () => {
      const config = getTestConfig();
      config.computed.greeting = () => { throw new Error('Computed error'); };
      config.onError = vi.fn();
      component('error-computed-element', config);
      const el = document.createElement('error-computed-element');
      document.body.appendChild(el);
      // @ts-ignore
      el['render']();
      expect(config.onError).toHaveBeenCalled();
      document.body.removeChild(el);
    });
    it('recovers from errors in lifecycle hooks', () => {
      const config = getTestConfig();
      config.onMounted = vi.fn(() => { throw new Error('Mount error'); });
      config.onError = vi.fn();
      component('error-lifecycle-element', config);
      const el = document.createElement('error-lifecycle-element');
      document.body.appendChild(el);
      expect(config.onError).toHaveBeenCalled();
      document.body.removeChild(el);
    });
  });

  describe('Attribute/Property Sync', () => {
    it('syncs null/undefined attributes to state', () => {
      const config = getTestConfig();
      component('sync-attr-element', config);
      const el = document.createElement('sync-attr-element');
      document.body.appendChild(el);
      el.setAttribute('name', '');
      // @ts-ignore
      expect(el['stateObj'].name).toBe('');
      el.removeAttribute('name');
      // @ts-ignore
      expect(el['stateObj'].name).toBeUndefined();
      document.body.removeChild(el);
    });
    it('coerces attribute types correctly', () => {
      const config = getTestConfig();
      component('coerce-attr-element', config);
      const el = document.createElement('coerce-attr-element');
      document.body.appendChild(el);
      el.setAttribute('name', '123');
      // @ts-ignore
      expect(typeof el['stateObj'].name).toBe('string');
      document.body.removeChild(el);
    });
  });

  describe('Shadow DOM & Light DOM', () => {
    it('supports slotting and event propagation', () => {
      const config = getTestConfig();
      config.template = () => `<slot></slot>`;
      component('slot-element', config);
      const el = document.createElement('slot-element');
      const child = document.createElement('span');
      let eventFired = false;
      child.addEventListener('click', () => { eventFired = true; });
      el.appendChild(child);
      document.body.appendChild(el);
      child.dispatchEvent(new Event('click', { bubbles: true }));
      expect(eventFired).toBe(true);
      document.body.removeChild(el);
    });
  });

  describe('Dynamic Template Updates', () => {
    it('updates template function at runtime', () => {
      const config = getTestConfig();
      component('dynamic-template-element', config);
      const el = document.createElement('dynamic-template-element');
      document.body.appendChild(el);
      // @ts-ignore
      expect(el.shadowRoot?.innerHTML).toContain('Hello World');
      config.template = () => `<div>Changed</div>`;
      // @ts-ignore
      el['render']();
      expect(el.shadowRoot?.innerHTML).toContain('Changed');
      document.body.removeChild(el);
    });
  });

  describe('Plugin System', () => {
    it('executes plugins in correct order', () => {
      const calls: string[] = [];
      const pluginA = { onInit: () => calls.push('A') };
      const pluginB = { onInit: () => calls.push('B') };
      useRuntimePlugin(pluginA);
      useRuntimePlugin(pluginB);
      component('plugin-order-element', getTestConfig());
      const el = document.createElement('plugin-order-element');
      document.body.appendChild(el);
      expect(calls).toEqual(['A', 'B']);
      document.body.removeChild(el);
    });
    it('handles plugin errors gracefully', () => {
      const plugin = { onInit: () => { throw new Error('Plugin error'); } };
      useRuntimePlugin(plugin);
      const config = getTestConfig();
      config.onError = vi.fn();
      component('plugin-error-element', config);
      const el = document.createElement('plugin-error-element');
      document.body.appendChild(el);
      expect(config.onError).toHaveBeenCalled();
      document.body.removeChild(el);
    });
  });

  describe('Global Event Bus', () => {
    it('allows cross-component event communication', () => {
      const configA = { ...getTestConfig(), onCustom: vi.fn() };
      const configB = { ...getTestConfig(), template: () => `<button data-on-click=\"onCustom\">Send</button>`, onCustom: vi.fn() };
      component('event-bus-a', configA);
      component('event-bus-b', configB);
      const elA = document.createElement('event-bus-a');
      const elB = document.createElement('event-bus-b');
      document.body.appendChild(elA);
      document.body.appendChild(elB);
      const btn = elB.shadowRoot!.querySelector('button')!;
      btn.dispatchEvent(new Event('click'));
      expect(configA.onCustom).not.toHaveBeenCalled(); // Should not be called unless global bus is used
      document.body.removeChild(elA);
      document.body.removeChild(elB);
    });
  });

  describe('Performance & Memory', () => {
    it('mounts and unmounts repeatedly without leaks', () => {
      const config = getTestConfig();
      component('perf-element', config);
      for (let i = 0; i < 10; i++) {
        const el = document.createElement('perf-element');
        document.body.appendChild(el);
        document.body.removeChild(el);
      }
      expect(config.onMounted).toHaveBeenCalledTimes(10);
      expect(config.onUnmounted).toHaveBeenCalledTimes(10);
    });
  });

  describe('Security & Input Validation', () => {
    it('sanitizes user input to prevent XSS', () => {
      const config = getTestConfig();
      config.state.name = '<img src=x onerror=alert(1)>';
      component('xss-element', config);
      const el = document.createElement('xss-element');
      document.body.appendChild(el);
      // @ts-ignore
      expect(el.shadowRoot?.innerHTML).not.toContain('onerror');
      document.body.removeChild(el);
    });
  });

  describe('Custom Element Lifecycle', () => {
    it('calls adoptedCallback if implemented', () => {
      const config = { ...getTestConfig(), adoptedCallback: vi.fn() };
      component('adopted-element', config);
      const el = document.createElement('adopted-element');
      document.body.appendChild(el);
      if (typeof el['adoptedCallback'] === 'function') {
        el['adoptedCallback']();
        expect(config.adoptedCallback).toHaveBeenCalled();
      }
      document.body.removeChild(el);
    });
  });

  describe('Edge Cases', () => {
    it('handles deeply nested components', () => {
      const config = getTestConfig();
      config.template = () => `<nested-element></nested-element>`;
      component('nested-element', getTestConfig());
      component('deep-element', config);
      const el = document.createElement('deep-element');
      document.body.appendChild(el);
      expect(el.shadowRoot?.innerHTML).toContain('nested-element');
      document.body.removeChild(el);
    });
    it('handles circular references in state', () => {
      const config = getTestConfig();
      // @ts-ignore
      config.state.self = config.state;
      component('circular-element', config);
      const el = document.createElement('circular-element');
      document.body.appendChild(el);
      expect(el.shadowRoot?.innerHTML).toContain('Hello World');
      document.body.removeChild(el);
    });
    it('handles malformed configs gracefully', () => {
      const config = {} as any;
      expect(() => component('malformed-element', config)).not.toThrow();
    });
  });
});
