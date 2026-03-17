/**
 * Development-only logging utilities
 * These are stripped out in production builds via bundler configuration
 */

// Robust dev-mode detection across environments (Node tests, Vite dev server, browser)
let isDev = false;
try {
  const maybeProcess = (
    globalThis as { process?: { env?: Record<string, string> } }
  ).process;

  if (maybeProcess?.env) {
    const env = maybeProcess.env.NODE_ENV ?? maybeProcess.env.MODE;
    isDev = env !== 'production';
  } else {
    // Browser fallback
    isDev = typeof window !== 'undefined' && typeof document !== 'undefined';
  }
} catch {
  isDev = true;
}

// Runtime-overridable flag. Consumers can set `globalThis.__CE_RUNTIME_DEV__ = true`
// before importing the library, or call `setDevMode(true)` at runtime to enable
// dev logging. We keep `isDev` for build-time detection but consult the
// runtime flag at each call so bundlers cannot safely remove the console calls
// if consumers rely on runtime toggling.
let runtimeFlag: boolean | undefined;

/**
 * Programmatically toggle dev-mode logging at runtime.
 * Prefer setting `globalThis.__CE_RUNTIME_DEV__ = true` before importing
 * the runtime so logs are enabled as early as possible.
 *
 * @param v - `true` to enable dev logging, `false` to disable it.
 *
 * @example
 * ```ts
 * import { setDevMode } from '@jasonshimmy/custom-elements-runtime';
 * setDevMode(true); // enable verbose dev logs
 * ```
 */
export function setDevMode(v: boolean): void {
  runtimeFlag = !!v;
  try {
    const g = globalThis as unknown as { __CE_RUNTIME_DEV__?: unknown };
    g.__CE_RUNTIME_DEV__ = runtimeFlag;
  } catch (_err: unknown) {
    void _err;
  }
}

function runtimeDevEnabled(): boolean {
  try {
    const g = globalThis as unknown as { __CE_RUNTIME_DEV__?: unknown };
    if (typeof g.__CE_RUNTIME_DEV__ !== 'undefined')
      return Boolean(g.__CE_RUNTIME_DEV__);
  } catch {
    // ignore
  }
  // fall back to build-time detection
  return runtimeFlag === true || isDev;
}

/**
 * Log error only in development mode
 */
export function devError(message: string, ...args: unknown[]): void {
  if (runtimeDevEnabled()) {
    console.error(message, ...args);
  }
}

/**
 * Log warning only in development mode
 */
export function devWarn(message: string, ...args: unknown[]): void {
  if (runtimeDevEnabled()) {
    console.warn(message, ...args);
  }
}

/**
 * Log an informational message only in development mode.
 * No-ops in production builds or when dev mode is disabled.
 *
 * @param message - Message to log.
 * @param args - Additional values to pass to `console.log`.
 *
 * @example
 * ```ts
 * import { devLog } from '@jasonshimmy/custom-elements-runtime';
 * devLog('[my-component] mounted', { props });
 * ```
 */
export function devLog(message: string, ...args: unknown[]): void {
  if (runtimeDevEnabled()) {
    console.log(message, ...args);
  }
}
