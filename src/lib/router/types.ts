import { type Store } from '../store';

/**
 * Represents a component that can be rendered by the router.
 * Can be either a class constructor or a function component.
 */
export type RouteComponent =
  | { new (...args: unknown[]): unknown } // class components
  | ((...args: unknown[]) => unknown); // functional components

/**
 * Represents the current state of the router.
 */
export interface RouteState {
  /** The current path without base, query, or fragment */
  path: string;
  /** Route parameters extracted from dynamic path segments */
  params: Record<string, string>;
  /** Query parameters from the URL search string */
  query: Record<string, string>;
  /** Optional fragment (hash) portion of the URL, without the leading '#' */
  fragment?: string;
}

/**
 * Result type for route guards.
 * - `true`: Allow navigation
 * - `false`: Block navigation
 * - `string`: Redirect to the specified path
 */
export type GuardResult = boolean | string | Promise<boolean | string>;

/**
 * Defines a route in the router configuration.
 */
export interface Route {
  /** The path pattern for this route (e.g., '/users/:id') */
  path: string;

  /** Statically available component (already imported) */
  component?: string | (() => unknown);

  /** Lazy loader that resolves to something renderable */
  load?: () => Promise<{
    default: string | HTMLElement | ((...args: unknown[]) => unknown);
  }>;

  /** Guard that runs before matching — return false to cancel, or a string to redirect */
  beforeEnter?: (to: RouteState, from: RouteState) => GuardResult;

  /** Guard that runs right before navigation commits — can cancel or redirect */
  onEnter?: (to: RouteState, from: RouteState) => GuardResult;

  /** Hook that runs after navigation completes — cannot cancel */
  afterEnter?: (to: RouteState, from: RouteState) => void;
}

/**
 * Props interface for the router-link component.
 */
export interface RouterLinkProps {
  /** Target path or URL to navigate to */
  to: string;
  /** HTML tag to render ('a' or 'button') */
  tag: string;
  /** Whether to use replace instead of push navigation */
  replace: boolean;
  /** Whether to use exact matching for active state */
  exact: boolean;
  /** CSS class applied when link is active */
  activeClass: string;
  /** CSS class applied when link is exactly active */
  exactActiveClass: string;
  /** Value for aria-current attribute when exactly active */
  ariaCurrentValue: string;
  /** Whether the link is disabled */
  disabled: boolean;
  /** Whether this is an external link */
  external: boolean;
  /** Additional CSS classes */
  class?: string;
  /** Additional inline styles */
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

/**
 * Configuration object for initializing the router.
 */
export interface RouterConfig {
  /** Array of route definitions */
  routes: Route[];
  /** Base path for all routes */
  base?: string;
  /** Initial URL for SSR mode */
  initialUrl?: string;
  /** Configure fragment (hash) scrolling behavior */
  scrollToFragment?:
    | boolean
    | {
        /** Whether fragment scrolling is enabled */
        enabled?: boolean;
        /** Offset in pixels to account for fixed headers */
        offset?: number;
        /** Timeout in ms to wait for element to appear */
        timeoutMs?: number;
      };
}

/**
 * Router instance interface providing navigation and state management.
 */
export interface Router {
  /** Reactive store containing current route state */
  store: Store<RouteState>;
  /** Navigate to a path (adds to history) */
  push: (path: string) => Promise<void>;
  /** Navigate to a path (replaces current history entry) */
  replace: (path: string) => Promise<void>;
  /** Go back in browser history */
  back: () => void;
  /** Subscribe to route state changes */
  subscribe: Store<RouteState>['subscribe'];
  /** Match a path against configured routes */
  matchRoute: (path: string) => {
    route: Route | null;
    params: Record<string, string>;
  };
  /** Get current route state */
  getCurrent: () => RouteState;
  /** Resolve a route's component */
  resolveRouteComponent: (
    route: Route,
  ) => Promise<string | HTMLElement | ((...args: unknown[]) => unknown)>;
  /** Base path for the router */
  base: string;
  /** Scroll to a fragment/hash element */
  scrollToFragment: (frag?: string) => Promise<boolean>;
  /** Internal scroll state cleanup (optional) */
  _cleanupScrollState?: () => void;
}
