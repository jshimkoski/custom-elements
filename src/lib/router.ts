import { createStore } from './store';

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
  let store: ReturnType<typeof createStore>;
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
    getCurrent: () => store.getState(),
    resolveRouteComponent
  };
}

// SSR/static site support: match route for a given path
export function matchRouteSSR(routes: Route[], path: string) {
  return matchRoute(routes, path);
}
