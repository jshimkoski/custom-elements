/**
 * Lightweight, scalable router for Custom Elements Runtime
 * - Functional API, zero dependencies, SSR/static site compatible
 * - Integrates with createStore and lib/index.ts
 */

import { html } from "./runtime/template-compiler";
import { component } from "./runtime/component";
import { useProps, useOnConnected } from "./runtime/hooks";
import { ref, computed } from "./runtime/reactive";
import { createStore, type Store } from "./store";
import { devError } from "./runtime/logger";
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
  class?: string;
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
    const matched = routes.find((r) => matchRoute([r], to.path).route !== null);
    if (matched?.beforeEnter) {
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
    }
    return true;
  };

  const runOnEnter = async (to: RouteState, from: RouteState) => {
    const matched = routes.find((r) => matchRoute([r], to.path).route !== null);
    if (matched?.onEnter) {
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
    }
    return true;
  };

  const runAfterEnter = (to: RouteState, from: RouteState) => {
    const matched = routes.find((r) => matchRoute([r], to.path).route !== null);
    if (matched?.afterEnter) {
      try {
        matched.afterEnter(to, from);
      } catch (err) {
        devError("afterEnter error", err);
      }
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
        const matched = routes.find(
          (r) => matchRoute([r], to.path).route !== null
        );
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

/**
 * Singleton router instance for global access.
 *
 * Define here to prevent circular dependency
 * issue with component.
 */

export function initRouter(config: RouterConfig) {
  const router = useRouter(config);

  component("router-view", () => {
    // Reactive current route so the component re-renders when router updates
    if (!router) return html`<div>Router not initialized.</div>`;

    const current = ref(router.getCurrent());

    useOnConnected(() => {
      // Subscribe to router updates and update the reactive ref
      try {
        if (router && typeof router.subscribe === "function") {
          router.subscribe((s) => {
            try {
              current.value = s;
            } catch (e) {
              /* best-effort */
            }
          });
        }
      } catch (e) {
        // swallow
      }
    });

    const match = router.matchRoute(current.value.path);
    if (!match || !match.route) return html`<div>Not found</div>`;

    // Resolve the component (supports cached async loaders)
    return router
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
      class: "",
      style: "",
    });

    // Reactive current state so link updates when route changes
    const current = ref(router.getCurrent());
    useOnConnected(() => {
      try {
        if (router && typeof router.subscribe === "function") {
          router.subscribe((s) => {
            try {
              current.value = s;
            } catch (e) {}
          });
        }
      } catch (e) {}
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
    const ariaCurrent = computed(() =>
      isExactActive.value
        ? `aria-current="${props.ariaCurrentValue as string}"`
        : ""
    );

    const userClassList = ((props.class as string) || "")
      .split(/\s+/)
      .filter(Boolean);
    const userClasses: Record<string, boolean> = {};
    for (const c of userClassList) userClasses[c] = true;

    const classObject = computed(() => ({
      ...userClasses,
      [(props.activeClass as string) || "active"]: isActive.value,
      [(props.exactActiveClass as string) || "exact-active"]:
        isExactActive.value,
    }));

    const isButton = computed(() => (props.tag as string) === "button");
    const disabledAttr = computed(() =>
      props.disabled
        ? isButton.value
          ? 'disabled aria-disabled="true" tabindex="-1"'
          : 'aria-disabled="true" tabindex="-1"'
        : ""
    );
    const externalAttr = computed(() =>
      props.external &&
      ((props.tag as string) === "a" || !(props.tag as string))
        ? 'target="_blank" rel="noopener noreferrer"'
        : ""
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
        router.replace(props.to as string);
      } else {
        router.push(props.to as string);
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
              ${ariaCurrent.value}
              ${disabledAttr.value}
              ${externalAttr.value}
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
              ${ariaCurrent.value}
              ${disabledAttr.value}
              ${externalAttr.value}
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
