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
  component?: string;

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

    update = async () => {};
    push = async () => {};
    replaceFn = async () => {};
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
      let componentTag = match.route.component;
      if (match.route.load) {
        const loaded = await match.route.load();
        // Only support string tag names for runtime
        if (typeof loaded.default === 'string') {
          componentTag = loaded.default;
        }
      }
      if (typeof componentTag === 'string') {
        return html`<${componentTag}></${componentTag}>`;
      }
      return html`<div>Invalid route component</div>`;
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

  interface RouterLinkProps {
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

  interface RouterLinkComputed {
    current: RouteState;
    isExactActive: boolean;
    isActive: boolean;
    className: string;
    ariaCurrent: string;
    isButton: boolean;
    disabledAttr: string;
    externalAttr: string;
  }

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
      style: { type: String, default: css`
        [aria-disabled="true"] {
          pointer-events: none;
          opacity: 0.5;
        }
      ` },
    },
    style: (context) => context.props.style,
    render: (context) => {
      // Recalculate computed values in render
      const current = router.getCurrent();
      const to = context.props.to;
      const exact = context.props.exact;
      const exactActiveClass = context.props.exactActiveClass;
      const activeClass = context.props.activeClass;
      const ariaCurrentValue = context.props.ariaCurrentValue;
      const tag = context.props.tag;
      const disabled = context.props.disabled;
      const external = context.props.external;
      // Computed
      const isExactActive = current.path === to;
      const isActive = exact
        ? isExactActive
        : current && typeof current.path === 'string'
          ? current.path.startsWith(to)
          : false;
      const className = isExactActive
        ? exactActiveClass
        : isActive
        ? activeClass
        : '';
      const ariaCurrent = isExactActive ? `aria-current="${ariaCurrentValue}"` : '';
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
              class="${className}"
              ${ariaCurrent}
              ${disabledAttr}
              ${externalAttr}
              data-on-click="navigate"
            ><slot></slot></button>
          `)
          .otherwise(html`
            <a
              part="link"
              href="${to}"
              class="${className}"
              ${ariaCurrent}
              ${disabledAttr}
              ${externalAttr}
              data-on-click="navigate"
            ><slot></slot></a>
          `)
          .done()}
      `;
    },
    navigate: (e: MouseEvent, context: ComponentContext<{}, RouterLinkComputed, RouterLinkProps, any>) => {
      const { disabled, external, tag, replace, to } = context.props;
      if (disabled) {
        e.preventDefault();
        return;
      }
      if (external && (tag === 'a' || !tag)) {
        return;
      }
      e.preventDefault();
      if (replace) {
        router.replace(to);
      } else {
        router.push(to);
      }
    }
  });
  return router;
}