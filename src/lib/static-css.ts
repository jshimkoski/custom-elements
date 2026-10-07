import { _registerRenderBridge } from './runtime/render-bridge';

/** Install build-generated utility and prose CSS into every rendered shadow root.
 * All possible classes must be present in the scanned sources or safelist.
 * Import this entry instead of jit-css to keep the generator out of the browser.
 */
export function enableStaticCSS(styles: string): void {
  _registerRenderBridge(() => true, () => styles, () => null);
}
