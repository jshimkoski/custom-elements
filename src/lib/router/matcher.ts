import type { Route } from './types';
import { safeDecode, normalizePathForRoute } from './path-utils';
import { devWarn } from '../runtime/logger';

// Cache compiled route regexes to avoid rebuilding on every navigation.
type CompiledRoute =
  | { regex: RegExp; paramNames: string[] }
  | { invalid: true };
const compileCache: WeakMap<Route, CompiledRoute> = new WeakMap();

function escapeSeg(seg: string) {
  return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

      for (let i = 0; i < paramNames.length; i++) {
        const rawValue = m[i + 1] || '';
        params[paramNames[i]] = rawValue ? safeDecode(rawValue) : '';
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
export function findMatchedRoute(routes: Route[], path: string): Route | null {
  for (const r of routes) {
    if (matchRoute([r], path).route !== null) return r;
  }
  return null;
}

// SSR/static site support: match route for a given path
export function matchRouteSSR(routes: Route[], path: string) {
  return matchRoute(routes, path);
}
