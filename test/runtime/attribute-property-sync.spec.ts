import { component } from '../../src/lib/runtime';
import { vi, describe, it, expect } from 'vitest';
import { getTestConfig } from './getTestConfig';

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