import { component } from '../../src/lib/runtime';
import { describe, it, expect } from 'vitest';
import { getTestConfig } from './getTestConfig';

describe('Attribute Reflection & Sync', () => {
  it('syncs state changes to attributes and vice versa', () => {
    const config = Object.assign(getTestConfig(), {
      state: { name: '' }
    });
    component('attr-sync-element', config as any);
    const el = document.createElement('attr-sync-element');
    document.body.appendChild(el);
    el.setAttribute('name', 'test');
    // @ts-ignore
    expect(el['stateObj'].name).toBe('test');
    el.removeAttribute('name');
    // @ts-ignore
    expect(el['stateObj'].name).toBeUndefined();
    document.body.removeChild(el);
  });

  it('coerces attribute types correctly', () => {
    const config = Object.assign(getTestConfig(), {
      state: { count: '' }
    });
    component('attr-type-element', config as any);
    const el = document.createElement('attr-type-element');
    document.body.appendChild(el);
    el.setAttribute('count', '123');
    // @ts-ignore
    expect(typeof el['stateObj'].count).toBe('string');
    document.body.removeChild(el);
  });

  it('reflects only whitelisted keys', () => {
    const config = Object.assign(getTestConfig(), {
      state: { foo: 'bar', baz: 'qux' },
      reflect: ['foo']
    });
    component('attr-reflect-element', config as any);
    const el = document.createElement('attr-reflect-element');
    document.body.appendChild(el);
    // @ts-ignore
    el['stateObj'].foo = 'updated';
    el['stateObj'].baz = 'hidden';
  (el as any).render();
    expect(el.getAttribute('foo')).toBe('updated');
    expect(el.getAttribute('baz')).toBeNull();
    document.body.removeChild(el);
  });

  it('handles all primitive types', () => {
    const config = Object.assign(getTestConfig(), {
      state: { str: '', num: 0, bool: false, undef: undefined, nul: null },
      reflect: ['str', 'num', 'bool', 'undef', 'nul']
    });
    component('attr-types-element', config as any);
    const el = document.createElement('attr-types-element');
    document.body.appendChild(el);
    // @ts-ignore
    el['stateObj'].str = 'abc';
    el['stateObj'].num = 42;
    el['stateObj'].bool = true;
    el['stateObj'].undef = undefined;
    el['stateObj'].nul = null;
  (el as any).render();
    expect(el.getAttribute('str')).toBe('abc');
    expect(el.getAttribute('num')).toBe('42');
    expect(el.getAttribute('bool')).toBe('true');
    expect(el.getAttribute('undef')).toBeNull();
    expect(el.getAttribute('nul')).toBeNull();
    document.body.removeChild(el);
  });

  it('removes attribute when state is set to undefined or null', () => {
    const config = Object.assign(getTestConfig(), {
      state: { foo: 'bar' },
      reflect: ['foo']
    });
    component('attr-remove-element', config as any);
    const el = document.createElement('attr-remove-element');
    document.body.appendChild(el);
    // @ts-ignore
    el['stateObj'].foo = undefined;
  (el as any).render();
    expect(el.getAttribute('foo')).toBeNull();
    // @ts-ignore
    el['stateObj'].foo = null;
  (el as any).render();
    expect(el.getAttribute('foo')).toBeNull();
    document.body.removeChild(el);
  });

  it('ignores dangerous/prototype pollution keys', () => {
    const config = Object.assign(getTestConfig(), {
      state: { __proto__: 'bad', constructor: 'bad', prototype: 'bad', safe: 'ok' },
      reflect: ['__proto__', 'constructor', 'prototype', 'safe']
    });
    component('attr-pollution-element', config as any);
    const el = document.createElement('attr-pollution-element');
    document.body.appendChild(el);
    // @ts-ignore
    el['stateObj'].safe = 'ok';
    el['stateObj'].__proto__ = 'bad';
    el['stateObj'].constructor = 'bad';
    el['stateObj'].prototype = 'bad';
  (el as any).render();
    expect(el.getAttribute('safe')).toBe('ok');
    expect(el.getAttribute('__proto__')).toBeNull();
    expect(el.getAttribute('constructor')).toBeNull();
    expect(el.getAttribute('prototype')).toBeNull();
    document.body.removeChild(el);
  });

  it('syncs attribute changes to state for all primitive types', () => {
    const config = Object.assign(getTestConfig(), {
      state: { str: '', num: 0, bool: false },
      reflect: ['str', 'num', 'bool']
    });
    component('attr-sync-types-element', config as any);
    const el = document.createElement('attr-sync-types-element');
    document.body.appendChild(el);
    el.setAttribute('str', 'xyz');
    el.setAttribute('num', '99');
    el.setAttribute('bool', 'true');
    // @ts-ignore
    expect(el['stateObj'].str).toBe('xyz');
    // @ts-ignore
    expect(el['stateObj'].num).toBe(99);
    // @ts-ignore
    expect(el['stateObj'].bool).toBe(true);
    document.body.removeChild(el);
  });
});
