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

import type { HydrateStrategy, VNode } from './types';
import { renderToString } from './vdom-ssr';
import { VOID_ELEMENTS, buildAttrs, buildRawAttrs, type RenderOptions } from './ssr-utils';
import { registry } from './component/registry';
import { runComponentSSRRender } from './ssr-context';
import { jitCSS, getProseSheet, extractClassesFromHTML } from './style';
import { baseResetRules, minifyCSS } from './css-utils';
import { escapeHTML, toKebab } from './helpers';
import { devWarn } from './logger';
import { processClassDirective, processStyleDirective } from './vdom-directives';

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
  /** @internal Strategy inherited by registered descendants of an SSR island. */
  _inheritedHydrateStrategy?: HydrateStrategy;
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
 * Serialize JSON-safe object/array props for an island whose parent will never
 * hydrate. Normally a hydrating parent promotes bound custom-element props to
 * live JS properties before its children hydrate, so repeating those values in
 * HTML would only increase document size. A `hydrate: 'none'` boundary cannot
 * perform that handoff, however, and an explicitly interactive descendant
 * needs its complex initial props before its first client render.
 */
function serializeStaticBoundaryIslandProps(
  props: Record<string, unknown>,
): string | null {
  const entries: string[] = [];

  for (const [key, value] of Object.entries(props)) {
    if (value !== null && typeof value !== 'object') continue;

    if (value !== null && !Array.isArray(value)) {
      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) continue;
    }

    try {
      const encodedValue = JSON.stringify(value);
      if (encodedValue !== undefined) {
        entries.push(`${JSON.stringify(key)}:${encodedValue}`);
      }
    } catch {
      // Circular and otherwise non-JSON values remain server-only. Hydration
      // must never make an otherwise valid SSR render fail.
    }
  }

  return entries.length ? `{${entries.join(',')}}` : null;
}

/**
 * Build the combined `<style>` block for a shadow root.
 *
 * Layer order (matches the runtime adoptedStyleSheets order):
 *   1. baseResetRules — shadow-local reset (document tokens inherit naturally)
 *   2. Prose CSS — inlined when the shadow HTML uses prose/prose-sm/etc. classes,
 *      because the singleton proseSheet is applied via adoptedStyleSheets at runtime
 *      and is therefore unavailable at first paint without this inline copy.
 *   3. useStyle() output — component-defined rules (:host, ::slotted, etc.)
 *   4. JIT CSS — utility classes extracted from the shadow HTML. Keeping variants
 *      after prose base rules is required for equal-specificity utilities such as
 *      dark:prose-invert to override the default prose variables.
 */
export function buildShadowStyleBlock(
  useStyleCSS: string,
  shadowHTML: string,
): string {
  // Keep the reset in its own style element. Complete-document SSR can then
  // share this identical sheet across every declarative shadow root even when
  // each component has different local/JIT styles. Combining everything into
  // one block repeats the reset once per component and forces the browser to
  // parse the same rules dozens of times before first paint.
  const reset = minifyCSS(baseResetRules);
  const parts: string[] = [];

  // Generate JIT CSS before reading the prose sheet because jitCSS() registers
  // prose sizes as a side effect. The generated text is appended later so its
  // utilities retain the same precedence as the client-side JIT stylesheet.
  const jit = jitCSS(shadowHTML);

  // jitCSS() registers prose sizes as a side-effect when it encounters prose/prose-sm
  // etc. class names. getProseSheet() returns the singleton prose CSS (or null when no
  // prose classes were found). We inline it here so prose styles are available before
  // JavaScript executes — otherwise the shadow DOM has no prose CSS at first paint.
  const containsProse = extractClassesFromHTML(shadowHTML).some((className) =>
    /(?:^|:)prose(?:-(?:sm|lg|xl|2xl))?$/.test(className),
  );
  const proseSheet = containsProse ? getProseSheet() : null;
  if (proseSheet) {
    const proseCSS = String(proseSheet);
    if (proseCSS.trim()) {
      parts.push(proseCSS);
    }
  }

  if (useStyleCSS.trim()) {
    parts.push(useStyleCSS);
  }

  if (jit.trim()) {
    parts.push(jit);
  }

  const componentCSS = minifyCSS(parts.join('\n'));
  return [
    reset ? `<style>${reset}</style>` : '',
    componentCSS ? `<style>${componentCSS}</style>` : '',
  ].join('');
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

  // Process :class and :style directives so computed classes/styles appear
  // in DSD output — same fix as vdom-ssr.ts renderToStringImpl.
  const directives = (vnode as VNode).props?.directives;
  if (directives) {
    if (directives.class) {
      processClassDirective(directives.class.value, attrsObj, undefined, vnode.props?.attrs as Record<string, unknown>);
      if (attrsObj.class === undefined) delete attrsObj.class;
    }
    if (directives.style) {
      processStyleDirective(directives.style.value, attrsObj);
      if (attrsObj.style === undefined) delete attrsObj.style;
    }
  }

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
  const rawAttrs: Record<string, unknown> = {
    ...(vnode.props?.attrs ?? {}),
  };
  const authoredHydrateStrategy = rawAttrs['data-cer-hydrate'];
  const hydrateStrategy =
    authoredHydrateStrategy === 'load' ||
    authoredHydrateStrategy === 'idle' ||
    authoredHydrateStrategy === 'visible' ||
    authoredHydrateStrategy === 'none'
      ? authoredHydrateStrategy
      : config?.hydrate ?? opts._inheritedHydrateStrategy;
  // data-cer-hydrate is runtime-owned output below. Removing the authored copy
  // prevents duplicate attributes while preserving per-instance overrides.
  delete rawAttrs['data-cer-hydrate'];
  const hydrateAttr = hydrateStrategy
    ? ` data-cer-hydrate="${hydrateStrategy}"`
    : '';
  const childOpts = hydrateStrategy
    ? { ...opts, _inheritedHydrateStrategy: hydrateStrategy }
    : opts;

  // Build the outer element attribute string.
  // rawAttrs holds static attrs (non-bound). The template compiler moves ALL
  // bound attrs on custom elements to vnode.props.props (camelCase) and deletes
  // them from attrs, so we re-add any serialisable primitive props (strings,
  // numbers, booleans) back as kebab-case HTML attributes. This ensures the
  // client-side component can read its initial prop values from the DOM during
  // hydration without re-rendering from defaults, which would cause pop-in.
  const vnodeProps = vnode.props?.props ?? {};
  const primitivePropsAsAttrs: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(vnodeProps)) {
    const t = typeof v;
    if (t === 'string' || t === 'number' || t === 'boolean') {
      primitivePropsAsAttrs[toKebab(k)] = v;
    }
  }
  const serializedIslandProps =
    opts._inheritedHydrateStrategy === 'none' && hydrateStrategy !== 'none'
      ? serializeStaticBoundaryIslandProps(vnodeProps)
      : null;
  const hydrationPropsAttr = serializedIslandProps
    ? { 'data-cer-props': serializedIslandProps }
    : {};
  // rawAttrs wins over derived primitive props on key conflict (explicit static
  // attrs should not be silently overridden by bound primitive props). The
  // runtime-owned hydration payload wins because data-cer-props is reserved.
  const attrsString = buildRawAttrs({
    ...primitivePropsAsAttrs,
    ...rawAttrs,
    ...hydrationPropsAttr,
  });

  // Move the null check BEFORE reading config.* properties for clarity.
  if (!config) {
    // Component not in registry on server (e.g. dynamic import not yet run).
    // Emit a shell with an empty DSD template so the client hydrates normally.
    const lightDOM = renderChildrenDSD(vnode.children, childOpts);
    return `<${tag}${attrsString}${hydrateAttr}><template shadowrootmode="open"></template>${lightDOM}</${tag}>`;
  }

  // The template compiler moves bound complex-object attrs (arrays, objects,
  // elements) from vnode.props.attrs to vnode.props.props (camelCase keys)
  // for custom elements, then deletes them from attrs. runComponentSSRRender
  // must receive both sources so useProps() inside the shadow DOM render sees
  // the actual JS values — not just the (now-empty) attrs dict.
  // vnode.props.props wins over vnode.props.attrs on conflict so complex JS
  // values are preferred over any residual serialised string representation.
  const ssrAttrs: Record<string, unknown> = {
    ...rawAttrs,
    ...(vnode.props?.props ?? {}),
  };

  // Run the component's render function in a minimal SSR context to get the
  // shadow DOM VNode tree and capture any useStyle() output.
  const { shadowVNode, useStyleCSS, asyncPromise } = runComponentSSRRender(config, ssrAttrs, tag, opts.router);

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
    const lightDOM = renderChildrenDSD(vnode.children, childOpts);
    _streamingCollector.push({
      id,
      tag,
      attrsString,
      hydrateAttr,
      useStyleCSS,
      lightDOM,
      opts: childOpts,
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
      // The client VDOM normalizes multi-root output into one fragment wrapper.
      // Emit the same shape on the server so hydration can retain the existing
      // DOM instead of replacing every sibling during custom-element upgrade.
      shadowHTML = `<div>${(shadowVNode as VNode[])
        .map((n) => renderToDSD(n, childOpts))
        .join('')}</div>`;
    } else {
      shadowHTML = renderToDSD(shadowVNode as VNode, childOpts);
    }
  }

  const styleBlock = buildShadowStyleBlock(useStyleCSS, shadowHTML);

  // Light DOM children become slotted content — rendered outside the template
  const lightDOM = renderChildrenDSD(vnode.children, childOpts);

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
