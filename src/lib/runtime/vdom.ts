/**
 * vdom.ts
 *
 * Barrel re-export module for the virtual DOM implementation.
 * The actual code lives in the focused sub-modules:
 *
 * | Module               | Responsibilities                                       |
 * |----------------------|--------------------------------------------------------|
 * | vdom-helpers.ts      | Private utilities and shared internal types            |
 * | vdom-directives.ts   | processModelDirective and all process*Directive funcs  |
 * | vdom-patch.ts        | assignKeysDeep, patchProps, createElement, patch, etc. |
 * | vdom-ssr.ts          | renderToString (server-side rendering)                 |
 *
 * Import directly from these focused modules for tree-shaking.
 * This file is kept for backwards compatibility.
 */

export {
  processModelDirective,
  processBindDirective,
  processShowDirective,
  processClassDirective,
  processStyleDirective,
  processRefDirective,
  processDirectives,
} from "./vdom-directives";

export {
  cleanupRefs,
  assignKeysDeep,
  patchProps,
  createElement,
  patchChildren,
  patch,
  vdomRenderer,
} from "./vdom-patch";
