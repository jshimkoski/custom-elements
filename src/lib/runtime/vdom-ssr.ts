import type { VNode } from './types';
import { escapeHTML } from './helpers';
import {
  beginRenderWarningScope,
  endRenderWarningScope,
} from './logger';
import { VOID_ELEMENTS, buildAttrs, type RenderOptions } from './ssr-utils';
import { processClassDirective, processStyleDirective } from './vdom-directives';

/**
 * Render a VNode to a string (SSR).
 * Kept intentionally minimal: only serializes attributes under `props.attrs`
 * to avoid leaking runtime-only values (functions, reactive state, directives).
 * @param vnode The virtual node to render.
 * @returns The rendered HTML string.
 */
export type { RenderOptions } from './ssr-utils';

export function renderToString(vnode: VNode, opts?: RenderOptions): string {
  beginRenderWarningScope();
  try {
    return renderToStringImpl(vnode, opts);
  } finally {
    endRenderWarningScope();
  }
}

function renderToStringImpl(vnode: VNode, opts?: RenderOptions): string {
  if (typeof vnode === 'string') return escapeHTML(vnode) as string;

  if (vnode.tag === '#text') {
    return typeof vnode.children === 'string'
      ? (escapeHTML(vnode.children) as string)
      : '';
  }

  if (vnode.tag === '#anchor') {
    // Preserve meaningful falsy children (0, false, '') while filtering out
    // only null and undefined. Anchor blocks are normalized by the compiler
    // to exclude null/undefined; SSR should follow the same rule to avoid
    // hydration mismatches where falsy values are significant.
    const children = Array.isArray(vnode.children)
      ? vnode.children.filter((c) => c !== null && c !== undefined)
      : [];
    return children.map((c) => renderToStringImpl(c, opts)).join('');
  }

  if (vnode.tag === '#raw') {
    return typeof vnode.children === 'string' ? vnode.children : '';
  }

  // Collect attributes from props.attrs. For SSR we mirror vnode.attrs
  // but ensure SVG nodes behave like client-side: if this is an <svg>
  // and no xmlns was provided, inject the standard SVG namespace so
  // server markup matches client-created DOM namespace.
  const attrsObj: Record<string, unknown> = vnode.props?.attrs
    ? { ...vnode.props.attrs }
    : {};

  // Process :class and :style directives so computed classes/styles appear in
  // the SSR output. Without this, elements using :class (e.g. md-app-bar's
  // <header :class="..."> ) emit no class attribute, breaking CSS rules that
  // depend on those classes being present at first paint.
  const directives = vnode.props?.directives;
  if (directives) {
    if (directives.class) {
      processClassDirective(directives.class.value, attrsObj, undefined, vnode.props?.attrs as Record<string, unknown>);
      // processClassDirective sets attrs.class = undefined when the directive resolves
      // to empty; delete the key so buildAttrs doesn't emit class="undefined".
      if (attrsObj.class === undefined) delete attrsObj.class;
    }
    if (directives.style) {
      processStyleDirective(directives.style.value, attrsObj);
      if (attrsObj.style === undefined) delete attrsObj.style;
    }
  }

  const attrsString = buildAttrs(attrsObj, vnode.tag, opts ?? {});

  // Handle void elements (self-closing tags)
  if (VOID_ELEMENTS.has(vnode.tag)) {
    return `<${vnode.tag}${attrsString}>`;
  }

  const children = Array.isArray(vnode.children)
    ? vnode.children
        .filter((c) => c !== null && c !== undefined)
        .map((c) => renderToStringImpl(c, opts))
        .join('')
    : typeof vnode.children === 'string'
      ? escapeHTML(vnode.children)
      : vnode.children
        ? renderToStringImpl(vnode.children, opts)
        : '';

  return `<${vnode.tag}${attrsString}>${children}</${vnode.tag}>`;
}
