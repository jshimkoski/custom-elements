import '@testing-library/jest-dom';

// Polyfill for Custom Elements and Shadow DOM if needed
if (!window.customElements) {
  window.customElements = {
    define: () => {},
    get: () => undefined,
  } as any;
}
