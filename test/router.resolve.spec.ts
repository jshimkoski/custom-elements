import { describe, it, expect } from 'vitest';
import { resolveRouteComponent } from '../src/lib/router';

describe('router resolveRouteComponent', () => {
  it('returns static component when component field present', async () => {
    const route = { path: '/a', component: 'my-el' } as any;
    const out = await resolveRouteComponent(route);
    expect(out).toBe('my-el');
  });

  it('loads async component and caches result', async () => {
    let calls = 0;
    const loader = async () => {
      calls++;
      return { default: 'async-el' };
    };

    const route = { path: '/async', load: loader } as any;
    const first = await resolveRouteComponent(route);
    const second = await resolveRouteComponent(route);
    expect(first).toBe('async-el');
    expect(second).toBe('async-el');
    // loader should have been called only once (second call hits cache)
    expect(calls).toBe(1);
  });

  it('throws when no component or loader present', async () => {
    const route = { path: '/none' } as any;
    await expect(resolveRouteComponent(route)).rejects.toThrow();
  });
});
