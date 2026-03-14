/**
 * JIT CSS hooks — lives in a separate module so that hooks.ts does not
 * statically import style.ts. Consumers who never call `useJITCSS` will
 * have the entire JIT engine tree-shaken out of their bundle.
 */

import { isDiscoveryRender as _isDiscoveryRenderFn } from './discovery-state';
import { getCurrentComponentContext } from './hooks';
import {
  enableJITCSS,
  registerJITCSSComponent,
  type JITCSSOptions,
} from './style';

/**
 * Configure the JIT CSS engine for the current session.
 * This is a convenience wrapper around `enableJITCSS()` that can be called
 * inside a component render function or at module initialisation time.
 *
 * @example
 * ```ts
 * component('my-component', () => {
 *   // Enable extended Tailwind colors so bg-blue-500, text-violet-700, etc. generate CSS
 *   useJITCSS({ extendedColors: true });
 *   return html`<div class="bg-blue-500 text-white">Hello</div>`;
 * });
 * ```
 *
 * @example
 * ```ts
 * // At app entry – enable once for all components
 * useJITCSS({ extendedColors: true, customColors: { brand: { '500': '#e63946' } } });
 * ```
 */
export function useJITCSS(options?: JITCSSOptions): void {
  // During discovery renders (component registration phase) there is no real
  // shadow root. Without this guard, useJITCSS() falls through to
  // enableJITCSS() and globally enables JIT CSS for every component — exactly
  // the opt-in behaviour we are trying to prevent.
  if (_isDiscoveryRenderFn()) return;

  // When called inside a component render function, register this component's
  // shadow root for per-component JIT CSS opt-in. Context is always set during
  // a real render; it may be absent (null) or missing _host when called at app
  // startup level (outside any component context).
  const host = (getCurrentComponentContext() as { _host?: Element } | null)
    ?._host;
  const shadowRoot = host?.shadowRoot ?? null;

  if (shadowRoot) {
    // Per-component opt-in: register this shadow root only.
    registerJITCSSComponent(shadowRoot, options);
  } else {
    // App-level call (outside component context) — enable for all components
    // globally, preserving v2 behaviour when called at the entry point.
    enableJITCSS(options);
  }
}

export type { JITCSSOptions };
