/**
 * Shared utilities for SSR renderers.
 * Imported by vdom-ssr.ts and vdom-ssr-dsd.ts to avoid duplication.
 */
import { escapeHTML } from './helpers';
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
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => ` ${k}="${escapeHTML(String(v))}"`)
    .join('');
}

export function buildRawAttrs(attrs: Record<string, unknown>): string {
  return Object.entries(attrs)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => ` ${k}="${escapeHTML(String(v))}"`)
    .join('');
}
