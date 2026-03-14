/**
 * vdom-patch.ts
 *
 * Core virtual DOM patching and rendering engine. Provides:
 * - `cleanupRefs`    — recursively remove event listeners and clear ref entries
 * - `assignKeysDeep` — recursively assign stable keys to VNode trees
 * - `patchProps`     — diff and apply prop/attr/directive changes to a DOM element
 * - `createElement`  — create a new DOM element from a VNode descriptor
 * - `patchChildren`  — reconcile a list of child VNodes against real DOM children
 * - `patch`          — top-level diff/patch driver for a single VNode
 * - `vdomRenderer`   — entry-point renderer for a shadow root or container
 */

import type { VNode, VDomRefs, AnchorBlockVNode } from './types';
import { toCamel, safe, safeSerializeAttr, isClassLikeAttr } from './helpers';
import {
  setAttributeSmart,
  removeAttributeSmart,
  TAG_NAMESPACE_MAP,
  SVG_NS,
} from './namespace-helpers';
import { EventManager } from './event-manager';
import { isReactiveState } from './reactive';
import {
  performEnterTransition,
  performLeaveTransition,
} from './transition-utils';
import { devError } from './logger';
import {
  getNodeKey,
  setNodeKey,
  getElementTransition,
  setElementTransition,
  type TransitionMetadata,
} from './node-metadata';
import {
  hasValueProp,
  unwrapValue,
  writebackAttr,
  isNativeControl,
  coerceBooleanForNative,
  eventNameFromKey,
  isBooleanishForProps,
  type PropsMap,
  type DirectiveSpec,
  type VNodePropBag,
} from './vdom-helpers';
import { processDirectives } from './vdom-directives';

/** @internal Minimal transition metadata alias used by the renderer. */
type Transition = TransitionMetadata;

export function cleanupRefs(node: Node, refs?: VDomRefs) {
  if (!refs) return;

  // Optimized cleanup with early returns and better memory management
  if (node instanceof Element) {
    // Clean up event listeners for this element
    EventManager.cleanup(node);

    // Clean up refs more efficiently
    const keysToDelete: string[] = [];
    for (const refKey in refs) {
      if (refs[refKey] === node) {
        keysToDelete.push(refKey);
      }
    }

    // Batch delete refs to avoid repeated object restructuring
    for (const key of keysToDelete) {
      delete refs[key];
    }
  }

  // Clean up child nodes with better iteration
  if (node.hasChildNodes()) {
    const children = node.childNodes;
    for (let i = children.length - 1; i >= 0; i--) {
      cleanupRefs(children[i], refs);
    }
  }
}

/**
 * Assign a ref to an element, supporting both string refs and reactive state objects
 */
function assignRef(vnode: VNode, element: Element, refs?: VDomRefs): void {
  if (typeof vnode === 'string') return;

  const reactiveRef =
    vnode.props?.reactiveRef ??
    (vnode.props?.props && vnode.props.props.reactiveRef);
  const refKey =
    vnode.props?.ref ?? (vnode.props?.props && vnode.props.props.ref);

  if (reactiveRef) {
    // For reactive state objects, assign the element to the .value property when possible.
    // Support both ReactiveState detection and plain objects with a `value` property.
    try {
      if (
        isReactiveState(reactiveRef) ||
        (typeof reactiveRef === 'object' && 'value' in reactiveRef)
      ) {
        (reactiveRef as { value: Element | null }).value = element;
      } else if (typeof reactiveRef === 'function') {
        // support callback refs
        (reactiveRef as unknown as (el: Element) => void)(element);
      } else if (typeof reactiveRef === 'string' && refs) {
        // string-style ref passed directly in reactiveRef slot
        try {
          const rk = String(reactiveRef);
          (refs as Record<string, Element | null>)[rk] = element;
        } catch {
          // ignore invalid ref assignments
        }
      }
    } catch {
      // ignore invalid ref assignments
    }
  } else if (refKey && refs) {
    // Legacy string-based ref - ensure string key and typed index access
    try {
      const rk = String(refKey);
      (refs as Record<string, Element | null>)[rk] = element;
    } catch {
      // ignore invalid ref assignments
    }
  }
}

/**
 * Assign unique keys to VNodes for efficient rendering
 * @param nodeOrNodes
 * @param baseKey
 * @returns
 */

export function assignKeysDeep(
  nodeOrNodes: VNode | VNode[],
  baseKey: string,
): VNode | VNode[] {
  if (Array.isArray(nodeOrNodes)) {
    const usedKeys = new Set<string>();
    // Per-base-key counters so uniqueness search is O(1) instead of O(n).
    const keyCounters = new Map<string, number>();

    return nodeOrNodes.map((child) => {
      if (!child || typeof child !== 'object') return child;

      // Determine the starting key
      let key = child.props?.key ?? child.key;

      if (!key) {
        // Build a stable identity from tag + stable attributes
        const tagPart = child.tag || 'node';
        // Look for stable identity attributes in both attrs and promoted
        // props (props.props) because the compiler may have promoted bound
        // attributes to JS properties for custom elements and converted
        // kebab-case to camelCase (e.g. data-key -> dataKey).
        const idAttrCandidates = [
          // attrs (kebab-case)
          child.props?.attrs?.id,
          child.props?.attrs?.name,
          child.props?.attrs?.['data-key'],
          // promoted JS props (camelCase or original)
          child.props?.props?.id,
          child.props?.props?.name,
          child.props?.props?.dataKey,
          child.props?.props?.['data-key'],
        ];
        const idPart =
          idAttrCandidates.find((v) => v !== undefined && v !== null) ?? '';
        key = idPart
          ? `${baseKey}:${tagPart}:${idPart}`
          : `${baseKey}:${tagPart}`;
      }

      // Ensure uniqueness among siblings using a per-base-key counter (O(1)).
      let uniqueKey = key as string;
      if (usedKeys.has(uniqueKey)) {
        const next = (keyCounters.get(uniqueKey) ?? 1) + 1;
        keyCounters.set(uniqueKey, next);
        uniqueKey = `${key}#${next}`;
      }
      keyCounters.set(key as string, (keyCounters.get(key as string) ?? 0) + 1);
      usedKeys.add(uniqueKey);

      // Recurse into children with this node's unique key
      let children = child.children;
      if (Array.isArray(children)) {
        children = assignKeysDeep(children, uniqueKey) as VNode[];
      }

      return { ...child, key: uniqueKey, children };
    });
  }

  // Single node case
  const node = nodeOrNodes as VNode;
  const key = node.props?.key ?? node.key ?? baseKey;

  let children = node.children;
  if (Array.isArray(children)) {
    children = assignKeysDeep(children, key) as VNode[];
  }

  return { ...node, key, children };
}

/**
 * Patch props on an element.
 * Only update changed props, remove old, add new.
 * @param el
 * @param oldProps
 * @param newProps
 * @param context
 */
export function patchProps(
  el: HTMLElement,
  oldProps: VNodePropBag,
  newProps: VNodePropBag,
  context?: Record<string, unknown>,
) {
  // Process directives first
  const newDirectives =
    (newProps.directives as Record<string, DirectiveSpec> | undefined) ?? {};

  // Create a shallow copy of attrs to prevent mutations from affecting
  // the cached vnode. This is critical because vnodes are cached and reused
  // across renders, and writebackAttr mutates oldProps.attrs which can
  // pollute the cache if oldProps and the cached vnode share references.
  const newPropsAttrsCopy = newProps.attrs ? { ...newProps.attrs } : {};

  const processedDirectives = processDirectives(
    newDirectives,
    context,
    el,
    newPropsAttrsCopy,
  );

  // Merge processed directive results with existing props/attrs.
  // NOTE: Do NOT include oldProps.attrs in mergedAttrs — it is the "new"
  // side of the diff and must only carry the incoming new attrs plus any
  // directive-generated overrides. Including old attrs here would prevent
  // previously-set attributes from ever being removed (e.g. name="fallback"
  // on a <slot> after an error-boundary resets to its clean state).
  const mergedProps: PropsMap = {
    ...((oldProps.props as PropsMap) || {}),
    ...((newProps.props as PropsMap) || {}),
    ...(processedDirectives.props || {}),
  };
  const mergedAttrs: PropsMap = {
    ...(newPropsAttrsCopy || {}),
    ...(processedDirectives.attrs || {}),
  };

  const oldPropProps = (oldProps.props as PropsMap) ?? {};
  const newPropProps = mergedProps;
  // Detect whether this vnode represents a custom element so we can
  // trigger its internal prop application lifecycle after patching.
  const elIsCustom = Boolean(
    newProps?.isCustomElement ?? oldProps?.isCustomElement ?? false,
  );
  let anyChange = false;
  // Collect keys from both old and new without allocating a merged object.
  const visitedPropKeys = new Set<string>();
  for (const k in oldPropProps) visitedPropKeys.add(k);
  for (const k in newPropProps) visitedPropKeys.add(k);
  for (const key of visitedPropKeys) {
    const oldVal = oldPropProps[key];
    const newVal = newPropProps[key];

    // For reactive wrapper objects (ReactiveState or { value }), compare
    // their unwrapped inner values so updates trigger even when the
    // wrapper identity stays the same across renders.
    let oldUnwrapped: unknown = oldVal;
    let newUnwrapped: unknown = newVal;
    safe(() => {
      if (isReactiveState(oldVal))
        oldUnwrapped = (oldVal as { value: unknown }).value;
      else if (hasValueProp(oldVal))
        oldUnwrapped = (oldVal as { value: unknown }).value;
    });
    safe(() => {
      if (isReactiveState(newVal))
        newUnwrapped = (newVal as { value: unknown }).value;
      else if (hasValueProp(newVal))
        newUnwrapped = (newVal as { value: unknown }).value;
    });

    // Consider changed when either the wrapper identity changed or the
    // inner unwrapped value changed.
    if (oldVal !== newVal && oldUnwrapped === newUnwrapped) {
      // wrapper identity changed but inner value same -> still treat as change
    }

    if (!(oldVal === newVal && oldUnwrapped === newUnwrapped)) {
      anyChange = true;
      if (
        key === 'value' &&
        (el instanceof HTMLInputElement ||
          el instanceof HTMLTextAreaElement ||
          el instanceof HTMLSelectElement)
      ) {
        // Unwrap reactive-like wrappers before assigning to .value
        const unwrapped = unwrapValue(newVal);
        const coerced =
          unwrapped === undefined || unwrapped === null
            ? ''
            : String(unwrapped);
        if (el.value !== coerced) el.value = coerced;
      } else if (key === 'checked' && el instanceof HTMLInputElement) {
        const unwrapped = unwrapValue(newVal);
        el.checked = !!unwrapped;
      } else if (key.startsWith('on') && typeof newVal === 'function') {
        // DOM-first listener: onClick -> click
        const ev = eventNameFromKey(key);
        if (typeof oldVal === 'function') {
          EventManager.removeListener(el, ev, oldVal as EventListener);
        }
        if (typeof newVal === 'function') {
          EventManager.addListener(el, ev, newVal as EventListener);
        }
        // If this is an update:* handler for a bound object prop, also
        // register nested update:<field> listeners that call the same
        // handler with a shallow-copied object so compiled handlers that
        // expect the full object will work with child-emitted nested events.
        try {
          if (ev && ev.startsWith('update:')) {
            const propName = ev.split(':', 2)[1];
            const propVal = newPropProps[propName] as unknown;
            // Determine nested keys robustly: if propVal is a ReactiveState,
            // inspect its .value, otherwise inspect the object itself.
            let candidateKeys: string[] = [];
            try {
              if (isReactiveState(propVal)) {
                const v = (propVal as { value?: unknown }).value;
                candidateKeys =
                  v && typeof v === 'object' ? Object.keys(v) : [];
              } else if (propVal && typeof propVal === 'object') {
                candidateKeys = Object.keys(propVal as Record<string, unknown>);
              }
            } catch {
              candidateKeys = [];
            }
            // Filter out internal keys
            const userKeys = candidateKeys.filter(
              (k) =>
                typeof k === 'string' &&
                !k.startsWith('_') &&
                k !== 'constructor',
            );
            for (const nestedKey of userKeys) {
              const nestedEvent = `update:${nestedKey}`;
              const nestedHandler = (e: Event) => {
                const nestedNew =
                  (e as CustomEvent).detail !== undefined
                    ? (e as CustomEvent).detail
                    : e.target instanceof HTMLInputElement ||
                        e.target instanceof HTMLTextAreaElement ||
                        e.target instanceof HTMLSelectElement
                      ? (
                          e.target as
                            | HTMLInputElement
                            | HTMLTextAreaElement
                            | HTMLSelectElement
                        ).value
                      : undefined;
                const current = isReactiveState(propVal)
                  ? ((propVal as { value?: unknown }).value as Record<
                      string,
                      unknown
                    >) || {}
                  : (newPropProps[propName] as Record<string, unknown>) || {};
                const updated = { ...current, [nestedKey]: nestedNew };
                try {
                  if (typeof newVal === 'function') {
                    (newVal as (...args: unknown[]) => unknown)({
                      detail: updated,
                    } as unknown);
                  }
                } catch {
                  void 0;
                }
              };
              safe(() => {
                EventManager.addListener(el, nestedEvent, nestedHandler);
              });
            }
          }
        } catch {
          /* ignore */
        }
      } else if (newVal === undefined || newVal === null) {
        removeAttributeSmart(el as Element, key);
      } else {
        // Prefer setting DOM properties for custom elements or when the
        // property already exists on the element so that JS properties are
        // updated (important for custom elements that observe property changes).
        // Prefer property assignment for elements that are custom elements or
        // when the property exists on the element. This avoids attribute
        // fallbacks being used for reactive properties on custom elements.
        // Rely only on compiler/runtime-provided hint. Do not perform implicit
        // dash-based heuristics here: callers/tests should set isCustomElement on
        // the vnode props when a tag is a custom element.
        const elIsCustom =
          newProps?.isCustomElement ?? oldProps?.isCustomElement ?? false;
        if (elIsCustom || key in el) {
          try {
            (el as unknown as Record<string, unknown>)[key] = newVal;
            // For native form controls, also remove the disabled attribute when setting disabled=false
            // The browser doesn't automatically sync the attribute when the property changes
            if (
              key === 'disabled' &&
              newVal === false &&
              !elIsCustom &&
              isNativeControl(el)
            ) {
              removeAttributeSmart(el as Element, 'disabled');
            }
          } catch {
            // Enforce property-only binding: skip silently on failure.
          }
        } else {
          // Handle boolean false by removing attribute for non-custom elements
          if (newVal === false) {
            removeAttributeSmart(el as Element, key);
          } else {
            // Property does not exist; skip silently.
          }
        }
      }
    }
  }

  // Handle directive event listeners
  for (const [eventType, listener] of Object.entries(
    processedDirectives.listeners || {},
  )) {
    EventManager.addListener(el, eventType, listener as EventListener);
  }

  // Use a copy of oldProps.attrs as the authoritative prior-state for
  // attribute diffs. We intentionally removed the live-DOM snapshot
  // fallback here and instead rely on writeback into `oldProps.attrs`
  // at the moment the runtime mutates the DOM. Reading the live DOM can
  // capture transient animation classes and lead to incorrect removals.
  // If writeback is correctly applied on all mutation paths, this
  // snapshot is unnecessary and harmful; keep it simple and avoid DOM
  // reads for class/style detection.
  //
  // EXCEPTION: When a :class or :style directive is present, we MUST
  // read the actual DOM value to ensure we have the current merged state,
  // because the writeback system may not be reliable when vnodes are
  // cached and reused across renders.
  const oldAttrs = { ...(oldProps.attrs ?? {}) } as Record<string, unknown>;
  const newAttrs = mergedAttrs;

  // If a :class directive exists, read the actual DOM class to ensure
  // we have the current state for comparison
  const pdAttrs = (processedDirectives && processedDirectives.attrs) || {};
  if (
    Object.prototype.hasOwnProperty.call(pdAttrs, 'class') &&
    typeof el.getAttribute === 'function'
  ) {
    const actual = el.getAttribute('class');
    if (actual !== null) {
      oldAttrs['class'] = actual;
    }
  }
  if (
    Object.prototype.hasOwnProperty.call(pdAttrs, 'style') &&
    typeof el.getAttribute === 'function'
  ) {
    const actual = el.getAttribute('style');
    if (actual !== null) {
      oldAttrs['style'] = actual;
    }
  }

  // Narrow fallback: if a directive explicitly attempted to clear the
  // `class` or `style` attribute (processedDirectives set it to
  // `undefined`) we need to consult the live DOM to detect whether the
  // attribute actually exists on the element so we can remove it.
  // This is intentionally narrow: we only read the DOM when a directive
  // signalled intent to remove the attribute, which matches the prior
  // behavior but avoids broad DOM reads that interfere with transitions.
  try {
    if (
      Object.prototype.hasOwnProperty.call(pdAttrs, 'class') &&
      pdAttrs['class'] === undefined &&
      typeof el.getAttribute === 'function'
    ) {
      const actual = el.getAttribute('class');
      if (actual !== null) oldAttrs['class'] = actual;
    }
    if (
      Object.prototype.hasOwnProperty.call(pdAttrs, 'style') &&
      pdAttrs['style'] === undefined &&
      typeof el.getAttribute === 'function'
    ) {
      const actual = el.getAttribute('style');
      if (actual !== null) oldAttrs['style'] = actual;
    }
    // Narrow sync: if the real DOM class attribute differs from the
    // vnode-recorded attrs (oldProps.attrs), prefer the real DOM value so
    // we detect cases where prior DOM mutations weren't persisted to the
    // vnode bag. This only applies to native text inputs and only when
    // a discrepancy is observed to avoid removing transient animation
    // classes unnecessarily.
    try {
      if (typeof el.getAttribute === 'function') {
        const actualClass = el.getAttribute('class');
        try {
          if (
            el instanceof HTMLInputElement &&
            (el as HTMLInputElement).type === 'text' &&
            actualClass !== null &&
            actualClass !== oldAttrs['class']
          ) {
            oldAttrs['class'] = actualClass;
          }
        } catch {
          /* ignore */
        }
      }
    } catch {
      void 0;
    }
  } catch {
    void 0;
  }
  for (const key in { ...oldAttrs, ...newAttrs }) {
    const oldVal = oldAttrs[key];
    const newVal = newAttrs[key];

    // For reactive state objects, compare the unwrapped values
    let oldUnwrapped = oldVal;
    let newUnwrapped = newVal;

    if (isReactiveState(oldVal)) {
      oldUnwrapped = (oldVal as { value?: unknown }).value; // This triggers dependency tracking
    }
    if (isReactiveState(newVal)) {
      newUnwrapped = (newVal as { value?: unknown }).value; // This triggers dependency tracking
    }

    if (oldUnwrapped !== newUnwrapped) {
      anyChange = true;
      // Handle removal/null/false: remove attribute and clear corresponding
      // DOM property for native controls where Vue treats null/undefined as ''
      if (
        newUnwrapped === undefined ||
        newUnwrapped === null ||
        newUnwrapped === false
      ) {
        safe(() => {
          removeAttributeSmart(el as Element, key);
        });
        writebackAttr(oldProps, key, undefined);

        // Clear value for native controls when value is removed
        if (key === 'value') {
          if (
            el instanceof HTMLInputElement ||
            el instanceof HTMLTextAreaElement
          ) {
            safe(() => {
              el.value = '';
            });
          } else if (el instanceof HTMLSelectElement) {
            safe(() => {
              el.value = '';
            });
          } else if (el instanceof HTMLProgressElement) {
            safe(() => {
              (el as HTMLProgressElement).value = 0;
            });
          }
        }

        // Clear checked for checkbox/radio
        if (key === 'checked' && el instanceof HTMLInputElement) {
          safe(() => {
            el.checked = false;
          });
        }

        // Ensure disabled property is unset for native controls
        if (key === 'disabled' && isNativeControl(el)) {
          safe(() => {
            if (el instanceof HTMLInputElement)
              (el as HTMLInputElement).disabled = false;
            else if (el instanceof HTMLSelectElement)
              (el as HTMLSelectElement).disabled = false;
            else if (el instanceof HTMLTextAreaElement)
              (el as HTMLTextAreaElement).disabled = false;
            else if (el instanceof HTMLButtonElement)
              (el as HTMLButtonElement).disabled = false;
          });
        }
      } else {
        // New value present: for native controls prefer assigning .value/.checked
        if (key === 'value') {
          if (
            el instanceof HTMLInputElement ||
            el instanceof HTMLTextAreaElement
          ) {
            safe(() => {
              el.value = (newUnwrapped as string) ?? '';
            });
            continue;
          } else if (el instanceof HTMLSelectElement) {
            safe(() => {
              el.value = (newUnwrapped as string) ?? '';
            });
            continue;
          } else if (el instanceof HTMLProgressElement) {
            safe(() => {
              (el as HTMLProgressElement).value = Number(newUnwrapped);
            });
            continue;
          }
        }
        if (key === 'checked' && el instanceof HTMLInputElement) {
          safe(() => {
            el.checked = !!newUnwrapped;
          });
          continue;
        }

        // Special handling for style attribute - always use setAttribute
        if (key === 'style') {
          const serialized = safeSerializeAttr(newUnwrapped);
          if (serialized !== null)
            setAttributeSmart(el as Element, key, String(serialized));
          writebackAttr(oldProps, key, newUnwrapped as unknown);
          continue;
        }

        // Special handling for class attribute - always use setAttribute so
        // vnode.attrs stays authoritative and we keep oldProps.attrs in sync
        if (key === 'class') {
          const serialized = safeSerializeAttr(newUnwrapped);
          if (serialized !== null)
            setAttributeSmart(el as Element, key, String(serialized));
          writebackAttr(oldProps, key, newUnwrapped as unknown);
          continue;
        }

        // Defensive handling for disabled when a new value is present
        if (key === 'disabled' && isNativeControl(el)) {
          safe(() => {
            const final = coerceBooleanForNative(newUnwrapped);
            if (el instanceof HTMLInputElement)
              (el as HTMLInputElement).disabled = final;
            else if (el instanceof HTMLSelectElement)
              (el as HTMLSelectElement).disabled = final;
            else if (el instanceof HTMLTextAreaElement)
              (el as HTMLTextAreaElement).disabled = final;
            else if (el instanceof HTMLButtonElement)
              (el as HTMLButtonElement).disabled = final;
          });
          if (!coerceBooleanForNative(newUnwrapped))
            safe(() => {
              removeAttributeSmart(el as Element, key);
            });
          else
            safe(() => {
              setAttributeSmart(el as Element, key, '');
            });
          continue;
        }

        // Non-native or generic attributes: prefer property when available
        const isSVG =
          (el as Element).namespaceURI === 'http://www.w3.org/2000/svg';

        // For custom elements, convert kebab-case attributes to camelCase properties
        // and prefer assigning ReactiveState instances directly to element
        // properties so child components that call useProps receive the
        // live ReactiveState (with .value) instead of a stale plain object.
        // However, preserve kebab-case class-like attributes (ending with
        // `-class`) as attributes so they remain visible in serialized
        // HTML (important for JIT CSS extraction). Only non-class-like
        // kebab attributes are promoted to camelCase props.
        if (elIsCustom && !isSVG && key.includes('-')) {
          // For custom elements, prefer promoting kebab attributes to properties
          // except for class-like attributes which should remain attributes
          // for reliable HTML serialization. Use helpers to ensure safe string
          // serialization.
          if (isClassLikeAttr(key)) {
            const serialized = safeSerializeAttr(newVal ?? newUnwrapped);
            if (serialized !== null) {
              try {
                setAttributeSmart(el as Element, key, String(serialized));
              } catch {
                /* best-effort */
              }
              writebackAttr(oldProps, key, newUnwrapped as unknown);
            }
          } else {
            const camelKey = toCamel(key);
            try {
              const hostObj = el as unknown as Record<string, unknown>;
              hostObj[camelKey] = isReactiveState(newVal)
                ? (newVal as unknown)
                : newUnwrapped;
              // Write back into vnode oldProps.attrs so future diffs see the
              // authoritative value. This prevents cases where a property
              // assignment updates the element but the vnode bag remains stale.
              writebackAttr(oldProps, key, newUnwrapped as unknown);
            } catch {
              // If property assignment fails, fall back to attribute
              const serialized = safeSerializeAttr(newVal ?? newUnwrapped);
              if (serialized !== null)
                setAttributeSmart(el as Element, key, String(serialized));
            }
          }
        } else if (!isSVG && key in el) {
          try {
            const hostObj = el as unknown as Record<string, unknown>;
            hostObj[key] = isReactiveState(newVal)
              ? (newVal as unknown)
              : newUnwrapped;
            // Write back into vnode attrs after successful property assignment
            writebackAttr(oldProps, key, newUnwrapped as unknown);
          } catch {
            const serialized = safeSerializeAttr(newUnwrapped);
            if (serialized !== null) {
              setAttributeSmart(el as Element, key, String(serialized));
              writebackAttr(oldProps, key, newUnwrapped as unknown);
            }
          }
        } else {
          const serialized = safeSerializeAttr(newUnwrapped);
          if (serialized !== null) {
            setAttributeSmart(el as Element, key, String(serialized));
            writebackAttr(oldProps, key, newUnwrapped as unknown);
          }
        }
      }
    }
  }

  // If this is a custom element, attempt to notify it that props/attrs
  // were updated so it can re-run its internal applyProps logic and
  // schedule a render. This mirrors the behavior in createElement where
  // newly created custom elements are told to apply props and render.
  // Defensive: ensure native disabled property matches the intended source
  try {
    if (isNativeControl(el)) {
      const propCandidate = (mergedProps as PropsMap)['disabled'];
      // Only treat the propCandidate as the authoritative source when it's
      // a clear boolean-ish primitive or a reactive/wrapper we can unwrap.
      // Otherwise fallback to mergedAttrs to avoid arbitrary objects (proxies,
      // wrapper containers) from being treated as truthy and disabling native
      // controls.
      let sourceVal: unknown;
      try {
        // If the disabled was provided via a directive (processedDirectives)
        // or is a reactive/wrapper value we can safely prefer the prop.
        // Also accept clear boolean-ish primitive prop values as authoritative
        // so native inputs receive intended boolean state. Otherwise prefer
        // the attribute source to avoid arbitrary objects (proxies, wrapper
        // containers) from being treated as truthy and disabling native
        // controls.
        const hasDisabledInProcessed = Object.prototype.hasOwnProperty.call(
          processedDirectives.props || {},
          'disabled',
        );
        const isWrapper =
          propCandidate &&
          typeof propCandidate === 'object' &&
          'value' in propCandidate;
        let isReactive = false;
        safe(() => {
          isReactive = !!isReactiveState(propCandidate);
        });
        const isBooleanish = isBooleanishForProps(propCandidate);
        if (isReactive || isWrapper || hasDisabledInProcessed || isBooleanish) {
          sourceVal = propCandidate;
        } else {
          sourceVal = (mergedAttrs as PropsMap)['disabled'];
        }
      } catch {
        sourceVal = (mergedAttrs as PropsMap)['disabled'];
      }
      const finalDisabled = coerceBooleanForNative(sourceVal);
      safe(() => {
        if (el instanceof HTMLInputElement)
          (el as HTMLInputElement).disabled = finalDisabled;
        else if (el instanceof HTMLSelectElement)
          (el as HTMLSelectElement).disabled = finalDisabled;
        else if (el instanceof HTMLTextAreaElement)
          (el as HTMLTextAreaElement).disabled = finalDisabled;
        else if (el instanceof HTMLButtonElement)
          (el as HTMLButtonElement).disabled = finalDisabled;
      });
      if (finalDisabled) {
        safe(() => {
          setAttributeSmart(el as Element, 'disabled', '');
        });
      } else {
        safe(() => {
          removeAttributeSmart(el as Element, 'disabled');
        });
      }
    }
  } catch {
    void 0;
  }

  if (elIsCustom && anyChange) {
    const maybeEl = el as unknown as {
      _applyProps?: (cfg?: unknown) => void;
      _cfg?: unknown;
      requestRender?: () => void;
      _render?: (cfg?: unknown) => void;
    };
    safe(() => {
      maybeEl._applyProps?.(maybeEl._cfg);
    });
    safe(() => {
      if (typeof maybeEl.requestRender === 'function') maybeEl.requestRender();
      else if (typeof maybeEl._render === 'function')
        maybeEl._render?.(maybeEl._cfg);
    });
  }
}

/**
 * Create a DOM element from a VNode.
 * @param vnode
 * @param context
 * @param refs
 * @returns
 */
export function createElement(
  vnode: VNode | string,
  context?: Record<string, unknown>,
  refs?: VDomRefs,
  // Parent namespace (e.g. SVG_NS) or null for HTML. Propagated from parent → child.
  parentNamespace: string | null = null,
): Node {
  // String VNode → plain text node (no key)
  if (typeof vnode === 'string') {
    return document.createTextNode(vnode);
  }

  // Text VNode
  if (vnode.tag === '#text') {
    const textNode = document.createTextNode(
      typeof vnode.children === 'string' ? vnode.children : '',
    );
    if (vnode.key != null) setNodeKey(textNode, vnode.key); // attach key
    return textNode;
  }

  // Raw HTML vnode - insert provided HTML as nodes (unsafe: caller must opt-in)
  if (vnode.tag === '#raw') {
    const html = typeof vnode.children === 'string' ? vnode.children : '';
    const range = document.createRange();
    // createContextualFragment is broadly supported and safe when used with
    // controlled input. We intentionally call it for opt-in raw HTML insertion.
    const frag = range.createContextualFragment(html);
    return frag;
  }

  // Anchor block VNode - ALWAYS create start/end boundaries
  if (vnode.tag === '#anchor') {
    const anchorVNode = vnode as AnchorBlockVNode;
    const children = Array.isArray(anchorVNode.children)
      ? anchorVNode.children
      : [];

    // Always create start/end markers for stable boundaries
    const start = document.createTextNode('');
    const end = document.createTextNode('');

    if (anchorVNode.key != null) {
      setNodeKey(start, `${anchorVNode.key}:start`);
      setNodeKey(end, `${anchorVNode.key}:end`);
    }
    anchorVNode._startNode = start;
    anchorVNode._endNode = end;

    const frag = document.createDocumentFragment();
    frag.appendChild(start);

    for (const child of children) {
      const childNode = createElement(
        child,
        context,
        refs,
        // propagate parent namespace (was previously a boolean)
        parentNamespace,
      );
      // Propagate anchor block's key to child elements ONLY if child doesn't have its own key
      // This allows keyed lists (each()) to preserve their own keys
      if (
        anchorVNode.key != null &&
        childNode instanceof Element &&
        !childNode.hasAttribute('data-anchor-key')
      ) {
        const childVNode = child as VNode;
        const childHasOwnKey =
          childVNode &&
          typeof childVNode === 'object' &&
          childVNode.key != null;

        if (!childHasOwnKey) {
          setNodeKey(childNode, String(anchorVNode.key));
        }
      }
      frag.appendChild(childNode);
    }
    frag.appendChild(end);
    return frag;
  }

  // Standard element VNode
  // Respect an explicit xmlns attribute on the VNode (don't overwrite it).
  // Peek at vnode.attrs if provided so we can create the element in the
  // correct namespace up-front (before processing props/attrs below).
  const vnodeAttrs =
    vnode &&
    typeof vnode === 'object' &&
    vnode.props &&
    (vnode.props as VNodePropBag).attrs
      ? (vnode.props as VNodePropBag).attrs
      : (undefined as unknown as PropsMap | undefined);

  const declaredNS =
    vnodeAttrs && typeof vnodeAttrs['xmlns'] === 'string'
      ? String(vnodeAttrs['xmlns'])
      : undefined;

  // Decide namespace to use when creating the element (priority):
  // 1. If an explicit `xmlns` is provided on the vnode, use that.
  // 2. If parentNamespace is present, inherit that namespace.
  // 3. If the tag is a well-known namespaced tag (svg, math), use its namespace.
  // 4. Otherwise create a regular HTML element (null namespace -> createElement).
  const nsToUse =
    declaredNS ?? parentNamespace ?? TAG_NAMESPACE_MAP[vnode.tag] ?? null;

  // Create element in the appropriate namespace. For TypeScript compatibility
  // with existing APIs that expect `HTMLElement`, cast to `HTMLElement` here.
  // At runtime, SVG elements remain proper SVGElement instances.
  const el = (nsToUse
    ? document.createElementNS(nsToUse, vnode.tag)
    : document.createElement(vnode.tag)) as unknown as HTMLElement;
  if (vnode.key != null) setNodeKey(el, vnode.key);

  // Store TransitionGroup metadata on the DOM element for patchChildren to use
  if (vnode.props && (vnode.props as VNodePropBag)?._transitionGroup) {
    setElementTransition(
      el,
      (vnode.props as VNodePropBag)?._transitionGroup as TransitionMetadata,
    );
  }

  const { props = {}, attrs = {}, directives = {} } = vnode.props ?? {};

  // Process directives first to get merged props/attrs/listeners
  const processedDirectives = processDirectives(
    directives,
    context,
    el instanceof HTMLElement ? el : undefined,
    attrs,
  );

  // Merge processed directive results with existing props/attrs
  const mergedProps = {
    ...props,
    ...processedDirectives.props,
  };
  const mergedAttrs = {
    ...attrs,
    ...processedDirectives.attrs,
  };

  // Ensure any explicit string `class` provided on the vnode (static class)
  // is applied to the host element as a plain attribute. This guarantees
  // that parent serialized `innerHTML` includes user-specified utility
  // classes (important for JIT CSS extraction and tests). Use a safe
  // string coercion and ignore non-string values to avoid assigning
  // complex objects to DOM attributes which can throw in jsdom.
  try {
    const hostClass =
      (mergedAttrs && mergedAttrs.class) ??
      (mergedProps && mergedProps.class) ??
      (vnode.props && vnode.props.attrs && vnode.props.attrs.class) ??
      (vnode.props && vnode.props.props && vnode.props.props.class);
    const serializedHostClass = safeSerializeAttr(hostClass);
    if (serializedHostClass !== null) {
      const cls = String(serializedHostClass).trim();
      if (cls) setAttributeSmart(el as Element, 'class', cls);
    }
  } catch {
    void 0;
  }

  // Defensive: if the compiler (vnode.props) or earlier processing placed
  // a primitive `disabled` into props for a native input, move it to attrs
  // to avoid accidental truthiness causing native controls to be disabled.
  try {
    if (
      (mergedProps as Record<string, unknown>).disabled !== undefined &&
      el &&
      isNativeControl(el)
    ) {
      const candidate = (mergedProps as Record<string, unknown>).disabled;
      const isWrapper =
        candidate && typeof candidate === 'object' && 'value' in candidate;
      let isReactiveVal = false;
      try {
        isReactiveVal = isReactiveState(candidate);
      } catch {
        isReactiveVal = false;
      }
      if (!isWrapper && !isReactiveVal) {
        safe(() => {
          (mergedAttrs as Record<string, unknown>).disabled = candidate;
          delete (mergedProps as Record<string, unknown>).disabled;
        });
      }
    }
  } catch {
    void 0;
  }

  // Set attributes
  // Prefer property assignment for certain attributes (value/checked) and
  // when the element exposes a corresponding property. SVG elements should
  // keep attributes only.
  const isSVG = (el as Element).namespaceURI === 'http://www.w3.org/2000/svg';
  for (const key in mergedAttrs) {
    const val = mergedAttrs[key];
    // Only allow valid attribute names (string, not object)
    if (typeof key !== 'string' || /\[object Object\]/.test(key)) {
      continue;
    }
    // Unwrap reactive-like wrappers (ReactiveState or { value }) to primitives
    const unwrappedVal = unwrapValue(val);

    if (typeof unwrappedVal === 'boolean') {
      // Use the unwrapped boolean to decide presence of boolean attributes
      if (unwrappedVal) {
        setAttributeSmart(el as Element, key, '');
      } else {
        safe(() => {
          removeAttributeSmart(el as Element, key);
        });
      }
    } else if (unwrappedVal !== undefined && unwrappedVal !== null) {
      // For disabled attr on native inputs, coerce to boolean and set property
      if (key === 'disabled' && isNativeControl(el)) {
        // Prefer props over attrs when deciding disabled state, but only when
        // the prop value is explicitly booleanish (boolean, numeric, or wrapper).
        // This avoids treating empty-string or arbitrary objects on props as
        // truthy which would incorrectly disable native controls.
        const propCandidate = (mergedProps as Record<string, unknown>).disabled;
        const sourceVal = isBooleanishForProps(propCandidate)
          ? propCandidate
          : unwrappedVal;
        const final = coerceBooleanForNative(sourceVal);
        safe(() => {
          (
            el as
              | HTMLInputElement
              | HTMLSelectElement
              | HTMLTextAreaElement
              | HTMLButtonElement
          ).disabled = final;
        });
        if (final) {
          safe(() => {
            setAttributeSmart(el as Element, key, '');
          });
        } else {
          safe(() => {
            removeAttributeSmart(el as Element, key);
          });
        }
        // keep going (do not fallthrough to attribute string path)
        continue;
      }
      // Special-case value/checked for native inputs so .value/.checked are set
      if (
        !isSVG &&
        key === 'value' &&
        (el instanceof HTMLInputElement ||
          el instanceof HTMLTextAreaElement ||
          el instanceof HTMLSelectElement ||
          el instanceof HTMLProgressElement)
      ) {
        try {
          // Progress expects numeric value
          if (el instanceof HTMLProgressElement)
            (el as HTMLProgressElement).value = Number(unwrappedVal as unknown);
          else el.value = String(unwrappedVal ?? '');
        } catch {
          const serialized = safeSerializeAttr(unwrappedVal);
          if (serialized !== null)
            setAttributeSmart(el as Element, key, String(serialized));
        }
      } else if (
        !isSVG &&
        key === 'checked' &&
        el instanceof HTMLInputElement
      ) {
        try {
          el.checked = !!unwrappedVal;
        } catch {
          const serialized = safeSerializeAttr(unwrappedVal);
          if (serialized !== null)
            setAttributeSmart(el as Element, key, String(serialized));
        }
      } else if (!isSVG && key in el) {
        try {
          (el as unknown as Record<string, unknown>)[key] = unwrappedVal;
          // For native form controls, also remove the disabled attribute when setting disabled=false
          // The browser doesn't automatically sync the attribute when the property changes
          if (
            key === 'disabled' &&
            unwrappedVal === false &&
            isNativeControl(el)
          ) {
            removeAttributeSmart(el as Element, 'disabled');
          }
          // Keep vnode attrs in sync with DOM mutation. In the createElement
          // path there is no `oldProps` bag; write back into the vnode's
          // own prop bag so future diffs see the authoritative value.
          writebackAttr(vnode.props, key, unwrappedVal as unknown);
        } catch {
          const serialized = safeSerializeAttr(unwrappedVal);
          if (serialized !== null)
            setAttributeSmart(el as Element, key, String(serialized));
        }
      } else {
        // For custom elements, convert kebab-case attributes to camelCase properties
        const vnodeIsCustom = vnode.props?.isCustomElement ?? false;
        if (vnodeIsCustom && !isSVG && key.includes('-')) {
          const camelKey = toCamel(key);
          try {
            (el as unknown as Record<string, unknown>)[camelKey] = unwrappedVal;
          } catch {
            // If property assignment fails, fall back to attribute
            const serialized = safeSerializeAttr(unwrappedVal);
            if (serialized !== null)
              setAttributeSmart(el as Element, key, String(serialized));
          }
        } else {
          const serialized = safeSerializeAttr(unwrappedVal);
          if (serialized !== null)
            setAttributeSmart(el as Element, key, String(serialized));
        }
      }
    }
  }

  // Set props and event listeners
  for (const key in mergedProps) {
    const val = mergedProps[key];
    // Only allow valid attribute names (string, not object)
    if (typeof key !== 'string' || /\[object Object\]/.test(key)) {
      // Skip invalid prop keys silently to keep runtime minimal
      continue;
    }
    if (
      key === 'value' &&
      (el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement)
    ) {
      // Check if val is a reactive state object and extract its value
      // Use the getter to ensure dependency tracking happens
      const propValue =
        typeof val === 'object' && val !== null && hasValueProp(val)
          ? (val as { value: unknown }).value
          : val;
      safe(() => {
        (
          el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        ).value = String(propValue ?? '');
      });
    } else if (key.startsWith('on') && typeof val === 'function') {
      // If a directive already provided a listener for this event (for
      // example :model produced update:prop handlers), prefer the directive
      // listener and skip the prop-based handler. This avoids attaching
      // compiler-generated handlers that close over transient render-local
      // variables and later do nothing when events fire.
      const eventType = eventNameFromKey(key);
      // Also consider alternate camel/kebab variant when checking directive provided listeners
      const altEventType = eventType.includes(':')
        ? (() => {
            const parts = eventType.split(':');
            const prop = parts[1];
            if (prop.includes('-')) {
              const camel = prop
                .split('-')
                .map((p: string, i: number) =>
                  i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1),
                )
                .join('');
              return `${parts[0]}:${camel}`;
            } else {
              const kebab = prop
                .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
                .toLowerCase();
              return `${parts[0]}:${kebab}`;
            }
          })()
        : eventType;
      if (
        processedDirectives.listeners &&
        (processedDirectives.listeners[eventType] ||
          processedDirectives.listeners[altEventType])
      ) {
        // skip prop handler in favor of directive-provided listener
      } else {
        EventManager.addListener(el, eventType, val as EventListener);
      }
    } else if (key.startsWith('on') && val === undefined) {
      continue; // skip undefined event handlers
    } else if (val === undefined || val === null || val === false) {
      removeAttributeSmart(el as Element, key);
    } else {
      // Prefer setting DOM properties for custom elements or when the
      // property already exists on the element. This ensures JS properties
      // (and reactive custom element props) receive the value instead of
      // only an HTML attribute string. However, certain attributes like
      // `class` and `style` should remain HTML attributes on the host so
      // they show up in serialized `innerHTML` (important for JIT CSS
      // extraction and tests). Handle those as attributes explicitly.
      const vnodeIsCustom = vnode.props?.isCustomElement ?? false;
      // Compute propValue once for use in attribute/property assignment.
      const propValue =
        typeof val === 'object' && val !== null && isReactiveState(val)
          ? val
          : hasValueProp(val) &&
              typeof (val as { value: unknown }).value !== 'undefined'
            ? (val as { value: unknown }).value
            : val;

      if (key === 'class' || key === 'style') {
        try {
          const serialized = safeSerializeAttr(propValue);
          if (serialized !== null)
            setAttributeSmart(el as Element, key, String(serialized));
        } catch {
          void 0;
        }
        continue;
      }
      if (vnodeIsCustom || key in el) {
        try {
          // If this is a ReactiveState instance, assign the instance itself
          // to custom element properties so child components can call
          // useProps and receive the live ReactiveState (with .value).
          const propValue =
            typeof val === 'object' && val !== null && isReactiveState(val)
              ? val
              : hasValueProp(val)
                ? (val as { value: unknown }).value
                : val;
          // For native elements and the disabled prop, coerce to a boolean
          if (key === 'disabled' && isNativeControl(el)) {
            const sourceVal =
              (mergedProps as Record<string, unknown>).disabled !== undefined
                ? (mergedProps as Record<string, unknown>).disabled
                : propValue;
            const final = coerceBooleanForNative(sourceVal);
            safe(() => {
              (
                el as
                  | HTMLInputElement
                  | HTMLSelectElement
                  | HTMLTextAreaElement
                  | HTMLButtonElement
              ).disabled = final;
            });
            if (final) {
              safe(() => {
                setAttributeSmart(el as Element, key, '');
              });
            } else {
              safe(() => {
                removeAttributeSmart(el as Element, key);
              });
            }
            continue;
          }
          // Coerce boolean DOM properties to real booleans. This prevents
          // empty-string or 'false' string values from incorrectly enabling
          // properties like `disabled` during SSR/attribute promotions.
          try {
            const existingProp = (el as unknown as Record<string, unknown>)[
              key
            ];
            if (typeof existingProp === 'boolean') {
              let assignValue: unknown = propValue;
              if (typeof propValue === 'string') {
                if (propValue === 'false') assignValue = false;
                else if (propValue === 'true') assignValue = true;
                else assignValue = !!propValue && propValue !== '';
              } else {
                assignValue = !!propValue;
              }
              (el as unknown as Record<string, unknown>)[key] = assignValue;
            } else {
              (el as unknown as Record<string, unknown>)[key] =
                propValue as unknown;
            }
          } catch {
            (el as unknown as Record<string, unknown>)[key] =
              propValue as unknown;
          }
        } catch {
          // silently skip on failure
        }
      } else {
        // silently skip when property doesn't exist
      }
    }
  }

  // Handle directive event listeners
  for (const [eventType, listener] of Object.entries(
    processedDirectives.listeners || {},
  )) {
    EventManager.addListener(el, eventType, listener as EventListener);
  }

  // Assign ref if present - create a vnode with processed props for ref assignment
  const vnodeWithProcessedProps = {
    ...vnode,
    props: {
      ...vnode.props,
      ...processedDirectives.props,
    },
  };
  assignRef(vnodeWithProcessedProps, el as HTMLElement, refs);

  // If this is a custom element instance, request an initial render now that
  // attributes/props/listeners have been applied. This fixes the common timing
  // issue where the element constructor rendered before the renderer set the
  // initial prop values (for example :model or :model:prop). Prefer the
  // public requestRender API when available, otherwise call internal _render
  // with the stored config.
  try {
    // If the element exposes a public requestRender or internal _render/_applyProps,
    // call them safely. Use a typed wrapper to avoid repeated `as any` casts.
    const maybeEl = el as HTMLElement & {
      _applyProps?: (cfg?: unknown) => void;
      _cfg?: unknown;
      requestRender?: () => void;
      _render?: (cfg?: unknown) => void;
    };
    if (typeof maybeEl._applyProps === 'function') {
      try {
        maybeEl._applyProps(maybeEl._cfg);
      } catch {
        // ignore
      }
    }
    if (typeof maybeEl.requestRender === 'function') {
      maybeEl.requestRender();
    } else if (typeof maybeEl._render === 'function') {
      maybeEl._render(maybeEl._cfg);
    }
  } catch {
    // Swallow errors to keep the renderer robust and minimal.
  }

  // Append children
  if (Array.isArray(vnode.children)) {
    // Determine the namespace that should be propagated to children.
    // Special-case: when inside an SVG `<foreignObject>` the element itself
    // remains in the SVG namespace but its contents should be HTML.
    const childParentNamespace =
      vnode.tag === 'foreignObject' && nsToUse === SVG_NS
        ? null
        : ((el as Element).namespaceURI ?? null);

    for (const child of vnode.children) {
      el.appendChild(createElement(child, context, refs, childParentNamespace));
    }
  } else if (typeof vnode.children === 'string') {
    el.textContent = vnode.children;
  }

  // After children are appended, reapply select value selection if necessary.
  try {
    if (
      el instanceof HTMLSelectElement &&
      mergedAttrs &&
      Object.prototype.hasOwnProperty.call(mergedAttrs, 'value')
    ) {
      try {
        el.value = String(mergedAttrs['value'] ?? '');
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }

  // Final defensive enforcement: ensure native controls are only disabled
  // when the authoritative source is a clear boolean-ish primitive or a
  // reactive/wrapper that unwraps to a boolean. This prevents transient
  // propagation of miscellaneous objects or compiler-promoted primitives
  // from leaving native inputs disabled on initial mount.
  try {
    if (isNativeControl(el)) {
      const propCandidate = (mergedProps as Record<string, unknown>).disabled;
      const attrCandidate = (mergedAttrs as Record<string, unknown>).disabled;
      const isWrapper =
        propCandidate &&
        typeof propCandidate === 'object' &&
        'value' in propCandidate;
      let isReactive = false;
      try {
        isReactive = !!isReactiveState(propCandidate);
      } catch {
        isReactive = false;
      }
      // choose authoritative source: prefer reactive/wrapper/booleanish propCandidate
      const useProp =
        isReactive || isWrapper || isBooleanishForProps(propCandidate);
      const sourceVal = useProp ? propCandidate : attrCandidate;
      const final = coerceBooleanForNative(sourceVal);
      safe(() => {
        (
          el as
            | HTMLInputElement
            | HTMLSelectElement
            | HTMLTextAreaElement
            | HTMLButtonElement
        ).disabled = final;
      });
      if (!final)
        safe(() => {
          removeAttributeSmart(el as Element, 'disabled');
        });
      else
        safe(() => {
          setAttributeSmart(el as Element, 'disabled', '');
        });
    }
  } catch {
    void 0;
  }

  return el;
}

/**
 * Patch children using keys for node matching.
 * @param parent
 * @param oldChildren
 * @param newChildren
 * @param context
 * @param refs
 * @returns
 */
export function patchChildren(
  parent: HTMLElement,
  oldChildren: VNode[] | string | undefined,
  newChildren: VNode[] | string | undefined,
  context?: Record<string, unknown>,
  refs?: VDomRefs,
): void {
  if (typeof newChildren === 'string') {
    if (parent.textContent !== newChildren) parent.textContent = newChildren;
    return;
  }
  if (!Array.isArray(newChildren)) return;

  // Cache childNodes to avoid issues with live NodeList during mutations
  const oldNodeList = parent.childNodes;
  const oldNodesCache: Node[] = [];
  for (let i = 0; i < oldNodeList.length; i++) {
    oldNodesCache.push(oldNodeList[i]);
  }
  const oldVNodes: VNode[] = Array.isArray(oldChildren) ? oldChildren : [];

  // Check if parent has TransitionGroup metadata (use WeakMap-backed accessor)
  const transitionGroup = getElementTransition(parent as HTMLElement);

  // If TransitionGroup, flatten anchor blocks and handle as batch keyed diff
  if (transitionGroup) {
    // Helper to strip 'each-' prefix from keys for proper keyed diffing
    const stripKeyPrefix = (key: unknown): string | undefined => {
      if (typeof key === 'string') {
        return key.startsWith('each-') ? key.substring(5) : key;
      }
      if (typeof key === 'number') return String(key);
      return undefined;
    };

    const flattenedNew: VNode[] = [];
    const flattenedOldVNodes: VNode[] = [];

    // Flatten new children (extract from anchor blocks)
    for (const child of newChildren) {
      if (child && child.tag === '#anchor') {
        const anchorChildren = Array.isArray(child.children)
          ? child.children
          : [];
        for (const anchorChild of anchorChildren) {
          // Extract the actual item key from the anchor key
          const actualKey = stripKeyPrefix(
            anchorChild.key ?? child.key ?? 'unknown',
          );
          flattenedNew.push({ ...anchorChild, key: actualKey });
        }
      } else if (child) {
        // Handle already-flattened children (from previous renders)
        flattenedNew.push({ ...child, key: stripKeyPrefix(child.key) });
      }
    }

    // Flatten old VNodes (extract from anchor blocks)
    for (const oldVNode of oldVNodes) {
      if (oldVNode && oldVNode.tag === '#anchor') {
        const anchorChildren = Array.isArray(oldVNode.children)
          ? oldVNode.children
          : [];
        for (const anchorChild of anchorChildren) {
          // Extract the actual item key from the anchor key
          const actualKey = stripKeyPrefix(
            anchorChild.key ?? oldVNode.key ?? 'unknown',
          );
          flattenedOldVNodes.push({ ...anchorChild, key: actualKey });
        }
      } else if (oldVNode) {
        // Handle already-flattened children (from previous renders)
        flattenedOldVNodes.push({
          ...oldVNode,
          key: stripKeyPrefix(oldVNode.key),
        });
      }
    }

    // Now perform keyed diffing on flattened lists
    const hasKeys =
      flattenedNew.some((c) => c && c.key != null) ||
      flattenedOldVNodes.some((c) => c && c.key != null);

    if (hasKeys) {
      // Build maps for keyed diffing
      const oldVNodeByKeyFlat = new Map<string | number, VNode>();
      const oldNodeByKeyFlat = new Map<string | number, Node>();

      for (const v of flattenedOldVNodes) {
        if (v && v.key != null) {
          // Ensure key is a string for consistent comparison
          const key = String(v.key);
          oldVNodeByKeyFlat.set(key, v);
        }
      }

      // Map old DOM nodes by their keys with dual mapping for numeric/string keys
      for (let i = 0; i < oldNodesCache.length; i++) {
        const node = oldNodesCache[i];

        // Try multiple ways to find the key (WeakMap-backed accessor + attribute fallback)
        let nodeKey = getNodeKey(node);
        // Strip "each-" prefix from node keys to match flattened VNode keys
        nodeKey = stripKeyPrefix(nodeKey);

        // Skip text nodes and comment nodes without keys
        if (
          nodeKey != null &&
          node instanceof Element &&
          node.nodeType === Node.ELEMENT_NODE
        ) {
          // Extract the base key (remove :tagname suffix if present)
          let baseKey =
            typeof nodeKey === 'string' && nodeKey.includes(':')
              ? nodeKey.substring(0, nodeKey.lastIndexOf(':'))
              : nodeKey;

          // Ensure key is a string for consistent comparison with VNode keys
          baseKey = String(baseKey);

          // Store with the base key (stripped of "each-" prefix to match VNode keys)
          oldNodeByKeyFlat.set(baseKey, node);
        }
      }

      const usedFlat = new Set<Node>();

      // PHASE 0: Record positions BEFORE any DOM modifications for FLIP animation
      // Only record if we have existing nodes to animate from
      const positionsBefore = new Map<Node, DOMRect>();
      const hadPreviousContent = oldNodesCache.length > 0;

      if (transitionGroup.moveClass && hadPreviousContent) {
        for (let i = 0; i < oldNodesCache.length; i++) {
          const node = oldNodesCache[i];
          if (node instanceof HTMLElement && node.parentElement) {
            const rect = node.getBoundingClientRect();
            // Record position even if dimensions are zero (test environments)
            positionsBefore.set(node, rect);
          }
        }
      }

      // PHASE 1: Identify which nodes to keep, create new nodes, but DON'T move anything yet
      const nodesToProcess: Array<{
        node: Node;
        key: string;
        newVNode: VNode;
        oldVNode?: VNode;
        isNew: boolean;
      }> = [];

      for (const newVNode of flattenedNew) {
        let key = newVNode.key;
        if (key == null) continue;

        // Ensure key is a string for consistent comparison
        key = String(key);

        const oldVNode = oldVNodeByKeyFlat.get(key);
        let node = oldNodeByKeyFlat.get(key);

        if (node && oldVNode) {
          // Existing node - patch it but don't move yet
          const patched = patch(node, oldVNode, newVNode, context);
          usedFlat.add(node);

          // Ensure the node has the correct key and attribute
          const keyStr = String(key);
          setNodeKey(patched, keyStr);

          nodesToProcess.push({
            node: patched,
            key,
            newVNode,
            oldVNode,
            isNew: false,
          });
        } else {
          // Create new node and insert it immediately (but invisible via enterFrom classes)
          node = createElement(
            newVNode,
            context,
            undefined,
            parent instanceof Element ? (parent.namespaceURI ?? null) : null,
          );
          setNodeKey(node, String(key));

          // For new nodes, immediately insert them into DOM (at the end) and start enter transition
          // This ensures the transition can capture the correct FROM state
          parent.appendChild(node);

          // Only animate if: we had previous content to transition from OR appear is true
          // This prevents initial render items from animating (unless appear: true explicitly set)
          // but allows subsequent additions to animate
          const shouldAnimate =
            hadPreviousContent || transitionGroup.appear === true;

          if (node instanceof HTMLElement && shouldAnimate) {
            performEnterTransition(node, transitionGroup).catch((err) => {
              devError('Enter transition error:', err);
            });
          }

          nodesToProcess.push({ node, key, newVNode, isNew: true });
        }
      }

      const leaveTransitions: Promise<void>[] = [];

      for (let i = 0; i < oldNodesCache.length; i++) {
        const node = oldNodesCache[i];
        const nodeKey = getNodeKey(node);
        const isUsed = usedFlat.has(node);

        if (!isUsed && nodeKey != null && node instanceof HTMLElement) {
          const leavePromise = performLeaveTransition(node, transitionGroup)
            .then(() => {
              if (parent.contains(node)) {
                parent.removeChild(node);
              }
            })
            .catch((err) => {
              devError('Leave transition error:', err);
              if (parent.contains(node)) {
                parent.removeChild(node);
              }
            });
          leaveTransitions.push(leavePromise);
        }
      }

      // PHASE 3: Move nodes to correct positions and apply FLIP animations
      // SKIP if there are active leave transitions to prevent visual jumps
      if (leaveTransitions.length === 0) {
        // FLIP Animation for move transitions
        // Positions were already recorded in PHASE 0, now we just move and animate
        let currentPosition: Node | null = parent.firstChild;

        for (const { node } of nodesToProcess) {
          // Move node to correct position if needed
          if (node !== currentPosition) {
            parent.insertBefore(node, currentPosition);
          }
          currentPosition = node.nextSibling;
        }

        // Apply FLIP animation for moved items
        if (transitionGroup.moveClass && positionsBefore.size > 0) {
          // Collect elements that need to be animated
          const elementsToAnimate: Array<{
            node: HTMLElement;
            deltaX: number;
            deltaY: number;
            moveClasses: string[];
          }> = [];

          for (const { node, isNew } of nodesToProcess) {
            if (!isNew && node instanceof HTMLElement) {
              const oldPos = positionsBefore.get(node);
              if (oldPos) {
                const newPos = node.getBoundingClientRect();
                const deltaX = oldPos.left - newPos.left;
                const deltaY = oldPos.top - newPos.top;

                // If position changed, prepare for animation
                if (deltaX !== 0 || deltaY !== 0) {
                  const moveClasses = transitionGroup.moveClass
                    .split(/\s+/)
                    .filter((c: string) => c);
                  elementsToAnimate.push({ node, deltaX, deltaY, moveClasses });
                }
              }
            }
          }

          if (elementsToAnimate.length > 0) {
            // FLIP Animation technique:
            // We need to ensure the browser paints the inverted state before animating
            // Step 1: Apply inverted transforms (without transition)
            for (const { node, deltaX, deltaY } of elementsToAnimate) {
              node.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
              node.style.transitionProperty = 'none';
            }

            // Step 2: Force reflow to ensure transforms are applied
            void parent.offsetHeight;

            // Step 3: Use triple RAF to ensure browser has:
            // 1. Painted the inverted state
            // 2. Applied the transition classes
            // 3. Ready to animate when transform is removed
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                // Add moveClass for transition properties
                for (const { node, moveClasses } of elementsToAnimate) {
                  for (const cls of moveClasses) {
                    node.classList.add(cls);
                  }
                }

                // One more RAF to ensure transition classes are processed
                requestAnimationFrame(() => {
                  // Set transition directly on each element
                  // Parse moveClass to extract duration and timing
                  const moveClassStr = transitionGroup.moveClass || '';
                  const durationMatch = moveClassStr.match(/duration-(\d+)/);
                  const duration = durationMatch
                    ? `${durationMatch[1]}ms`
                    : '300ms';
                  const easingMatch = moveClassStr.match(
                    /ease-(out|in|in-out|linear)/,
                  );
                  const easing = easingMatch
                    ? `ease-${easingMatch[1]}`
                    : 'ease-out';

                  for (const { node } of elementsToAnimate) {
                    // Set transition inline to override everything
                    // This sets transition-property, transition-duration, and transition-timing-function
                    node.style.transition = `transform ${duration} ${easing}`;
                  }

                  // One final RAF before removing transform
                  requestAnimationFrame(() => {
                    // Now remove transforms to trigger animation
                    for (const { node, moveClasses } of elementsToAnimate) {
                      node.style.removeProperty('transform');
                      // Clean up moveClass after transition completes
                      const cleanup = () => {
                        for (const cls of moveClasses) {
                          node.classList.remove(cls);
                        }
                        // Also remove the inline transition we set for move animation
                        // This allows leave transitions to work properly
                        node.style.removeProperty('transition');
                        node.removeEventListener('transitionend', cleanup);
                        node.removeEventListener('transitioncancel', cleanup);
                      };
                      node.addEventListener('transitionend', cleanup, {
                        once: true,
                      });
                      node.addEventListener('transitioncancel', cleanup, {
                        once: true,
                      });
                    }
                  });
                });
              });
            });
          }
        }
      }

      return; // Done with TransitionGroup keyed diffing
    }
  }

  // Map old VNodes by key
  const oldVNodeByKey = new Map<string | number, VNode>();
  for (const v of oldVNodes) {
    if (v && v.key != null) oldVNodeByKey.set(v.key, v);
  }

  // Map DOM nodes by key (elements, text, anchors)
  const oldNodeByKey = new Map<string | number, Node>();

  // Scan DOM for keyed nodes including anchor boundaries
  for (let i = 0; i < oldNodesCache.length; i++) {
    const node = oldNodesCache[i];
    const k = getNodeKey(node);
    if (k != null) {
      oldNodeByKey.set(k, node);
    }
  }

  const usedNodes = new Set<Node>();
  let nextSibling: Node | null = parent.firstChild;

  function markRangeUsed(start: Comment, end?: Comment) {
    let cur: Node | null = start;
    while (cur) {
      usedNodes.add(cur);
      if (cur === end) break;
      cur = cur.nextSibling;
    }
  }

  function patchChildrenBetween(
    start: Comment,
    end: Comment,
    oldChildren: VNode[] | undefined,
    newChildren: VNode[],
    transition?: Transition | undefined,
    shouldAnimate = true,
  ) {
    const oldNodesInRange: Node[] = [];
    let cur: Node | null = start.nextSibling;
    while (cur && cur !== end) {
      oldNodesInRange.push(cur);
      cur = cur.nextSibling;
    }

    const oldVNodesInRange: VNode[] = Array.isArray(oldChildren)
      ? oldChildren
      : [];
    const hasKeys =
      newChildren.some((c) => c && c.key != null) ||
      oldVNodesInRange.some((c) => c && c.key != null);

    if (hasKeys) {
      // Keyed diff
      const oldVNodeByKeyRange = new Map<string | number, VNode>();
      const oldNodeByKeyRange = new Map<string | number, Node>();

      for (const v of oldVNodesInRange) {
        if (v && v.key != null) oldVNodeByKeyRange.set(v.key, v);
      }
      for (const node of oldNodesInRange) {
        const k = getNodeKey(node);
        if (k != null) oldNodeByKeyRange.set(k, node);
      }

      // Calculate if this is initial visible render (for appear transitions)
      const isInitialVisible =
        transition &&
        transition.state === 'visible' &&
        oldVNodesInRange.length === 0 &&
        newChildren.length > 0;

      const usedInRange = new Set<Node>();
      let next: Node | null = start.nextSibling;

      for (const newVNode of newChildren) {
        // Handle nested anchor blocks (e.g. when() inside when()).
        // Anchor boundaries are stored as `key:start` / `key:end` text nodes, not
        // as a single node with key `key`.  Without this path the keyed diff falls
        // through to `createElement()`, which returns a DocumentFragment that is
        // empty after `insertBefore`.  `fragment.nextSibling` is then null, so
        // every subsequent sibling gets appended at the very end of the parent
        // element — past unrelated nodes such as `picker-actions`.
        if (typeof newVNode === 'object' && newVNode.tag === '#anchor') {
          const innerKey = newVNode.key!;
          const innerStartKey = `${innerKey}:start`;
          const innerEndKey = `${innerKey}:end`;
          const existingStart = oldNodeByKeyRange.get(innerStartKey) as
            | Comment
            | undefined;
          const existingEnd = oldNodeByKeyRange.get(innerEndKey) as
            | Comment
            | undefined;
          const innerChildren = Array.isArray(newVNode.children)
            ? newVNode.children
            : [];
          const innerOldVNode = oldVNodeByKeyRange.get(innerKey);
          let anchorStart: Comment;
          let anchorEnd: Comment;

          if (existingStart && existingEnd && parent.contains(existingStart)) {
            // Reuse existing boundaries and recursively patch their content.
            anchorStart = existingStart;
            anchorEnd = existingEnd;
            patchChildrenBetween(
              anchorStart,
              anchorEnd,
              innerOldVNode?.children as VNode[] | undefined,
              innerChildren,
            );
          } else {
            // No existing boundaries — create them and insert all content before `next`.
            anchorStart = document.createTextNode('') as unknown as Comment;
            anchorEnd = document.createTextNode('') as unknown as Comment;
            setNodeKey(anchorStart, innerStartKey);
            setNodeKey(anchorEnd, innerEndKey);
            parent.insertBefore(anchorStart, next);
            for (const child of innerChildren) {
              const childEl = createElement(
                child,
                context,
                undefined,
                parent instanceof Element
                  ? (parent.namespaceURI ?? null)
                  : null,
              );
              parent.insertBefore(childEl, next);
              usedInRange.add(childEl);
            }
            parent.insertBefore(anchorEnd, next);
          }

          // Mark every node in the anchor range as used so the cleanup pass
          // below does not remove the newly reconciled (or reused) boundaries.
          let rangeNode: Node | null = anchorStart;
          while (rangeNode) {
            usedInRange.add(rangeNode);
            if (rangeNode === anchorEnd) break;
            rangeNode = rangeNode.nextSibling;
          }

          (newVNode as AnchorBlockVNode)._startNode = anchorStart;
          (newVNode as AnchorBlockVNode)._endNode = anchorEnd;
          next = anchorEnd.nextSibling;
          continue;
        }

        let node: Node;
        if (newVNode.key != null && oldNodeByKeyRange.has(newVNode.key)) {
          const oldVNode = oldVNodeByKeyRange.get(newVNode.key)!;
          node = patch(
            oldNodeByKeyRange.get(newVNode.key)!,
            oldVNode,
            newVNode,
            context,
          );
          usedInRange.add(node);

          // Apply enter transition to patched nodes if this is initial visible render with appear: true
          if (
            transition &&
            node instanceof HTMLElement &&
            isInitialVisible &&
            transition.appear
          ) {
            performEnterTransition(node, transition).catch((err) => {
              devError('Transition enter error (appear):', err);
            });
          }

          if (node !== next && parent.contains(node)) {
            parent.insertBefore(node, next);
          }
        } else {
          node = createElement(
            newVNode,
            context,
            undefined,
            parent instanceof Element ? (parent.namespaceURI ?? null) : null,
          );
          parent.insertBefore(node, next);
          usedInRange.add(node);

          // Apply enter transition to new nodes ONLY if shouldAnimate is true
          if (transition && node instanceof HTMLElement && shouldAnimate) {
            performEnterTransition(node, transition).catch((err) => {
              devError('Transition enter error:', err);
            });
          }
        }
        next = node.nextSibling;
      }

      for (const node of oldNodesInRange) {
        if (!usedInRange.has(node) && parent.contains(node)) {
          if (transition && node instanceof HTMLElement && shouldAnimate) {
            // Apply leave transition before removing
            performLeaveTransition(node, transition)
              .then(() => {
                if (parent.contains(node)) {
                  parent.removeChild(node);
                }
              })
              .catch((err) => {
                devError('Transition leave error:', err);
                if (parent.contains(node)) {
                  parent.removeChild(node);
                }
              });
          } else {
            parent.removeChild(node);
          }
        }
      }
    } else {
      // Keyless: fall back to index-based patch
      const commonLength = Math.min(
        oldVNodesInRange.length,
        newChildren.length,
      );

      for (let i = 0; i < commonLength; i++) {
        const oldVNode = oldVNodesInRange[i];
        const newVNode = newChildren[i];
        const node = patch(oldNodesInRange[i], oldVNode, newVNode, context);
        if (node !== oldNodesInRange[i]) {
          parent.insertBefore(node, oldNodesInRange[i]);
          parent.removeChild(oldNodesInRange[i]);
        }
      }

      // Add extra new
      for (let i = commonLength; i < newChildren.length; i++) {
        const node = createElement(
          newChildren[i],
          context,
          undefined,
          parent instanceof Element ? (parent.namespaceURI ?? null) : null,
        );
        parent.insertBefore(node, end);

        // Apply enter transition to new nodes ONLY if shouldAnimate is true
        if (transition && node instanceof HTMLElement && shouldAnimate) {
          performEnterTransition(node, transition).catch((err) => {
            devError('Transition enter error:', err);
          });
        }
      }

      // Remove extra old
      for (let i = commonLength; i < oldNodesInRange.length; i++) {
        const node = oldNodesInRange[i];
        if (transition && node instanceof HTMLElement && shouldAnimate) {
          // Apply leave transition before removing
          performLeaveTransition(node, transition)
            .then(() => {
              if (parent.contains(node)) {
                parent.removeChild(node);
              }
            })
            .catch((err) => {
              devError('Transition leave error:', err);
              if (parent.contains(node)) {
                parent.removeChild(node);
              }
            });
        } else {
          parent.removeChild(node);
        }
      }
    }
  }

  for (const newVNode of newChildren) {
    let node: Node;

    // Handle AnchorBlocks
    if (newVNode.tag === '#anchor') {
      const aKey = newVNode.key!;
      const startKey = `${aKey}:start`;
      const endKey = `${aKey}:end`;

      let start = oldNodeByKey.get(startKey) as Node;
      let end = oldNodeByKey.get(endKey) as Node;
      const children = Array.isArray(newVNode.children)
        ? newVNode.children
        : [];

      // Create boundaries if they don't exist
      if (!start) {
        start = document.createTextNode('');
        setNodeKey(start, startKey);
      }
      if (!end) {
        end = document.createTextNode('');
        setNodeKey(end, endKey);
      }

      // Preserve anchor references on the new VNode
      (newVNode as AnchorBlockVNode)._startNode = start as Comment;
      (newVNode as AnchorBlockVNode)._endNode = end as Comment;

      // If boundaries aren't in DOM, insert the whole fragment
      if (!parent.contains(start) || !parent.contains(end)) {
        parent.insertBefore(start, nextSibling);
        const transition = (newVNode as VNode & Record<string, unknown>)
          ._transition as Transition | undefined;

        // Determine if we should animate:
        // - If transition.state === 'visible' and children.length > 0, this is initial visible state
        //   → only animate if appear: true
        // - If transition.state === 'hidden' and children.length === 0, this is initial hidden state
        //   → don't animate (nothing to animate)
        // - Otherwise, this is a state change → always animate
        const isInitialVisible =
          transition && transition.state === 'visible' && children.length > 0;
        const shouldAnimate = !isInitialVisible || transition.appear;

        for (const child of children) {
          const childNode = createElement(
            child,
            context,
            refs,
            parent instanceof Element ? (parent.namespaceURI ?? null) : null,
          );
          parent.insertBefore(childNode, nextSibling);

          // Apply enter transitions to new nodes ONLY if shouldAnimate is true
          if (transition && childNode instanceof HTMLElement) {
            if (shouldAnimate) {
              performEnterTransition(childNode, transition).catch((err) => {
                devError('Transition enter error:', err);
              });
            }
          }
        }
        parent.insertBefore(end, nextSibling);
      } else {
        // Patch children between existing boundaries
        const transition = (newVNode as VNode & Record<string, unknown>)
          ._transition as Transition | undefined;
        const oldVNode = oldVNodeByKey.get(aKey) as VNode;
        const oldTransition = (oldVNode as VNode & Record<string, unknown>)
          ._transition as Transition | undefined;

        // Determine if we should animate:
        // - If this is a state change (hidden → visible or visible → hidden), always animate
        // - If this is initial render with state='visible', only animate if appear: true
        const isStateChange =
          oldTransition && oldTransition.state !== transition?.state;
        const isInitialVisible =
          transition &&
          transition.state === 'visible' &&
          children.length > 0 &&
          !isStateChange;
        const shouldAnimate =
          isStateChange || !isInitialVisible || transition?.appear === true;

        patchChildrenBetween(
          start as Comment,
          end as Comment,
          (oldVNodeByKey.get(aKey) as VNode)?.children as VNode[] | undefined,
          children,
          transition,
          shouldAnimate,
        );
      }

      markRangeUsed(start as Comment, end as Comment);
      nextSibling = end.nextSibling;
      continue;
    }

    // Normal keyed element/text
    if (newVNode.key != null && oldNodeByKey.has(newVNode.key)) {
      const oldVNode = oldVNodeByKey.get(newVNode.key)!;
      node = patch(
        oldNodeByKey.get(newVNode.key)!,
        oldVNode,
        newVNode,
        context,
        refs,
      );
      usedNodes.add(node);
      if (node !== nextSibling && parent.contains(node)) {
        if (nextSibling && !parent.contains(nextSibling)) nextSibling = null;
        parent.insertBefore(node, nextSibling);
      }
    } else {
      node = createElement(
        newVNode,
        context,
        refs,
        parent instanceof Element ? (parent.namespaceURI ?? null) : null,
      );
      if (nextSibling && !parent.contains(nextSibling)) nextSibling = null;
      parent.insertBefore(node, nextSibling);
      usedNodes.add(node);
    }

    nextSibling = node.nextSibling;
  }

  // Remove unused nodes (use cached array to avoid live NodeList issues)
  for (let i = 0; i < oldNodesCache.length; i++) {
    const node = oldNodesCache[i];
    if (!usedNodes.has(node) && parent.contains(node)) {
      cleanupRefs(node, refs);
      parent.removeChild(node);
    }
  }
}

/**
 * Patch a node using keys for node matching.
 * @param dom
 * @param oldVNode
 * @param newVNode
 * @param context
 * @param refs
 * @returns
 */
export function patch(
  dom: Node,
  oldVNode: VNode | string | null,
  newVNode: VNode | string | null,
  context?: Record<string, unknown>,
  refs?: VDomRefs,
): Node {
  if (oldVNode && typeof oldVNode !== 'string' && oldVNode.props?.ref && refs) {
    cleanupRefs(dom, refs); // Clean up old ref and descendants
  }

  if (oldVNode === newVNode) return dom;

  if (typeof newVNode === 'string') {
    if (dom.nodeType === Node.TEXT_NODE) {
      if (dom.textContent !== newVNode) dom.textContent = newVNode;
      return dom;
    } else {
      const textNode = document.createTextNode(newVNode);
      dom.parentNode?.replaceChild(textNode, dom);
      return textNode;
    }
  }

  if (newVNode && typeof newVNode !== 'string' && newVNode.tag === '#anchor') {
    const anchorVNode = newVNode as AnchorBlockVNode;
    const children = Array.isArray(anchorVNode.children)
      ? anchorVNode.children
      : [];
    const start = anchorVNode._startNode ?? document.createTextNode('');
    const end = anchorVNode._endNode ?? document.createTextNode('');
    if (anchorVNode.key != null) {
      setNodeKey(start, `${anchorVNode.key}:start`);
      setNodeKey(end, `${anchorVNode.key}:end`);
    }
    anchorVNode._startNode = start;
    anchorVNode._endNode = end;
    const frag = document.createDocumentFragment();
    frag.appendChild(start);
    for (const child of children) {
      const childNode = createElement(
        child,
        context,
        refs,
        dom.parentNode instanceof Element
          ? (dom.parentNode.namespaceURI ?? null)
          : null,
      );
      frag.appendChild(childNode);
    }
    frag.appendChild(end);
    dom.parentNode?.replaceChild(frag, dom);
    return start;
  }

  if (!newVNode) {
    cleanupRefs(dom, refs);
    const placeholder = document.createComment('removed');
    dom.parentNode?.replaceChild(placeholder, dom);
    return placeholder;
  }

  if (!oldVNode || typeof oldVNode === 'string') {
    cleanupRefs(dom, refs);
    const newEl = createElement(
      newVNode,
      context,
      refs,
      dom.parentNode instanceof Element
        ? (dom.parentNode.namespaceURI ?? null)
        : null,
    );
    assignRef(newVNode, newEl as HTMLElement, refs);
    dom.parentNode?.replaceChild(newEl, dom);
    return newEl;
  }

  if (newVNode.tag === '#anchor') {
    const children = Array.isArray(newVNode.children) ? newVNode.children : [];
    const start =
      (newVNode as AnchorBlockVNode)._startNode ?? document.createTextNode('');
    const end =
      (newVNode as AnchorBlockVNode)._endNode ?? document.createTextNode('');

    if (newVNode.key != null) {
      setNodeKey(start, `${newVNode.key}:start`);
      setNodeKey(end, `${newVNode.key}:end`);
    }

    (newVNode as AnchorBlockVNode)._startNode = start as Comment;
    (newVNode as AnchorBlockVNode)._endNode = end as Comment;

    const frag = document.createDocumentFragment();
    frag.appendChild(start);
    for (const child of children) {
      frag.appendChild(
        createElement(
          child,
          context,
          refs,
          dom.parentNode instanceof Element
            ? (dom.parentNode.namespaceURI ?? null)
            : null,
        ),
      );
    }
    frag.appendChild(end);
    dom.parentNode?.replaceChild(frag, dom);
    return start;
  }

  if (
    typeof oldVNode !== 'string' &&
    typeof newVNode !== 'string' &&
    oldVNode.tag === newVNode.tag &&
    oldVNode.key === newVNode.key
  ) {
    const el = dom as HTMLElement;
    patchProps(el, oldVNode.props || {}, newVNode.props || {}, context);
    patchChildren(el, oldVNode.children, newVNode.children, context, refs); // <-- Pass refs
    assignRef(newVNode, el, refs);
    return el;
  }

  // If the tag matches but the key changed, prefer to patch in-place for
  // custom elements to avoid remounting their internals. This handles cases
  // where compiler promotion or key churn causes vnode keys to differ even
  // though the DOM element should remain the same instance.
  if (
    typeof oldVNode !== 'string' &&
    typeof newVNode !== 'string' &&
    oldVNode.tag === newVNode.tag
  ) {
    const isCustomTag =
      (oldVNode.tag && String(oldVNode.tag).includes('-')) ||
      (newVNode.props && (newVNode.props as VNodePropBag).isCustomElement) ||
      (oldVNode.props && (oldVNode.props as VNodePropBag).isCustomElement);
    if (isCustomTag) {
      try {
        const el = dom as HTMLElement;
        patchProps(el, oldVNode.props || {}, newVNode.props || {}, context);
        // For custom elements, their internal rendering is managed by the
        // element itself; do not touch children here.
        assignRef(newVNode, el, refs);
        return el;
      } catch {
        // fall through to full replace on error
      }
    }
  }

  cleanupRefs(dom, refs);
  const newEl = createElement(
    newVNode,
    context,
    refs,
    dom.parentNode instanceof Element
      ? (dom.parentNode.namespaceURI ?? null)
      : null,
  );
  assignRef(newVNode, newEl as HTMLElement, refs);
  dom.parentNode?.replaceChild(newEl, dom);
  return newEl;
}

/**
 * Virtual DOM renderer.
 * @param root The root element to render into.
 * @param vnodeOrArray The virtual node or array of virtual nodes to render.
 * @param context The context to use for rendering.
 * @param refs The refs to use for rendering.
 */
export function vdomRenderer(
  root: ShadowRoot,
  vnodeOrArray: VNode | VNode[],
  context?: Record<string, unknown>,
  refs?: VDomRefs,
) {
  let newVNode: VNode;
  if (Array.isArray(vnodeOrArray)) {
    if (vnodeOrArray.length === 1) {
      newVNode = vnodeOrArray[0];
      if (newVNode && typeof newVNode === 'object' && newVNode.key == null) {
        newVNode = { ...newVNode, key: '__root__' };
      }
    } else {
      newVNode = { tag: 'div', key: '__root__', children: vnodeOrArray };
    }
  } else {
    newVNode = vnodeOrArray;
    if (newVNode && typeof newVNode === 'object' && newVNode.key == null) {
      newVNode = { ...newVNode, key: '__root__' };
    }
  }

  // If the root is an AnchorBlock, wrap it in a real element for DOM insertion
  if (newVNode && typeof newVNode === 'object' && newVNode.tag === '#anchor') {
    newVNode = {
      tag: 'div',
      key: '__anchor_root__',
      props: {
        attrs: { 'data-anchor-block-root': '', key: '__anchor_root__' },
      },
      children: [newVNode],
    };
  }

  newVNode = assignKeysDeep(newVNode, String(newVNode.key ?? 'root')) as VNode;

  // Track previous VNode and DOM node
  const prevVNode: VNode | null =
    ((root as unknown as Record<string, unknown>)._prevVNode as VNode | null) ??
    null;
  const prevDom: Node | null =
    ((root as unknown as Record<string, unknown>)._prevDom as Node | null) ??
    root.firstChild ??
    null;

  let newDom: Node;

  if (prevVNode && prevDom) {
    // Only replace if tag or key changed
    if (
      typeof prevVNode !== 'string' &&
      typeof newVNode !== 'string' &&
      prevVNode.tag === newVNode.tag &&
      prevVNode.key === newVNode.key
    ) {
      newDom = patch(prevDom, prevVNode, newVNode, context, refs);
    } else {
      newDom = createElement(
        newVNode,
        context,
        refs,
        root.host instanceof Element ? (root.host.namespaceURI ?? null) : null,
      );
      root.replaceChild(newDom, prevDom);
    }
  } else {
    newDom = createElement(
      newVNode,
      context,
      refs,
      root.host instanceof Element ? (root.host.namespaceURI ?? null) : null,
    );
    if (root.firstChild) root.replaceChild(newDom, root.firstChild);
    else root.appendChild(newDom);
  }

  // Remove any extra nodes, but preserve style elements
  const nodesToRemove: Node[] = [];
  for (let i = 0; i < root.childNodes.length; i++) {
    const node = root.childNodes[i];
    if (node !== newDom && node.nodeName !== 'STYLE') {
      cleanupRefs(node, refs);
      nodesToRemove.push(node);
    }
  }
  nodesToRemove.forEach((node) => root.removeChild(node));

  // Update tracked VNode and DOM node.
  // Store a copy of newVNode with its own props/attrs objects so that
  // subsequent writebackAttr calls (inside patchProps) do not mutate the
  // LRU-cached VNode that the template compiler returns on every render.
  // Shallow-copying props + deep-copying attrs/props sub-objects is
  // enough because writebackAttr only writes one level deep into attrs.
  const prevVNodeToStore: VNode =
    newVNode && typeof newVNode === 'object' && newVNode.props
      ? ({
          ...newVNode,
          props: {
            ...newVNode.props,
            attrs: newVNode.props.attrs
              ? { ...newVNode.props.attrs }
              : undefined,
            props: newVNode.props.props
              ? { ...newVNode.props.props }
              : undefined,
          },
        } as VNode)
      : newVNode;
  (root as unknown as Record<string, unknown>)._prevVNode =
    prevVNodeToStore as unknown;
  (root as unknown as Record<string, unknown>)._prevDom = newDom as unknown;
}
