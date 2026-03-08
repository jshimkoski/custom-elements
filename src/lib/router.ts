export type {
  RouteComponent,
  RouteState,
  GuardResult,
  Route,
  RouterLinkProps,
  RouterLinkComputed,
  RouterConfig,
  Router,
} from './router/types';
export {
  parseQuery,
  serializeQuery,
  normalizePathForRoute,
  DEFAULT_SCROLL_CONFIG,
  isDangerousScheme,
  isAbsoluteUrl,
  safeDecode,
  canonicalizeBase,
} from './router/path-utils';
export { matchRoute, matchRouteSSR, findMatchedRoute } from './router/matcher';
export {
  clearComponentCache,
  resolveRouteComponent,
} from './router/component-loader';
export { activeRouterProxy } from './router/active-proxy';
export { useRouter, initRouter } from './router/instance';
