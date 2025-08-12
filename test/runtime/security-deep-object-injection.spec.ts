import { component } from '../../src/lib/runtime';
import { describe, it, expect } from 'vitest';
import { getTestConfig } from './getTestConfig';

describe('Security: Deep Object Injection', () => {
  it('prevents prototype pollution in state', () => {
    const config = getTestConfig();
  (config.state as any).__proto__.polluted = true;
    component('pollution-element', config);
    const el = document.createElement('pollution-element');
    document.body.appendChild(el);
    // @ts-ignore
    expect(({} as any).polluted).not.toBe(true);
    document.body.removeChild(el);
  });

  it('prevents deep object injection in config', () => {
    const config = getTestConfig();
    (config as any).constructor.prototype.injected = true;
    component('injection-element', config);
    const el = document.createElement('injection-element');
    document.body.appendChild(el);
    // @ts-ignore
    expect(({} as any).injected).not.toBe(true);
    document.body.removeChild(el);
  });
});
