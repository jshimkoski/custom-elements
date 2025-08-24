/**
 * Lightweight, scalable router for Custom Elements Runtime
 * - Functional API, zero dependencies, SSR/static site compatible
 * - Integrates with Store and runtime.ts
 */


import { createStore, type Store } from './store';

export interface Route {
  path: string;
  component?: string;
  load?: () => Promise<{ default: string | HTMLElement | Function }>;
}

export interface RouterConfig {
  routes: Route[];
  base?: string;
}

export interface RouteState {
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
}


const parseQuery = (search: string): Record<string, string> => {
  if (!search) return {};
  if (typeof URLSearchParams === 'undefined') return {};
  return Object.fromEntries(new URLSearchParams(search));
};

const matchRoute = (routes: Route[], path: string): { route: Route | null; params: Record<string, string> } => {
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
  const { routes, base = '' } = config;
  let getLocation: () => { path: string; query: Record<string, string> };
  let initial: { path: string; query: Record<string, string> };
  let store: Store<RouteState>;
  let update: () => void;
  let push: (path: string) => void;
  let replace: (path: string) => void;
  let back: () => void;

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
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
    update = () => {
      const loc = getLocation();
      const match = matchRoute(routes, loc.path);
      const s = store.getState() as RouteState;
      s.path = loc.path;
      s.params = match.params;
      s.query = loc.query;
    };
    window.addEventListener('popstate', update);
    push = (path: string) => {
      window.history.pushState({}, '', base + path);
      update();
    };
    replace = (path: string) => {
      window.history.replaceState({}, '', base + path);
      update();
    };
    back = () => window.history.back();
  } else {
    // SSR fallback: minimal API
    getLocation = () => ({ path: '/', query: {} });
    initial = getLocation();
    const match = matchRoute(routes, initial.path);
    store = createStore<RouteState>({
      path: initial.path,
      params: match.params,
      query: initial.query
    });
    update = () => {};
    push = () => {};
    replace = () => {};
    back = () => {};
  }

  return {
    store,
    push,
    replace,
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
import { component, html, css, match } from './runtime';
export function initRouter(config: RouterConfig) {
  const router = useRouter(config);
  component('router-view', {
    render: async () => {
      if (!router) return html`<div>Router not initialized.</div>`;
      const current = router.getCurrent() as import('./router').RouteState;
      const { path } = current;
      const match = router.matchRoute(path);
      if (!match.route) return html`<div>Not found</div>`;
      if (match.route.load) {
        await match.route.load();
      }
      return html`<${match.route.component}></${match.route.component}>`;
    },
    onConnected(context) {
      // Subscribe to router state and re-render on change
      if (router && typeof router.subscribe === 'function') {
        router.subscribe(() => {
          if (typeof context.render === 'function') context.render();
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
    styles: string;
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
    computed: {
      current(_context) {
        return router.getCurrent();
      },
      isExactActive(context) {
        const current = context.current as { path: string };
        return current.path === context.to;
      },
      isActive(context) {
        const current = context.current as { path?: string } | undefined;
        return context.exact
          ? context.isExactActive
          : current && typeof current.path === 'string'
            ? current.path.startsWith(context.to)
            : false;
      },
      className(context) {
        return context.isExactActive
          ? context.exactActiveClass
          : context.isActive
          ? context.activeClass
          : '';
      },
      ariaCurrent(context) {
        return context.isExactActive ? `aria-current="${context.ariaCurrentValue}"` : '';
      },
      isButton(context) {
        return context.tag === 'button';
      },
      disabledAttr(context) {
        return context.disabled
          ? context.isButton
            ? 'disabled aria-disabled="true" tabindex="-1"'
            : 'aria-disabled="true" tabindex="-1"'
          : '';
      },
      externalAttr(context) {
        return context.external && (context.tag === 'a' || !context.tag)
          ? 'target="_blank" rel="noopener noreferrer"'
          : '';
      },
    },
    style: (context) => context.style,
    render: (context) => html`
      ${match()
        .when(context.isButton, html`
          <button
            part="button"
            class="${context.className}"
            ${context.ariaCurrent}
            ${context.disabledAttr}
            ${context.externalAttr}
            data-on-click="navigate"
          ><slot></slot></button>
        `)
        .otherwise(html`
          <a
            part="link"
            href="${context.to}"
            class="${context.className}"
            ${context.ariaCurrent}
            ${context.disabledAttr}
            ${context.externalAttr}
            data-on-click="navigate"
          ><slot></slot></a>
        `)
        .done()}
    `,
    navigate: (e: MouseEvent, context) => {
      if (context.disabled) {
        e.preventDefault();
        return;
      }
      // If external, let browser handle navigation
      if (context.external && (context.tag === 'a' || !context.tag)) {
        return;
      }
      e.preventDefault();
      if (context.replace) {
        router.replace(context.to);
      } else {
        router.push(context.to);
      }
    }
  });
  return router;
}