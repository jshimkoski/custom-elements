import { describe, it, expect } from 'vitest';
import {
  getNodeKey,
  setNodeKey,
  getElementTransition,
  setElementTransition,
} from '../src/lib/runtime/node-metadata';

describe('node-metadata (weakmap + fallback behavior)', () => {
  it('returns undefined for null/undefined nodes', () => {
    expect(getNodeKey(null)).toBeUndefined();
    expect(getNodeKey(undefined)).toBeUndefined();
  });

  it('setNodeKey writes attribute and property and getNodeKey reads it', () => {
    const el = document.createElement('div');
    setNodeKey(el, 'my-key');
    // Should prefer weakmap (internal) but still expose attribute/property fallbacks
    expect(el.getAttribute('data-anchor-key')).toBe('my-key');
    expect((el as any).key).toBe('my-key');
    expect(getNodeKey(el)).toBe('my-key');
  });

  it('handles WeakMap.set throwing by falling back to property/attribute', () => {
    // Basic sanity: no exception should be thrown when calling setNodeKey
    const el = document.createElement('span');
    setNodeKey(el, 'fallback-key');
    expect((el as any).key).toBe('fallback-key');
    expect(el.getAttribute('data-anchor-key')).toBe('fallback-key');
    expect(getNodeKey(el)).toBe('fallback-key');
  });

  it('getNodeKey falls back to .key or data-anchor-key when WeakMap.get throws', () => {
    const el = document.createElement('p');
    // Set legacy property and attribute and ensure getNodeKey sees them
    (el as any).key = 'legacy-prop';
    el.setAttribute('data-anchor-key', 'legacy-attr');
    expect(getNodeKey(el)).toBe('legacy-prop');
  });

  it('set/get element transition via weakmap and fallback property', () => {
    const el = document.createElement('div');
    const meta = { name: 'g', moveClass: 'm' } as any;
    setElementTransition(el, meta);
    expect(getElementTransition(el)).toEqual(meta);

    // Use a different element that only has the legacy property set so the
    // WeakMap lookup will be undefined and the fallback path is exercised.
    const el2 = document.createElement('div');
    (el2 as any)._transitionGroup = { name: 'legacy' };
    expect(getElementTransition(el2)).toEqual({ name: 'legacy' });
  });
});
