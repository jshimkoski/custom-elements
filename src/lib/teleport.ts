/**
 * teleport.ts
 *
 * Renders virtual DOM content into an arbitrary DOM target located outside
 * the current component's Shadow Root. Useful for modals, tooltips, popovers,
 * and any UI that must visually escape the component boundary.
 *
 * @example
 * ```ts
 * import { component, html, ref, useOnDisconnected, useTeleport } from '@jasonshimmy/custom-elements-runtime';
 *
 * component('modal-trigger', () => {
 *   const isOpen = ref(false);
 *
 *   // Render modal content into <body> outside the shadow root
 *   const { portal, destroy } = useTeleport('#modal-root');
 *   useOnDisconnected(destroy);
 *
 *   // Call portal() to update the teleported content on each render
 *   if (isOpen.value) {
 *     portal(html`<div class="modal">
 *       <h2>Hello</h2>
 *       <button @click="${() => (isOpen.value = false)}">Close</button>
 *     </div>`);
 *   } else {
 *     portal(null);
 *   }
 *
 *   return html`
 *     <button @click="${() => (isOpen.value = true)}">Open modal</button>
 *   `;
 * });
 * ```
 */

import type { VNode, VDomRefs } from './runtime/types';
import { vdomRenderer } from './runtime/vdom';
import { reactiveSystem } from './runtime/reactive';
import { getCurrentComponentContext, isDiscoveryRender } from './runtime/hooks';

/** Handle returned by {@link useTeleport} for managing a portal. */
export interface TeleportHandle {
  /**
   * Render (or clear) content at the teleport target.
   * Pass `null` or `undefined` to remove previously rendered content.
   */
  portal(content: VNode | VNode[] | null | undefined): void;

  /**
   * Destroy the teleport container and clean up all rendered content.
   * Call this in `useOnDisconnected` to prevent memory leaks.
   */
  destroy(): void;
}

/**
 * Create a teleport portal that renders content outside the current Shadow Root.
 *
 * @param target - A CSS selector string or an `Element` reference to render into.
 * @returns A {@link TeleportHandle} with `portal()` (update content) and `destroy()` (cleanup).
 *
 * @example
 * ```ts
 * import { component, html, useOnDisconnected, useTeleport } from '@jasonshimmy/custom-elements-runtime';
 *
 * component('my-tooltip', () => {
 *   const { portal, destroy } = useTeleport('body');
 *   useOnDisconnected(destroy);
 *
 *   portal(html`<div class="tooltip">Tooltip content</div>`);
 *   return html`<span>Hover me</span>`;
 * });
 * ```
 */
export function useTeleport(target: string | Element): TeleportHandle {
  // SSR guard
  if (typeof document === 'undefined') {
    return { portal: () => {}, destroy: () => {} };
  }

  // During discovery render the component is not yet mounted — return a no-op
  // handle so the library can detect props/hooks without side-effects.
  if (isDiscoveryRender()) {
    return { portal: () => {}, destroy: () => {} };
  }

  // If called inside a component render, use the reactive state-index slot
  // mechanism to ensure the same handle is returned on every re-render of the
  // same component instance.  Without this, each re-render would create a new
  // <cer-teleport> container in the target, leaking all but the last one.
  const ctx = getCurrentComponentContext();
  if (ctx) {
    // getOrCreateState uses an incrementing stateIndex that is reset to 0 at
    // the start of each render, so the same call site always gets the same slot.
    const slot = reactiveSystem.getOrCreateState<TeleportHandle | null>(null);
    const existing = slot.peek();
    if (existing !== null) {
      return existing;
    }
    // First render: create the handle and store it without triggering a
    // reactive update (initSilent bypasses triggerUpdate).
    // Pass a slot-invalidation callback so that destroy() clears the slot,
    // allowing a reconnected component to create a fresh container.
    const handle = _createTeleportHandle(target, () => slot.initSilent(null));
    slot.initSilent(handle);
    return handle;
  }

  // Outside a component context (e.g. called directly in tests or scripts):
  // fall through to a non-cached, non-stable handle.
  return _createTeleportHandle(target);
}

/** Internal: create a fresh teleport handle pointing at `target`.
 * @param onDestroy - Optional callback invoked after cleanup in destroy(), used
 *   to invalidate a cached slot so the next render creates a fresh handle.
 */
function _createTeleportHandle(
  target: string | Element,
  onDestroy?: () => void,
): TeleportHandle {
  const targetEl =
    typeof target === 'string'
      ? (document.querySelector(target) as Element | null)
      : target;

  if (!targetEl) {
    console.warn(
      `[useTeleport] Target "${String(target)}" not found in the document. ` +
        'Teleported content will not be rendered.',
    );
    return { portal: () => {}, destroy: () => {} };
  }

  // Create a dedicated container so we never clobber sibling content.
  const container = document.createElement('cer-teleport');
  container.dataset.cerTeleport = '';
  targetEl.appendChild(container);

  // Shared refs bag — passed consistently so ref directives work across updates.
  const refs: VDomRefs = {};

  const handle: TeleportHandle = {
    portal(content: VNode | VNode[] | null | undefined): void {
      const nodes: VNode[] =
        content == null ? [] : Array.isArray(content) ? content : [content];
      // vdomRenderer stores _prevVNode/_prevDom on the root object for diffing.
      // Casting to ShadowRoot is safe: we only access properties that exist on
      // HTMLElement (firstChild, appendChild, replaceChild, childNodes).
      vdomRenderer(container as unknown as ShadowRoot, nodes, undefined, refs);
    },

    destroy(): void {
      // Render empty nodes to clean up event listeners and refs.
      try {
        vdomRenderer(container as unknown as ShadowRoot, [], undefined, refs);
      } catch {
        /* best-effort cleanup */
      }
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
      // Invalidate the cached slot so that if the component reconnects and
      // re-renders, useTeleport() creates a fresh container rather than
      // reusing this destroyed one.
      onDestroy?.();
    },
  };

  return handle;
}
