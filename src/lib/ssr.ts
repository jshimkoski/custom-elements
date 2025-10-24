/**
 * SSR entrypoint — small re-export so consumers can import SSR-only helpers
 * without pulling them into the main client runtime bundle.
 */
export { renderToString } from './runtime/vdom-ssr';
export type { VNode } from './runtime/types';
