import type { VNode } from './types';
import { escapeHTML } from './helpers';
import { TAG_NAMESPACE_MAP, SVG_NS } from './namespace-helpers';

/**
 * Render a VNode to a string (SSR).
 * Kept intentionally minimal: only serializes attributes under `props.attrs`
 * to avoid leaking runtime-only values (functions, reactive state, directives).
 * @param vnode The virtual node to render.
 * @returns The rendered HTML string.
 */
export type RenderOptions = {
  /** Backwards-compatible: whether to inject the SVG namespace on <svg> nodes (default true) */
  injectSvgNamespace?: boolean;
  /** Inject known well-known namespaces for tags like <math> when missing (default follows injectSvgNamespace) */
  injectKnownNamespaces?: boolean;
};

export function renderToString(vnode: VNode, opts?: RenderOptions): string {
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
    return children.map((c) => renderToString(c, opts)).join('');
  }

  if (vnode.tag === '#raw') {
    return typeof vnode.children === 'string' ? vnode.children : '';
  }

  // Collect attributes from props.attrs. For SSR we mirror vnode.attrs
  // but ensure SVG nodes behave like client-side: if this is an <svg>
  // and no xmlns was provided, inject the standard SVG namespace so
  // server markup matches client-created DOM namespace.
  let attrsObj: Record<string, unknown> = {};
  if (vnode.props && vnode.props.attrs) {
    attrsObj = { ...vnode.props.attrs };
  }

  const inject = opts?.injectSvgNamespace ?? true;
  const injectKnown = opts?.injectKnownNamespaces ?? inject;

  // Inject namespace for well-known tags when missing. By default we
  // preserve previous behavior (SVG injected) and also allow injecting
  // other known namespaces (MathML) when injectKnownNamespaces is true.
  if (inject && vnode.tag === 'svg' && !('xmlns' in attrsObj)) {
    attrsObj.xmlns = SVG_NS;
  } else if (
    injectKnown &&
    vnode.tag in TAG_NAMESPACE_MAP &&
    !('xmlns' in attrsObj)
  ) {
    attrsObj.xmlns = TAG_NAMESPACE_MAP[vnode.tag];
  }

  const attrsString = Object.entries(attrsObj)
    .map(([k, v]) => ` ${k}="${escapeHTML(String(v))}"`)
    .join('');

  const children = Array.isArray(vnode.children)
    ? vnode.children
        .filter((c) => c !== null && c !== undefined)
        .map((c) => renderToString(c, opts))
        .join('')
    : typeof vnode.children === 'string'
      ? escapeHTML(vnode.children)
      : vnode.children
        ? renderToString(vnode.children)
        : '';

  return `<${vnode.tag}${attrsString}>${children}</${vnode.tag}>`;
}
