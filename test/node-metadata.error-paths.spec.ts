import { describe, it, expect } from 'vitest';
import {
  getNodeKey,
  setNodeKey,
  getElementTransition,
  setElementTransition,
} from '../src/lib/runtime/node-metadata';

describe('runtime/node-metadata - error/catch paths', () => {
  it('swallows WeakMap.set errors in setNodeKey when non-object is passed', () => {
    // calling with a primitive should not throw even though WeakMap.set will
    // throw internally; API should swallow the error
    expect(() => (setNodeKey as any)('primitive', 'k')).not.toThrow();
  });

  it('swallows error when reading .key getter throws', () => {
    const bad = {} as any;
    Object.defineProperty(bad, 'key', {
      get() {
        throw new Error('boom');
      },
    });
    // should not throw and returns undefined
    expect(() => getNodeKey(bad as Node)).not.toThrow();
    expect(getNodeKey(bad as Node)).toBeUndefined();
  });

  it('setElementTransition swallows property setter errors but still uses WeakMap', () => {
    const el: any = document.createElement('div');
    // make the legacy property setter throw
    Object.defineProperty(el, '_transitionGroup', {
      set() {
        throw new Error('setter boom');
      },
      configurable: true,
    });
    const meta = { name: 'boom' };
    // should not throw despite the setter throwing
    expect(() => setElementTransition(el, meta)).not.toThrow();
    // WeakMap-backed getElementTransition should return the stored value
    expect(getElementTransition(el)).toEqual(meta);
  });

  it('swallows errors when legacy property setter throws in setNodeKey', () => {
    const obj: any = {};
    Object.defineProperty(obj, 'key', {
      set() {
        throw new Error('setter boom');
      },
      configurable: true,
    });
    // should swallow the property setter error
    expect(() => (setNodeKey as any)(obj, 'k')).not.toThrow();
  });

  it('swallows errors when setAttribute throws in setNodeKey', () => {
    const el: any = document.createElement('div');
    // make setAttribute throw
    el.setAttribute = () => {
      throw new Error('attr boom');
    };
    // should not throw even if attribute write fails
    expect(() => setNodeKey(el, 'k')).not.toThrow();
  });
});
