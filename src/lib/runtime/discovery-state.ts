/**
 * discovery-state.ts
 *
 * Isolated discovery-render flag. Extracted from hooks.ts to break the
 * circular dependency between hooks.ts and reactive.ts — both modules need
 * to check `isDiscoveryRender()`, but hooks.ts also imports from reactive.ts.
 *
 * All side-effectful hooks (watchEffect, watch, useOnConnected, useStyle,
 * provide, inject, useEmit, …) must guard their setup with
 * `isDiscoveryRender()` and return early / return no-ops when it is true.
 */

import { devWarn } from './logger';

let _discoveryRender = false;

/**
 * Returns `true` while a discovery render is in progress.
 * Used by `html` tagged templates and hooks to short-circuit side effects.
 * @internal
 */
export function isDiscoveryRender(): boolean {
  return _discoveryRender;
}

/**
 * Mark the start of a discovery render pass.
 * Call this immediately before invoking the render function for the first time
 * (before `useProps` prop-name collection).
 *
 * Emits a dev warning when called while a discovery render is already active
 * so that nested or mismatched begin/end pairs are surfaced during development.
 * @internal
 */
export function beginDiscoveryRender(): void {
  if (_discoveryRender) {
    devWarn(
      '[CER] beginDiscoveryRender() called while a discovery render is already active. ' +
        "This usually means a component was registered inside another component's render function. " +
        'Ensure component() calls are at module top-level.',
    );
  }
  _discoveryRender = true;
}

/**
 * Mark the end of a discovery render pass.
 * Call this in a `finally` block after the discovery render function returns.
 * @internal
 */
export function endDiscoveryRender(): void {
  _discoveryRender = false;
}
