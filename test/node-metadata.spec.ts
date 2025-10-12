import { describe, it, expect, beforeEach } from 'vitest';
import * as nodeMeta from '../src/lib/runtime/node-metadata';

describe('node-metadata', () => {
  let el: HTMLElement;
  beforeEach(() => {
    el = document.createElement('div');
  });

  it('returns undefined for null/undefined nodes', () => {
    expect(nodeMeta.getNodeKey(null)).toBeUndefined();
    expect(nodeMeta.getNodeKey(undefined)).toBeUndefined();
    expect(nodeMeta.getElementTransition(null)).toBeUndefined();
    expect(nodeMeta.getElementTransition(undefined)).toBeUndefined();
  });

  it('setNodeKey and getNodeKey via internal WeakMap path', () => {
    nodeMeta.setNodeKey(el, 'abc');
    expect(nodeMeta.getNodeKey(el)).toBe('abc');
  });

  it('setElementTransition and getElementTransition via internal WeakMap path', () => {
    const obj = { name: 't1' };
    nodeMeta.setElementTransition(el, obj);
    expect(nodeMeta.getElementTransition(el)).toBe(obj);
  });

  it('falls back to legacy property for node key if WeakMap missing', () => {
    // Simulate environment where WeakMap get returns undefined by not using it,
    // but the legacy property is present.
    (el as any).key = 'legacy-key';
    expect(nodeMeta.getNodeKey(el)).toBe('legacy-key');
  });

  it('falls back to data-anchor-key attribute for node key', () => {
    el.setAttribute('data-anchor-key', 'attr-key');
    expect(nodeMeta.getNodeKey(el)).toBe('attr-key');
  });

  it('falls back to legacy _transitionGroup property for element transition', () => {
    (el as any)._transitionGroup = { name: 'legacy' };
    expect(nodeMeta.getElementTransition(el)).toEqual({ name: 'legacy' });
  });

  it('setNodeKey writes defensive fallbacks (property and attribute)', () => {
    const el2 = document.createElement('span');
    nodeMeta.setNodeKey(el2, 'x1');
    // property fallback
    expect((el2 as any).key).toBe('x1');
    // attribute fallback
    expect(el2.getAttribute('data-anchor-key')).toBe('x1');
  });

  it('setElementTransition writes legacy property fallback', () => {
    const el3 = document.createElement('p');
    const payload = { id: 5 };
    nodeMeta.setElementTransition(el3, payload);
    expect((el3 as any)._transitionGroup).toBe(payload);
  });
});
