import { component } from '../../src/lib/runtime';
import { vi, describe, it, expect } from 'vitest';
import { getTestConfig } from './getTestConfig';

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