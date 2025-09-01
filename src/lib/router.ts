/**
 * Lightweight, scalable router for Custom Elements Runtime
 * - Functional API, zero dependencies, SSR/static site compatible
 * - Integrates with createStore and lib/index.ts
 */

import type { ComponentContext } from './runtime/types';
import { createStore, type Store } from './store';
import { component } from './runtime/component';
import { html } from './runtime/template-compiler';
import { css } from './runtime/style';
import { match } from './directives';

export interface RouteComponent {
  // Can be any renderable type — adjust as needed for your framework
  new (...args: any[]): any; // class components
  // OR functional components
  (...args: any[]): any;
}

export interface RouteState {
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
}

export type GuardResult = boolean | string | Promise<boolean | string>;

export interface Route {
  path: string;

  /**
   * Statically available component (already imported)
   */
  component?: string | (() => any);

  /**
   * Lazy loader that resolves to something renderable
   */
  load?: () => Promise<{ default: string | HTMLElement | Function }>;


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
  style: string;
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
}

export interface RouteState {
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
}


export const parseQuery = (search: string): Record<string, string> => {
  if (!search) return {};
  if (typeof URLSearchParams === 'undefined') return {};
  return Object.fromEntries(new URLSearchParams(search));
};

export const matchRoute = (routes: Route[], path: string): { route: Route | null; params: Record<string, string> } => {
  for (const route of routes) {
    const paramNames: string[] = [];
    const regexPath = route.path.replace(/:[^/]+/g, (m) => {
      paramNames.push(m.slice(1));
      return '([^/]+)';
    });
    const regex = new RegExp(`^${regexPath}$`);
    const match = path.match(regex);
    if (match) {
      const params: Record<string, string> = {};
      paramNames.forEach((name, i) => {
        params[name] = match[i + 1];
      });
      return { route, params };
    }
  }
  return { route: null, params: {} };
};

// Async component loader cache
const componentCache: Record<string, any> = {};

/**
 * Loads a route's component, supporting both static and async.
 * @param route Route object
 * @returns Promise resolving to the component
 */
export async function resolveRouteComponent(route: Route): Promise<any> {
  if (route.component) return route.component;
  if (route.load) {
    if (componentCache[route.path]) return componentCache[route.path];
    try {
      const mod = await route.load();
      componentCache[route.path] = mod.default;
      return mod.default;
    } catch (err) {
      throw new Error(`Failed to load component for route: ${route.path}`);
    }
  }
  throw new Error(`No component or loader defined for route: ${route.path}`);
}

export function useRouter(config: RouterConfig) {
  const { routes, base = '', initialUrl } = config;

  let getLocation: () => { path: string; query: Record<string, string> };
  let initial: { path: string; query: Record<string, string> };
  let store: Store<RouteState>;
  let update: (replace?: boolean) => Promise<void>;
  let push: (path: string) => Promise<void>;
  let replaceFn: (path: string) => Promise<void>;
  let back: () => void;

  // Run matching route guards/hooks
  const runBeforeEnter = async (to: RouteState, from: RouteState) => {
    const matched = routes.find(r => matchRoute([r], to.path).route !== null);
    if (matched?.beforeEnter) {
      try {
        const result = await matched.beforeEnter(to, from);
        if (typeof result === 'string') {
          // Redirect
          await navigate(result, true);
          return false;
        }
        return result !== false;
      } catch (err) {
        console.error('beforeEnter error', err);
        return false;
      }
    }
    return true;
  };

  const runOnEnter = async (to: RouteState, from: RouteState) => {
    const matched = routes.find(r => matchRoute([r], to.path).route !== null);
    if (matched?.onEnter) {
      try {
        const result = await matched.onEnter(to, from);
        if (typeof result === 'string') {
          await navigate(result, true);
          return false;
        }
        return result !== false;
      } catch (err) {
        console.error('onEnter error', err);
        return false;
      }
    }
    return true;
  };

  const runAfterEnter = (to: RouteState, from: RouteState) => {
    const matched = routes.find(r => matchRoute([r], to.path).route !== null);
    if (matched?.afterEnter) {
      try {
        matched.afterEnter(to, from);
      } catch (err) {
        console.error('afterEnter error', err);
      }
    }
  };

  const navigate = async (path: string, replace = false) => {
    try {
      const loc = {
        path: path.replace(base, '') || '/',
        query: {}
      };
      const match = matchRoute(routes, loc.path);
      if (!match) throw new Error(`No route found for ${loc.path}`);

      const from = store.getState();
      const to: RouteState = {
        path: loc.path,
        params: match.params,
        query: loc.query
      };

      // beforeEnter guard
      const allowedBefore = await runBeforeEnter(to, from);
      if (!allowedBefore) return;

      // onEnter guard (right before commit)
      const allowedOn = await runOnEnter(to, from);
      if (!allowedOn) return;

      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        if (replace) {
          window.history.replaceState({}, '', base + path);
        } else {
          window.history.pushState({}, '', base + path);
        }
      }

      store.setState(to);

      // afterEnter hook (post commit)
      runAfterEnter(to, from);

    } catch (err) {
      console.error('Navigation error:', err);
    }
  };

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    // Browser mode
    getLocation = () => {
      const url = new URL(window.location.href);
      const path = url.pathname.replace(base, '') || '/';
      const query = parseQuery(url.search);
      return { path, query };
    };

    initial = getLocation();
    const match = matchRoute(routes, initial.path);
    store = createStore<RouteState>({
      path: initial.path,
      params: match.params,
      query: initial.query
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
      const path = url.pathname.replace(base, '') || '/';
      const query = parseQuery(url.search);
      return { path, query };
    };

    initial = getLocation();
    const match = matchRoute(routes, initial.path);
    store = createStore<RouteState>({
      path: initial.path,
      params: match.params,
      query: initial.query
    });

    update = async () => {
      const loc = getLocation();
      await navigateSSR(loc.path);
    };

    const navigateSSR = async (path: string) => {
      try {
        const loc = {
          path: path.replace(base, '') || '/',
          query: {}
        };
        const match = matchRoute(routes, loc.path);
        if (!match) throw new Error(`No route found for ${loc.path}`);

        const from = store.getState();
        const to: RouteState = {
          path: loc.path,
          params: match.params,
          query: loc.query
        };

        // beforeEnter guard
        const matched = routes.find(r => matchRoute([r], to.path).route !== null);
        if (matched?.beforeEnter) {
          try {
            const result = await matched.beforeEnter(to, from);
            if (typeof result === 'string') {
              // Redirect
              await navigateSSR(result);
              return;
            }
            if (result === false) return;
          } catch (err) {
            return;
          }
        }

        // onEnter guard
        if (matched?.onEnter) {
          try {
            const result = await matched.onEnter(to, from);
            if (typeof result === 'string') {
              await navigateSSR(result);
              return;
            }
            if (result === false) return;
          } catch (err) {
            return;
          }
        }

        store.setState(to);

        // afterEnter hook
        if (matched?.afterEnter) {
          try {
            matched.afterEnter(to, from);
          } catch (err) {}
        }
      } catch (err) {}
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
    resolveRouteComponent
  };
}


// SSR/static site support: match route for a given path
export function matchRouteSSR(routes: Route[], path: string) {
  return matchRoute(routes, path);
}

/**
 * Singleton router instance for global access.
 * 
 * Define here to prevent circular dependency
 * issue with component.
 */

export function initRouter(config: RouterConfig) {
  const router = useRouter(config);
  component('router-view', {
    async render() {
      if (!router) return html`<div>Router not initialized.</div>`;
      const current = router.getCurrent();
      const { path } = current;
      const match = router.matchRoute(path);
      if (!match.route) return html`<div>Not found</div>`;

      // Resolve the component (supports cached async loaders)
      try {
        const comp = await router.resolveRouteComponent(match.route);

        // String tag (custom element) -> render as VNode
        if (typeof comp === 'string') {
          return { tag: comp, props: {}, children: [] };
        }

        // Function component (sync or async) -> call and return its VNode(s)
        if (typeof comp === 'function') {
          const out = comp();
          const resolved = out instanceof Promise ? await out : out;
          // If the function returned a string tag, render that element
          if (typeof resolved === 'string') return { tag: resolved, props: {}, children: [] };
          // Otherwise assume it's a VNode or VNode[] and return it directly
          return resolved as any;
        }

        // Unknown component type
        return html`<div>Invalid route component</div>`;
      } catch (err) {
        // Propagate as an invalid route component to show a clear message in the view
        return html`<div>Invalid route component</div>`;
      }
    },
    onConnected(ctx) {
      if (router && typeof router.subscribe === 'function') {
        router.subscribe(() => {
          if (typeof ctx.requestRender === 'function') {
            ctx.requestRender();
          }
        });
      }
    }
  });

  component<{}, RouterLinkComputed, RouterLinkProps>('router-link', {
    state: {},
    props: {
      to: { type: String, default: '' },
      tag: { type: String, default: 'a' },
      replace: { type: Boolean, default: false },
      exact: { type: Boolean, default: false },
      activeClass: { type: String, default: 'active' },
      exactActiveClass: { type: String, default: 'exact-active' },
      ariaCurrentValue: { type: String, default: 'page' },
      disabled: { type: Boolean, default: false },
      external: { type: Boolean, default: false },
      class: { type: String, default: '' },
      style: { type: String, default: css`
        [aria-disabled="true"] {
          pointer-events: none;
          opacity: 0.5;
        }
      ` },
    },
    style: (ctx) => ctx.style,
    render: (ctx) => {
      // Recalculate computed values in render
      const current = router.getCurrent();
      const to = ctx.to;
      const exact = ctx.exact;
      const exactActiveClass = ctx.exactActiveClass;
      const activeClass = ctx.activeClass;
      const ariaCurrentValue = ctx.ariaCurrentValue;
      const tag = ctx.tag;
      const disabled = ctx.disabled;
      const external = ctx.external;
      // Computed
      const isExactActive = current.path === to;
      const isActive = exact
        ? isExactActive
        : current && typeof current.path === 'string'
          ? current.path.startsWith(to)
          : false;
      const ariaCurrent = isExactActive ? `aria-current="${ariaCurrentValue}"` : '';
      // Build class object so JIT CSS can see the literal class names.
      // Include user-provided classes (may be multiple space-separated) and
      // static keys for active/exact-active so a JIT scanner can pick them up.
      const userClassList = (ctx.class || '').split(/\s+/).filter(Boolean);
      const userClasses: Record<string, boolean> = {};
      for (const c of userClassList) userClasses[c] = true;
      const classObject = {
        ...userClasses,
        // Also include the configurable names (may duplicate the above)
        [activeClass]: isActive,
        [exactActiveClass]: isExactActive,
      };
      const isButton = tag === 'button';
      const disabledAttr = disabled
        ? isButton
          ? 'disabled aria-disabled="true" tabindex="-1"'
          : 'aria-disabled="true" tabindex="-1"'
        : '';
      const externalAttr = external && (tag === 'a' || !tag)
        ? 'target="_blank" rel="noopener noreferrer"'
        : '';
      return html`
        ${match()
          .when(isButton, html`
            <button
              part="button"
              :class="${classObject}"
              ${ariaCurrent}
              ${disabledAttr}
              ${externalAttr}
              @click="navigate"
            ><slot></slot></button>
          `)
          .otherwise(html`
            <a
              part="link"
              href="${to}"
              :class="${classObject}"
              ${ariaCurrent}
              ${disabledAttr}
              ${externalAttr}
              @click="navigate"
            ><slot></slot></a>
          `)
          .done()}
      `;
    },
    navigate: (e: MouseEvent, ctx: ComponentContext<{}, RouterLinkComputed, RouterLinkProps, any>) => {
      if (ctx.disabled) {
        e.preventDefault();
        return;
      }
      if (ctx.external && (ctx.tag === 'a' || !ctx.tag)) {
        return;
      }
      e.preventDefault();
      if (ctx.replace) {
        router.replace(ctx.to);
      } else {
        router.push(ctx.to);
      }
    }
  });
  return router;
}