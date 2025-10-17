/**
 * Internal helpers for attaching metadata to DOM nodes without relying on
 * DOM-attached properties that minifiers or consumers might accidentally
 * rename/mangle.
 *
 * These helpers prefer WeakMap storage (safe and memory-leak free) and only
 * fall back to setting DOM properties/attributes for compatibility with older
 * code or tests.
 *
 * NOTE: This module is internal to the runtime and should not be re-exported
 * from the public API surface. Use the exported functions in this file when
 * you need minifier-safe metadata on nodes.
 *
 * Contract (brief):
 * - setNodeKey(node, key): associates an opaque string key with a Node.
 * - getNodeKey(node): returns the associated key or undefined.
 * - setElementTransition(el, val): stores transition-group metadata on an
 *   element used by the patcher/transition system.
 * - getElementTransition(el): retrieves previously stored transition metadata.
 *
 * Edge cases / error modes:
 * - All setters swallow errors (defensive) to avoid breaking production code
 *   when host environments restrict adding properties or attributes.
 * - Prefer the WeakMap APIs for future-proof, minifier-safe behavior.
 * @internal
 */
const nodeKeyMap = new WeakMap<Node, string>();
const elementTransitionMap = new WeakMap<HTMLElement, any>();

/**
 * Retrieve the stored node key for a Node.
 *
 * The lookup prefers a WeakMap-stored value. For compatibility it will also
 * attempt to read legacy fallbacks: a `.key` property or the
 * `data-anchor-key` attribute on Elements.
 *
 * @internal
 */
export function getNodeKey(node: Node | null | undefined): string | undefined {
  if (!node) return undefined;
  const wm = nodeKeyMap.get(node);
  if (wm !== undefined) return wm as string;
  try {
    const anyNode = node as any;
    if (anyNode && anyNode.key != null) return anyNode.key;
  } catch (e) {}
  if (node instanceof Element) {
    const attr = node.getAttribute("data-anchor-key");
    if (attr) return attr;
  }
  return undefined;
}

/**
 * Store a node key on a Node.
 *
 * This sets a WeakMap entry and also writes defensive DOM fallbacks for
 * compatibility with older consumers/tests. Errors are swallowed to avoid
 * disrupting host environments that forbid property writes.
 *
 * @internal
 */
import { safeSerializeAttr } from "./helpers";

export function setNodeKey(node: Node, key: string): void {
  try {
    nodeKeyMap.set(node, key);
  } catch (e) {}
  try {
    (node as any).key = key;
  } catch (e) {}
  try {
    if (node instanceof Element) {
      const s = safeSerializeAttr(key);
      if (s !== null) node.setAttribute("data-anchor-key", s);
    }
  } catch (e) {}
}

/**
 * Retrieve transition-group metadata attached to an element.
 *
 * Prefers the WeakMap but falls back to a legacy `._transitionGroup` property
 * if present.
 *
 * @internal
 */
export function getElementTransition(el: HTMLElement | null | undefined): any {
  if (!el) return undefined;
  const wm = elementTransitionMap.get(el);
  if (wm !== undefined) return wm;
  try {
    const anyEl = el as any;
    if (anyEl && anyEl._transitionGroup != null) return anyEl._transitionGroup;
  } catch (e) {}
  return undefined;
}

/**
 * Store transition-group metadata for an element.
 *
 * Writes to the WeakMap and a defensive legacy property for compatibility.
 * Errors are swallowed to avoid breaking host environments.
 *
 * @internal
 */
export function setElementTransition(el: HTMLElement, val: any): void {
  try {
    elementTransitionMap.set(el, val);
  } catch (e) {}
  try {
    (el as any)._transitionGroup = val;
  } catch (e) {}
}

export default {
  getNodeKey,
  setNodeKey,
  getElementTransition,
  setElementTransition,
};
