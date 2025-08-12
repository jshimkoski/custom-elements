import { component } from '../../src/lib/runtime';
import { vi, describe, it, expect } from 'vitest';
import { getTestConfig } from './getTestConfig';

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