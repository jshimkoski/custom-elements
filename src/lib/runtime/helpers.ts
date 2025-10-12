/**
 * Safe execution helper - silently ignores errors
 */
export const safe = (fn: () => void): void => { try { fn(); } catch {} };

import { isReactiveState } from "./reactive";
import { devWarn } from "./logger";

// Caches for string transformations to improve performance
const KEBAB_CASE_CACHE = new Map<string, string>();
const CAMEL_CASE_CACHE = new Map<string, string>();
const HTML_ESCAPE_CACHE = new Map<string, string>();

// Cache size limits to prevent memory bloat
const MAX_CACHE_SIZE = 500;

// Module-level state for entity map and loader. Using module-level vars avoids
// reliance on attaching properties to functions which can be brittle when
// minifiers are configured to mangle properties.
let _namedEntityMap: Record<string, string> | undefined;
let _namedEntityMapLoader: (() => Promise<Record<string, string>>) | undefined;
let _usedEntityFallback = false;
let _warnedEntityFallback = false;
// Module-level decode element used in browser environments to avoid attaching
// an element to the function object (function properties can be mangled by
// aggressive minifiers). Keep a function-attached reference only for backward
// compatibility but prefer `_decodeEl` at runtime.
let _decodeEl: HTMLDivElement | undefined;
// NOTE (internal): The runtime prefers module-level state for the entity map
// and decode element to ensure minifier-safe behavior in production builds.
// We intentionally retain assignments to function-attached properties in a
// few places solely for backward compatibility with older tests and code
// paths. New code should rely on `registerEntityMap`, `loadEntityMap`, and
// the exported `decodeEntities` function rather than inspecting internal
// function properties.
// Use globalThis to avoid TypeScript requiring Node typings for `process`.
const _isNode = !!((globalThis as any).process && (globalThis as any).process.versions && (globalThis as any).process.versions.node);

/**
 * Convert camelCase to kebab-case with caching
 */
export function toKebab(str: string): string {
  if (KEBAB_CASE_CACHE.has(str)) {
    return KEBAB_CASE_CACHE.get(str)!;
  }
  
  const result = str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
  
  // Prevent memory bloat with size limit
  if (KEBAB_CASE_CACHE.size < MAX_CACHE_SIZE) {
    KEBAB_CASE_CACHE.set(str, result);
  }
  
  return result;
}

/**
 * Convert kebab-case to camelCase with caching
 */
export function toCamel(str: string): string {
  if (CAMEL_CASE_CACHE.has(str)) {
    return CAMEL_CASE_CACHE.get(str)!;
  }
  
  const result = str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  
  if (CAMEL_CASE_CACHE.size < MAX_CACHE_SIZE) {
    CAMEL_CASE_CACHE.set(str, result);
  }
  
  return result;
}

/**
 * Clear string transformation caches (useful for testing)
 */
export function clearStringCaches(): void {
  KEBAB_CASE_CACHE.clear();
  CAMEL_CASE_CACHE.clear();
  HTML_ESCAPE_CACHE.clear();
}

/**
 * Get cache statistics for debugging
 */
export function getStringCacheStats(): {
  kebabCacheSize: number;
  camelCacheSize: number;
  htmlEscapeCacheSize: number;
} {
  return {
    kebabCacheSize: KEBAB_CASE_CACHE.size,
    camelCacheSize: CAMEL_CASE_CACHE.size,
    htmlEscapeCacheSize: HTML_ESCAPE_CACHE.size,
  };
}

export function escapeHTML(str: string | number | boolean): string | number | boolean {
  if (typeof str === "string") {
    // Check cache first for frequently escaped strings
    if (HTML_ESCAPE_CACHE.has(str)) {
      return HTML_ESCAPE_CACHE.get(str)!;
    }
    
    const result = str.replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c]!,
    );
    
    // Only cache strings that contain entities to escape
    if (result !== str && HTML_ESCAPE_CACHE.size < MAX_CACHE_SIZE) {
      HTML_ESCAPE_CACHE.set(str, result);
    }
    
    return result;
  }
  return str;
}

/**
 * Decode HTML entities (named and numeric) into their character equivalents.
 * - In browser: uses a DOM-based technique to decode entities while preserving
 *   existing raw tags.
 * - In non-DOM (SSR) environments: handles numeric references and a conservative
 *   named-entity map for common entities.
 *
 * @param str - string containing HTML entities
 * @returns decoded string
 */
export function decodeEntities(str: string): string {
  if (!str) return '';
  const s = String(str);

  // Browser environment: use a DOM element to decode the full set of named entities.
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    const SENTINEL_L = '\uF000';
    const SENTINEL_G = '\uF001';
    // Protect existing literal tags so they won't be parsed as HTML by innerHTML
    const protectedStr = s.replace(/</g, SENTINEL_L).replace(/>/g, SENTINEL_G);

    // Prefer module-level el to avoid relying on function-attached properties
    // which can be renamed/mangled by some minifiers. Keep function-attached
    // `_el` for backward compatibility but do not depend on it.
    const el = _decodeEl || (_decodeEl = document.createElement('div'));
    try { (decodeEntities as any)._el = el; } catch {}

    el.innerHTML = protectedStr;
    const decoded = el.textContent || '';
    return decoded.replace(new RegExp(SENTINEL_L, 'g'), '<').replace(new RegExp(SENTINEL_G, 'g'), '>');
  }

  // SSR / non-DOM fallback: handle numeric refs and named entities via an external JSON map.
  // Keep a tiny inline map for the most common entities so decodeEntities remains sync.
  const tinyMap: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'", nbsp: '\u00A0' };

  // Prefer module-level registered map first (minifier-safe). Keep function
  // attached map as a fallback for backward compatibility only.
  const registered = _namedEntityMap ?? (decodeEntities as any)._namedMap;

  // Select map: module-level registered > function-attached registered > sync require (Node-only) > tinyMap.
  let namedMap: Record<string, string> | undefined = registered;

  if (!namedMap && _isNode) {
    // Try to synchronously require the JSON in Node-like environments without importing `require`.
    try {
      // Use globalThis to avoid referencing `require` directly (prevents TS needing node types)
      const maybeRequire = (globalThis as any).require;
      if (typeof maybeRequire === 'function') {
        // Try several common require paths (installed package, dist layout, src layout)
        const candidates = [
          '@jasonshimmy/custom-elements-runtime/entities.json', // installed package export
          '../../entities.json', // dist/runtime -> ../../entities.json
          '../../../entities.json', // src/lib/runtime -> ../../../entities.json
          '../entities.json',
          './entities.json'
        ];
        for (const p of candidates) {
          try {
            const m = maybeRequire(p);
            if (m) { namedMap = m; break; }
          } catch {}
        }
      }
    } catch {}
  }

  // If we still don't have a map, fall back to tinyMap and trigger background loader if present.
  if (!namedMap) {
    namedMap = tinyMap;
    // Keep both module and function-level flags in sync for backward compatibility.
    // Mark fallback usage primarily on module-level flags (minifier-safe).
    _usedEntityFallback = true;
    try { (decodeEntities as any)._usedFallback = true; } catch {}
    const loader = (decodeEntities as any)._namedMapLoader ?? _namedEntityMapLoader;
    if (loader) {
      // Load asynchronously; when ready, cache it for future sync calls and sync to function props.
      loader().then((m: Record<string, string>) => {
        _namedEntityMap = m;
        try { (decodeEntities as any)._namedMap = m; } catch {}
      }).catch(() => {});
    }
  }

  // Emit a one-time dev warning if we used the tiny fallback.
  // Prefer module-level flags first, then function-attached fallbacks for
  // backward compatibility. This avoids depending on function property names
  // which some minifiers may mangle.
  if ((_usedEntityFallback || (decodeEntities as any)._usedFallback) && !(_warnedEntityFallback || (decodeEntities as any)._warnedFallback)) {
    _warnedEntityFallback = true;
    try { (decodeEntities as any)._warnedFallback = true; } catch {}
    try { devWarn('decodeEntities: using small SSR fallback entity map. Register the full entities.json via registerEntityMap(entities) on the server to enable full HTML5 named-entity decoding.'); } catch {}
  }

  // Replace entities: numeric (hex/dec) or named.
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (_, entity) => {
    if (entity.charCodeAt(0) === 35) { // '#'
      const isHex = (entity.charAt(1) || '').toLowerCase() === 'x';
      const num = isHex ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isNaN(num) ? `&${entity};` : String.fromCodePoint(num);
    }
    const mapped = (namedMap as any)[entity] ?? (registered && registered[entity]);
    return mapped !== undefined ? mapped : `&${entity};`;
  });
}

/**
 * Dynamically load the full named-entity map (used in SSR). Exported for testing and
 * to allow bundlers to exclude the JSON from client bundles when dynamic import
 * is used behind a DOM check.
 */
export async function loadEntityMap(): Promise<Record<string, string>> {
  // Prefer dynamic import so bundlers can code-split or ignore this file for browser bundles.
  // Try the published package export first; in installed packages this is usually the most
  // reliable path. Make the specifier a runtime string to discourage bundlers from inlining.
  const pkgExport = ['@jasonshimmy', 'custom-elements-runtime', 'entities.json'].join('/');
  try {
    const mPkg = await import(pkgExport as any);
    return (mPkg && (mPkg.default || mPkg)) as Record<string, string>;
  } catch {
    // Next try relative local JSON (useful during development or mono-repo installs)
    try {
      // Try several reasonable local import paths (development vs built layouts)
      const localCandidates = [
        pkgExport, // try package export via dynamic import too (best for installed packages)
        './entities.json',
        '../../entities.json',
        '../../../entities.json'
      ];
      for (const p of localCandidates) {
        try {
          const mLocal = await import(p as any);
          if (mLocal) return (mLocal && (mLocal.default || mLocal)) as Record<string, string>;
        } catch {}
      }
      // If none of the dynamic imports succeeded, fall back to the small map.
      return { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'", nbsp: '\u00A0' };
    } catch {
      // Final small fallback
      return { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'", nbsp: '\u00A0' };
    }
  }
}

// Attach loader to module state and (for backward compatibility) to the function
// as well. Using module-level state avoids property-mangling risks in minified
// builds; attaching to the function keeps tests that reference the property
// working until they can be updated.
_namedEntityMapLoader = loadEntityMap;
(decodeEntities as any)._namedMapLoader = loadEntityMap;

/**
 * Register a full named-entity map for SSR. Intended for server startup code to
 * provide the authoritative HTML5 entity mapping. This keeps the client bundle
 * small because the map is only injected on the server side.
 *
 * registerEntityMap should be called once at server startup prior to rendering.
 */
export function registerEntityMap(map: Record<string, string>, options?: { overwrite?: boolean }): void {
  if (!map || typeof map !== 'object') return;
  const existing = _namedEntityMap;
  if (existing && !options?.overwrite) return; // first registration wins by default
  _namedEntityMap = map;
}

/**
 * Clear any registered entity map. Useful for tests or restarting state.
 */
export function clearRegisteredEntityMap(): void {
  _namedEntityMap = undefined;
}

/**
 * Wrap a string as raw HTML. This is intentionally unsafe — callers must
 * sanitize untrusted input before using this. The returned object provides
 * two property names to be compatible with different parts of the runtime.
 */
export function unsafeHTML(html: string): { __unsafeHTML: string; __rawHTML: string } {
  const s = String(html);
  // Provide both property names to be compatible with compiler/renderer expectations
  return { __unsafeHTML: s, __rawHTML: s };
}

/** Type-guard for unsafeHTML wrapper */
export function isUnsafeHTML(value: unknown): value is { __unsafeHTML?: string; __rawHTML?: string } {
  return !!value && (typeof (value as any).__unsafeHTML === 'string' || typeof (value as any).__rawHTML === 'string');
}

/**
 * Get nested property value from object using dot notation
 */
export function getNestedValue(obj: any, path: string): any {
  if (typeof path === "string") {
    const result = path.split(".").reduce((current, key) => current?.[key], obj);
    // If the result is a ReactiveState object, return its value
    if (isReactiveState(result)) {
      return result.value;
    }
    return result;
  }
  return path;
}

/**
 * Set nested property value in object using dot notation
 */
export function setNestedValue(obj: any, path: string, value: any): void {
  const keys = String(path).split(".");
  const lastKey = keys.pop();
  if (!lastKey) return;
  const target = keys.reduce((current: any, key: string) => {
    if (current[key] == null) current[key] = {};
    return current[key];
  }, obj);
  
  // If target[lastKey] is a ReactiveState object, set its value property
  if (isReactiveState(target[lastKey])) {
    target[lastKey].value = value;
  } else {
    target[lastKey] = value;
  }
}
