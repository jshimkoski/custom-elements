import { html } from '../runtime/template-compiler';
import { component } from '../runtime/component';
import {
  useProps,
  useOnConnected,
  useOnDisconnected,
  useStyle,
} from '../runtime/hooks';
import { ref, computed } from '../runtime/reactive';
import { flushDOMUpdates } from '../runtime/scheduler';
import { createStore } from '../store';
import { devError, devWarn } from '../runtime/logger';
import { match } from '../directives';
import type {
  RouteState,
  Route,
  RouterLinkProps,
  RouterConfig,
  Router,
} from './types';
import {
  DEFAULT_SCROLL_CONFIG,
  isDangerousScheme,
  isAbsoluteUrl,
  canonicalizeBase,
  normalizePathForRoute,
  parseQuery,
  serializeQuery,
} from './path-utils';
import { matchRoute, findMatchedRoute } from './matcher';
import { clearComponentCache, resolveRouteComponent } from './component-loader';
import {
  activeRouterProxy,
  setActiveRouter,
  getActiveRouter,
  rebindProxy,
} from './active-proxy';

export function useRouter(config: RouterConfig): Router {
  const { routes, base = '', initialUrl, scrollToFragment = true } = config;

  // Canonicalize base so callers and internal logic have a single
  // representation. Normalized base will be '' for root or '/x' (no
  // trailing slash). This prevents accidental double-prefixing like
  // '/app/app/about' and makes startsWith checks reliable.
  const canonicalBase = canonicalizeBase(base);

  // Normalize scroll configuration
  const _scrollConfig =
    typeof scrollToFragment === 'boolean'
      ? { ...DEFAULT_SCROLL_CONFIG, enabled: scrollToFragment }
      : { ...DEFAULT_SCROLL_CONFIG, ...scrollToFragment };

  // getLocation/initial include an optional `fragment` field in practice.
  let getLocation: () => {
    path: string;
    query: Record<string, string>;
    fragment?: string;
  };
  let initial: {
    path: string;
    query: Record<string, string>;
    fragment?: string;
  };
  let store: ReturnType<typeof createStore<RouteState>>;
  let update: (replace?: boolean) => Promise<void>;
  let push: (path: string) => Promise<void>;
  let replaceFn: (path: string) => Promise<void>;
  let back: () => void;
  let destroyFn: () => void = () => {};

  // Track redirects to prevent infinite loops
  const redirectTracker = new Set<string>();
  const MAX_REDIRECT_DEPTH = 10;
  let redirectDepth = 0;

  // Run matching route guards/hooks
  const runBeforeEnter = async (
    to: RouteState,
    from: RouteState,
  ): Promise<boolean | string> => {
    const matched = findMatchedRoute(routes, to.path);
    if (!matched || !matched.beforeEnter) return true;
    try {
      const result = await matched.beforeEnter(to, from);
      if (typeof result === 'string') {
        // Check for redirect loops
        const redirectKey = `${to.path}->${result}`;
        if (
          redirectTracker.has(redirectKey) ||
          redirectDepth >= MAX_REDIRECT_DEPTH
        ) {
          devError(`Redirect loop detected: ${redirectKey}`);
          return false;
        }
        return result; // Return redirect path instead of navigating immediately
      }
      return result !== false;
    } catch (err) {
      devError('beforeEnter error', err);
      // Reset store to previous state on guard error to maintain consistency
      try {
        store.setState(from);
      } catch {
        /* swallow setState errors */
      }
      // Always let guard errors bubble up for proper error handling
      throw err;
    }
  };

  const runOnEnter = async (
    to: RouteState,
    from: RouteState,
  ): Promise<boolean | string> => {
    const matched = findMatchedRoute(routes, to.path);
    if (!matched || !matched.onEnter) return true;
    try {
      const result = await matched.onEnter(to, from);
      if (typeof result === 'string') {
        // Check for redirect loops
        const redirectKey = `${to.path}->${result}`;
        if (
          redirectTracker.has(redirectKey) ||
          redirectDepth >= MAX_REDIRECT_DEPTH
        ) {
          devError(`Redirect loop detected: ${redirectKey}`);
          return false;
        }
        return result; // Return redirect path instead of navigating immediately
      }
      return result !== false;
    } catch (err) {
      devError('onEnter error', err);
      // Reset store to previous state on guard error to maintain consistency
      try {
        store.setState(from);
      } catch {
        /* swallow setState errors */
      }
      // Always let guard errors bubble up for proper error handling
      throw err;
    }
  };

  const runAfterEnter = (to: RouteState, from: RouteState): void => {
    const matched = findMatchedRoute(routes, to.path);
    if (!matched || !matched.afterEnter) return;
    try {
      const result: void | Promise<void> = matched.afterEnter(to, from);
      if (result instanceof Promise) {
        result.catch((err: unknown) => {
          devError('afterEnter async error', err);
        });
      }
    } catch (err) {
      devError('afterEnter error', err);
    }
  };

  // Cache for route matching to avoid repeated expensive operations
  const matchCache = new Map<
    string,
    { route: Route | null; params: Record<string, string> }
  >();
  const MATCH_CACHE_SIZE = 100;

  const cachedMatchRoute = (path: string) => {
    if (matchCache.has(path)) {
      return matchCache.get(path)!;
    }

    const result = matchRoute(routes, path);

    // Implement proper LRU by clearing oldest entries when cache is full
    if (matchCache.size >= MATCH_CACHE_SIZE) {
      // Remove oldest 25% of entries to avoid frequent cleanup
      const entriesToRemove = Math.floor(MATCH_CACHE_SIZE * 0.25);
      const keys = Array.from(matchCache.keys());
      for (let i = 0; i < entriesToRemove && i < keys.length; i++) {
        matchCache.delete(keys[i]);
      }
    }

    matchCache.set(path, result);
    return result;
  };

  // Scroll management with per-promise tracking
  const cleanupScrollState = () => {
    // No global cleanup needed - each promise manages its own lifecycle
  };

  async function doScrollToElement(id: string, offset = 0): Promise<boolean> {
    try {
      const element = document.getElementById(id);
      if (!element) {
        return false;
      }

      if (offset > 0) {
        try {
          const rect = element.getBoundingClientRect();
          const top = Math.max(0, window.scrollY + rect.top - offset);
          if (typeof window.scrollTo === 'function') {
            window.scrollTo({ top, behavior: 'auto' });
          }
        } catch {
          try {
            element.scrollIntoView();
          } catch {
            return false;
          }
        }
      } else {
        if (typeof element.scrollIntoView === 'function') {
          try {
            element.scrollIntoView({
              behavior: 'auto',
              block: 'start',
              inline: 'nearest',
            });
          } catch {
            try {
              element.scrollIntoView();
            } catch {
              return false;
            }
          }
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  // Scroll with per-promise lifecycle management and retry for missing elements
  function startScrollForNavigation(
    id: string,
    offset: number = 0,
    timeoutMs: number = 2000,
  ): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      let resolved = false;
      let timeoutId: number | null = null;
      let rafHandle: number | null = null;
      const startTime = Date.now();

      const safeResolve = (value: boolean) => {
        if (resolved) return;
        resolved = true;
        if (timeoutId) clearTimeout(timeoutId);
        // Cancel any pending rAF so orphaned retry loops don't keep firing
        // after the promise has already resolved (e.g. on rapid navigation).
        if (rafHandle !== null) cancelAnimationFrame(rafHandle);
        resolve(value);
      };

      const attemptScroll = async () => {
        if (resolved) return;

        try {
          // Try immediate scroll first
          if (await doScrollToElement(id, offset)) {
            return safeResolve(true);
          }

          // For missing elements, continue retrying until timeout
          const retryScroll = async () => {
            if (resolved) return;

            const elapsed = Date.now() - startTime;
            if (elapsed >= timeoutMs) {
              return safeResolve(false);
            }

            try {
              if (await doScrollToElement(id, offset)) {
                return safeResolve(true);
              }

              rafHandle = requestAnimationFrame(retryScroll);
            } catch (error) {
              devWarn('Scroll retry attempt failed:', error);
              rafHandle = requestAnimationFrame(retryScroll);
            }
          };

          // Start retry loop after initial attempt
          rafHandle = requestAnimationFrame(retryScroll);
        } catch (error) {
          devWarn('Initial scroll attempt failed:', error);
          safeResolve(false);
        }
      };

      // Set timeout as final safety net
      timeoutId = setTimeout(() => {
        safeResolve(false);
      }, timeoutMs);

      // Start the attempt immediately with error handling
      attemptScroll().catch((error) => {
        devWarn('Scroll attempt failed:', error);
        safeResolve(false);
      });
    });
  }

  // Navigation lock to prevent concurrent navigation race conditions
  let isNavigating = false;

  const navigate = async (path: string, replace = false): Promise<void> => {
    // Prevent concurrent navigation
    if (isNavigating) {
      devWarn(`Navigation to ${path} blocked - navigation already in progress`);
      return;
    }

    isNavigating = true;
    redirectDepth = 0;
    redirectTracker.clear();

    try {
      await performNavigation(path, replace);
    } finally {
      isNavigating = false;
      redirectDepth = 0;
      redirectTracker.clear();
    }
  };

  // Extract path parsing logic for reuse in SSR
  const parseNavigationPath = (path: string) => {
    const hashIndex = path.indexOf('#');
    const fragment = hashIndex >= 0 ? path.slice(hashIndex + 1) : '';
    const rawPath = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
    const qIndex = rawPath.indexOf('?');
    const pathBeforeQuery = qIndex >= 0 ? rawPath.slice(0, qIndex) : rawPath;
    const query = qIndex >= 0 ? parseQuery(rawPath.slice(qIndex)) : {};
    const stripped = pathBeforeQuery.startsWith(canonicalBase)
      ? pathBeforeQuery.slice(canonicalBase.length)
      : pathBeforeQuery;
    const normalized = normalizePathForRoute(stripped || '/');
    return {
      path: normalized,
      query,
      fragment,
    };
  };

  const performNavigation = async (
    path: string,
    replace = false,
  ): Promise<void> => {
    try {
      const loc = parseNavigationPath(path);
      const match = cachedMatchRoute(loc.path);
      if (!match.route) throw new Error(`No route found for ${loc.path}`);

      const from = store.getState();
      const to: RouteState = {
        path: loc.path,
        params: match.params,
        query: loc.query,
        fragment: (loc as { fragment?: string }).fragment,
      };

      // beforeEnter guard
      const beforeEnterResult = await runBeforeEnter(to, from);
      if (beforeEnterResult === false) return;
      if (typeof beforeEnterResult === 'string') {
        // Handle redirect
        redirectDepth++;
        const redirectKey = `${to.path}->${beforeEnterResult}`;
        redirectTracker.add(redirectKey);
        await performNavigation(beforeEnterResult, true);
        return;
      }

      // onEnter guard (right before commit)
      const onEnterResult = await runOnEnter(to, from);
      if (onEnterResult === false) return;
      if (typeof onEnterResult === 'string') {
        // Handle redirect
        redirectDepth++;
        const redirectKey = `${to.path}->${onEnterResult}`;
        redirectTracker.add(redirectKey);
        await performNavigation(onEnterResult, true);
        return;
      }

      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const qstr = serializeQuery(loc.query);
        const href =
          canonicalBase +
          loc.path +
          (qstr || '') +
          (loc.fragment ? '#' + loc.fragment : '');
        if (replace) {
          window.history.replaceState({}, '', href);
        } else {
          window.history.pushState({}, '', href);
        }
      }

      store.setState(to);

      // afterEnter hook (post commit)
      runAfterEnter(to, from);

      // If there's a fragment (hash) preserve it on the URL and attempt to
      // scroll to the element with that id on client-side navigation.
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        try {
          const frag = (to as { fragment?: string }).fragment;
          if (_scrollConfig.enabled && frag) {
            // Start the robust scroll flow (observer + timeout + cancellation)
            startScrollForNavigation(
              String(frag),
              _scrollConfig.offset,
              _scrollConfig.timeoutMs,
            ).catch(() => {});
          }
        } catch {
          /* swallow */
        }
      }
    } catch (err) {
      devError('Navigation error:', err);

      // If this is a guard error, re-throw it so the promise rejects properly
      if (
        err instanceof Error &&
        (err.stack?.includes('runBeforeEnter') ||
          err.stack?.includes('runOnEnter'))
      ) {
        throw err;
      }

      // For other navigation errors, ensure store state remains consistent
      try {
        const current = store.getState();
        const targetMatches = matchRoute(routes, current.path);
        if (!targetMatches.route) {
          // If current state is invalid, reset to a valid route or root
          let fallbackRoute = routes.find((r) => r.path === '/');
          if (!fallbackRoute) {
            // Find any route that doesn't have dynamic segments as fallback
            fallbackRoute = routes.find(
              (r) => !r.path.includes(':') && !r.path.includes('*'),
            );
          }
          if (!fallbackRoute && routes.length > 0) {
            fallbackRoute = routes[0];
          }

          if (fallbackRoute) {
            const fallbackMatch = matchRoute(routes, fallbackRoute.path);
            store.setState({
              path: fallbackRoute.path,
              params: fallbackMatch.params,
              query: {},
            });
          } else {
            devError('No fallback route available for error recovery');
          }
        }
      } catch (recoveryError) {
        devWarn(
          'State recovery failed during navigation error:',
          recoveryError,
        );
      }
    }
  };

  // Validate routes configuration
  const validateRoutes = (routeList: Route[]): boolean => {
    if (!routeList || routeList.length === 0) {
      devError('Router configuration error: No routes provided');
      return false;
    }

    const pathSet = new Set<string>();
    for (const route of routeList) {
      if (!route.path) {
        devError('Router configuration error: Route missing path', route);
        return false;
      }

      if (pathSet.has(route.path)) {
        devWarn(`Duplicate route path detected: ${route.path}`);
      }
      pathSet.add(route.path);

      if (!route.component && !route.load) {
        devWarn(`Route '${route.path}' has no component or load function`);
      }
    }
    return true;
  };

  // Validate configuration before proceeding (non-fatal for compatibility)
  validateRoutes(routes);

  // Pre-compile all routes for better SSR performance
  const isSSRMode =
    typeof window === 'undefined' || typeof initialUrl !== 'undefined';
  if (isSSRMode) {
    for (const route of routes) {
      // Force compilation of all routes during SSR initialization
      cachedMatchRoute(route.path);
    }
    devWarn(`Pre-compiled ${routes.length} routes for SSR`);
  }

  // If an explicit `initialUrl` is provided we treat this as SSR/static rendering
  // even if a `window` exists (useful for hydration tests). Browser mode only
  // applies when `initialUrl` is undefined.
  if (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined' &&
    typeof initialUrl === 'undefined'
  ) {
    // Browser mode
    getLocation = () => {
      try {
        const url = new URL(window.location.href);
        const raw = url.pathname;
        const stripped = raw.startsWith(canonicalBase)
          ? raw.slice(canonicalBase.length)
          : raw;
        const path = normalizePathForRoute(stripped || '/');
        const query = parseQuery(url.search);
        const fragment = url.hash && url.hash.length ? url.hash.slice(1) : '';
        return { path, query, fragment };
      } catch (error) {
        devWarn('Invalid URL detected, falling back to safe defaults', error);
        return { path: '/', query: {}, fragment: '' };
      }
    };

    initial = getLocation();
    const match = cachedMatchRoute(initial.path);
    store = createStore<RouteState>({
      path: initial.path,
      params: match.params,
      query: initial.query,
      fragment: (initial as { fragment?: string }).fragment,
    });

    update = async (replace = false) => {
      const loc = getLocation();
      await navigate(loc.path, replace);
    };

    const handlePopState = () => update(true);
    window.addEventListener('popstate', handlePopState);
    destroyFn = () => window.removeEventListener('popstate', handlePopState);

    push = (path: string) => navigate(path, false);
    replaceFn = (path: string) => navigate(path, true);
    back = () => window.history.back();
  } else {
    // SSR mode
    getLocation = () => {
      try {
        const url = new URL(initialUrl || '/', 'http://localhost');
        const raw = url.pathname;
        const stripped = raw.startsWith(canonicalBase)
          ? raw.slice(canonicalBase.length)
          : raw;
        const path = normalizePathForRoute(stripped || '/');
        const query = parseQuery(url.search);
        const fragment = url.hash && url.hash.length ? url.hash.slice(1) : '';
        return { path, query, fragment };
      } catch (error) {
        devWarn(
          'Invalid SSR URL detected, falling back to safe defaults',
          error,
        );
        return { path: '/', query: {}, fragment: '' };
      }
    };

    initial = getLocation();
    const match = cachedMatchRoute(initial.path);
    store = createStore<RouteState>({
      path: initial.path,
      params: match.params,
      query: initial.query,
      fragment: (initial as { fragment?: string }).fragment,
    });

    update = async () => {
      const loc = getLocation();
      await navigateSSR(loc.path);
    };

    // SSR navigation contract:
    // - `push` / `replace` call into `navigateSSR` and return a Promise.
    // - On the server we intentionally surface navigation failures so
    //   server-side logic (or tests) can react: missing routes or thrown
    //   errors from `beforeEnter`/`onEnter` will cause the Promise to
    //   reject. This lets the server render 404s or abort builds.
    // - For valid routes the server-side navigation resolves and updates
    //   the internal store state so rendered output matches the target
    //   path. The `back()` operation is client-only and is a synchronous
    //   no-op in SSR mode.
    const navigateSSR = async (path: string) => {
      // Prevent infinite recursion in SSR mode
      redirectDepth++;
      if (redirectDepth > MAX_REDIRECT_DEPTH) {
        devError(`SSR redirect depth exceeded for path: ${path}`);
        return;
      }

      try {
        const loc = parseNavigationPath(path);
        const match = cachedMatchRoute(loc.path);
        // In SSR mode we intentionally surface navigation errors (missing
        // route) to the caller so server-side logic may handle them. If no
        // route matches, throw and let the caller observe the rejection.
        if (!match.route) throw new Error(`No route found for ${loc.path}`);

        const from = store.getState();
        const to: RouteState = {
          path: loc.path,
          params: match.params,
          query: loc.query,
          fragment: (loc as { fragment?: string }).fragment,
        };

        // beforeEnter guard with redirect tracking - let errors bubble up in SSR
        const matched = findMatchedRoute(routes, to.path);
        if (matched?.beforeEnter) {
          const result = await matched.beforeEnter(to, from);
          if (typeof result === 'string') {
            // Handle redirect with tracking
            const redirectKey = `${to.path}->${result}`;
            redirectTracker.add(redirectKey);
            await navigateSSR(result);
            return;
          }
          if (result === false) return;
        }

        // onEnter guard with redirect tracking - let errors bubble up in SSR
        if (matched?.onEnter) {
          const result = await matched.onEnter(to, from);
          if (typeof result === 'string') {
            // Handle redirect with tracking
            const redirectKey = `${to.path}->${result}`;
            redirectTracker.add(redirectKey);
            await navigateSSR(result);
            return;
          }
          if (result === false) return;
        }

        store.setState(to);

        // afterEnter hook
        if (matched?.afterEnter) {
          matched.afterEnter(to, from);
        }
      } catch (err) {
        // Surface SSR navigation errors so callers (and tests) can observe
        // failures during server-side resolution.
        devError('SSR navigation error:', err);
        throw err;
      }
    };

    push = async (path: string) => {
      redirectDepth = 0;
      redirectTracker.clear();
      return navigateSSR(path);
    };
    replaceFn = async (path: string) => {
      redirectDepth = 0;
      redirectTracker.clear();
      return navigateSSR(path);
    };
    back = () => {};
  }

  const router: Router = {
    _cleanupScrollState: cleanupScrollState,
    destroy: destroyFn,
    store,
    push,
    replace: replaceFn,
    back,
    subscribe: store.subscribe,
    matchRoute: (path: string) => cachedMatchRoute(path),
    getCurrent: (): RouteState => store.getState(),
    resolveRouteComponent,
    base: canonicalBase,
    // Public API: allow components or tests to explicitly request scrolling to
    // a fragment when they know their DOM is ready. Returns true if scrolled.
    scrollToFragment: (frag?: string) => {
      const id = frag || (store.getState() as RouteState).fragment;
      if (!id) return Promise.resolve(false);
      if (typeof window === 'undefined' || typeof document === 'undefined')
        return Promise.resolve(false);
      return startScrollForNavigation(
        id,
        _scrollConfig.offset,
        _scrollConfig.timeoutMs,
      );
    },
  };

  return router;
}

/**
 * Singleton router instance for global access.
 *
 * Define here to prevent circular dependency
 * issue with component.
 */

export function initRouter(config: RouterConfig): Router {
  // Clear component cache on reinitialization to prevent stale components
  clearComponentCache();

  const router = useRouter(config);

  // Clean up previous router instance to prevent listener accumulation
  const prevRouter = getActiveRouter();
  if (prevRouter) {
    try {
      prevRouter.destroy();
    } catch {
      // Ignore cleanup errors - function may not exist in older instances
    }
    try {
      prevRouter._cleanupScrollState?.();
    } catch {
      // Ignore cleanup errors - function may not exist in older instances
    }
  }
  // Expose the most recently initialized router to components defined
  // earlier in the process (tests may call initRouter multiple times).
  // Components reference `activeRouterProxy` so re-calling initRouter updates
  // the router instance they use.
  setActiveRouter(router);
  // Rebind the proxy so any existing subscribers are forwarded to the
  // newly initialized router immediately.
  try {
    rebindProxy();
    try {
      // Only attempt to flush DOM updates in browser environments.
      if (typeof window !== 'undefined') flushDOMUpdates();
    } catch {
      // Ignore DOM flush errors
    }

    // Additional flush after rebind to ensure all router-link components
    // have updated their active states before any synchronous inspection
    try {
      if (typeof window !== 'undefined') {
        // Use a microtask to allow reactive computations to complete
        queueMicrotask(() => {
          try {
            flushDOMUpdates();
          } catch {
            /* swallow */
          }
        });
      }
    } catch {
      /* swallow */
    }
  } catch {
    // Ignore proxy rebind errors
  }

  component('router-view', async () => {
    // Prefer the latest initialized router (tests may re-init). Resolve the
    // router lazily so components connect to whichever router is currently
    // active instead of capturing a stale instance at definition time.
    // Reactive current route so the component re-renders when router updates
    if (!getActiveRouter()) return html`<div>Router not initialized.</div>`;

    const current = ref(activeRouterProxy.getCurrent());
    const isSSR = typeof window === 'undefined';

    // We'll capture the unsubscribe function when the component connects
    // and register a disconnect cleanup during render-time (useOnDisconnected
    // must be called during the component render/execution).
    let unsubRouterView: (() => void) | undefined;

    // Only set up subscriptions in browser environment
    if (!isSSR) {
      useOnConnected(() => {
        try {
          if (typeof activeRouterProxy.subscribe === 'function') {
            unsubRouterView = activeRouterProxy.subscribe((s) => {
              try {
                // Validate state before updating to prevent corruption
                if (s && typeof s === 'object' && typeof s.path === 'string') {
                  current.value = s;
                } else {
                  devWarn('router-view received invalid state', s);
                  // Fallback to safe default state
                  current.value = { path: '/', params: {}, query: {} };
                }
              } catch (e) {
                devWarn('router-view subscription update failed', e);
                // Attempt to recover with safe state
                try {
                  current.value = { path: '/', params: {}, query: {} };
                } catch {
                  /* swallow recovery errors */
                }
              }
            });
          }
        } catch (e) {
          devWarn('router-view subscribe failed', e);
        }
      });

      useOnDisconnected(() => {
        if (typeof unsubRouterView === 'function') {
          try {
            unsubRouterView();
          } catch (e) {
            devWarn('router-view unsubscribe failed', e);
          }
          unsubRouterView = undefined; // Clear reference to prevent memory leaks
        }
      });
    }

    const match = activeRouterProxy.matchRoute(current.value.path);
    if (!match || !match.route) return html`<div>Not found</div>`;

    // Resolve the component (supports cached async loaders)
    try {
      const compRaw = await activeRouterProxy.resolveRouteComponent(
        match.route!,
      );
      const comp = compRaw as
        | string
        | HTMLElement
        | ((...args: unknown[]) => unknown)
        | undefined;
      // String tag (custom element) -> render as VNode
      if (typeof comp === 'string') {
        return { tag: comp, props: {}, children: [] };
      }

      // Function component (sync or async) -> call and return its VNode(s)
      if (typeof comp === 'function') {
        const out = comp();
        const resolved = out instanceof Promise ? out : Promise.resolve(out);
        return resolved.then((resolvedComp) => {
          if (typeof resolvedComp === 'string')
            return { tag: resolvedComp, props: {}, children: [] };
          return resolvedComp;
        });
      }

      return html`<div>Invalid route component</div>`;
    } catch {
      return html`<div>Invalid route component</div>`;
    }
  });

  component('router-link', () => {
    // Declare props via useProps so observedAttributes are correct
    const props = useProps<Partial<RouterLinkProps>>({
      to: '',
      tag: 'a',
      replace: false,
      exact: false,
      activeClass: 'active',
      exactActiveClass: 'exact-active',
      ariaCurrentValue: 'page',
      disabled: false,
      external: false,
      // allow host `class` and `style` attributes to be read via useProps
      class: '',
      style: '',
    });

    const isSSR = typeof window === 'undefined';
    const current = ref(activeRouterProxy.getCurrent());

    // For SSR, compute stable active states to prevent hydration mismatches
    const stableCurrentPath = current.value?.path || '/';
    const targetPath = String(props.to || '');

    // Pre-compute SSR-safe active states
    const ssrActiveStates = isSSR
      ? {
          isExactActive: computeExactActive(
            stableCurrentPath,
            targetPath,
            activeRouterProxy.base,
          ),
          isActive: computeActive(
            stableCurrentPath,
            targetPath,
            activeRouterProxy.base,
          ),
          isExternal: isAbsoluteUrl(targetPath) || !!props.external,
        }
      : null;

    let unsubRouterLink: (() => void) | undefined;

    // Keep a minimal internal host-scoped style for element display.
    // Host `style` will be applied to the inner anchor/button element.
    useStyle(() => `a,button{display:inline-block;}`);

    // We capture host attributes at connection time and migrate them to
    // internal refs so we can remove them from the host. This prevents
    // global/author CSS targeting the host from styling the host element
    // itself while still allowing authors to use `class`/`style` on the
    // router-link to style the inner anchor/button.
    const hostClassRef = ref((props.class as string) || '');
    const hostStyleRef = ref((props.style as string) || '');

    // Only set up DOM interactions in browser environment
    if (!isSSR) {
      let syncCheckInterval: ReturnType<typeof setInterval> | null = null;

      useOnConnected((ctx?: unknown) => {
        try {
          if (typeof activeRouterProxy.subscribe === 'function') {
            unsubRouterLink = activeRouterProxy.subscribe((s) => {
              try {
                // Validate state before updating to prevent corruption
                if (s && typeof s === 'object' && typeof s.path === 'string') {
                  current.value = s;
                } else {
                  devWarn('router-link received invalid state', s);
                  // Fallback to safe default state
                  current.value = { path: '/', params: {}, query: {} };
                }
              } catch (e) {
                devWarn('router-link subscription update failed', e);
                // Attempt to recover with safe state
                try {
                  current.value = { path: '/', params: {}, query: {} };
                } catch {
                  /* swallow recovery errors */
                }
              }
            });

            // Immediately sync current state after subscription to ensure
            // correct active state even if router was initialized after component creation
            try {
              const currentState = activeRouterProxy.getCurrent();
              if (currentState && typeof currentState.path === 'string') {
                current.value = currentState;
              }
            } catch (e) {
              devWarn('router-link initial state sync failed', e);
            }

            // Set up periodic sync check to ensure state accuracy after router changes
            // This catches edge cases where subscription updates might be missed
            syncCheckInterval = setInterval(() => {
              try {
                const latestState = activeRouterProxy.getCurrent();
                if (latestState && typeof latestState.path === 'string') {
                  // Only update if state actually changed to avoid unnecessary re-renders
                  if (
                    JSON.stringify(current.value) !==
                    JSON.stringify(latestState)
                  ) {
                    current.value = latestState;
                  }
                }
              } catch {
                // Silent failure - don't spam console with periodic check errors
              }
            }, 100); // Check every 100ms
          }
        } catch (e) {
          devWarn('router-link subscribe failed', e);
        }

        // Migrate host `class`/`style` into internal refs and remove them
        // from the host so only the inner element is styled.
        try {
          const host = (ctx as { _host?: HTMLElement } | undefined)?._host;
          if (host instanceof HTMLElement) {
            const hc = host.getAttribute('class');
            const hs = host.getAttribute('style');
            if (hc) hostClassRef.value = hc;
            if (hs) hostStyleRef.value = hs;
            // Remove attributes from host to avoid styling the host
            if (hc !== null) host.removeAttribute('class');
            if (hs !== null) host.removeAttribute('style');
            // Re-render to ensure migrated host classes/styles are applied
            // to the internal anchor/button element.
            try {
              // The `ctx` passed into useOnConnected is the component context
              // which exposes `_requestRender`. Call that to re-render after
              // migrating host attributes into internal refs.
              (
                ctx as unknown as { _requestRender?: () => void }
              )?._requestRender?.();
              // Ensure DOM updates from the scheduled render are flushed so
              // callers (and tests) can synchronously observe migrated
              // classes/styles on the inner anchor/button.
              try {
                flushDOMUpdates();
              } catch {
                /* ignore */
              }
            } catch {
              /* ignore */
            }
          }
        } catch (e) {
          devWarn('router-link host migration failed', e);
        }
      });

      useOnDisconnected(() => {
        // Clean up router subscription
        if (typeof unsubRouterLink === 'function') {
          try {
            unsubRouterLink();
          } catch (e) {
            devWarn('router-link unsubscribe failed', e);
          } finally {
            unsubRouterLink = undefined; // Clear reference to prevent memory leaks
          }
        }

        // Clean up sync check interval
        if (syncCheckInterval) {
          try {
            clearInterval(syncCheckInterval);
          } catch (e) {
            devWarn('router-link sync interval cleanup failed', e);
          } finally {
            syncCheckInterval = null;
          }
        }
      });
    }

    // Use pre-computed values for SSR or dynamic computed for client
    const isExactActive = computed(() => {
      if (isSSR && ssrActiveStates) {
        return ssrActiveStates.isExactActive;
      }

      try {
        const runtimeBase = activeRouterProxy.base ?? '';
        const targetRaw = (props.to as string) || '';

        // Defensive check for current value
        if (!current.value || typeof current.value.path !== 'string') {
          return false;
        }

        return computeExactActive(current.value.path, targetRaw, runtimeBase);
      } catch (err) {
        devWarn('isExactActive computation error', err);
        return false;
      }
    });

    const isActive = computed(() => {
      if (isSSR && ssrActiveStates) {
        return ssrActiveStates.isActive;
      }

      try {
        const runtimeBase = activeRouterProxy.base ?? '';
        const targetRaw = (props.to as string) || '';

        // Defensive check for current value
        if (!current.value || typeof current.value.path !== 'string') {
          return false;
        }

        if (props.exact) return isExactActive.value;
        return computeActive(current.value.path, targetRaw, runtimeBase);
      } catch (err) {
        devWarn('isActive computation error', err);
        return false;
      }
    });

    // Compute a normalized href for the inner anchor so middle-click / open-in-new-tab
    // uses a canonical absolute path (includes base and fragment). We keep using
    // props.to for router navigation so current behavior (literal `to`) remains.
    const hrefTarget = computed(() => {
      const raw = String(props.to || '');
      // Block obviously dangerous javascript: URIs from becoming clickable
      // hrefs. See isDangerousScheme for rationale.
      if (isDangerousScheme(raw)) return null;

      // Preserve absolute URLs with a scheme (http:, mailto:, data:, etc.)
      // and protocol-relative URLs that begin with `//`.
      if (isAbsoluteUrl(raw)) return raw;

      // Split fragment and query explicitly so both are preserved.
      const [pathWithQuery, frag] = raw.split('#');
      const [pathOnly, query] = (pathWithQuery || '').split('?');

      // Read base dynamically from the current router instance so repeated
      // calls to initRouter (tests) do not leave a stale captured value.
      const runtimeBase = activeRouterProxy.base ?? '';
      // If the provided path already contains the runtime base, strip it to
      // avoid duplicating e.g. '/app/app/about'. Keep a fallback of '/'.
      // Use more robust base removal that handles normalization edge cases.
      let candidate = pathOnly || '/';
      if (runtimeBase && runtimeBase !== '/') {
        // Normalize both base and candidate to ensure consistent comparison
        const normalizedBase = normalizePathForRoute(runtimeBase);
        const normalizedCandidate = normalizePathForRoute(candidate);
        if (normalizedCandidate.startsWith(normalizedBase)) {
          candidate = normalizedCandidate.slice(normalizedBase.length) || '/';
        } else {
          candidate = normalizedCandidate;
        }
      }
      const norm = normalizePathForRoute(candidate || '/');
      return (
        runtimeBase +
        norm +
        (query ? '?' + query : '') +
        (frag ? '#' + frag : '')
      );
    });

    // Build user classes reactively from the host `class` attribute prop.
    // We intentionally apply classes to the inner element so the consumer
    // can style the link via `class="..."`.
    const userClasses = computed(() => {
      const rawHost =
        (hostClassRef && hostClassRef.value) || (props.class as string) || '';
      const list = rawHost.split(/\s+/).filter(Boolean);
      const map: Record<string, boolean> = {};
      for (const c of list) map[c] = true;
      return map;
    });

    const classObject = computed(() => ({
      ...userClasses.value,
      [(props.activeClass as string) || 'active']: isActive.value,
      [(props.exactActiveClass as string) || 'exact-active']:
        isExactActive.value,
    }));

    // Compute a final class string (template accepts object or string; we
    // convert to string to safely include host classes and conditionals).
    const classString = computed(() =>
      Object.keys(classObject.value)
        .filter((k) => classObject.value[k])
        .join(' '),
    );

    const tagName = computed(() => (props.tag as string) || 'a');
    const isButton = computed(() => tagName.value === 'button');
    // Instead of pre-building attribute fragments as strings (which can
    // accidentally inject invalid attribute names into the template and
    // cause DOMExceptions), compute simple booleans/values and apply
    // attributes explicitly in the template below.
    // Return null when not exact so the attribute is omitted from the DOM
    const ariaCurrentValue = computed<null | string>(() =>
      isExactActive.value ? (props.ariaCurrentValue as string) : null,
    );
    const isDisabled = computed(() => !!props.disabled);
    // External should only apply to anchor tags (links). Make the check explicit.
    // Detect absolute/protocol-relative URLs as external even if the prop
    // wasn't explicitly set by the caller. Only apply to anchor tags.
    const isExternal = computed(() => {
      const toStr = String(props.to || '');
      const looksAbsolute = isAbsoluteUrl(toStr);
      return (looksAbsolute || !!props.external) && tagName.value === 'a';
    });

    // Inline style from host `style` attribute.
    const inlineStyle = computed(
      () =>
        (hostStyleRef && hostStyleRef.value) || (props.style as string) || '',
    );

    const navigate = (e: MouseEvent) => {
      // Respect pre-handled events, non-left clicks, and modifier keys so
      // default browser behaviors (open-in-new-tab, context menu) work.
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.altKey ||
        e.ctrlKey ||
        e.shiftKey
      )
        return;

      if (isDisabled.value) {
        // Prevent navigation and let assistive tech see disabled state
        e.preventDefault();
        return;
      }

      // Block dangerous javascript: URIs explicitly to avoid accidental XSS
      const _targetRaw = String(props.to || '');
      if (isDangerousScheme(_targetRaw)) {
        try {
          e.preventDefault();
        } catch {
          /* swallow */
        }
        devWarn('Blocked unsafe javascript: URI in router-link.to');
        return;
      }

      // If this is an external anchor, allow default browser behavior
      if (isExternal.value) return;

      e.preventDefault();
      if (props.replace) {
        activeRouterProxy.replace(props.to as string);
      } else {
        activeRouterProxy.push(props.to as string);
      }
    };

    return html`
      ${match()
        .when(
          isButton.value,
          html`
            <button
              part="button"
              class="${classString.value}"
              style="${inlineStyle.value || null}"
              aria-current="${ariaCurrentValue.value}"
              disabled="${isDisabled.value ? '' : null}"
              aria-disabled="${isDisabled.value ? 'true' : null}"
              tabindex="${isDisabled.value ? '-1' : null}"
              @click="${navigate}"
            >
              <slot></slot>
            </button>
          `,
        )
        .otherwise(html`
          <a
            part="link"
            href="${isDisabled.value ? null : hrefTarget.value}"
            class="${classString.value}"
            style="${inlineStyle.value || null}"
            aria-current="${ariaCurrentValue.value}"
            aria-disabled="${isDisabled.value ? 'true' : null}"
            tabindex="${isDisabled.value ? '-1' : null}"
            target="${isExternal.value ? '_blank' : null}"
            rel="${isExternal.value ? 'noopener noreferrer' : null}"
            @click="${navigate}"
            ><slot></slot
          ></a>
        `)
        .done()}
    `;
  });

  return router;
}

// Helper functions for SSR-safe active state computation
export function computeExactActive(
  currentPath: string,
  targetRaw: string,
  runtimeBase: string,
): boolean {
  if (isAbsoluteUrl(targetRaw)) return false;

  const targetPathOnly = (targetRaw.split('#')[0] || '/').split('?')[0];
  let tgtCandidate = targetPathOnly;

  if (runtimeBase && runtimeBase !== '/') {
    const normalizedBase = normalizePathForRoute(runtimeBase);
    const normalizedTarget = normalizePathForRoute(tgtCandidate);
    if (normalizedTarget.startsWith(normalizedBase)) {
      tgtCandidate = normalizedTarget.slice(normalizedBase.length) || '/';
    } else {
      tgtCandidate = normalizedTarget;
    }
  }

  const cur = normalizePathForRoute(currentPath);
  const tgt = normalizePathForRoute(tgtCandidate);
  return cur === tgt;
}

export function computeActive(
  currentPath: string,
  targetRaw: string,
  runtimeBase: string,
): boolean {
  if (isAbsoluteUrl(targetRaw)) return false;

  const targetPathOnly = (targetRaw.split('#')[0] || '/').split('?')[0];
  let tgtCandidate = targetPathOnly;

  if (runtimeBase && runtimeBase !== '/') {
    const normalizedBase = normalizePathForRoute(runtimeBase);
    const normalizedTarget = normalizePathForRoute(tgtCandidate);
    if (normalizedTarget.startsWith(normalizedBase)) {
      tgtCandidate = normalizedTarget.slice(normalizedBase.length) || '/';
    } else {
      tgtCandidate = normalizedTarget;
    }
  }

  const cur = normalizePathForRoute(currentPath);
  const tgt = normalizePathForRoute(tgtCandidate);

  if (tgt === '/') return cur === '/';
  if (cur === tgt) return true;
  return cur.startsWith(tgt.endsWith('/') ? tgt : tgt + '/');
}
