import { component } from '../../src/lib/runtime';
import { describe, it, expect } from 'vitest';
import { getTestConfig } from './getTestConfig';

describe('Smart DOM Batching', () => {
  it('batches multiple state changes efficiently', async () => {
    const config = Object.assign(getTestConfig(), {
      state: { count: 0 },
      template: ({ count }: any) => `<span>${count}</span>`
    });
    component('dom-batch-element', config as any);
    const el = document.createElement('dom-batch-element');
    document.body.appendChild(el);
    // @ts-ignore
    el['stateObj'].count++;
    // @ts-ignore
    el['stateObj'].count++;
    // @ts-ignore
    el['stateObj'].count++;
    await new Promise(requestAnimationFrame);
    expect(el.shadowRoot?.innerHTML).toContain('3');
    document.body.removeChild(el);
  });
});
