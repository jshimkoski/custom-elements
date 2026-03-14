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

// ---- SSR JIT CSS pre-generation (§5.8) ----

import { renderToString as _render } from './runtime/vdom-ssr';
import { jitCSS, enableJITCSS, type JITCSSOptions } from './runtime/style';
import type { VNode } from './runtime/types';
import type { RenderOptions } from './runtime/vdom-ssr';

/**
 * Result of `renderToStringWithJITCSS()`.
 */
export interface SSRJITResult {
  /** The rendered HTML string. */
  html: string;
  /**
   * Pre-generated JIT CSS extracted from the rendered HTML.
   * Embed this in a `<style>` element in your document `<head>` to eliminate
   * Flash of Unstyled Content (FOUC) on hydration.
   */
  css: string;
  /**
   * Convenience: the HTML with a `<style>` element injected before `</head>`.
   * If no `</head>` tag is found, the `<style>` is prepended to the HTML.
   */
  htmlWithStyles: string;
}

/**
 * Server-side render a VNode tree and simultaneously pre-generate JIT CSS for
 * all utility classes present in the rendered output.
 *
 * Embed the returned `css` in a `<style>` element in your document `<head>`
 * to ensure correct styles are present before the client runtime hydrates,
 * eliminating Flash of Unstyled Content (FOUC).
 *
 * @example
 * ```ts
 * import { renderToStringWithJITCSS } from '@jasonshimmy/custom-elements-runtime/ssr';
 *
 * const { htmlWithStyles } = await renderToStringWithJITCSS(appVNode, {
 *   jit: { extendedColors: true },
 * });
 * res.send(`<!DOCTYPE html><html><head>${headTags}</head><body>${htmlWithStyles}</body></html>`);
 * ```
 */
export function renderToStringWithJITCSS(
  vnode: VNode,
  options?: RenderOptions & { jit?: JITCSSOptions },
): SSRJITResult {
  const { jit, ...renderOptions } = options ?? {};

  if (jit) enableJITCSS(jit);

  const html = _render(vnode, renderOptions);
  const css = jitCSS(html);

  let htmlWithStyles: string;
  if (css) {
    const styleTag = `<style id="cer-ssr-jit">${css}</style>`;
    if (html.includes('</head>')) {
      htmlWithStyles = html.replace('</head>', `${styleTag}</head>`);
    } else {
      htmlWithStyles = `${styleTag}${html}`;
    }
  } else {
    htmlWithStyles = html;
  }

  return { html, css, htmlWithStyles };
}
