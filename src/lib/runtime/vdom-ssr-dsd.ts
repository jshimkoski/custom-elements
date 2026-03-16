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
import { renderToString, type RenderOptions } from './vdom-ssr';
import { registry } from './component/registry';
import { runComponentSSRRender } from './ssr-context';
import { jitCSS } from './style';
import { baseReset, minifyCSS } from './css-utils';
import { escapeHTML } from './helpers';
import { TAG_NAMESPACE_MAP, SVG_NS } from './namespace-helpers';

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
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

/**
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

function buildAttrsString(
  attrs: Record<string, unknown>,
  opts: DSDRenderOptions,
): string {
  const inject = opts.injectSvgNamespace ?? true;
  const injectKnown = opts.injectKnownNamespaces ?? inject;

  const merged = { ...attrs };

  // Mirror namespace injection logic from renderToString
  const tag = (merged as { _tag?: string })._tag;
  if (tag) delete merged._tag;

  if (inject && tag === 'svg' && !('xmlns' in merged)) {
    merged['xmlns'] = SVG_NS;
  } else if (injectKnown && tag && tag in TAG_NAMESPACE_MAP && !('xmlns' in merged)) {
    merged['xmlns'] = TAG_NAMESPACE_MAP[tag];
  }

  return Object.entries(merged)
    .map(([k, v]) => ` ${k}="${escapeHTML(String(v))}"`)
    .join('');
}

/**
 * Build the combined `<style>` block for a shadow root.
 *
 * Layer order (matches the runtime adoptedStyleSheets order):
 *   1. baseReset — global reset + CSS custom properties
 *   2. useStyle() output — component-defined rules (:host, ::slotted, etc.)
 *   3. JIT CSS — utility classes extracted from the shadow HTML
 */
function buildShadowStyleBlock(
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
    ? { ...vnode.props.attrs, _tag: tag }
    : { _tag: tag };

  const attrsString = buildAttrsString(attrsObj, opts);

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
  const attrsString = Object.entries(rawAttrs)
    .map(([k, v]) => ` ${k}="${escapeHTML(String(v))}"`)
    .join('');

  // Emit data-cer-hydrate when a non-default strategy is configured.
  // 'load' is the default and doesn't need to be serialised.
  const hydrateStrategy = config?.hydrate;
  const hydrateAttr =
    hydrateStrategy && hydrateStrategy !== 'load'
      ? ` data-cer-hydrate="${hydrateStrategy}"`
      : '';

  if (!config) {
    // Component not in registry on server (e.g. dynamic import not yet run).
    // Emit a shell with an empty DSD template so the client hydrates normally.
    const lightDOM = renderChildrenDSD(vnode.children, opts);
    return `<${tag}${attrsString}${hydrateAttr}><template shadowrootmode="open"></template>${lightDOM}</${tag}>`;
  }

  // Run the component's render function in a minimal SSR context to get the
  // shadow DOM VNode tree and capture any useStyle() output.
  const { shadowVNode, useStyleCSS } = runComponentSSRRender(config, rawAttrs, tag);

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
