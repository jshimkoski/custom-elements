/**
 * Development-only logging utilities
 * These are stripped out in production builds via bundler configuration
 */

type RuntimeEnv = {
  DEV?: boolean;
  PROD?: boolean;
  MODE?: string;
};

function detectStaticDevMode(): boolean {
  try {
    const maybeProcess = (
      globalThis as { process?: { env?: Record<string, string | undefined> } }
    ).process;
    const env = maybeProcess?.env?.NODE_ENV ?? maybeProcess?.env?.MODE;
    if (typeof env === 'string' && env.length > 0) {
      return env !== 'production';
    }
  } catch {
    // ignore
  }

  try {
    const env = (import.meta as ImportMeta & { env?: RuntimeEnv }).env;
    if (typeof env?.DEV === 'boolean') return env.DEV;
    if (typeof env?.PROD === 'boolean') return !env.PROD;
    if (typeof env?.MODE === 'string' && env.MODE.length > 0) {
      return env.MODE !== 'production';
    }
  } catch {
    // ignore
  }

  return false;
}

const isDev = detectStaticDevMode();

// Runtime-overridable flag. Consumers can set `globalThis.__CE_RUNTIME_DEV__ = true`
// before importing the library, or call `setDevMode(true)` at runtime to enable
// dev logging. We keep `isDev` for build-time detection but consult the
// runtime flag at each call so bundlers cannot safely remove the console calls
// if consumers rely on runtime toggling.
let runtimeFlag: boolean | undefined;
let renderWarningDepth = 0;
let renderWarningsThisCycle: Set<string> | null = null;
let warningsSeenGlobally = new Set<string>();

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

export function beginRenderWarningScope(): void {
  renderWarningDepth += 1;
  if (renderWarningDepth === 1) {
    renderWarningsThisCycle = new Set();
  }
}

export function endRenderWarningScope(): void {
  if (renderWarningDepth === 0) return;
  renderWarningDepth -= 1;
  if (renderWarningDepth === 0) {
    renderWarningsThisCycle = null;
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

function shouldEmitWarning(message: string): boolean {
  if (!renderWarningsThisCycle) return true;
  if (renderWarningsThisCycle.has(message)) return false;
  renderWarningsThisCycle.add(message);
  return true;
}

function shouldEmitWarningOnce(message: string): boolean {
  if (warningsSeenGlobally.has(message)) return false;
  warningsSeenGlobally.add(message);
  return true;
}

/**
 * Log runtime errors in all modes.
 * Production builds suppress framework warnings, not actual errors.
 */
export function devError(message: string, ...args: unknown[]): void {
  console.error(message, ...args);
}

/**
 * Log warning only in development mode
 */
export function devWarn(message: string, ...args: unknown[]): void {
  if (runtimeDevEnabled() && shouldEmitWarning(message)) {
    console.warn(message, ...args);
  }
}

/**
 * Log a warning only once for the lifetime of the current runtime instance.
 * Useful for API-level warnings like unsafeHTML() where repeated renders would
 * otherwise re-emit the same message on every request.
 */
export function devWarnOnce(message: string, ...args: unknown[]): void {
  if (runtimeDevEnabled() && shouldEmitWarningOnce(message)) {
    console.warn(message, ...args);
  }
}

/** @internal Test-only helper to reset warning dedupe state. */
export function __resetWarningDeduplicationForTests(): void {
  warningsSeenGlobally = new Set();
  renderWarningDepth = 0;
  renderWarningsThisCycle = null;
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
