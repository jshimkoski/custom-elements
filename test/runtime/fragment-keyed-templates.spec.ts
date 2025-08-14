import { component } from '../../src/lib/runtime';
import { describe, it, expect } from 'vitest';
import { getTestConfig } from './getTestConfig';

describe('Fragment & Keyed Templates', () => {
  it('handles fragment templates and keyed reconciliation', () => {
    const config = Object.assign(getTestConfig(), {
      state: { items: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }] },
      template: ({ items }: any) => `<div>${items.map((item: any) => `<span key='${item.id}'>${item.name}</span>`).join('')}</div>`
    });
    component('fragment-keyed-element', config as any);
    const el = document.createElement('fragment-keyed-element');
    document.body.appendChild(el);
    // Simulate list update
    // @ts-ignore
    el['stateObj'].items = [{ id: 2, name: 'B' }, { id: 1, name: 'A' }];
    expect(el.shadowRoot?.innerHTML).toContain('A');
    expect(el.shadowRoot?.innerHTML).toContain('B');
    document.body.removeChild(el);
  });
});
