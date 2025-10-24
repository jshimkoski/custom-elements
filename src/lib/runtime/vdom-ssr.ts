import type { VNode } from './types';
import { escapeHTML } from './helpers';

/**
 * Render a VNode to a string (SSR).
 * Kept intentionally minimal: only serializes attributes under `props.attrs`
 * to avoid leaking runtime-only values (functions, reactive state, directives).
 * @param vnode The virtual node to render.
 * @returns The rendered HTML string.
 */
export function renderToString(vnode: VNode): string {
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
    return children.map(renderToString).join('');
  }

  if (vnode.tag === '#raw') {
    return typeof vnode.children === 'string' ? vnode.children : '';
  }

  // Collect attributes from props.attrs
  let attrsString = '';
  if (vnode.props && vnode.props.attrs) {
    attrsString = Object.entries(vnode.props.attrs)
      .map(([k, v]) => ` ${k}="${escapeHTML(String(v))}"`)
      .join('');
  }

  const children = Array.isArray(vnode.children)
    ? vnode.children
        .filter((c) => c !== null && c !== undefined)
        .map(renderToString)
        .join('')
    : typeof vnode.children === 'string'
      ? escapeHTML(vnode.children)
      : vnode.children
        ? renderToString(vnode.children)
        : '';

  return `<${vnode.tag}${attrsString}>${children}</${vnode.tag}>`;
}
