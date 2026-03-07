import type { ComponentConfig } from '../types';
import { devWarn } from '../logger';

// Interface for custom element with framework-specific properties
interface CustomElement extends HTMLElement {
  _cfg?: ComponentConfig<object, object, object>;
  _render?: (config: ComponentConfig<object, object, object>) => void;
  onLoadingStateChange?: (loading: boolean) => void;
  onErrorStateChange?: (error: Error | null) => void;
}

/**
 * @internal
 * Runtime registry of component configs.
 * NOTE: This is an internal implementation detail. Do not import from the
 * published package in consumer code — it is intended for runtime/HMR and
 * internal tests only. Consumers should use the public `component` API.
 */
export const registry = new Map<
  string,
  ComponentConfig<object, object, object>
>();

// Expose the registry for browser/HMR use without overwriting existing globals
// (avoid cross-request mutation in SSR and preserve HMR behavior).
const GLOBAL_REG_KEY = Symbol.for('cer.registry');

/**
 * Lazily initialize the global registry slot with SSR safety.
 * This avoids performing a write to globalThis at module-import time
 * (which is a side-effect that prevents bundlers from tree-shaking).
 * Enhanced with SSR detection and multi-tenant safety.
 */
export function initGlobalRegistryIfNeeded(): void {
  // Enhanced SSR detection
  const isSSR =
    typeof window === 'undefined' &&
    typeof document === 'undefined' &&
    typeof navigator === 'undefined';

  if (!isSSR) {
    try {
      const g = globalThis as Record<string | symbol, unknown>;
      if (!g[GLOBAL_REG_KEY]) {
        // Use a unique registry per realm to avoid cross-contamination
        const realmId = crypto.randomUUID();
        g[GLOBAL_REG_KEY] = new Map([...registry.entries()]);
        // Store realm identifier for debugging
        (
          g[GLOBAL_REG_KEY] as Record<string, unknown> & { __realmId?: string }
        ).__realmId = realmId;
      }
    } catch (error) {
      // Gracefully handle cases where globalThis access is restricted
      devWarn('Could not initialize global registry:', error);
    }
  }
}

// --- Hot Module Replacement (HMR) ---
{
  type HMRImportMeta = {
    hot?: { accept: (fn: (newModule?: unknown) => void) => void };
  };
  const hmrHot = (import.meta as HMRImportMeta).hot;
  if (hmrHot) {
    hmrHot.accept((newModule: unknown) => {
      // Update registry with new configs from the hot module (SSR-safe)
      const mod = newModule as
        | { registry?: Map<string, ComponentConfig<object, object, object>> }
        | undefined;
      if (mod && mod.registry) {
        for (const [tag, newConfig] of mod.registry.entries()) {
          registry.set(tag, newConfig);
          // Update all instances to use new config (browser only)
          if (typeof document !== 'undefined' && document.querySelectorAll) {
            try {
              document.querySelectorAll(tag).forEach((el) => {
                const customEl = el as CustomElement;
                if (typeof customEl._cfg !== 'undefined') {
                  customEl._cfg = newConfig;
                }
                // HMR: Preserve existing state by keeping the context object intact.
                // Instead of re-executing the component function (which would create new refs),
                // we just update the config and re-render with the existing context.
                // This ensures refs and other reactive state are preserved across HMR updates.
                if (typeof customEl._render === 'function') {
                  customEl._render(newConfig);
                }
              });
            } catch (error) {
              devWarn('HMR update failed:', error);
            }
          }
        }
      }
    });
  }
}
