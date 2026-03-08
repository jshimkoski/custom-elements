import type { Router, RouteState, Route } from './types';
import { devWarn } from '../runtime/logger';
import { flushDOMUpdates } from '../runtime/scheduler';

// Module-level reference to the latest initialized router. Tests and
// components may rely on re-initializing the router during their setup,
// so exposing this lets components pick up the most recent instance.
let activeRouter: Router | null = null;

export function setActiveRouter(r: Router | null): void {
  activeRouter = r;
}

export function getActiveRouter(): Router | null {
  return activeRouter;
}

// Proxy that provides a stable API for consumers (components/tests).
// Subscriptions and method calls are forwarded to the currently active
// router instance. When `activeRouter` changes (via `initRouter`) the
// proxy rebinds and forwards updates to its listeners so components do
// not need to re-register on re-init.
type RouterListener = (s: RouteState) => void;
const _proxyListeners: Set<RouterListener> = new Set();
let _proxyInnerUnsub: (() => void) | null = null;

function _rebindProxy() {
  // Unsubscribe previous inner subscription to prevent memory leaks
  if (_proxyInnerUnsub) {
    try {
      _proxyInnerUnsub();
    } catch {
      // Ignore unsubscribe errors
    }
    _proxyInnerUnsub = null;
  }

  if (activeRouter) {
    // Subscribe to the new router and forward updates
    try {
      // We'll detect whether the inner subscription invokes synchronously.
      // Some store implementations call subscribers immediately; others
      // don't. To guarantee exactly-one initial delivery we record whether
      // the inner callback ran during subscribe and only emit a manual
      // snapshot when it did not.
      let innerCalledSync = false;
      _proxyInnerUnsub = activeRouter.subscribe((s) => {
        innerCalledSync = true;
        // Forward to listeners, using Set iteration which is safe for concurrent modification
        for (const listener of _proxyListeners) {
          try {
            listener(s);
          } catch {
            /* swallow listener errors */
          }
        }
      });

      // Update proxy base to reflect active router
      try {
        activeRouterProxy.base = activeRouter.base;
      } catch {
        /* swallow */
      }

      // If the inner subscription did not synchronously invoke, emit a
      // single initial snapshot so listeners that were registered while
      // no active router existed receive the current state exactly once.
      if (!innerCalledSync) {
        const cur = activeRouter.getCurrent();
        for (const listener of _proxyListeners) {
          try {
            listener(cur);
          } catch {
            /* swallow */
          }
        }
      } else {
        // Even if inner subscription called synchronously, ensure all listeners
        // receive the current state immediately to handle router re-initialization
        const cur = activeRouter.getCurrent();
        for (const listener of _proxyListeners) {
          try {
            listener(cur);
          } catch {
            /* swallow */
          }
        }
      }

      // After synchronously forwarding the current snapshot to proxy
      // listeners, flush any pending DOM updates in browser environments
      // so callers that immediately inspect the DOM observe the updated
      // rendered state.
      try {
        if (typeof window !== 'undefined') flushDOMUpdates();
      } catch {
        /* swallow */
      }
    } catch {
      _proxyInnerUnsub = null;
    }
  }
}

export function rebindProxy(): void {
  _rebindProxy();
}

export const activeRouterProxy: Router = {
  store: {
    subscribe(listener: RouterListener) {
      if (activeRouter) return activeRouter.store.subscribe(listener);
      // immediate no-op subscribe - provide safe fallback state
      try {
        listener({ path: '/', params: {}, query: {} });
      } catch {
        /* swallow listener errors */
      }
      return () => {};
    },
    getState() {
      return activeRouter
        ? activeRouter.getCurrent()
        : { path: '/', params: {}, query: {} };
    },
    setState(
      partial:
        | Partial<RouteState>
        | ((prev: RouteState) => Partial<RouteState>),
    ) {
      if (!activeRouter) return;
      try {
        if (typeof partial === 'function') {
          activeRouter.store.setState(
            partial as (prev: RouteState) => Partial<RouteState>,
          );
        } else {
          activeRouter.store.setState(partial as Partial<RouteState>);
        }
      } catch {
        /* swallow */
      }
    },
  },
  subscribe(listener: RouterListener) {
    // Defensive check - ensure listener is a function
    if (typeof listener !== 'function') {
      devWarn('activeRouterProxy.subscribe: listener must be a function');
      return () => {};
    }

    // Add the listener to the proxy set
    _proxyListeners.add(listener);

    // Ensure we are bound to the active router. If not bound, rebind so
    // the inner subscription will forward updates to `_proxyListeners`.
    if (activeRouter) {
      if (!_proxyInnerUnsub) {
        // Rebind will synchronously forward the current state to all
        // proxy listeners (including the one we just pushed). Don't
        // call the listener again here to avoid double-invocation.
        _rebindProxy();
      } else {
        // Inner subscription already present; deliver a synchronous
        // snapshot only to the newly added listener.
        try {
          const currentState = activeRouter.getCurrent();
          if (currentState) {
            listener(currentState);
          }
        } catch (err) {
          devWarn('activeRouterProxy subscription failed', err);
        }
      }
    } else {
      // No active router yet - provide fallback state
      try {
        listener({ path: '/', params: {}, query: {} });
      } catch (err) {
        devWarn('activeRouterProxy fallback state delivery failed', err);
      }
    }

    // Return unsubscribe with additional safety checks
    return () => {
      try {
        _proxyListeners.delete(listener);
        // If no more proxy listeners remain, unsubscribe inner subscription
        // to avoid retaining unused references. It will be rebound on demand.
        if (_proxyListeners.size === 0 && _proxyInnerUnsub) {
          try {
            _proxyInnerUnsub();
          } catch (err) {
            devWarn('activeRouterProxy inner unsubscribe failed', err);
          }
          _proxyInnerUnsub = null;
        }
      } catch (err) {
        devWarn('activeRouterProxy unsubscribe failed', err);
      }
    };
  },
  getCurrent() {
    return activeRouter
      ? activeRouter.getCurrent()
      : { path: '/', params: {}, query: {} };
  },
  async push(path: string) {
    if (!activeRouter) return Promise.resolve();
    return activeRouter.push(path);
  },
  async replace(path: string) {
    if (!activeRouter) return Promise.resolve();
    return activeRouter.replace(path);
  },
  back() {
    if (!activeRouter) return;
    return activeRouter.back();
  },
  matchRoute(path: string) {
    return activeRouter
      ? activeRouter.matchRoute(path)
      : { route: null as Route | null, params: {} };
  },
  resolveRouteComponent(route: Route) {
    return activeRouter
      ? activeRouter.resolveRouteComponent(route)
      : Promise.reject(new Error('No active router'));
  },
  base: '',
  scrollToFragment(frag?: string) {
    return activeRouter
      ? activeRouter.scrollToFragment(frag)
      : Promise.resolve(false);
  },
};
