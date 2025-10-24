import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ReactiveProxyCache,
  ProxyOptimizer,
} from '../src/lib/runtime/reactive-proxy-cache';

describe('ReactiveProxyCache WeakSet behavior', () => {
  beforeEach(() => {
    ReactiveProxyCache.clear();
  });

  it('returns same proxy for same target and caches by target', () => {
    const target = { a: 1 };
    const onUpdate = vi.fn();
    const makeReactive = (v: any) => v;

    const p1 = ProxyOptimizer.createReactiveProxy(
      target,
      onUpdate,
      makeReactive,
    );
    const p2 = ProxyOptimizer.createReactiveProxy(
      target,
      onUpdate,
      makeReactive,
    );

    expect(p1).toBe(p2);
    expect(ReactiveProxyCache.hasProxy(target)).toBe(true);
  });

  it('passing a proxy returns the proxy instance directly', () => {
    const target = { b: 2 };
    const onUpdate = vi.fn();
    const makeReactive = (v: any) => v;

    const p = ProxyOptimizer.createReactiveProxy(
      target,
      onUpdate,
      makeReactive,
    );
    const p2 = ProxyOptimizer.createReactiveProxy(
      p as any,
      onUpdate,
      makeReactive,
    );

    expect(p2).toBe(p);
  });

  it('markAsProxy tracks the proxy instance (indirectly observable)', () => {
    const target = { c: 3 };
    const onUpdate = vi.fn();
    const makeReactive = (v: any) => v;

    const proxy = ProxyOptimizer.createReactiveProxy(
      target,
      onUpdate,
      makeReactive,
    );

    // we can't inspect WeakSet directly. Verify that calling createReactiveProxy with the proxy
    // returns the same proxy (behavior that depends on proxiedObjects membership)
    const returned = ProxyOptimizer.createReactiveProxy(
      proxy as any,
      onUpdate,
      makeReactive,
    );
    expect(returned).toBe(proxy);
  });
});
