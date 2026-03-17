import { describe, it, expect } from 'vitest';
import {
  getNodeKey,
  setNodeKey,
  getElementTransition,
  setElementTransition,
} from '../src/lib/runtime/node-metadata';

describe('runtime/node-metadata', () => {
  it('returns undefined for null/undefined nodes', () => {
    expect(getNodeKey(null)).toBeUndefined();
    expect(getNodeKey(undefined)).toBeUndefined();
    expect(getElementTransition(null)).toBeUndefined();
    expect(getElementTransition(undefined)).toBeUndefined();
  });

  it('uses legacy key property fallback for non-DOM objects', () => {
    const fake = { key: 5 } as unknown as Node;
    expect(getNodeKey(fake)).toBe('5');
  });

  it('reads data-anchor-key attribute when present', () => {
    const el = document.createElement('div');
    el.setAttribute('data-anchor-key', 'attr-val');
    expect(getNodeKey(el)).toBe('attr-val');
  });

  it('setNodeKey writes key, attribute and makes getNodeKey return it', () => {
    const el = document.createElement('div');
    expect(getNodeKey(el)).toBeUndefined();
    setNodeKey(el, 'my-key');
    // getNodeKey should read the WeakMap-stored value (or fallback to attribute/property)
    expect(getNodeKey(el)).toBe('my-key');
    // defensive fallbacks should also be present
    // property 'key' and attribute 'data-anchor-key' are set where possible
    // (some environments may not expose the legacy property, but the attribute must exist)
    expect(el.getAttribute('data-anchor-key')).toBe('my-key');
  });

  it('getElementTransition/setElementTransition prefer WeakMap but fallback to property', () => {
    const el = document.createElement('div');
    const meta = { name: 't', appear: true };
    // legacy property fallback
    (el as any)._transitionGroup = meta;
    expect(getElementTransition(el)).toBe(meta);

    // setting via API should make it retrievable
    const el2 = document.createElement('div');
    const meta2 = { name: 'x' };
    setElementTransition(el2, meta2);
    expect(getElementTransition(el2)).toEqual(meta2);
    // also check the defensive legacy property exists
    expect((el2 as any)._transitionGroup).toEqual(meta2);
  });
});

describe('node-metadata extra cases', () => {
  it('reads data-anchor-key attribute when WeakMap not set', () => {
    const el = document.createElement('div');
    el.setAttribute('data-anchor-key', 'attr-key');
    expect(getNodeKey(el)).toBe('attr-key');
  });

  it('setElementTransition/getElementTransition fallback to legacy property', () => {
    const el = document.createElement('div');
    // set via legacy property
    (el as any)._transitionGroup = { name: 'g1' };
    expect(getElementTransition(el)).toEqual({ name: 'g1' });

    // set via setter and read back
    setElementTransition(el, { name: 'g2' });
    const got = getElementTransition(el);
    expect(got && (got as any).name).toBe('g2');
  });
});
