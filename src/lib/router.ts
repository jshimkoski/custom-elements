import { html } from "./runtime/template-compiler";
import { component } from "./runtime/component";
import {
  useProps,
  useOnConnected,
  useOnDisconnected,
  useStyle,
} from "./runtime/hooks";
import { ref, computed } from "./runtime/reactive";
import { createStore, type Store } from "./store";
import { devError, devWarn } from "./runtime/logger";
import { match } from "./directives";

export type RouteComponent =
  | { new (...args: any[]): any } // class components
  | ((...args: any[]) => any); // functional components

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
  linkClass?: string;
  linkStyle?: string;
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

export const parseQuery = (search: string): Record<string, string> => {
  if (!search) return {};
  if (typeof URLSearchParams === "undefined") return {};
  return Object.fromEntries(new URLSearchParams(search));
};

export const matchRoute = (
  routes: Route[],
  path: string
): { route: Route | null; params: Record<string, string> } => {
  for (const route of routes) {
    const paramNames: string[] = [];
    const regexPath = route.path.replace(/:[^/]+/g, (m) => {
      paramNames.push(m.slice(1));
      return "([^/]+)";
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
  const { routes, base = "", initialUrl } = config;

  let getLocation: () => { path: string; query: Record<string, string> };
  let initial: { path: string; query: Record<string, string> };
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
      if (typeof result === "string") {
        // Redirect
        await navigate(result, true);
        return false;
      }
      return result !== false;
    } catch (err) {
      devError("beforeEnter error", err);
      return false;
    }
  };

  const runOnEnter = async (to: RouteState, from: RouteState) => {
    const matched = findMatchedRoute(routes, to.path);
    if (!matched || !matched.onEnter) return true;
    try {
      const result = await matched.onEnter(to, from);
      if (typeof result === "string") {
        await navigate(result, true);
        return false;
      }
      return result !== false;
    } catch (err) {
      devError("onEnter error", err);
      return false;
    }
  };

  const runAfterEnter = (to: RouteState, from: RouteState) => {
    const matched = findMatchedRoute(routes, to.path);
    if (!matched || !matched.afterEnter) return;
    try {
      matched.afterEnter(to, from);
    } catch (err) {
      devError("afterEnter error", err);
    }
  };

  const navigate = async (path: string, replace = false) => {
    try {
      const loc = {
        path: path.replace(base, "") || "/",
        query: {},
      };
      const match = matchRoute(routes, loc.path);
      if (!match) throw new Error(`No route found for ${loc.path}`);

      const from = store.getState();
      const to: RouteState = {
        path: loc.path,
        params: match.params,
        query: loc.query,
      };

      // beforeEnter guard
      const allowedBefore = await runBeforeEnter(to, from);
      if (!allowedBefore) return;

      // onEnter guard (right before commit)
      const allowedOn = await runOnEnter(to, from);
      if (!allowedOn) return;

      if (typeof window !== "undefined" && typeof document !== "undefined") {
        if (replace) {
          window.history.replaceState({}, "", base + path);
        } else {
          window.history.pushState({}, "", base + path);
        }
      }

      store.setState(to);

      // afterEnter hook (post commit)
      runAfterEnter(to, from);
    } catch (err) {
      devError("Navigation error:", err);
    }
  };

  // If an explicit `initialUrl` is provided we treat this as SSR/static rendering
  // even if a `window` exists (useful for hydration tests). Browser mode only
  // applies when `initialUrl` is undefined.
  if (
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    typeof initialUrl === "undefined"
  ) {
    // Browser mode
    getLocation = () => {
      const url = new URL(window.location.href);
      const path = url.pathname.replace(base, "") || "/";
      const query = parseQuery(url.search);
      return { path, query };
    };

    initial = getLocation();
    const match = matchRoute(routes, initial.path);
    store = createStore<RouteState>({
      path: initial.path,
      params: match.params,
      query: initial.query,
    });

    update = async (replace = false) => {
      const loc = getLocation();
      await navigate(loc.path, replace);
    };

    window.addEventListener("popstate", () => update(true));

    push = (path: string) => navigate(path, false);
    replaceFn = (path: string) => navigate(path, true);
    back = () => window.history.back();
  } else {
    // SSR mode
    getLocation = () => {
      const url = new URL(initialUrl || "/", "http://localhost");
      const path = url.pathname.replace(base, "") || "/";
      const query = parseQuery(url.search);
      return { path, query };
    };

    initial = getLocation();
    const match = matchRoute(routes, initial.path);
    store = createStore<RouteState>({
      path: initial.path,
      params: match.params,
      query: initial.query,
    });

    update = async () => {
      const loc = getLocation();
      await navigateSSR(loc.path);
    };

    const navigateSSR = async (path: string) => {
      try {
        const loc = {
          path: path.replace(base, "") || "/",
          query: {},
        };
        const match = matchRoute(routes, loc.path);
        if (!match) throw new Error(`No route found for ${loc.path}`);

        const from = store.getState();
        const to: RouteState = {
          path: loc.path,
          params: match.params,
          query: loc.query,
        };

        // beforeEnter guard
        const matched = findMatchedRoute(routes, to.path);
        if (matched?.beforeEnter) {
          try {
            const result = await matched.beforeEnter(to, from);
            if (typeof result === "string") {
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
            if (typeof result === "string") {
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
    resolveRouteComponent,
  };
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
  activeRouter = router;

  component("router-view", () => {
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
        if (r && typeof r.subscribe === "function") {
          unsubRouterView = r.subscribe((s) => {
            try {
              current.value = s;
            } catch (e) {
              devWarn("router-view subscription update failed", e);
            }
          });
        }
      } catch (e) {
        devWarn("router-view subscribe failed", e);
      }
    });

    useOnDisconnected(() => {
      if (typeof unsubRouterView === "function") {
        try {
          unsubRouterView();
        } catch (e) {
          devWarn("router-view unsubscribe failed", e);
        }
      }
    });

    const match = r.matchRoute(current.value.path);
    if (!match || !match.route) return html`<div>Not found</div>`;

    // Resolve the component (supports cached async loaders)
    return r
      .resolveRouteComponent(match.route)
      .then((comp: any) => {
        // String tag (custom element) -> render as VNode
        if (typeof comp === "string") {
          return { tag: comp, props: {}, children: [] };
        }

        // Function component (sync or async) -> call and return its VNode(s)
        if (typeof comp === "function") {
          const out = comp();
          const resolved = out instanceof Promise ? out : Promise.resolve(out);
          return resolved.then((resolvedComp: any) => {
            if (typeof resolvedComp === "string")
              return { tag: resolvedComp, props: {}, children: [] };
            return resolvedComp as any;
          });
        }

        return html`<div>Invalid route component</div>`;
      })
      .catch(() => html`<div>Invalid route component</div>`);
  });

  component("router-link", () => {
    // Declare props via useProps so observedAttributes are correct
    const props = useProps<Partial<RouterLinkProps>>({
      to: "",
      tag: "a",
      replace: false,
      exact: false,
      activeClass: "active",
      exactActiveClass: "exact-active",
      ariaCurrentValue: "page",
      disabled: false,
      external: false,
      linkClass: "",
      linkStyle: "",
    });

    // Prefer the latest initialized router (tests may re-init). Fallback
    // to the router captured at init time.
    const r = activeRouter || router;
    // Reactive current state so link updates when route changes
    const current = ref(r.getCurrent());
    // Capture unsubscribe for link subscriptions and register disconnect
    // cleanup during render time.
    let unsubRouterLink: (() => void) | undefined;

    useStyle(
      () => (`a,button{display:inline-block;}` + props.linkStyle) as string
    );

    useOnConnected(() => {
      try {
        if (r && typeof r.subscribe === "function") {
          unsubRouterLink = r.subscribe((s) => {
            try {
              current.value = s;
            } catch (e) {
              devWarn("router-link subscription update failed", e);
            }
          });
        }
      } catch (e) {
        devWarn("router-link subscribe failed", e);
      }
    });

    useOnDisconnected(() => {
      if (typeof unsubRouterLink === "function") {
        try {
          unsubRouterLink();
        } catch (e) {
          devWarn("router-link unsubscribe failed", e);
        }
      }
    });

    const isExactActive = computed(
      () => current.value.path === (props.to as string)
    );
    const isActive = computed(() =>
      props.exact
        ? isExactActive.value
        : current.value && typeof current.value.path === "string"
        ? current.value.path.startsWith(props.to as string)
        : false
    );

    // Build user classes reactively from the `linkClass` prop.
    // We intentionally do NOT read the host `class` attribute to avoid
    // duplicate styling applied to both host and inner element.
    const userClasses = computed(() => {
      const raw = (props.linkClass as string) || "";
      const list = raw.split(/\s+/).filter(Boolean);
      const map: Record<string, boolean> = {};
      for (const c of list) map[c] = true;
      return map;
    });

    const classObject = computed(() => ({
      ...userClasses.value,
      [(props.activeClass as string) || "active"]: isActive.value,
      [(props.exactActiveClass as string) || "exact-active"]:
        isExactActive.value,
    }));

    const isButton = computed(() => (props.tag as string) === "button");
    // Instead of pre-building attribute fragments as strings (which can
    // accidentally inject invalid attribute names into the template and
    // cause DOMExceptions), compute simple booleans/values and apply
    // attributes explicitly in the template below.
    const ariaCurrentValue = computed(() =>
      isExactActive.value ? (props.ariaCurrentValue as string) : ""
    );
    const isDisabled = computed(() => !!props.disabled);
    const isExternal = computed(
      () =>
        !!props.external &&
        ((props.tag as string) === "a" || !(props.tag as string))
    );

    const navigate = (e: MouseEvent) => {
      if (props.disabled) {
        e.preventDefault();
        return;
      }
      if (
        props.external &&
        ((props.tag as string) === "a" || !(props.tag as string))
      ) {
        return;
      }
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
              :class="${classObject.value}"
              aria-current="${ariaCurrentValue.value}"
              disabled="${isDisabled.value ? "" : null}"
              aria-disabled="${isDisabled.value ? "true" : null}"
              tabindex="${isDisabled.value ? "-1" : null}"
              @click="${navigate}"
            >
              <slot></slot>
            </button>
          `
        )
        .otherwise(
          html`
            <a
              part="link"
              href="${props.to}"
              :class="${classObject.value}"
              aria-current="${ariaCurrentValue.value}"
              aria-disabled="${isDisabled.value ? "true" : null}"
              tabindex="${isDisabled.value ? "-1" : null}"
              target="${isExternal.value ? "_blank" : null}"
              rel="${isExternal.value ? "noopener noreferrer" : null}"
              @click="${navigate}"
              ><slot></slot
            ></a>
          `
        )
        .done()}
    `;
  });

  return router;
}
