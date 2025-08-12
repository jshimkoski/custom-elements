import { component } from '../../src/lib/runtime';
import { describe, it, expect } from 'vitest';
import { getTestConfig } from './getTestConfig';

describe('Attribute Reflection and Sync', () => {
  it('reflects state changes as attributes', () => {
    const config = getTestConfig();
    component('attr-reflect-element', config);
    const el = document.createElement('attr-reflect-element');
    document.body.appendChild(el);
    // @ts-ignore
    el['stateObj'].name = 'Reflected';
    // @ts-ignore
    el['render']();
    expect(el.getAttribute('name')).toBe('Reflected');
    document.body.removeChild(el);
  });

  it('reflects attribute changes in state', () => {
    const config = getTestConfig();
    component('attr-sync-element', config);
    const el = document.createElement('attr-sync-element');
    document.body.appendChild(el);
    el.setAttribute('name', 'Synced');
    // @ts-ignore
    expect(el['stateObj'].name).toBe('Synced');
    document.body.removeChild(el);
  });

  it('handles null, undefined, and empty string attributes', () => {
    const config = getTestConfig();
    component('attr-edge-element', config);
    const el = document.createElement('attr-edge-element');
    document.body.appendChild(el);
    el.setAttribute('name', '');
    // @ts-ignore
    expect(el['stateObj'].name).toBe('');
    el.removeAttribute('name');
    // @ts-ignore
    expect(el['stateObj'].name).toBeUndefined();
    document.body.removeChild(el);
  });
});
