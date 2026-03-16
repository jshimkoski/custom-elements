/**
 * Built-in utility components provided by the custom-elements runtime.
 *
 * These components are registered automatically when this module is imported.
 * They are designed to be minimal, tree-shakeable, and zero-dependency.
 *
 * Included components:
 * - `<cer-suspense>` — Shows a fallback while async work is pending
 * - `<cer-error-boundary>` — Catches render errors and shows a fallback UI
 * - `<cer-keep-alive>` — Preserves component state across DOM removal/re-insertion
 */

import { component } from './component';
import { html } from './template-compiler';
import { ref } from './reactive';
import { useProps, useOnError, useExpose } from './hooks';
import { registerKeepAlive } from '../keep-alive';

// ── cer-suspense ──────────────────────────────────────────────────────────────

/**
 * A built-in component that conditionally renders either the default slot
 * content or the `fallback` slot content, controlled by the `pending` prop.
 *
 * Use the `pending` attribute/property to signal that async work is in
 * progress; the component will swap to the `fallback` slot until `pending`
 * becomes falsy.
 *
 * @example
 * ```html
 * <cer-suspense pending>
 *   <!-- shown when pending=false -->
 *   <my-async-content></my-async-content>
 *
 *   <!-- shown while pending=true -->
 *   <div slot="fallback">Loading…</div>
 * </cer-suspense>
 * ```
 *
 * @example Programmatic usage
 * ```ts
 * component('my-data-loader', () => {
 *   const pending = ref(true);
 *   useOnConnected(async () => {
 *     await fetchData();
 *     pending.value = false;
 *   });
 *   return html`
 *     <cer-suspense pending="${pending.value}">
 *       <my-data-view></my-data-view>
 *       <div slot="fallback">Loading data…</div>
 *     </cer-suspense>
 *   `;
 * });
 * ```
 */
export function registerSuspense(): void {
  if (typeof customElements !== 'undefined' && customElements.get('cer-suspense')) return;

  component('cer-suspense', () => {
    const { pending } = useProps({ pending: false });

    return pending
      ? html`<slot name="fallback"><span>Loading…</span></slot>`
      : html`<slot></slot>`;
  });
}

// ── cer-error-boundary ────────────────────────────────────────────────────────

/**
 * A built-in component that catches errors thrown during child component
 * rendering and displays a fallback UI instead of crashing the page.
 *
 * Errors are caught via the `useOnError` lifecycle hook. Once an error is
 * caught the component switches to showing the `fallback` named slot (or a
 * default "Something went wrong" message if no fallback slot is provided).
 *
 * Call the custom `reset()` method on the element to clear the error and
 * attempt re-rendering the default slot.
 *
 * @example
 * ```html
 * <cer-error-boundary>
 *   <my-risky-component></my-risky-component>
 *
 *   <div slot="fallback">
 *     <p>Something went wrong. <button onclick="this.closest('cer-error-boundary').reset()">Retry</button></p>
 *   </div>
 * </cer-error-boundary>
 * ```
 */
export function registerErrorBoundary(): void {
  if (typeof customElements !== 'undefined' && customElements.get('cer-error-boundary')) return;

  component('cer-error-boundary', () => {
    const hasError = ref(false);
    const errorMessage = ref('');

    useOnError((err: Error) => {
      hasError.value = true;
      errorMessage.value = err.message;
    });

    // Expose a reset() method so parent templates can call
    // `errorBoundaryRef.value.reset()` to clear the error and retry.
    // Also expose an internal `_cerHandleChildError` receiver so that the
    // component runtime can propagate uncaught errors from slotted child
    // components up to the nearest ancestor <cer-error-boundary>.
    useExpose({
      _cerHandleChildError: (err: unknown) => {
        // Use peek() to read the current value without registering a reactive
        // dependency — the child component's render context may be active when
        // this handler runs, and we must not accidentally subscribe the child
        // to this boundary's internal state.
        if (!hasError.peek()) {
          hasError.value = true;
          errorMessage.value = err instanceof Error ? err.message : String(err);
        }
      },
      reset: () => {
        hasError.value = false;
        errorMessage.value = '';
      },
    });

    return hasError.value
      ? html`<slot name="fallback"
          ><div role="alert">
            <strong>Something went wrong.</strong>
            ${errorMessage.value ? html`<p>${errorMessage.value}</p>` : html``}
          </div></slot
        >`
      : html`<slot></slot>`;
  });
}

// ── Auto-register all components ─────────────────────────────────────────────

/**
 * Register all built-in components (`cer-suspense`, `cer-error-boundary`,
 * `cer-keep-alive`).
 * Safe to call multiple times — each registration is guarded by a
 * `customElements.get()` check.
 */
export function registerBuiltinComponents(): void {
  registerSuspense();
  registerErrorBoundary();
  registerKeepAlive();
}
