import '@testing-library/jest-dom';

// Polyfill for Custom Elements and Shadow DOM if needed
if (!window.customElements) {
  window.customElements = {
    define: () => {},
    get: () => undefined,
  } as any;
}
import { getTestConfig } from './getTestConfig';
globalThis.getTestConfig = getTestConfig;

// JSDOM doesn't implement Constructed Stylesheets (adoptedStyleSheets) fully.
// Some tests call APIs that ultimately call CSSStyleSheet.replaceSync which
// is not present in JSDOM. Provide a tiny no-op polyfill to silence stderr
// noise while preserving test behavior.
if (
  typeof (window as any).CSSStyleSheet === 'function' &&
  typeof (window as any).CSSStyleSheet.prototype.replaceSync !== 'function'
) {
  (window as any).CSSStyleSheet.prototype.replaceSync = function () {
    // no-op: JSDOM will still accept style text via other code paths; this
    // avoids noisy TypeErrors during the test run. Keep it intentionally
    // tiny to avoid changing behavior.
    return undefined;
  };
}
