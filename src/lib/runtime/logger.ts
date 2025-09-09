/**
 * Development-only logging utilities
 * These are stripped out in production builds via bundler configuration
 */

declare const process: any;
const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';

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
