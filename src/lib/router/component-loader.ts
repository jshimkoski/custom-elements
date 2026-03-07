import type { Route } from './types';
import { devError } from '../runtime/logger';

// Async component loader cache with size limit to prevent memory leaks
const MAX_COMPONENT_CACHE_SIZE = 50;
let componentCache: Record<
  string,
  {
    component: string | HTMLElement | ((...args: unknown[]) => unknown);
    lastAccessed: number;
  }
> = {};

// Separate cache for loading promises to prevent race conditions
let loadingCache: Record<
  string,
  Promise<string | HTMLElement | ((...args: unknown[]) => unknown)>
> = {};

/**
 * Clear component cache to prevent memory leaks
 */
export function clearComponentCache(): void {
  componentCache = {};
  loadingCache = {};
}

/**
 * Evict least recently used components when cache exceeds size limit
 */
function evictLRUComponents(): void {
  const entries = Object.entries(componentCache);
  if (entries.length <= MAX_COMPONENT_CACHE_SIZE) return;

  // Sort by lastAccessed (oldest first) and remove oldest entries
  const sortedEntries = entries.sort(
    ([, a], [, b]) => a.lastAccessed - b.lastAccessed,
  );
  const toRemove = sortedEntries.slice(
    0,
    entries.length - MAX_COMPONENT_CACHE_SIZE,
  );

  for (const [path] of toRemove) {
    delete componentCache[path];
  }
}

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
    const cached = componentCache[route.path];
    if (cached) {
      // Update last accessed time for LRU tracking
      cached.lastAccessed = Date.now();
      return cached.component;
    }

    // Check if already loading to prevent race conditions
    if (loadingCache[route.path] !== undefined) {
      return loadingCache[route.path];
    }

    // In SSR context, we need to handle components synchronously when possible
    const isSSR = typeof window === 'undefined';

    try {
      // Create loading promise
      const loadPromise = route
        .load()
        .then((mod) => {
          // Evict old components if cache is full
          evictLRUComponents();

          const component = mod.default;
          componentCache[route.path] = {
            component,
            lastAccessed: Date.now(),
          };

          // Remove from loading cache
          delete loadingCache[route.path];

          return component;
        })
        .catch((err) => {
          // Remove from loading cache on error
          delete loadingCache[route.path];
          const errorMsg = err instanceof Error ? err.message : String(err);
          if (isSSR) {
            // In SSR, surface errors more prominently
            devError(
              `SSR component load failed for route: ${route.path}. ${errorMsg}`,
            );
          }
          throw new Error(
            `Failed to load component for route: ${route.path}. ${errorMsg}`,
          );
        });

      // Store loading promise to prevent concurrent loads
      loadingCache[route.path] = loadPromise;

      return await loadPromise;
    } catch (err) {
      // More descriptive error with original error details
      const errorMsg = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Failed to load component for route: ${route.path}. ${errorMsg}`,
        { cause: err },
      );
    }
  }
  throw new Error(`No component or loader defined for route: ${route.path}`);
}
