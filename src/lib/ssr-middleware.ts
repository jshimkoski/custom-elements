/**
 * SSR middleware helpers for Express, Fastify, Hono, and other Node.js HTTP frameworks.
 *
 * Provides two handler factories that wrap the SSR rendering pipeline and
 * emit a complete HTML document response. Both accept a static VNode **or**
 * a per-request factory function so route-specific data can be threaded into
 * the render tree.
 *
 * @example Express — static VNode
 * ```ts
 * import express from 'express';
 * import { createSSRHandler } from '@jasonshimmy/custom-elements-runtime/ssr-middleware';
 * import { html } from '@jasonshimmy/custom-elements-runtime';
 *
 * const app = express();
 * app.get('/', createSSRHandler(html`<my-app />`, {
 *   render: { dsd: true, jit: { extendedColors: true } },
 * }));
 * ```
 *
 * @example Express — per-request factory
 * ```ts
 * app.get('*', createSSRHandler(
 *   (req) => html`<my-app url="${req.url}" />`,
 *   { render: { dsd: true }, head: '<link rel="stylesheet" href="/app.css">' },
 * ));
 * ```
 *
 * @example Streaming variant
 * ```ts
 * app.get('*', createStreamingSSRHandler(
 *   (req) => html`<my-app url="${req.url}" />`,
 * ));
 * ```
 */

import { renderToStringWithJITCSS, renderToStream } from './ssr';
import type { VNode } from './runtime/types';
import type { RenderOptions } from './runtime/vdom-ssr';
import type { DSDRenderOptions } from './runtime/vdom-ssr-dsd';
import type { JITCSSOptions } from './runtime/style';

/**
 * What a per-request factory may return.
 *
 * - Plain `VNode` — backward-compatible; no per-request router threading.
 * - `{ vnode, router? }` — the router instance is threaded through the render
 *   context, making concurrent SSR requests safe (each render reads from its
 *   own router, not the module-level `activeRouterProxy` singleton).
 * - `{ vnode, router?, head? }` — `head` is an HTML string injected into the
 *   document `<head>` for this specific request (e.g. serialized loader data).
 *   It is merged with the static `head` option passed to the handler factory.
 */
export type VnodeFactoryResult = VNode | { vnode: VNode; router?: unknown; head?: string };

// ---------------------------------------------------------------------------
// Minimal framework-agnostic HTTP types
// ---------------------------------------------------------------------------

/**
 * Minimal request interface compatible with Express, Fastify, Hono, and the
 * raw Node.js `IncomingMessage`. Extend or replace with your framework's
 * request type via the generic parameter on `createSSRHandler`.
 */
export interface MinimalRequest {
  url?: string;
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
}

/**
 * Minimal response interface compatible with Express, Fastify, Hono, and the
 * raw Node.js `ServerResponse`. `write` is optional — handlers fall back to
 * buffering when it is absent.
 */
export interface MinimalResponse {
  setHeader(name: string, value: string): void;
  write?(chunk: string): boolean | void;
  end(data?: string): void;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

/**
 * Options for {@link createSSRHandler} and {@link createStreamingSSRHandler}.
 */
export interface SSRMiddlewareOptions {
  /**
   * Render options forwarded to `renderToStringWithJITCSS`.
   * Defaults to `{ dsd: true }` so DSD output is on by default.
   */
  render?: RenderOptions & DSDRenderOptions & { jit?: JITCSSOptions };
  /**
   * Additional HTML inserted at the end of the `<head>` tag.
   * Use this to inject `<link>`, `<script>`, `<meta>`, or `<title>` tags.
   */
  head?: string;
  /**
   * When `true` (default), the response is wrapped in a complete
   * `<!DOCTYPE html>` document shell. Set to `false` if you want to
   * assemble the document yourself and only need the rendered fragment.
   */
  document?: boolean;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function wrapInDocument(
  htmlWithStyles: string,
  head: string | undefined,
  wrapDocument: boolean,
): string {
  if (!wrapDocument) return htmlWithStyles;

  // If the rendered HTML already contains a root <html> tag, inject extra
  // head tags and prepend the DOCTYPE — do not double-wrap.
  if (
    htmlWithStyles.trimStart().toLowerCase().startsWith('<html') ||
    htmlWithStyles.includes('</html>')
  ) {
    const extra = head ?? '';
    const withDoctype = htmlWithStyles.startsWith('<!DOCTYPE')
      ? htmlWithStyles
      : `<!DOCTYPE html>${htmlWithStyles}`;
    if (extra) {
      return withDoctype.includes('</head>')
        ? withDoctype.replace('</head>', `${extra}</head>`)
        : withDoctype;
    }
    return withDoctype;
  }

  // Minimal shell
  const headContent = head ?? '';
  return `<!DOCTYPE html><html><head>${headContent}</head><body>${htmlWithStyles}</body></html>`;
}

// ---------------------------------------------------------------------------
// Handler factories
// ---------------------------------------------------------------------------

/**
 * Create a request handler that SSR-renders a VNode tree and sends the full
 * HTML document as the response.
 *
 * Compatible with Express, Fastify, Hono, and any framework that uses an
 * `(req, res)` handler signature. The generic `Req` parameter lets you use
 * your framework's typed request object.
 *
 * @param vnodeOrFactory - A static {@link VNode} **or** a (possibly async)
 *   factory function that receives the request and returns the VNode to render.
 * @param options - Render and document-shell options.
 *
 * @example
 * ```ts
 * app.get('*', createSSRHandler(
 *   (req) => html`<my-app url="${req.url}" />`,
 *   { render: { dsd: true, jit: { extendedColors: true } } },
 * ));
 * ```
 */
export function createSSRHandler<Req extends MinimalRequest = MinimalRequest>(
  vnodeOrFactory:
    | VnodeFactoryResult
    | ((req: Req) => VnodeFactoryResult | Promise<VnodeFactoryResult>),
  options?: SSRMiddlewareOptions,
): (req: Req, res: MinimalResponse) => Promise<void> {
  const renderOptions: RenderOptions &
    DSDRenderOptions & { jit?: JITCSSOptions } = {
    dsd: true,
    ...options?.render,
  };
  const { head, document: wrapDocument = true } = options ?? {};

  return async (req, res) => {
    try {
      const rawResult =
        typeof vnodeOrFactory === 'function'
          ? await vnodeOrFactory(req)
          : vnodeOrFactory;

      const isBundle =
        rawResult !== null &&
        typeof rawResult === 'object' &&
        'vnode' in (rawResult as object);
      const vnode = isBundle
        ? (rawResult as { vnode: VNode }).vnode
        : (rawResult as VNode);
      const router = isBundle
        ? (rawResult as { vnode: VNode; router?: unknown }).router
        : undefined;
      const perRequestHead = isBundle
        ? (rawResult as { head?: string }).head
        : undefined;

      const { htmlWithStyles } = renderToStringWithJITCSS(vnode, { ...renderOptions, router });

      const mergedHead = [head, perRequestHead].filter(Boolean).join('\n') || undefined;
      const body = wrapInDocument(htmlWithStyles, mergedHead, wrapDocument);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(body);
    } catch (err) {
      // Ensure the response is always closed to prevent the request hanging.
      // Re-throw so the framework's error handler can set the proper status code.
      try {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Internal Server Error');
      } catch {
        // ignore secondary errors during error response
      }
      throw err;
    }
  };
}

/**
 * Create a request handler that SSR-renders a VNode tree and streams the HTML
 * response using chunked transfer encoding.
 *
 * Each chunk produced by the underlying {@link renderToStream} call is written
 * to the response as it becomes available, minimising Time-to-First-Byte.
 * The document shell preamble (`<!DOCTYPE html>…<body>`) is sent in the first
 * write so the browser can begin parsing immediately.
 *
 * @param vnodeOrFactory - A static {@link VNode} **or** a (possibly async)
 *   factory function that receives the request and returns the VNode to render.
 * @param options - Render and document-shell options.
 *
 * @example
 * ```ts
 * app.get('*', createStreamingSSRHandler(
 *   (req) => html`<my-app url="${req.url}" />`,
 *   { render: { dsd: true } },
 * ));
 * ```
 */
export function createStreamingSSRHandler<
  Req extends MinimalRequest = MinimalRequest,
>(
  vnodeOrFactory:
    | VnodeFactoryResult
    | ((req: Req) => VnodeFactoryResult | Promise<VnodeFactoryResult>),
  options?: SSRMiddlewareOptions,
): (req: Req, res: MinimalResponse) => Promise<void> {
  const renderOptions: RenderOptions &
    DSDRenderOptions & { jit?: JITCSSOptions } = {
    dsd: true,
    ...options?.render,
  };
  const { head, document: wrapDocument = true } = options ?? {};

  return async (req, res) => {
    try {
      const rawResult =
        typeof vnodeOrFactory === 'function'
          ? await vnodeOrFactory(req)
          : vnodeOrFactory;

      const isBundle =
        rawResult !== null &&
        typeof rawResult === 'object' &&
        'vnode' in (rawResult as object);
      const vnode = isBundle
        ? (rawResult as { vnode: VNode }).vnode
        : (rawResult as VNode);
      const router = isBundle
        ? (rawResult as { vnode: VNode; router?: unknown }).router
        : undefined;
      const perRequestHead = isBundle
        ? (rawResult as { head?: string }).head
        : undefined;

      const mergedHead = [head, perRequestHead].filter(Boolean).join('\n') || undefined;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');

      const stream = renderToStream(vnode, { ...renderOptions, router });
      const reader = stream.getReader();

      if (res.write) {
        // Streaming path: pipe chunks directly to the response as they arrive.
        res.setHeader('Transfer-Encoding', 'chunked');
        if (wrapDocument) {
          res.write(`<!DOCTYPE html><html><head>${mergedHead ?? ''}</head><body>`);
        }
        let done = false;
        while (!done) {
          const { value, done: d } = await reader.read();
          if (value) res.write(value);
          done = d;
        }
        if (wrapDocument) {
          res.end('</body></html>');
        } else {
          res.end();
        }
      } else {
        // Buffered fallback: framework does not expose write(); collect and send as one response.
        const chunks: string[] = [];
        let done = false;
        while (!done) {
          const { value, done: d } = await reader.read();
          if (value) chunks.push(value);
          done = d;
        }
        const content = chunks.join('');
        const body = wrapDocument
          ? `<!DOCTYPE html><html><head>${mergedHead ?? ''}</head><body>${content}</body></html>`
          : content;
        res.end(body);
      }
    } catch (err) {
      // Ensure the response is always closed to prevent the request hanging.
      // Re-throw so the framework's error handler can set the proper status code.
      try {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Internal Server Error');
      } catch {
        // ignore secondary errors during error response
      }
      throw err;
    }
  };
}
