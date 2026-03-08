// ============================================================================
// CONSTANTS
// ============================================================================

export const DEFAULT_SCROLL_CONFIG = {
  enabled: true,
  offset: 0,
  timeoutMs: 2000,
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Parse URL search string into query parameters object.
 * @param search - The search string (with or without leading '?')
 * @returns Object with query parameter key-value pairs
 */
export const parseQuery = (search: string): Record<string, string> => {
  if (!search) return {};
  if (typeof URLSearchParams === 'undefined') return {};
  return Object.fromEntries(new URLSearchParams(search));
};

/**
 * Serialize query parameters object into URL search string.
 * @param q - Query parameters object
 * @returns Search string with leading '?' or empty string
 */
export const serializeQuery = (q: Record<string, string> | undefined) => {
  if (!q || Object.keys(q).length === 0) return '';
  try {
    return '?' + new URLSearchParams(q as Record<string, string>).toString();
  } catch {
    return '';
  }
};

/**
 * Detect dangerous javascript: URIs to prevent XSS attacks.
 * @param s - URL string to check
 * @returns True if the URL uses a dangerous scheme
 */
export const isDangerousScheme = (s: string): boolean => {
  if (!s) return false;
  return /^\s*javascript\s*:/i.test(s);
};

/**
 * Check if a URL is absolute (has protocol or is protocol-relative).
 * @param url - URL string to check
 * @returns True if the URL is absolute
 */
export const isAbsoluteUrl = (url: string): boolean => {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url) || url.startsWith('//');
};

/**
 * Safely decode a URI component, returning original value on error.
 * @param value - String to decode
 * @returns Decoded string or original value if decoding fails
 */
export const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/**
 * Normalize a path for consistent route matching.
 * Ensures leading slash, removes trailing slash, and collapses duplicate slashes.
 * @param p - Path string to normalize
 * @returns Normalized path string
 */
export function normalizePathForRoute(p: string): string {
  if (!p) return '/';
  // Collapse duplicate slashes, ensure leading slash, remove trailing slash
  let out = p.replace(/\/+/g, '/');
  if (!out.startsWith('/')) out = '/' + out;
  if (out.length > 1 && out.endsWith('/')) out = out.slice(0, -1);
  return out;
}

/**
 * Canonicalize base path for consistent handling.
 * @param base - Base path string
 * @returns Canonicalized base path (empty string for root)
 */
export const canonicalizeBase = (base: string): string => {
  if (!base) return '';
  const normalized = normalizePathForRoute(base);
  return normalized === '/' ? '' : normalized;
};
