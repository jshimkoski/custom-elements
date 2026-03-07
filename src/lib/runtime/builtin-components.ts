/**
 * Built-in utility components provided by the custom-elements runtime.
 *
 * These components are registered automatically when this module is imported.
 * They are designed to be minimal, tree-shakeable, and zero-dependency.
 *
 * Included components:
 * - `<ce-suspense>` — Shows a fallback while async work is pending
 * - `<ce-error-boundary>` — Catches render errors and shows a fallback UI
 */

import { component } from './component';
import { html } from './template-compiler';
import { ref } from './reactive';
import { useProps, useOnError } from './hooks';

// ── ce-suspense ──────────────────────────────────────────────────────────────

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
 * <ce-suspense pending>
 *   <!-- shown when pending=false -->
 *   <my-async-content></my-async-content>
 *
 *   <!-- shown while pending=true -->
 *   <div slot="fallback">Loading…</div>
 * </ce-suspense>
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
 *     <ce-suspense pending="${pending.value}">
 *       <my-data-view></my-data-view>
 *       <div slot="fallback">Loading data…</div>
 *     </ce-suspense>
 *   `;
 * });
 * ```
 */
export function registerCeSuspense(): void {
  if (customElements.get('ce-suspense')) return;

  component('ce-suspense', () => {
    const { pending } = useProps({ pending: false });

    return pending
      ? html`<slot name="fallback"><span>Loading…</span></slot>`
      : html`<slot></slot>`;
  });
}

// ── ce-error-boundary ────────────────────────────────────────────────────────

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
 * <ce-error-boundary>
 *   <my-risky-component></my-risky-component>
 *
 *   <div slot="fallback">
 *     <p>Something went wrong. <button onclick="this.closest('ce-error-boundary').reset()">Retry</button></p>
 *   </div>
 * </ce-error-boundary>
 * ```
 */
export function registerCeErrorBoundary(): void {
  if (customElements.get('ce-error-boundary')) return;

  component('ce-error-boundary', () => {
    const hasError = ref(false);
    const errorMessage = ref('');

    useOnError((err: Error) => {
      hasError.value = true;
      errorMessage.value = err.message;
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

// ── Auto-register both components ────────────────────────────────────────────

/**
 * Register all built-in components (`ce-suspense`, `ce-error-boundary`).
 * Safe to call multiple times — each registration is guarded by a
 * `customElements.get()` check.
 */
export function registerBuiltinComponents(): void {
  registerCeSuspense();
  registerCeErrorBoundary();
}
