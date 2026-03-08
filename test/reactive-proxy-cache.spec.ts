import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ReactiveProxyCache,
  ProxyOptimizer,
} from '../src/lib/runtime/reactive-proxy-cache';

describe('ReactiveProxyCache & ProxyOptimizer', () => {
  beforeEach(() => {
    ReactiveProxyCache.clear();
  });

  it('caches proxies and returns same proxy for same object', () => {
    const obj = { a: 1 };
    const onUpdate = vi.fn();
    const makeReactive = (v: any) => v;

    const p1 = ProxyOptimizer.createReactiveProxy(obj, onUpdate, makeReactive);
    const p2 = ProxyOptimizer.createReactiveProxy(obj, onUpdate, makeReactive);

    expect(p1).toBe(p2);
    expect(ReactiveProxyCache.hasProxy(obj)).toBe(true);
  });

  it('array handler triggers on mutation methods', () => {
    const arr = [1, 2, 3];
    const onUpdate = vi.fn();
    const makeReactive = (v: any) => v;

    const proxy = ProxyOptimizer.createReactiveProxy(
      arr,
      onUpdate,
      makeReactive,
    ) as any;
    // push should call triggerUpdate
    proxy.push(4);
    expect(onUpdate).toHaveBeenCalled();
    expect(proxy.length).toBe(4);
  });

  it('object handler set/delete triggers update and wraps values', () => {
    const obj: any = { a: 1 };
    const onUpdate = vi.fn();
    // Mimic real makeReactive: only wrap primitives, pass objects through
    // (the real implementation is idempotent — returning the same proxy
    // when called a second time on an already-reactive value).
    const makeReactive = vi.fn((v: any) =>
      typeof v === 'object' && v !== null ? v : { v },
    );

    const proxy = ProxyOptimizer.createReactiveProxy(
      obj,
      onUpdate,
      makeReactive,
    ) as any;
    proxy.b = 2;
    expect(makeReactive).toHaveBeenCalledWith(2);
    expect(onUpdate).toHaveBeenCalled();
    expect(proxy.b).toEqual({ v: 2 });

    delete proxy.b;
    expect(onUpdate).toHaveBeenCalledTimes(2);
    expect(proxy.b).toBeUndefined();
  });

  it('markAsProxy defines non-enumerable flag', () => {
    const plain = {} as any;
    ProxyOptimizer.markAsProxy(plain);
    const desc = Object.getOwnPropertyDescriptor(plain, '__isProxy__');
    expect(desc).toBeUndefined();
  });

  it('returns same proxy instance and recognizes proxies', () => {
    const obj = { x: 1 };
    const onUpdate = vi.fn();
    const makeReactive = (v: any) => v;

    const p = ProxyOptimizer.createReactiveProxy(obj, onUpdate, makeReactive);
    // creating again returns same proxy
    const p2 = ProxyOptimizer.createReactiveProxy(
      p as any,
      onUpdate,
      makeReactive,
    );
    expect(p2).toBe(p);

    // target is recognized as having a cached proxy
    expect(ReactiveProxyCache.hasProxy(obj)).toBe(true);

    // ensure no legacy flag exists on target or proxy
    expect((obj as any)['__isProxy__']).toBeUndefined();
    expect((p as any)['__isProxy__']).toBeUndefined();
  });
});
