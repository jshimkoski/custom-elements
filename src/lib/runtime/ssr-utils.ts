import { NATIVE_PROMOTE_MAP } from './native-properties';
import type { VNode } from './types';
/**
 * Shared utilities for SSR renderers.
 * Imported by vdom-ssr.ts and vdom-ssr-dsd.ts to avoid duplication.
 */
import { escapeHTML, isHTMLBooleanAttribute } from './helpers';
import { TAG_NAMESPACE_MAP, SVG_NS } from './namespace-helpers';

export type RenderOptions = {
  /** Backwards-compatible: whether to inject the SVG namespace on <svg> nodes (default true) */
  injectSvgNamespace?: boolean;
  /** Inject known well-known namespaces for tags like <math> when missing (default follows injectSvgNamespace) */
  injectKnownNamespaces?: boolean;
};

export const VOID_ELEMENTS = new Set([
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

export function buildAttrs(
  attrs: Record<string, unknown>,
  tag: string,
  opts: RenderOptions,
): string {
  const inject = opts.injectSvgNamespace ?? true;
  const injectKnown = opts.injectKnownNamespaces ?? inject;
  const merged = { ...attrs };

  if (inject && tag === 'svg' && !('xmlns' in merged)) {
    merged['xmlns'] = SVG_NS;
  } else if (injectKnown && tag in TAG_NAMESPACE_MAP && !('xmlns' in merged)) {
    merged['xmlns'] = TAG_NAMESPACE_MAP[tag];
  }

  return Object.entries(merged)
    .filter(([k, v]) =>
      v !== null &&
      v !== undefined &&
      !(typeof v === 'boolean' && isHTMLBooleanAttribute(k) && !v),
    )
    .map(([k, v]) =>
      typeof v === 'boolean' && isHTMLBooleanAttribute(k)
        ? ` ${k}`
        : ` ${k}="${escapeHTML(String(v))}"`,
    )
    .join('');
}

export function buildRawAttrs(attrs: Record<string, unknown>): string {
  return Object.entries(attrs)
    .filter(([k, v]) =>
      v !== null &&
      v !== undefined &&
      !(typeof v === 'boolean' && isHTMLBooleanAttribute(k) && !v),
    )
    .map(([k, v]) =>
      typeof v === 'boolean' && isHTMLBooleanAttribute(k)
        ? ` ${k}`
        : ` ${k}="${escapeHTML(String(v))}"`,
    )
    .join('');
}

/** Include only reflected native properties; never serialize runtime objects/events. */
export function collectNativeAttrs(vnode: VNode): Record<string, unknown> {
  const attrs: Record<string, unknown> = { ...vnode.props?.attrs };
  const names = [...(NATIVE_PROMOTE_MAP[vnode.tag] ?? []), 'disabled'];
  for (const name of names) {
    const value = vnode.props?.props?.[name];
    if (!(name in attrs) && (value == null || ['string', 'number', 'boolean'].includes(typeof value))) {
      if (value !== undefined) attrs[name] = value;
    }
  }
  if (vnode.tag === 'textarea' || vnode.tag === 'select') delete attrs.value;
  return attrs;
}

/** HTML represents textarea values as text and select values on their options. */
export function collectNativeChildren(vnode: VNode): VNode['children'] {
  const value = vnode.props?.props?.value ?? vnode.props?.attrs?.value;
  if (value == null) return vnode.children;
  // HTML parsing removes one leading newline immediately after <textarea>.
  if (vnode.tag === 'textarea') return String(value).startsWith('\n') ? '\n' + String(value) : String(value);
  if (vnode.tag !== 'select' || !Array.isArray(vnode.children)) return vnode.children;
  const selectedValues = new Set((Array.isArray(value) ? value : [value]).map(String));
  const multipleValue = vnode.props?.props?.multiple ?? vnode.props?.attrs?.multiple;
  const multiple = multipleValue != null && multipleValue !== false;
  let matched = false;
  const text = (node: VNode): string => typeof node.children === 'string' ? node.children : (node.children ?? []).map(text).join('');
  const visit = (node: VNode): VNode => {
    if (node.tag === 'option') {
      const optionValue = node.props?.props?.value ?? node.props?.attrs?.value ?? text(node).trim();
      const selected = selectedValues.has(String(optionValue)) && (multiple || !matched);
      matched ||= selected;
      return { ...node, props: { ...node.props, attrs: { ...node.props?.attrs, selected }, props: { ...node.props?.props, selected } } };
    }
    return node.tag === 'optgroup' && Array.isArray(node.children) ? { ...node, children: node.children.map(visit) } : node;
  };
  return vnode.children.map(visit);
}
