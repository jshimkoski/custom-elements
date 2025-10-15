/**
 * Development-only logging utilities
 * These are stripped out in production builds via bundler configuration
 */

// Robust dev-mode detection across environments (Node tests, Vite dev server, browser)
let isDev = false;
try {
  // Node environment (Vitest / Node.js) via globalThis.process to avoid TS node type dependency
  const maybeProcess: any = (globalThis as any).process;
  if (maybeProcess && maybeProcess.env) {
    isDev = maybeProcess.env.NODE_ENV !== 'production';
  } else if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    // Vite / bundler-provided mode
    isDev = (import.meta as any).env.MODE !== 'production';
  } else {
    // Fallback: assume dev when running in a browser-like environment without explicit MODE
    isDev = typeof window !== 'undefined';
  }
} catch (e) {
  // Be conservative: default to true to surface diagnostics during development
  isDev = true;
}

/**
 * Log error only in development mode
 */
export function devError(message: string, ...args: any[]): void {
  if (isDev) {
    console.error(message, ...args);
  }
}

/**
 * Log warning only in development mode
 */
export function devWarn(message: string, ...args: any[]): void {
  if (isDev) {
    console.warn(message, ...args);
  }
}

/**
 * Log info only in development mode
 */
export function devLog(message: string, ...args: any[]): void {
  if (isDev) {
    console.log(message, ...args);
  }
}
