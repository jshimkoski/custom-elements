import type { VNode } from '../types';
import { component } from '../component';
import { getCurrentComponentContext } from '../hooks';

/**
 * Options for `defineAsyncComponent`.
 */
export interface AsyncComponentOptions {
  /**
   * Render function shown while the async component is loading.
   * Defaults to rendering nothing (empty fragment).
   */
  loading?: () => VNode | VNode[];
  /**
   * Render function shown when the loader Promise rejects or times out.
   * Defaults to rendering nothing.
   */
  error?: () => VNode | VNode[];
  /**
   * Maximum milliseconds to wait before treating the loader as timed out.
   * When exceeded, the component transitions to the `error` state.
   * Defaults to no timeout.
   */
  timeout?: number;
}

type AsyncComponentState = 'idle' | 'loading' | 'resolved' | 'error' | 'timeout';

/**
 * Defines a component whose render function is loaded asynchronously.
 *
 * On first render a loading placeholder is shown (if provided). When the
 * loader resolves the real component is registered under the same tag name
 * and the element re-renders with the full implementation.
 *
 * This is the Web Components equivalent of Vue's `defineAsyncComponent` /
 * React's `React.lazy`.
 *
 * @example
 * ```ts
 * // app/components/heavy-editor.ts
 * defineAsyncComponent(
 *   'heavy-editor',
 *   () => import('./heavy-editor-impl.ts').then(m => m.renderFn),
 *   { loading: () => html`<p>Loading editor…</p>` },
 * )
 * ```
 *
 * @param tag - Custom element tag name (must contain a hyphen).
 * @param loader - A function that returns a Promise resolving to a render
 *   function `() => VNode | VNode[]`.
 * @param options - Optional loading/error placeholders and timeout.
 */
export function defineAsyncComponent(
  tag: string,
  loader: () => Promise<() => VNode | VNode[]>,
  options?: AsyncComponentOptions,
): void {
  let state: AsyncComponentState = 'idle';
  let resolvedRenderFn: (() => VNode | VNode[]) | null = null;

  // Mutable reference updated on every real render so `settle` always calls
  // the most-recent live `requestRender`. This avoids the pitfall where the
  // first invocation of the render function is the framework's discovery render
  // (which supplies a no-op `requestRender`) and `load()` would otherwise
  // capture that no-op permanently.
  const rerenderRef: { fn: () => void } = { fn: (): void => {} };

  let loaderStarted = false;
  let settled = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const settle = (nextState: AsyncComponentState, fn?: () => VNode | VNode[]): void => {
    if (settled) return;
    settled = true;
    if (timeoutId !== null) clearTimeout(timeoutId);
    if (fn) resolvedRenderFn = fn;
    state = nextState;
    rerenderRef.fn();
  };

  const startLoader = (): void => {
    if (loaderStarted) return;
    loaderStarted = true;
    state = 'loading';

    if (options?.timeout != null) {
      timeoutId = setTimeout(() => settle('timeout'), options.timeout);
    }

    loader()
      .then((renderFn) => settle('resolved', renderFn))
      .catch(() => settle('error'));
  };

  component(tag, () => {
    // Always refresh the rerender reference from the current render context.
    // The discovery render (prop introspection) supplies a no-op requestRender;
    // real renders supply the live element requestRender. By updating on every
    // call, settle() will use the most-recent live context when it fires.
    const ctx = getCurrentComponentContext() as { requestRender?: () => void } | null;
    if (typeof ctx?.requestRender === 'function') {
      rerenderRef.fn = (): void => { ctx.requestRender!(); };
    }

    switch (state) {
      case 'idle':
        startLoader();
        return (options?.loading?.() ?? []) as VNode | VNode[];
      case 'loading':
        return (options?.loading?.() ?? []) as VNode | VNode[];
      case 'resolved':
        return resolvedRenderFn!();
      case 'error':
      case 'timeout':
        return (options?.error?.() ?? []) as VNode | VNode[];
    }
  });
}
