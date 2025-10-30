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
export interface TransitionMetadata {
  name?: string;
  appear?: boolean;
  mode?: 'out-in' | 'in-out' | 'default';
  enterClass?: string;
  leaveClass?: string;
  moveClass?: string;
  [key: string]: unknown;
}

const elementTransitionMap = new WeakMap<Element, TransitionMetadata>();

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
    const nodeWithKey = node as { key?: string | number };
    if (nodeWithKey && nodeWithKey.key != null) return String(nodeWithKey.key);
  } catch {
    void 0;
  }
  if (node instanceof Element) {
    const attr = node.getAttribute('data-anchor-key');
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
import { safeSerializeAttr } from './helpers';
import { setAttributeSmart } from './namespace-helpers';

export function setNodeKey(node: Node, key: string): void {
  try {
    nodeKeyMap.set(node, key);
  } catch {
    void 0;
  }
  try {
    (node as { key?: string | number }).key = key;
  } catch {
    void 0;
  }
  try {
    if (node instanceof Element) {
      const s = safeSerializeAttr(key);
      if (s !== null) setAttributeSmart(node, 'data-anchor-key', s);
    }
  } catch {
    void 0;
  }
}

/**
 * Retrieve transition-group metadata attached to an element.
 *
 * Prefers the WeakMap but falls back to a legacy `._transitionGroup` property
 * if present.
 *
 * @internal
 */
export function getElementTransition(
  el: Element | null | undefined,
): TransitionMetadata | undefined {
  if (!el) return undefined;
  const wm = elementTransitionMap.get(el);
  if (wm !== undefined) return wm;
  try {
    const elWithTransition = el as { _transitionGroup?: unknown };
    if (elWithTransition && elWithTransition._transitionGroup != null)
      return elWithTransition._transitionGroup as TransitionMetadata;
  } catch {
    void 0;
  }
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
export function setElementTransition(
  el: Element,
  value: TransitionMetadata,
): void {
  try {
    elementTransitionMap.set(el, value);
  } catch {
    void 0;
  }
  try {
    (el as { _transitionGroup?: unknown })._transitionGroup = value;
  } catch {
    void 0;
  }
}

export default {
  getNodeKey,
  setNodeKey,
  getElementTransition,
  setElementTransition,
};
