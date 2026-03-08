/**
 * vdom-helpers.ts
 *
 * Private utility functions and shared internal types for the virtual DOM.
 * These are consumed by vdom-directives.ts and vdom-patch.ts.
 * Keeping them here avoids circular imports and enables tree-shaking.
 *
 * Public API (for use by vdom-patch / vdom-directives only):
 *   hasValueProp       — structural check: object has a `.value` property
 *   unwrapValue        — unwrap reactive / wrapper objects to their inner value
 *   writebackAttr      — mutate oldProps.attrs[key] to track applied values
 *   isNativeControl    — true for input / select / textarea / button elements
 *   coerceBooleanForNative — coerce a value to boolean for native attributes
 *   eventNameFromKey   — "onClick" → "click", "onUpdate:name" → "update:name"
 *   isBooleanishForProps — true when val is a clear boolean-ish primitive
 */

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

/** A loose map of property names to arbitrary values used throughout the VDOM. */
export type PropsMap = Record<string, unknown>;

/**
 * Directive specification as produced by the template compiler and consumed
 * by `processDirectives`.
 */
export interface DirectiveSpec {
  value: unknown;
  modifiers: string[];
  arg?: string;
}

/**
 * The `props` bag attached to a VNode. Used as the parameter / return type
 * for patchProps, createElement, and VNode diffing helpers.
 */
export interface VNodePropBag {
  key?: string;
  props?: Record<string, unknown>;
  attrs?: Record<string, unknown>;
  directives?: Record<string, DirectiveSpec>;
  ref?: string;
  reactiveRef?: { value: unknown; [key: string]: unknown };
  /** Compiler-provided hint: whether this VNode represents a custom element. */
  isCustomElement?: boolean;
  /** Transition group metadata forwarded from `<Transition>`. */
  _transitionGroup?: {
    name?: string;
    appear?: boolean;
    mode?: 'out-in' | 'in-out' | 'default';
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Extension of `globalThis` used exclusively for internal VDom test-env probes
 * and debug diagnostics. Never rely on these properties in production code.
 */
export interface VDomGlobal {
  process?: { env?: { NODE_ENV?: string } };
  __vitest__?: unknown;
  __VDOM_DISABLED_PROMOTIONS?: unknown[];
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/**
 * Returns `true` when `val` is an object that exposes a `.value` property.
 * This is a structural (duck-type) check used in the VDOM prop-diffing loop
 * to detect value-wrapper objects that are *not* identified as ReactiveState
 * by `isReactiveState()` (e.g. plain `{ value: 42 }` bags).
 *
 * Note: ReactiveState instances also satisfy this check; callers should test
 * `isReactiveState(val)` first and only fall through to `hasValueProp` for the
 * non-reactive wrapper case.
 */
export function hasValueProp(val: unknown): boolean {
  return (
    val !== null &&
    val !== undefined &&
    typeof val === 'object' &&
    'value' in val
  );
}

/**
 * Unwrap a reactive-state or value-wrapper object to its inner value.
 * If `val` is an object with a `.value` property the inner value is returned;
 * otherwise `val` is returned as-is (including primitives, null, undefined).
 *
 * @example
 * unwrapValue(ref(42))  // → 42
 * unwrapValue({ value: 'hello' })  // → 'hello'
 * unwrapValue('plain')  // → 'plain'
 */
export function unwrapValue(val: unknown): unknown {
  if (
    val !== null &&
    val !== undefined &&
    typeof val === 'object' &&
    'value' in val
  ) {
    return (val as { value: unknown }).value;
  }
  return val;
}

/**
 * Write `val` back into `oldProps.attrs[key]` so that subsequent diff passes
 * see the most recently applied attribute value without re-reading the DOM.
 *
 * When `val` is `undefined` the entry is *deleted* from `oldProps.attrs`
 * (attribute was removed).
 *
 * Accepts `undefined` for `oldProps` to simplify call sites where the props
 * bag may not have been initialised yet (e.g. `createElement` paths).
 */
export function writebackAttr(
  oldProps: VNodePropBag | undefined,
  key: string,
  val: unknown,
): void {
  if (!oldProps) return;
  if (!oldProps.attrs) oldProps.attrs = {};
  const attrs = oldProps.attrs as Record<string, unknown>;
  // Always assign (including `undefined`) so that `hasOwnProperty` checks
  // can detect that the key was explicitly cleared versus never written.
  attrs[key] = val;
}

/**
 * Returns `true` when `el` is a native form control (input, select, textarea,
 * or button). Used to gate attribute/property coercion logic that only applies
 * to native control elements.
 */
export function isNativeControl(el: Element): boolean {
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLSelectElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLButtonElement
  );
}

/**
 * Coerce `val` to a boolean for use with native element `.disabled` (and other
 * boolean HTML attributes). Handles reactive/wrapper unwrapping, the string
 * literals `'true'`/`'false'`, and falsy zero/empty-string values.
 */
export function coerceBooleanForNative(val: unknown): boolean {
  // Unwrap reactive / wrapper objects (those with a `.value` property) and recurse.
  if (
    val !== null &&
    val !== undefined &&
    typeof val === 'object' &&
    'value' in val
  ) {
    return coerceBooleanForNative((val as { value: unknown }).value);
  }
  // Arbitrary objects without a `.value` property: do not coerce as truthy.
  // e.g. `{ some: 'object' }` should NOT enable disabled.
  if (val !== null && val !== undefined && typeof val === 'object')
    return false;
  // Explicit false values.
  if (
    val === false ||
    val === 'false' ||
    val === null ||
    val === undefined ||
    val === 0
  )
    return false;
  // All remaining values are truthy.
  // Note: empty string `''` is truthy here — HTML boolean attribute presence
  // semantics: `<input disabled="">` means disabled IS set.
  return true;
}

/**
 * Convert an `onXxx` prop key to the corresponding DOM event name.
 *
 * @example
 * eventNameFromKey('onClick')      // → 'click'
 * eventNameFromKey('onMouseOver')  // → 'mouseOver'  (EventManager normalises case)
 * eventNameFromKey('onUpdate:name') // → 'update:name'
 */
export function eventNameFromKey(key: string): string {
  // Remove the leading "on" prefix and lowercase the very first character of
  // the remainder so that "onClick" → "click" and "onUpdate:x" → "update:x".
  return key.substring(2, 3).toLowerCase() + key.substring(3);
}

/**
 * Returns `true` when `val` is a clear boolean-ish primitive — i.e. one of
 * `true`, `false`, `'true'`, or `'false'`. Used to decide whether a `:bind`
 * prop candidate should be treated as the authoritative source for a native
 * `disabled` attribute rather than falling back to the merged attrs value.
 */
export function isBooleanishForProps(val: unknown): boolean {
  return typeof val === 'boolean' || val === 'true' || val === 'false';
}
