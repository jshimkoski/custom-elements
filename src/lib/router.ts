import { html } from './runtime/template-compiler';
import { component } from './runtime/component';
import {
  useProps,
  useOnConnected,
  useOnDisconnected,
  useStyle,
} from './runtime/hooks';
import { ref, computed } from './runtime/reactive';
import { createStore, type Store } from './store';
import { devError, devWarn } from './runtime/logger';
import { match } from './directives';

export type RouteComponent =
  | { new (...args: unknown[]): unknown } // class components
  | ((...args: unknown[]) => unknown); // functional components

export interface RouteState {
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  // Optional fragment (hash) portion of the URL, without the leading '#'
  fragment?: string;
}

export type GuardResult = boolean | string | Promise<boolean | string>;

export interface Route {
  path: string;

  /**
   * Statically available component (already imported)
   */
  component?: string | (() => unknown);

  /**
   * Lazy loader that resolves to something renderable
   */
  load?: () => Promise<{
    default: string | HTMLElement | ((...args: unknown[]) => unknown);
  }>;

  /**
   * Runs before matching — return false to cancel,
   * or a string to redirect
   */
  beforeEnter?: (to: RouteState, from: RouteState) => GuardResult;

  /**
   * Runs right before navigation commits — can cancel or redirect
   */
  onEnter?: (to: RouteState, from: RouteState) => GuardResult;

  /**
   * Runs after navigation completes — cannot cancel
   */
  afterEnter?: (to: RouteState, from: RouteState) => void;
}

export interface RouterLinkProps {
  to: string;
  tag: string;
  replace: boolean;
  exact: boolean;
  activeClass: string;
  exactActiveClass: string;
  ariaCurrentValue: string;
  disabled: boolean;
  external: boolean;
  class?: string;
  style?: string;
}

export interface RouterLinkComputed {
  current: RouteState;
  isExactActive: boolean;
  isActive: boolean;
  className: string;
  ariaCurrent: string;
  isButton: boolean;
  disabledAttr: string;
  externalAttr: string;
}

export interface RouterConfig {
  routes: Route[];
  base?: string;
  initialUrl?: string; // For SSR: explicitly pass the URL
  /**
   * Configure fragment (hash) scrolling behavior. Either a boolean to enable/disable
   * or an object to enable and provide an offset in pixels to account for fixed
   * headers.
   */
  scrollToFragment?:
    | boolean
    | {
        enabled?: boolean;
        offset?: number; // pixels
        timeoutMs?: number; // ms to wait for element to appear
      };
}

export const parseQuery = (search: string): Record<string, string> => {
  if (!search) return {};
  if (typeof URLSearchParams === 'undefined') return {};
  return Object.fromEntries(new URLSearchParams(search));
};

// Serialize a query object into a leading `?a=b&c=d` string. Returns empty
// string when there are no keys. Centralized so client history URLs and
// other code use consistent encoding.
export const serializeQuery = (q: Record<string, string> | undefined) => {
  if (!q || Object.keys(q).length === 0) return '';
  try {
    return '?' + new URLSearchParams(q as Record<string, string>).toString();
  } catch {
    return '';
  }
};

// Detect obviously dangerous javascript: URIs. We intentionally block these
// from becoming clickable hrefs to avoid accidental XSS when `to` is
// derived from untrusted input.
const isDangerousScheme = (s: string) => {
  if (!s) return false;
  return /^\s*javascript\s*:/i.test(s);
};

// Cache compiled route regexes to avoid rebuilding on every navigation.
type CompiledRoute =
  | { regex: RegExp; paramNames: string[] }
  | { invalid: true };
const compileCache: WeakMap<Route, CompiledRoute> = new WeakMap();

function escapeSeg(seg: string) {
  return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function normalizePathForRoute(p: string) {
  if (!p) return '/';
  // Collapse duplicate slashes, ensure leading slash, remove trailing slash
  let out = p.replace(/\/+/g, '/');
  if (!out.startsWith('/')) out = '/' + out;
  if (out.length > 1 && out.endsWith('/')) out = out.slice(0, -1);
  return out;
}

function compileRoute(route: Route): CompiledRoute {
  const raw = route.path || '/';
  const routePath = normalizePathForRoute(raw);

  const segments =
    routePath === '/' ? [] : routePath.split('/').filter(Boolean);

  const paramNames: string[] = [];
  const regexParts: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    // Anonymous wildcard
    if (seg === '*') {
      // splat must be terminal
      if (i !== segments.length - 1) {
        devWarn(
          `Route '${route.path}' contains a '*' splat in a non-terminal position; splats must be the last segment. This route will be ignored.`,
        );
        return { invalid: true };
      }
      const name = `splat${paramNames.length}`;
      paramNames.push(name);
      // mark splat token; pattern will be built specially so the
      // preceding slash can be optional (allow empty splat)
      regexParts.push('__SPLAT__');
      continue;
    }

    const paramMatch = seg.match(/^:([A-Za-z0-9_-]+)(\*)?$/);
    if (paramMatch) {
      const name = paramMatch[1];
      const isSplat = !!paramMatch[2];
      // If splat, ensure terminal
      if (isSplat && i !== segments.length - 1) {
        devWarn(
          `Route '${route.path}' contains a splat param ':${name}*' in a non-terminal position; splats must be the last segment. This route will be ignored.`,
        );
        return { invalid: true };
      }
      paramNames.push(name);
      regexParts.push(isSplat ? '__SPLAT__' : '([^/]+)');
      continue;
    }

    // Static
    regexParts.push(escapeSeg(seg));
  }

  let pattern: string;
  if (regexParts.length === 0) {
    pattern = '^/$';
  } else {
    const last = regexParts[regexParts.length - 1];
    if (last === '__SPLAT__') {
      const prefix = regexParts.slice(0, -1).join('/');
      if (!prefix) {
        // route is like '/:rest*' or '/*' -> allow '/' or '/x' etc.
        pattern = '^(?:/(.*))?(?:/)?$';
      } else {
        pattern = `^/${prefix}(?:/(.*))?(?:/)?$`;
      }
    } else {
      pattern = `^/${regexParts.join('/')}(?:/)?$`;
    }
  }
  try {
    const regex = new RegExp(pattern);
    return { regex, paramNames };
  } catch (e) {
    devWarn(`Failed to compile route regex for '${route.path}': ${String(e)}`);
    return { invalid: true };
  }
}

export const matchRoute = (
  routes: Route[],
  path: string,
): { route: Route | null; params: Record<string, string> } => {
  const incoming = normalizePathForRoute(path);

  for (const route of routes) {
    let compiled = compileCache.get(route);
    if (!compiled) {
      compiled = compileRoute(route);
      compileCache.set(route, compiled);
    }

    if ((compiled as { invalid?: true }).invalid) continue;

    const { regex, paramNames } = compiled as {
      regex: RegExp;
      paramNames: string[];
    };
    const m = regex.exec(incoming);
    if (m) {
      const params: Record<string, string> = {};
      const safeDecode = (v: string) => {
        try {
          return decodeURIComponent(v);
        } catch {
          return v;
        }
      };

      for (let i = 0; i < paramNames.length; i++) {
        const raw = m[i + 1] || '';
        params[paramNames[i]] = raw ? safeDecode(raw) : '';
      }

      return { route, params };
    }
  }

  return { route: null, params: {} };
};

/**
 * Find the first route that matches the given path.
 * Consolidates repeated inline checks like `routes.find(r => matchRoute([r], path).route !== null)`
 */
function findMatchedRoute(routes: Route[], path: string): Route | null {
  for (const r of routes) {
    if (matchRoute([r], path).route !== null) return r;
  }
  return null;
}

// Async component loader cache
const componentCache: Record<
  string,
  string | HTMLElement | ((...args: unknown[]) => unknown)
> = {};

/**
 * Loads a route's component, supporting both static and async.
 * @param route Route object
 * @returns Promise resolving to the component
 */
export async function resolveRouteComponent(
  route: Route,
): Promise<string | HTMLElement | ((...args: unknown[]) => unknown)> {
  if (route.component) return route.component;
  if (route.load) {
    if (componentCache[route.path]) return componentCache[route.path];
    try {
      const mod = await route.load();
      componentCache[route.path] = mod.default;
      return mod.default;
    } catch {
      throw new Error(`Failed to load component for route: ${route.path}`);
    }
  }
  throw new Error(`No component or loader defined for route: ${route.path}`);
}

export function useRouter(config: RouterConfig) {
  const { routes, base = '', initialUrl, scrollToFragment = true } = config;

  // Canonicalize base so callers and internal logic have a single
  // representation. Normalized base will be '' for root or '/x' (no
  // trailing slash). This prevents accidental double-prefixing like
  // '/app/app/about' and makes startsWith checks reliable.
  const canonicalBase = (() => {
    if (!base) return '';
    const nb = normalizePathForRoute(base);
    return nb === '/' ? '' : nb;
  })();

  // Normalize scroll config: either boolean or object { enabled?, offset?, timeoutMs }
  const _scrollConfig =
    typeof scrollToFragment === 'boolean'
      ? { enabled: !!scrollToFragment, offset: 0, timeoutMs: 2000 }
      : {
          enabled: scrollToFragment.enabled ?? true,
          offset: scrollToFragment.offset ?? 0,
          timeoutMs: scrollToFragment.timeoutMs ?? 2000,
        };

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
  let store: Store<RouteState>;
  let update: (replace?: boolean) => Promise<void>;
  let push: (path: string) => Promise<void>;
  let replaceFn: (path: string) => Promise<void>;
  let back: () => void;

  // Run matching route guards/hooks
  const runBeforeEnter = async (to: RouteState, from: RouteState) => {
    const matched = findMatchedRoute(routes, to.path);
    if (!matched || !matched.beforeEnter) return true;
    try {
      const result = await matched.beforeEnter(to, from);
      if (typeof result === 'string') {
        // Redirect
        await navigate(result, true);
        return false;
      }
      return result !== false;
    } catch (err) {
      devError('beforeEnter error', err);
      return false;
    }
  };

  const runOnEnter = async (to: RouteState, from: RouteState) => {
    const matched = findMatchedRoute(routes, to.path);
    if (!matched || !matched.onEnter) return true;
    try {
      const result = await matched.onEnter(to, from);
      if (typeof result === 'string') {
        await navigate(result, true);
        return false;
      }
      return result !== false;
    } catch (err) {
      devError('onEnter error', err);
      return false;
    }
  };

  const runAfterEnter = (to: RouteState, from: RouteState) => {
    const matched = findMatchedRoute(routes, to.path);
    if (!matched || !matched.afterEnter) return;
    try {
      matched.afterEnter(to, from);
    } catch (err) {
      devError('afterEnter error', err);
    }
  };

  // Scroll-to-fragment helpers: a cancellable per-navigation flow that
  // first attempts immediate scroll, then uses rAF and MutationObserver as
  // a robust fallback. Resolves true if scroll executed, false if timed out
  // or cancelled.
  let _navToken = 0;
  let _activeObserver: MutationObserver | null = null;
  let _activeTimeout: number | null = null;
  let _activeResolve: ((v: boolean) => void) | null = null;

  async function doScrollToElement(id: string, offset = 0) {
    try {
      const el = document.getElementById(id) as HTMLElement | null;
      if (!el) return false;
      if (offset && offset > 0) {
        try {
          const rect = el.getBoundingClientRect();
          const top = Math.max(0, window.scrollY + rect.top - offset);
          if (typeof window.scrollTo === 'function') {
            window.scrollTo({ top, behavior: 'auto' });
          }
        } catch {
          try {
            el.scrollIntoView();
          } catch {
            /* swallow */
          }
        }
      } else {
        if (typeof el.scrollIntoView === 'function') {
          try {
            el.scrollIntoView({
              behavior: 'auto',
              block: 'start',
              inline: 'nearest',
            });
          } catch {
            try {
              el.scrollIntoView();
            } catch {
              /* swallow */
            }
          }
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  function clearActiveScrollAttempt() {
    if (_activeObserver) {
      try {
        _activeObserver.disconnect();
      } catch {
        /* swallow */
      }
      _activeObserver = null;
    }
    if (_activeTimeout) {
      try {
        clearTimeout(_activeTimeout);
      } catch {
        /* swallow */
      }
      _activeTimeout = null;
    }
    // NOTE: do NOT resolve/clear `_activeResolve` here. Resolution of the
    // active promise must be handled explicitly by the creator/canceller so
    // we avoid double-resolve races where both cleanup and the active
    // flow attempt try to resolve the same promise. Clearing observer/timeout
    // here is sufficient for cleanup; callers should resolve any prior
    // `_activeResolve` before calling this helper.
  }

  function startScrollForNavigation(
    id: string,
    offset: number | undefined,
    timeoutMs: number | undefined,
  ) {
    _navToken += 1;
    const myToken = _navToken;

    // If there is a previous pending resolver, resolve it as cancelled
    // (false) so callers awaiting it observe cancellation before we clear
    // internal observers/timeouts. This ensures the previous Promise is
    // resolved exactly once with `false` when a new navigation/scroll
    // attempt starts.
    if (_activeResolve) {
      try {
        _activeResolve(false);
      } catch {
        /* swallow */
      }
      _activeResolve = null;
    }

    clearActiveScrollAttempt();

    return new Promise<boolean>((resolve) => {
      // Register the new active resolver for potential cancellation by a
      // future navigation. We deliberately set this after clearing prior
      // observers/timeouts and resolving any previous resolver above.
      _activeResolve = resolve;

      const finish = (did: boolean) => {
        if (myToken !== _navToken) return;
        clearActiveScrollAttempt();
        try {
          resolve(did);
        } finally {
          // Avoid retaining a reference to the resolver after it has
          // been used — prevents later attempts from re-calling an old
          // function and keeps lifecycle explicit.
          _activeResolve = null;
        }
      };

      const tryNow = async () => {
        if (myToken !== _navToken) return finish(false);
        if (await doScrollToElement(id, offset)) return finish(true);

        // After rAF try once more so layout can settle
        if (typeof window.requestAnimationFrame === 'function') {
          window.requestAnimationFrame(async () => {
            if (myToken !== _navToken) return finish(false);
            if (await doScrollToElement(id, offset)) return finish(true);

            if (myToken !== _navToken) return finish(false);
            const container =
              document.querySelector('router-view') || document.body;
            try {
              const obs = new MutationObserver(async () => {
                if (myToken !== _navToken) return;
                if (await doScrollToElement(id, offset)) {
                  finish(true);
                }
              });
              _activeObserver = obs;
              obs.observe(container as Node, {
                childList: true,
                subtree: true,
                attributes: false,
              });

              _activeTimeout = window.setTimeout(() => {
                if (myToken !== _navToken) return;
                try {
                  obs.disconnect();
                } catch {
                  /* swallow */
                }
                _activeObserver = null;
                _activeTimeout = null;
                finish(false);
              }, timeoutMs ?? 2000);
            } catch {
              // Fallback to polling
              const MAX_RETRIES = 40;
              const RETRY_DELAY = 50;
              let n = 0;
              const poll = async () => {
                if (myToken !== _navToken) return finish(false);
                if (await doScrollToElement(id, offset)) return finish(true);
                n += 1;
                if (n < MAX_RETRIES) window.setTimeout(poll, RETRY_DELAY);
                else finish(false);
              };
              poll();
            }
          });
        } else {
          // no rAF — try MutationObserver immediately
          const container =
            document.querySelector('router-view') || document.body;
          try {
            const obs = new MutationObserver(async () => {
              if (myToken !== _navToken) return;
              if (await doScrollToElement(id, offset)) {
                finish(true);
              }
            });
            _activeObserver = obs;
            obs.observe(container as Node, {
              childList: true,
              subtree: true,
              attributes: false,
            });
            _activeTimeout = window.setTimeout(() => {
              if (myToken !== _navToken) return;
              try {
                obs.disconnect();
              } catch {
                /* swallow */
              }
              _activeObserver = null;
              _activeTimeout = null;
              finish(false);
            }, timeoutMs ?? 2000);
          } catch {
            // fallback polling
            const MAX_RETRIES = 40;
            const RETRY_DELAY = 50;
            let n = 0;
            const poll = async () => {
              if (myToken !== _navToken) return finish(false);
              if (await doScrollToElement(id, offset)) return finish(true);
              n += 1;
              if (n < MAX_RETRIES) window.setTimeout(poll, RETRY_DELAY);
              else finish(false);
            };
            poll();
          }
        }
      };

      queueMicrotask(tryNow);
    });
  }

  const navigate = async (path: string, replace = false) => {
    try {
      // Separate fragment (hash) from path so matching ignores it while
      // the fragment is preserved on the RouteState.
      const hashIndex = path.indexOf('#');
      const fragment = hashIndex >= 0 ? path.slice(hashIndex + 1) : '';
      const rawPath = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
      // Parse query string (if any) so queries are available on RouteState
      // and do not end up inside the normalized path used for matching.
      const qIndex = rawPath.indexOf('?');
      const pathBeforeQuery = qIndex >= 0 ? rawPath.slice(0, qIndex) : rawPath;
      const query = qIndex >= 0 ? parseQuery(rawPath.slice(qIndex)) : {};
      const stripped = pathBeforeQuery.startsWith(canonicalBase)
        ? pathBeforeQuery.slice(canonicalBase.length)
        : pathBeforeQuery;
      const normalized = normalizePathForRoute(stripped || '/');
      const loc = {
        path: normalized,
        query,
        fragment,
      };
      const match = matchRoute(routes, loc.path);
      if (!match.route) throw new Error(`No route found for ${loc.path}`);

      const from = store.getState();
      const to: RouteState = {
        path: loc.path,
        params: match.params,
        query: loc.query,
        fragment: (loc as { fragment?: string }).fragment,
      };

      // beforeEnter guard
      const allowedBefore = await runBeforeEnter(to, from);
      if (!allowedBefore) return;

      // onEnter guard (right before commit)
      const allowedOn = await runOnEnter(to, from);
      if (!allowedOn) return;

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
      try {
        const frag = (to as { fragment?: string }).fragment;
        if (
          _scrollConfig.enabled &&
          frag &&
          typeof window !== 'undefined' &&
          typeof document !== 'undefined'
        ) {
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
    } catch (err) {
      devError('Navigation error:', err);
    }
  };

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
      const url = new URL(window.location.href);
      const raw = url.pathname;
      const stripped = raw.startsWith(canonicalBase)
        ? raw.slice(canonicalBase.length)
        : raw;
      const path = normalizePathForRoute(stripped || '/');
      const query = parseQuery(url.search);
      const fragment = url.hash && url.hash.length ? url.hash.slice(1) : '';
      return { path, query, fragment };
    };

    initial = getLocation();
    const match = matchRoute(routes, initial.path);
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

    window.addEventListener('popstate', () => update(true));

    push = (path: string) => navigate(path, false);
    replaceFn = (path: string) => navigate(path, true);
    back = () => window.history.back();
  } else {
    // SSR mode
    getLocation = () => {
      const url = new URL(initialUrl || '/', 'http://localhost');
      const raw = url.pathname;
      const stripped = raw.startsWith(canonicalBase)
        ? raw.slice(canonicalBase.length)
        : raw;
      const path = normalizePathForRoute(stripped || '/');
      const query = parseQuery(url.search);
      const fragment = url.hash && url.hash.length ? url.hash.slice(1) : '';
      return { path, query, fragment };
    };

    initial = getLocation();
    const match = matchRoute(routes, initial.path);
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
      try {
        const hashIndex = path.indexOf('#');
        const fragment = hashIndex >= 0 ? path.slice(hashIndex + 1) : '';
        const rawPath = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
        // Parse query on SSR navigation as well so server-side logic and
        // tests can observe query params.
        const qIndex = rawPath.indexOf('?');
        const pathBeforeQuery =
          qIndex >= 0 ? rawPath.slice(0, qIndex) : rawPath;
        const query = qIndex >= 0 ? parseQuery(rawPath.slice(qIndex)) : {};
        const stripped = pathBeforeQuery.startsWith(canonicalBase)
          ? pathBeforeQuery.slice(canonicalBase.length)
          : pathBeforeQuery;
        const normalized = normalizePathForRoute(stripped || '/');
        const loc = {
          path: normalized,
          query,
          fragment,
        };
        const match = matchRoute(routes, loc.path);
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

        // beforeEnter guard
        const matched = findMatchedRoute(routes, to.path);
        if (matched?.beforeEnter) {
          const result = await matched.beforeEnter(to, from);
          if (typeof result === 'string') {
            // Redirect
            await navigateSSR(result);
            return;
          }
          if (result === false) return;
        }

        // onEnter guard
        if (matched?.onEnter) {
          const result = await matched.onEnter(to, from);
          if (typeof result === 'string') {
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

    push = async (path: string) => navigateSSR(path);
    replaceFn = async (path: string) => navigateSSR(path);
    back = () => {};
  }

  return {
    store,
    push,
    replace: replaceFn,
    back,
    subscribe: store.subscribe,
    matchRoute: (path: string) => matchRoute(routes, path),
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
        String(id),
        _scrollConfig.offset,
        _scrollConfig.timeoutMs,
      );
    },
  };
}

/**
 * Explicit Router instance type exported for clearer typing across the
 * codebase and tests.
 */
export interface Router {
  store: Store<RouteState>;
  push: (path: string) => Promise<void>;
  replace: (path: string) => Promise<void>;
  back: () => void;
  subscribe: Store<RouteState>['subscribe'];
  matchRoute: (path: string) => {
    route: Route | null;
    params: Record<string, string>;
  };
  getCurrent: () => RouteState;
  resolveRouteComponent: typeof resolveRouteComponent;
  base: string;
  scrollToFragment: (frag?: string) => Promise<boolean>;
}

// SSR/static site support: match route for a given path
export function matchRouteSSR(routes: Route[], path: string) {
  return matchRoute(routes, path);
}

// Module-level reference to the latest initialized router. Tests and
// components may rely on re-initializing the router during their setup,
// so exposing this lets components pick up the most recent instance.
let activeRouter: ReturnType<typeof useRouter> | null = null;

/**
 * Singleton router instance for global access.
 *
 * Define here to prevent circular dependency
 * issue with component.
 */

export function initRouter(config: RouterConfig) {
  const router = useRouter(config);
  // Expose the most recently initialized router to components defined
  // earlier in the process (tests may call initRouter multiple times).
  // Components reference `activeRouter` so re-calling initRouter updates
  // the router instance they use.
  // Expose the most recently initialized router to components defined
  // earlier in the process (tests may call initRouter multiple times).
  // Components reference `activeRouter` so re-calling initRouter updates
  // the router instance they use.
  activeRouter = router;

  component('router-view', async () => {
    // Prefer the latest initialized router (tests may re-init). Fallback
    // to the router captured at init time.
    const r = activeRouter || router;
    // Reactive current route so the component re-renders when router updates
    if (!r) return html`<div>Router not initialized.</div>`;

    const current = ref(r.getCurrent());

    // We'll capture the unsubscribe function when the component connects
    // and register a disconnect cleanup during render-time (useOnDisconnected
    // must be called during the component render/execution).
    let unsubRouterView: (() => void) | undefined;

    useOnConnected(() => {
      try {
        if (r && typeof r.subscribe === 'function') {
          unsubRouterView = r.subscribe((s) => {
            try {
              current.value = s;
            } catch (e) {
              devWarn('router-view subscription update failed', e);
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
      }
    });

    const match = r.matchRoute(current.value.path);
    if (!match || !match.route) return html`<div>Not found</div>`;

    // Resolve the component (supports cached async loaders)
    try {
      const compRaw = await r.resolveRouteComponent(match.route);
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

    // Prefer the latest initialized router (tests may re-init). Fallback
    // to the router captured at init time.
    const r = activeRouter || router;
    // Reactive current state so link updates when route changes
    const current = ref(r.getCurrent());
    // Capture unsubscribe for link subscriptions and register disconnect
    // cleanup during render time.
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

    useOnConnected((ctx?: unknown) => {
      try {
        if (r && typeof r.subscribe === 'function') {
          unsubRouterLink = r.subscribe((s) => {
            try {
              current.value = s;
            } catch (e) {
              devWarn('router-link subscription update failed', e);
            }
          });
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
        }
      } catch (e) {
        devWarn('router-link host migration failed', e);
      }
    });

    useOnDisconnected(() => {
      if (typeof unsubRouterLink === 'function') {
        try {
          unsubRouterLink();
        } catch (e) {
          devWarn('router-link unsubscribe failed', e);
        }
      }
    });

    const isExactActive = computed(() => {
      const runtimeBase = r?.base ?? '';
      const targetRaw = (props.to as string) || '';
      // If the target is an absolute or protocol-relative URL, it's external
      // and should not be considered active.
      if (
        /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(targetRaw) ||
        targetRaw.startsWith('//')
      )
        return false;
      // strip fragment and query from target when comparing. Default to '/'
      const targetPathOnly = (targetRaw.split('#')[0] || '/').split('?')[0];
      try {
        // Remove runtime base if present on the provided target so comparisons
        // are made against the router-internal path format (paths stored
        // without base).
        let tgtCandidate = targetPathOnly;
        if (runtimeBase && tgtCandidate.startsWith(runtimeBase)) {
          tgtCandidate = tgtCandidate.slice(runtimeBase.length) || '/';
        }
        const cur = normalizePathForRoute(current.value.path);
        const tgt = normalizePathForRoute(tgtCandidate);
        return cur === tgt;
      } catch {
        return current.value.path === targetPathOnly;
      }
    });

    const isActive = computed(() => {
      const runtimeBase = r?.base ?? '';
      const targetRaw = (props.to as string) || '';
      // External targets are never "active" in the SPA sense
      if (
        /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(targetRaw) ||
        targetRaw.startsWith('//')
      )
        return false;
      // strip fragment and query from target when comparing
      const targetPathOnly = (targetRaw.split('#')[0] || '/').split('?')[0];
      if (props.exact) return isExactActive.value;
      try {
        // Normalize and strip base from target to compare against
        let tgtCandidate = targetPathOnly;
        if (runtimeBase && tgtCandidate.startsWith(runtimeBase)) {
          tgtCandidate = tgtCandidate.slice(runtimeBase.length) || '/';
        }
        const cur = normalizePathForRoute(current.value.path);
        const tgt = normalizePathForRoute(tgtCandidate);
        // Special-case the root target: '/' should only be active when
        // the current path is exactly '/'. Without this, '/' matches all
        // routes (every path starts with '/').
        if (tgt === '/') return cur === '/';
        // Consider active when current is the target or a child of the target
        if (cur === tgt) return true;
        // Ensure we match whole path segment (avoid '/guide-api' matching '/guide')
        return cur.startsWith(tgt.endsWith('/') ? tgt : tgt + '/');
      } catch {
        return (
          current.value &&
          typeof current.value.path === 'string' &&
          current.value.path.startsWith(targetPathOnly)
        );
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
      if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw) || raw.startsWith('//'))
        return raw;

      // Split fragment and query explicitly so both are preserved.
      const [pathWithQuery, frag] = raw.split('#');
      const [pathOnly, query] = (pathWithQuery || '').split('?');

      // Read base dynamically from the current router instance so repeated
      // calls to initRouter (tests) do not leave a stale captured value.
      const runtimeBase = r?.base ?? '';
      // If the provided path already contains the runtime base, strip it to
      // avoid duplicating e.g. '/app/app/about'. Keep a fallback of '/'.
      let candidate = pathOnly || '/';
      if (runtimeBase && candidate.startsWith(runtimeBase)) {
        candidate = candidate.slice(runtimeBase.length) || '/';
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
      const looksAbsolute =
        /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(toStr) || toStr.startsWith('//');
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
        r.replace(props.to as string);
      } else {
        r.push(props.to as string);
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
