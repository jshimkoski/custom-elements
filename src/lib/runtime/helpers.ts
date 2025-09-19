// Caches for string transformations to improve performance
const KEBAB_CASE_CACHE = new Map<string, string>();
const CAMEL_CASE_CACHE = new Map<string, string>();
const HTML_ESCAPE_CACHE = new Map<string, string>();

// Cache size limits to prevent memory bloat
const MAX_CACHE_SIZE = 500;

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
 * Get nested property value from object using dot notation
 */
import { isReactiveState } from "./reactive";

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
