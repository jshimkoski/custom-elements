/**
 * Client-side hydration helpers.
 *
 * When the server renders with `dsd: true`, each custom element's shadow DOM
 * is already present in the HTML via a Declarative Shadow DOM template. The
 * browser parses that template and attaches the shadow root before any
 * JavaScript runs. When the JS bundle loads, the custom element constructors
 * detect the existing shadow root and skip the `attachShadow()` call, then
 * hydrate (attach reactivity to) the existing DOM on `connectedCallback`.
 *
 * `hydrateApp` is a signal/entry point for this process. In most cases custom
 * elements self-hydrate automatically on connection — this function is useful
 * when you need to explicitly trigger or defer the hydration of a subtree.
 */

/**
 * Trigger hydration for all registered custom elements within `root`.
 *
 * In practice, custom elements self-hydrate as soon as their class definition
 * is registered and the element is connected to the DOM. Call `hydrateApp`
 * after importing and calling `component()` for all your components to signal
 * that the page is ready for reactive activation.
 *
 * @param root - The root element to hydrate. Defaults to `document`.
 *
 * @example
 * ```ts
 * import { component, hydrateApp } from '@jasonshimmy/custom-elements-runtime';
 * import './components'; // registers all components via component()
 *
 * hydrateApp(); // activate all DSD-rendered components on the page
 * ```
 */
export function hydrateApp(root: Element | Document = document): void {
  if (typeof CustomEvent === 'undefined') return;
  const target =
    root instanceof Document ? root.documentElement : (root as Element);
  target.dispatchEvent(
    new CustomEvent('cer:hydrate', { bubbles: true, composed: true }),
  );
}
