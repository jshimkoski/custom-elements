import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  activeRouterProxy,
  rebindProxy,
  setActiveRouter,
} from '../src/lib/router/active-proxy';
import type { Router, RouteState } from '../src/lib/router/types';

const state: RouteState = { path: '/ready', params: {}, query: {} };

function makeSynchronousRouter(): Router {
  const subscribe = (listener: (next: RouteState) => void) => {
    listener(state);
    return () => {};
  };

  return {
    base: '/',
    store: {
      subscribe,
      getState: () => state,
      setState: () => {},
    },
    subscribe,
    getCurrent: () => state,
  } as unknown as Router;
}

describe('active router proxy', () => {
  afterEach(() => {
    setActiveRouter(null);
    rebindProxy();
  });

  it('delivers exactly one snapshot when rebinding a synchronous store', () => {
    setActiveRouter(null);
    rebindProxy();
    const listener = vi.fn();
    const unsubscribe = activeRouterProxy.subscribe(listener);
    listener.mockClear();

    setActiveRouter(makeSynchronousRouter());
    rebindProxy();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(state);
    unsubscribe();
  });
});
