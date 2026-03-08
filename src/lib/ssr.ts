/**
 * SSR entrypoint — small re-export so consumers can import SSR-only helpers
 * without pulling them into the main client runtime bundle.
 *
 * renderToString accepts an optional second argument to control SSR behavior:
 *
 *   renderToString(vnode, { injectSvgNamespace?: boolean })
 *
 * - injectSvgNamespace (default: true): when true, the SSR renderer will
 *   inject the standard SVG namespace attribute (xmlns="http://www.w3.org/2000/svg")
 *   onto `<svg>` elements that do not already provide an explicit `xmlns`.
 *   This matches the client runtime behavior (createElementNS) and avoids
 *   hydration/namespace mismatches. Set to `false` to opt out and keep SSR
 *   output minimal.
 *
 * Examples
 *
 *   // Default (injects xmlns for <svg> if missing)
 *   import { renderToString } from '@jasonshimmy/custom-elements-runtime/ssr';
 *   const html = renderToString(vnodeTree);
 *
 *   // Opt-out
 *   const htmlNoNs = renderToString(vnodeTree, { injectSvgNamespace: false });
 */
export { renderToString } from './runtime/vdom-ssr';
export type { VNode } from './runtime/types';
export type { RenderOptions } from './runtime/vdom-ssr';

// Entity map utilities for SSR — register the full HTML5 named-entity map at
// server startup so decodeEntities uses the complete mapping. Kept out of the
// main client bundle to reduce client-side payload.
export {
  registerEntityMap,
  loadEntityMap,
  clearRegisteredEntityMap,
} from './runtime/helpers';
