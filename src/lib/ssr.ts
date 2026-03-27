/**
 * SSR entry point — import from `@jasonshimmy/custom-elements-runtime/ssr`.
 *
 * Provides four rendering modes:
 *
 * 1. **renderToString** — baseline HTML serialisation (no shadow DOM content).
 *    Backwards-compatible with the original API.
 *
 * 2. **renderToStringWithJITCSS** — HTML + pre-generated JIT CSS injected into
 *    `<head>` to prevent FOUC. Supports `dsd: true` for DSD output.
 *
 * 3. **renderToStringWithJITCSSDSD** — convenience alias for DSD mode.
 *    Full Declarative Shadow DOM output with per-shadow-root CSS layer stack
 *    (baseReset + useStyle() + JIT CSS). Enables true hydration, zero FOUC.
 *
 * 4. **renderToStream** — ReadableStream variant for streaming SSR.
 *
 * 5. **renderToStreamWithJITCSSDSD** — convenience alias for streaming DSD mode.
 *    Equivalent to `renderToStream(vnode, { dsd: true, ...options })`.
 *    Recommended for new server-rendered applications that want true incremental
 *    streaming with Declarative Shadow DOM and zero FOUC.
 *
 * Entity map utilities are also exported for full HTML5 named-entity support.
 *
 * @example DSD usage (recommended)
 * ```ts
 * import { renderToStringWithJITCSSDSD } from '@jasonshimmy/custom-elements-runtime/ssr';
 *
 * const { htmlWithStyles } = renderToStringWithJITCSSDSD(appVNode, {
 *   jit: { extendedColors: true },
 * });
 * res.send(`<!DOCTYPE html><html><head>${head}</head><body>${htmlWithStyles}</body></html>`);
 * ```
 */

// ---------------------------------------------------------------------------
// Re-exports — backwards-compatible
// ---------------------------------------------------------------------------

export { renderToString } from './runtime/vdom-ssr';
export type { VNode } from './runtime/types';
export type { RenderOptions } from './runtime/vdom-ssr';

export {
  registerEntityMap,
  loadEntityMap,
  clearRegisteredEntityMap,
} from './runtime/helpers';

export {
  renderToStringDSD,
  DSD_POLYFILL_SCRIPT,
} from './runtime/vdom-ssr-dsd';
export type { DSDRenderOptions } from './runtime/vdom-ssr-dsd';

// ---------------------------------------------------------------------------
// Internal imports
// ---------------------------------------------------------------------------

import { renderToString as _render } from './runtime/vdom-ssr';
import {
  renderToStringDSD as _renderToStringDSD,
  renderToDSD,
  buildShadowStyleBlock,
  beginStreamingCollection,
  endStreamingCollection,
  DSD_POLYFILL_SCRIPT,
  type AsyncStreamEntry,
} from './runtime/vdom-ssr-dsd';
import { jitCSS, enableJITCSS, type JITCSSOptions } from './runtime/style';
import type { VNode } from './runtime/types';
import type { RenderOptions } from './runtime/vdom-ssr';
import type { DSDRenderOptions } from './runtime/vdom-ssr-dsd';
import {
  beginSSRGlobalStyleCollection,
  endSSRGlobalStyleCollection,
} from './runtime/ssr-context';

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

/**
 * Result of `renderToStringWithJITCSS()` and `renderToStringWithJITCSSDSD()`.
 */
export interface SSRJITResult {
  /** The rendered HTML string (styles not yet injected). */
  html: string;
  /**
   * Global JIT CSS extracted from the rendered HTML.
   * For DSD renders, each shadow root embeds its own scoped styles; this field
   * holds any residual light-DOM utility CSS.
   */
  css: string;
  /**
   * CSS captured from `useGlobalStyle()` calls during this render pass
   * (e.g. `@font-face`, `:root` custom properties).
   * Inject in a `<style id="cer-ssr-global">` in `<head>`.
   */
  globalStyles: string;
  /**
   * Convenience: `html` with both `<style>` tags injected before `</head>`.
   * If no `</head>` is found, the styles are prepended.
   */
  htmlWithStyles: string;
}

// ---------------------------------------------------------------------------
// renderToStringWithJITCSS — primary API, supports both modes
// ---------------------------------------------------------------------------

/**
 * Server-side render a VNode tree and simultaneously pre-generate JIT CSS.
 *
 * Pass `dsd: true` to enable Declarative Shadow DOM output with full per-shadow-
 * root CSS layer extraction (recommended for new apps).
 *
 * @example Standard (no DSD)
 * ```ts
 * const { htmlWithStyles } = renderToStringWithJITCSS(appVNode);
 * ```
 *
 * @example With DSD
 * ```ts
 * const { htmlWithStyles } = renderToStringWithJITCSS(appVNode, {
 *   dsd: true,
 *   jit: { extendedColors: true },
 * });
 * ```
 */
export function renderToStringWithJITCSS(
  vnode: VNode,
  options?: RenderOptions & DSDRenderOptions & { jit?: JITCSSOptions },
): SSRJITResult {
  const { jit, dsd, dsdPolyfill, ...renderOptions } = options ?? {};

  if (jit) enableJITCSS(jit);

  beginSSRGlobalStyleCollection();

  let html!: string;
  let globalStylesCaptured!: string[];
  try {
    if (dsd) {
      // renderToStringDSD handles DSD wrapping but skips the polyfill so we can
      // place it correctly relative to other injected style tags below.
      html = _renderToStringDSD(vnode, {
        ...renderOptions,
        dsd: true,
        dsdPolyfill: false,
      });
    } else {
      html = _render(vnode, renderOptions);
    }
  } finally {
    // Always end collection — even when the render throws — so the collector
    // is never left non-null, which would cause subsequent non-SSR
    // useGlobalStyle() calls to silently skip DOM injection.
    globalStylesCaptured = endSSRGlobalStyleCollection();
  }

  const css = jitCSS(html);
  const globalStyles = globalStylesCaptured.join('\n');

  const styleTags: string[] = [];
  if (css) styleTags.push(`<style id="cer-ssr-jit">${css}</style>`);
  if (globalStyles.trim())
    styleTags.push(`<style id="cer-ssr-global">${globalStyles}</style>`);

  let htmlWithStyles = html;
  if (styleTags.length) {
    const injection = styleTags.join('');
    htmlWithStyles = html.includes('</head>')
      ? html.replace('</head>', `${injection}</head>`)
      : `${injection}${html}`;
  }

  // Append DSD polyfill script inside </body> when in DSD mode
  if (dsd && dsdPolyfill !== false) {
    htmlWithStyles = htmlWithStyles.includes('</body>')
      ? htmlWithStyles.replace('</body>', `${DSD_POLYFILL_SCRIPT}</body>`)
      : htmlWithStyles + DSD_POLYFILL_SCRIPT;
  }

  return { html, css, globalStyles, htmlWithStyles };
}

// ---------------------------------------------------------------------------
// renderToStringWithJITCSSDSD — convenience alias
// ---------------------------------------------------------------------------

/**
 * Convenience alias: `renderToStringWithJITCSS(vnode, { dsd: true, ...options })`.
 *
 * Renders with Declarative Shadow DOM output, full per-shadow-root CSS layer
 * extraction, and the DSD browser polyfill. This is the recommended function
 * for all new server-rendered applications.
 *
 * @example
 * ```ts
 * import { renderToStringWithJITCSSDSD } from '@jasonshimmy/custom-elements-runtime/ssr';
 *
 * const { htmlWithStyles } = renderToStringWithJITCSSDSD(appVNode, {
 *   jit: { extendedColors: true },
 * });
 * ```
 */
export function renderToStringWithJITCSSDSD(
  vnode: VNode,
  options?: Omit<
    RenderOptions & DSDRenderOptions & { jit?: JITCSSOptions },
    'dsd'
  >,
): SSRJITResult {
  return renderToStringWithJITCSS(vnode, { ...options, dsd: true });
}

// ---------------------------------------------------------------------------
// renderToStream — streaming SSR
// ---------------------------------------------------------------------------

/**
 * Render a VNode tree to a `ReadableStream<string>`.
 *
 * Supports true incremental streaming: synchronous components are flushed as
 * the first chunk, then each async component's resolved output is streamed as
 * an inline swap `<script>` that fills the placeholder's shadow root.
 *
 * @example Node.js
 * ```ts
 * import { renderToStream } from '@jasonshimmy/custom-elements-runtime/ssr';
 *
 * app.get('/', (req, res) => {
 *   const stream = renderToStream(appVNode, { dsd: true });
 *   const reader = stream.getReader();
 *   const pump = () =>
 *     reader.read().then(({ value, done }) => {
 *       if (done) { res.end(); return; }
 *       res.write(value);
 *       pump();
 *     });
 *   pump();
 * });
 * ```
 */
export function renderToStream(
  vnode: VNode,
  options?: RenderOptions & DSDRenderOptions & { jit?: JITCSSOptions; asyncTimeout?: number },
): ReadableStream<string> {
  const timeoutMs = options?.asyncTimeout ?? 30_000;

  return new ReadableStream<string>({
    async start(controller) {
      const asyncEntries: AsyncStreamEntry[] = [];
      beginStreamingCollection(asyncEntries);

      try {
        const { htmlWithStyles } = renderToStringWithJITCSS(vnode, options);
        controller.enqueue(htmlWithStyles);
      } catch (err) {
        controller.error(err);
        return;
      } finally {
        endStreamingCollection();
      }

      // Resolve async components and stream swap scripts as they settle.
      // Each resolved component replaces its placeholder via an inline script.
      // A per-entry timeout prevents hung async components from blocking the stream.
      for (const entry of asyncEntries) {
        try {
          const timeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`[cer] async component timed out after ${timeoutMs}ms`)), timeoutMs),
          );
          const resolvedVNodes = await Promise.race([entry.promise, timeout]);
          const shadowHTML = Array.isArray(resolvedVNodes)
            ? (resolvedVNodes as VNode[]).map((n) => renderToDSD(n, entry.opts)).join('')
            : renderToDSD(resolvedVNodes as VNode, entry.opts);
          const styleBlock = buildShadowStyleBlock(entry.useStyleCSS, shadowHTML);
          const shadowContent = `${styleBlock}${shadowHTML}`;
          controller.enqueue(
            `<script>(function(){` +
              `var e=document.getElementById(${JSON.stringify(entry.id)});` +
              `if(!e)return;` +
              // The placeholder already has an empty shadow root attached (native DSD or polyfill).
              // If for some reason it doesn't, attach one now.
              `var s=e.shadowRoot;` +
              `if(!s&&e.attachShadow)try{s=e.attachShadow({mode:'open'});}catch(_){};` +
              `if(s)s.innerHTML=${JSON.stringify(shadowContent)};` +
              `e.removeAttribute('id');` +
              `})();</script>`,
          );
        } catch {
          // Async render failed — leave placeholder for client hydration.
        }
      }

      controller.close();
    },
  });
}

// ---------------------------------------------------------------------------
// renderToStreamWithJITCSSDSD — convenience alias
// ---------------------------------------------------------------------------

/**
 * Convenience alias: `renderToStream(vnode, { dsd: true, ...options })`.
 *
 * Renders with Declarative Shadow DOM output and full JIT CSS extraction,
 * streaming the synchronous render as the first chunk and each resolved async
 * component as a subsequent inline-script swap. This is the recommended
 * function for all new server-rendered applications.
 *
 * @example
 * ```ts
 * import { renderToStreamWithJITCSSDSD } from '@jasonshimmy/custom-elements-runtime/ssr';
 *
 * app.get('/', (req, res) => {
 *   const stream = renderToStreamWithJITCSSDSD(appVNode, { router });
 *   const reader = stream.getReader();
 *   const pump = () =>
 *     reader.read().then(({ value, done }) => {
 *       if (done) { res.end(); return; }
 *       res.write(value);
 *       pump();
 *     });
 *   pump();
 * });
 * ```
 */
export function renderToStreamWithJITCSSDSD(
  vnode: VNode,
  options?: Omit<
    RenderOptions & DSDRenderOptions & { jit?: JITCSSOptions; asyncTimeout?: number },
    'dsd'
  >,
): ReadableStream<string> {
  return renderToStream(vnode, { ...options, dsd: true });
}
