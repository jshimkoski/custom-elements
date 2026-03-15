/**
 * JIT CSS entry point — opt-in import for the full JIT CSS engine.
 *
 * @example
 * ```ts
 * import {
 *   useJITCSS,
 *   enableJITCSS,
 * } from '@jasonshimmy/custom-elements-runtime/jit-css';
 * ```
 */

// Hooks
export { useJITCSS } from './runtime/jit-hooks';
export { useDesignTokens, useGlobalStyle } from './runtime/hooks';
export type { JITCSSOptions, DesignTokens } from './runtime/hooks';

// Global configuration
export {
  enableJITCSS,
  disableJITCSS,
  isJITCSSEnabled,
  isJITCSSEnabledFor,
  registerJITCSSComponent,
  getJITCSSOptions,
  jitCSS,
  extractClassesFromHTML,
  parseColorClass,
  parseColorWithOpacity,
  parseGradientColorStop,
  parseSpacing,
  parseArbitrary,
  utilityMap,
  selectorVariants,
  mediaVariants,
  containerVariants,
  colors,
} from './runtime/style';

/**
 * A no-op identity function that signals to development tools (IDE
 * autocomplete, linters, PurgeCSS-style scanners) that the string contains
 * JIT CSS utility class names.
 *
 * At runtime this is simply `return className` — zero overhead.
 *
 * @example
 * ```ts
 * import { cls } from '@jasonshimmy/custom-elements-runtime/jit-css';
 *
 * const containerClasses = cls('flex items-center gap-4 bg-primary-500 text-white');
 * ```
 */
export function cls(className: string): string {
  return className;
}
