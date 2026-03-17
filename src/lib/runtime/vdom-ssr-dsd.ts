/**
 * Declarative Shadow DOM (DSD) SSR renderer.
 *
 * When `dsd: true` is passed to the render options, registered custom elements
 * are serialised as:
 *
 * ```html
 * <my-element attr="val">
 *   <template shadowrootmode="open">
 *     <style>
 *       /* baseReset + useStyle() output + JIT utility CSS *\/
 *     </style>
 *     <!-- shadow DOM from component render function -->
 *   </template>
 *   <!-- light DOM / slotted children from vnode.children -->
 * </my-element>
 * ```
 *
 * The browser parses the `<template shadowrootmode="open">` block and attaches
 * a real shadow root before any JavaScript executes. All CSS layers are present
 * at first paint — eliminating both FOUC and layout shift.
 *
 * Non-custom-element VNodes are rendered identically to renderToString() but
 * with DSD recursion active for any custom elements nested inside them.
 */

import type { VNode } from './types';
import { renderToString } from './vdom-ssr';
import { VOID_ELEMENTS, buildAttrs, buildRawAttrs, type RenderOptions } from './ssr-utils';
import { registry } from './component/registry';
import { runComponentSSRRender } from './ssr-context';
import { jitCSS } from './style';
import { baseReset, minifyCSS } from './css-utils';
import { escapeHTML } from './helpers';
import { devWarn } from './logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DSDRenderOptions = RenderOptions & {
  /**
   * Emit Declarative Shadow DOM output for registered custom elements.
   * Shadow content is serialised inside `<template shadowrootmode="open">`,
   * with a complete CSS layer stack (`baseReset` + `useStyle` + JIT CSS)
   * injected as a `<style>` block so styles are available at first paint.
   * @default false
   */
  dsd?: boolean;
  /**
   * Append the DSD polyfill `<script>` for browsers without native support
   * (Firefox < 123). Only meaningful when `dsd` is true.
   * @default true
   */
  dsdPolyfill?: boolean;
  /**
   * Router instance to thread through each component's SSR context.
   *
   * When provided, `router-view` reads the current route from this instance
   * instead of the module-level `activeRouterProxy` singleton, making
   * concurrent SSR renders safe — each request carries its own router with
   * its own URL state.
   *
   * In browser mode this option is ignored; components always use
   * `activeRouterProxy` there.
   */
  router?: unknown;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * @internal
 * Minified DSD polyfill for browsers without native Declarative Shadow DOM.
 * Processes all `<template shadowrootmode>` elements synchronously.
 */
export const DSD_POLYFILL_SCRIPT =
  '<script>(function(){' +
  "if(HTMLTemplateElement.prototype.hasOwnProperty('shadowRootMode'))return;" +
  "document.querySelectorAll('template[shadowrootmode]').forEach(function(t){" +
  "var m=t.getAttribute('shadowrootmode');" +
  'var s=t.parentElement.attachShadow({mode:m});' +
  's.appendChild(t.content);t.remove();' +
  '});})()' +
  '</script>';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isRegisteredCustomElement(tag: string): boolean {
  return tag.includes('-') && registry.has(tag);
}

/**
 * Build the combined `<style>` block for a shadow root.
 *
 * Layer order (matches the runtime adoptedStyleSheets order):
 *   1. baseReset — global reset + CSS custom properties
 *   2. useStyle() output — component-defined rules (:host, ::slotted, etc.)
 *   3. JIT CSS — utility classes extracted from the shadow HTML
 */
export function buildShadowStyleBlock(
  useStyleCSS: string,
  shadowHTML: string,
): string {
  const parts: string[] = [baseReset];

  if (useStyleCSS.trim()) {
    parts.push(useStyleCSS);
  }

  const jit = jitCSS(shadowHTML);
  if (jit.trim()) {
    parts.push(jit);
  }

  const combined = minifyCSS(parts.join('\n'));
  return combined ? `<style>${combined}</style>` : '';
}

// ---------------------------------------------------------------------------
// Streaming async component collector
// ---------------------------------------------------------------------------

export interface AsyncStreamEntry {
  id: string;
  tag: string;
  attrsString: string;
  hydrateAttr: string;
  useStyleCSS: string;
  lightDOM: string;
  opts: DSDRenderOptions;
  promise: Promise<VNode | VNode[]>;
  /** Router threaded from the originating render pass — propagated to async re-renders. */
  router?: unknown;
}

let _streamingCollector: AsyncStreamEntry[] | null = null;
let _streamingCounter = 0;

/** @internal Called by renderToStream() before the sync render pass. */
export function beginStreamingCollection(collector: AsyncStreamEntry[]): void {
  _streamingCollector = collector;
  _streamingCounter = 0;
}

/** @internal Called by renderToStream() after the sync render pass. */
export function endStreamingCollection(): void {
  _streamingCollector = null;
}

// ---------------------------------------------------------------------------
// Core renderer
// ---------------------------------------------------------------------------

/**
 * Render a VNode tree to an HTML string with Declarative Shadow DOM output
 * for all registered custom elements encountered in the tree.
 */
export function renderToDSD(vnode: VNode, opts: DSDRenderOptions): string {
  if (!opts.dsd) {
    return renderToString(vnode, opts);
  }

  // Primitive string nodes
  if (typeof vnode === 'string') {
    return escapeHTML(vnode) as string;
  }

  const tag = (vnode as VNode).tag;

  // Special virtual node types — delegate entirely to the base renderer
  if (tag === '#text' || tag === '#anchor' || tag === '#raw') {
    return renderToString(vnode, opts);
  }

  // Custom element — emit DSD wrapper
  if (isRegisteredCustomElement(tag)) {
    return renderCustomElementDSD(vnode, opts);
  }

  // Regular element — recurse with DSD mode on
  const attrsObj: Record<string, unknown> = vnode.props?.attrs
    ? { ...vnode.props.attrs }
    : {};

  const attrsString = buildAttrs(attrsObj, tag, opts);

  if (VOID_ELEMENTS.has(tag)) {
    return `<${tag}${attrsString}>`;
  }

  const children = renderChildrenDSD(vnode.children, opts);
  return `<${tag}${attrsString}>${children}</${tag}>`;
}

function renderCustomElementDSD(vnode: VNode, opts: DSDRenderOptions): string {
  const tag = vnode.tag;
  const config = registry.get(tag);

  // Build the plain attribute string (no namespace injection for custom elements)
  const rawAttrs = vnode.props?.attrs ?? {};
  const attrsString = buildRawAttrs(rawAttrs);

  // Move the null check BEFORE reading config.* properties for clarity.
  if (!config) {
    // Component not in registry on server (e.g. dynamic import not yet run).
    // Emit a shell with an empty DSD template so the client hydrates normally.
    const lightDOM = renderChildrenDSD(vnode.children, opts);
    return `<${tag}${attrsString}><template shadowrootmode="open"></template>${lightDOM}</${tag}>`;
  }

  // Emit data-cer-hydrate when a non-default strategy is configured.
  // 'load' is the default and doesn't need to be serialised.
  const hydrateStrategy = config.hydrate;
  const hydrateAttr =
    hydrateStrategy && hydrateStrategy !== 'load'
      ? ` data-cer-hydrate="${hydrateStrategy}"`
      : '';

  // Run the component's render function in a minimal SSR context to get the
  // shadow DOM VNode tree and capture any useStyle() output.
  const { shadowVNode, useStyleCSS, asyncPromise } = runComponentSSRRender(config, rawAttrs, tag, opts.router);

  // When streaming and this component has an async render, emit a placeholder
  // and register the promise for later resolution.
  if (asyncPromise && _streamingCollector === null) {
    devWarn(
      `[SSR] Component "${tag}" has an async render function. ` +
        `In standard SSR the shadow DOM will be empty. ` +
        `Use renderToStream() for incremental async component streaming.`,
    );
  }
  if (asyncPromise && _streamingCollector !== null) {
    const id = `cer-stream-${_streamingCounter++}`;
    const lightDOM = renderChildrenDSD(vnode.children, opts);
    _streamingCollector.push({
      id,
      tag,
      attrsString,
      hydrateAttr,
      useStyleCSS,
      lightDOM,
      opts,
      promise: asyncPromise,
      router: opts.router,
    });
    return (
      `<${tag} id="${id}"${attrsString}${hydrateAttr}>` +
      `<template shadowrootmode="open"></template>` +
      `${lightDOM}` +
      `</${tag}>`
    );
  }

  // Render the shadow DOM VNode tree to HTML (DSD-recursive for nested elements)
  let shadowHTML = '';
  if (shadowVNode !== null && shadowVNode !== undefined) {
    if (Array.isArray(shadowVNode)) {
      shadowHTML = (shadowVNode as VNode[])
        .map((n) => renderToDSD(n, opts))
        .join('');
    } else {
      shadowHTML = renderToDSD(shadowVNode as VNode, opts);
    }
  }

  const styleBlock = buildShadowStyleBlock(useStyleCSS, shadowHTML);

  // Light DOM children become slotted content — rendered outside the template
  const lightDOM = renderChildrenDSD(vnode.children, opts);

  return (
    `<${tag}${attrsString}${hydrateAttr}>` +
    `<template shadowrootmode="open">${styleBlock}${shadowHTML}</template>` +
    `${lightDOM}` +
    `</${tag}>`
  );
}

function renderChildrenDSD(
  children: VNode['children'],
  opts: DSDRenderOptions,
): string {
  if (!children) return '';
  if (typeof children === 'string') return escapeHTML(children) as string;
  if (Array.isArray(children)) {
    return children
      .filter((c) => c !== null && c !== undefined)
      .map((c) => renderToDSD(c as VNode, opts))
      .join('');
  }
  return renderToDSD(children as VNode, opts);
}

// ---------------------------------------------------------------------------
// Public entry points
// ---------------------------------------------------------------------------

/**
 * Render a VNode tree to a DSD HTML string and optionally append the
 * DSD polyfill script for older browsers.
 */
export function renderToStringDSD(
  vnode: VNode,
  opts?: DSDRenderOptions,
): string {
  const effectiveOpts: DSDRenderOptions = { dsd: true, ...opts };
  const html = renderToDSD(vnode, effectiveOpts);

  if (effectiveOpts.dsdPolyfill !== false) {
    // Inject polyfill before </body> if present, otherwise append
    if (html.includes('</body>')) {
      return html.replace('</body>', `${DSD_POLYFILL_SCRIPT}</body>`);
    }
    return html + DSD_POLYFILL_SCRIPT;
  }

  return html;
}
