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

  return {
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
    },
  };
}
