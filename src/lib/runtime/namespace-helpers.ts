/**
 * Namespace-aware attribute helpers.
 * Provides small, fast utilities to set/remove attributes using the
 * appropriate namespace when an attribute uses a known prefix (e.g. xlink:href).
 */

const ATTR_NAMESPACE_MAP: Record<string, string> = {
  xlink: 'http://www.w3.org/1999/xlink',
  xml: 'http://www.w3.org/XML/1998/namespace',
};

/**
 * Set attribute using namespace when the key contains a known prefix.
 */
export function setAttributeSmart(
  el: Element,
  key: string,
  value: string,
): void {
  try {
    if (!key || !key.includes(':')) {
      el.setAttribute(key, value);
      return;
    }
    const idx = key.indexOf(':');
    const prefix = key.substring(0, idx);
    const local = key.substring(idx + 1);
    const ns = ATTR_NAMESPACE_MAP[prefix];
    if (ns) el.setAttributeNS(ns, local, value);
    else el.setAttribute(key, value);
  } catch {
    try {
      // Fallback to un-namespaced setAttribute on error
      el.setAttribute(key, value);
    } catch {
      /* swallow */
    }
  }
}

/**
 * Remove attribute using namespace when the key contains a known prefix.
 */
export function removeAttributeSmart(el: Element, key: string): void {
  try {
    if (!key || !key.includes(':')) {
      el.removeAttribute(key);
      return;
    }
    const idx = key.indexOf(':');
    const prefix = key.substring(0, idx);
    const local = key.substring(idx + 1);
    const ns = ATTR_NAMESPACE_MAP[prefix];
    if (ns) el.removeAttributeNS(ns, local);
    else el.removeAttribute(key);
  } catch {
    try {
      el.removeAttribute(key);
    } catch {
      /* swallow */
    }
  }
}

export const __TEST_ONLY_ATTR_NS_MAP = ATTR_NAMESPACE_MAP;

// Common element namespace URIs and a small tag->namespace map used by
// both the client renderer and the SSR serializer. Exporting these from
// this module keeps namespace knowledge centralized and prevents
// accidental duplication between runtime and SSR code.
export const SVG_NS = 'http://www.w3.org/2000/svg';
export const MATHML_NS = 'http://www.w3.org/1998/Math/MathML';

export const TAG_NAMESPACE_MAP: Record<string, string> = {
  svg: SVG_NS,
  math: MATHML_NS,
};
