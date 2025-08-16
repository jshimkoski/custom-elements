import { describe, it, expect, vi } from 'vitest';
import { resolveRouteComponent, Route } from '../../src/lib/router';

const HomeComponent = 'home-page';

const asyncComponent = () => Promise.resolve({ default: 'async-page' });
const errorComponent = () => Promise.reject(new Error('Load failed'));

describe('router async component loading', () => {
  it('loads sync component via component property', async () => {
    const route: Route = { path: '/', component: HomeComponent };
    const result = await resolveRouteComponent(route);
    expect(result).toBe(HomeComponent);
  });

  it('loads async component via load property', async () => {
    const route: Route = { path: '/async', load: asyncComponent };
    const result = await resolveRouteComponent(route);
    expect(result).toBe('async-page');
  });

  it('caches async component after first load', async () => {
    const route: Route = { path: '/async', load: asyncComponent };
    const first = await resolveRouteComponent(route);
    const second = await resolveRouteComponent(route);
    expect(second).toBe(first);
  });

  it('throws error if load fails', async () => {
    const route: Route = { path: '/error', load: errorComponent };
    await expect(resolveRouteComponent(route)).rejects.toThrow('Failed to load component for route: /error');
  });

  it('throws error if no component or loader', async () => {
    const route: Route = { path: '/none' };
    await expect(resolveRouteComponent(route)).rejects.toThrow('No component or loader defined for route: /none');
  });
});
