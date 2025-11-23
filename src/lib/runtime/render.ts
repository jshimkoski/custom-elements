import { vdomRenderer } from './vdom';
import { setAttributeSmart } from './namespace-helpers';
import {
  minifyCSS,
  getBaseResetSheet,
  getProseSheet,
  sanitizeCSS,
  jitCSS,
  baseReset,
} from './style';
import { getTransitionStyleSheet } from '../transitions';
import type { ComponentConfig, ComponentContext, VNode, Refs } from './types';
import { devWarn, devError } from './logger';

// Module-level stack for context injection (scoped to render cycle, no global pollution)
export const contextStack: unknown[] = [];

// Cache for tracking last aggregated HTML per shadowRoot to avoid redundant jitCSS calls
const aggregatedHtmlCache = new WeakMap<ShadowRoot, string>();

// Cache for tracking child component elements per shadowRoot for faster aggregation
const childComponentCache = new WeakMap<ShadowRoot, Set<HTMLElement>>();

/**
 * Style application configuration and result
 */
interface StyleApplicationResult {
  shouldUpdateStyles: boolean;
  aggregatedHtml: string;
  jitCss: string;
  proseSheet: CSSStyleSheet | null;
  userStyle: string;
}

/**
 * Register a child component element for faster HTML aggregation
 * @internal
 */
export function registerChildComponent(
  shadowRoot: ShadowRoot,
  childEl: HTMLElement,
): void {
  if (!childComponentCache.has(shadowRoot)) {
    childComponentCache.set(shadowRoot, new Set());
  }
  childComponentCache.get(shadowRoot)!.add(childEl);
}

/**
 * Unregister a child component element when it's removed
 * @internal
 */
export function unregisterChildComponent(
  shadowRoot: ShadowRoot,
  childEl: HTMLElement,
): void {
  const cache = childComponentCache.get(shadowRoot);
  if (cache) {
    cache.delete(childEl);
  }
}

/**
 * Renders the component output.
 */
export function renderComponent<
  S extends object,
  C extends object,
  P extends object,
  T extends object,
>(
  shadowRoot: ShadowRoot | null,
  cfg: ComponentConfig<S, C, P, T>,
  context: ComponentContext<S, C, P, T>,
  refs: Refs['refs'],
  setHtmlString: (html: string) => void,
  setLoading: (val: boolean) => void,
  setError: (err: Error | null) => void,
  applyStyle: (html: string) => void,
): void {
  if (!shadowRoot) return;

  // Push context to stack before rendering
  contextStack.push(context);

  try {
    const outputOrPromise = cfg.render(context);

    if (outputOrPromise instanceof Promise) {
      setLoading(true);
      outputOrPromise
        .then((output) => {
          setLoading(false);
          setError(null);
          renderOutput(shadowRoot, output, context, refs, setHtmlString);
          applyStyle(shadowRoot.innerHTML);
        })
        .catch((error) => {
          setLoading(false);
          setError(error);
        });
      return;
    }

    renderOutput(shadowRoot, outputOrPromise, context, refs, setHtmlString);
    applyStyle(shadowRoot.innerHTML);
  } finally {
    // Always pop context from stack after rendering (ensures cleanup even on errors)
    contextStack.pop();
  }
}

/**
 * Renders VNode(s) to the shadowRoot.
 */
export function renderOutput<
  S extends object,
  C extends object,
  P extends object,
  T extends object,
>(
  shadowRoot: ShadowRoot | null,
  output: VNode | VNode[],
  context: ComponentContext<S, C, P, T>,
  refs: Refs['refs'],
  setHtmlString: (html: string) => void,
): void {
  if (!shadowRoot) return;
  vdomRenderer(
    shadowRoot,
    Array.isArray(output) ? output : [output],
    context,
    refs,
  );
  setHtmlString(shadowRoot.innerHTML);
}

/**
 * Debounced render request with infinite loop protection.
 */
export function requestRender(
  renderFn: () => void,
  lastRenderTime: number,
  renderCount: number,
  setLastRenderTime: (t: number) => void,
  setRenderCount: (c: number) => void,
  renderTimeoutId: ReturnType<typeof setTimeout> | null,
  setRenderTimeoutId: (id: ReturnType<typeof setTimeout> | null) => void,
): void {
  if (renderTimeoutId !== null) clearTimeout(renderTimeoutId);

  const now = Date.now();
  const isRapidRender = now - lastRenderTime < 16;

  if (isRapidRender) {
    setRenderCount(renderCount + 1);
    // Progressive warnings and limits
    if (renderCount === 15) {
      devWarn(
        '⚠️ Component is re-rendering rapidly. This might indicate:\n' +
          '  Common causes:\n' +
          '  • Event handler calling a function immediately: @click="${fn()}" should be @click="${fn}"\n' +
          '  • State modification during render\n' +
          '  • Missing dependencies in computed/watch\n' +
          '  Component rendering will be throttled to prevent browser freeze.',
      );
    } else if (renderCount > 20) {
      devError(
        '🛑 Infinite loop detected in component render:\n' +
          '  • This might be caused by state updates during render\n' +
          '  • Ensure all state modifications are done in event handlers or effects\n' +
          'Stopping runaway component render to prevent browser freeze',
      );
      setRenderTimeoutId(null);
      return;
    }
  } else {
    setRenderCount(0);
  }

  // Schedule renders intelligently based on render frequency
  const delay = renderCount >= 10 ? 100 : 0;

  if (delay > 0) {
    const timeoutId = setTimeout(() => {
      setLastRenderTime(Date.now());
      renderFn();
      setRenderTimeoutId(null);
    }, delay);
    setRenderTimeoutId(timeoutId);
  } else {
    // Use microtask for immediate renders to stay close to Promise timing
    const token = {};
    setRenderTimeoutId(token as unknown as ReturnType<typeof setTimeout>);
    queueMicrotask(() => {
      setLastRenderTime(Date.now());
      try {
        renderFn();
      } finally {
        setRenderTimeoutId(null);
      }
    });
  }
}

/**
 * Aggregates HTML from child components using cached references for performance
 */
function aggregateChildHTML(shadowRoot: ShadowRoot, baseHtml: string): string {
  let aggregatedHtml = baseHtml || '';

  try {
    const childComponents = childComponentCache.get(shadowRoot);

    if (childComponents && childComponents.size > 0) {
      // Fast path: iterate only registered child components
      for (const el of childComponents) {
        const childHtml = getChildComponentHTML(el);
        if (childHtml) {
          aggregatedHtml += '\n' + childHtml;
        }
      }
    } else {
      // Fallback: scan for child components if cache not initialized
      const allEls = Array.from(
        shadowRoot.querySelectorAll('*'),
      ) as HTMLElement[];
      for (const el of allEls) {
        const childHtml = getChildComponentHTML(el);
        if (childHtml) {
          aggregatedHtml += '\n' + childHtml;
        }
      }
    }
  } catch {
    // Best-effort: ignore errors while reading child HTML
  }

  return aggregatedHtml;
}

/**
 * Safely extracts HTML string from child component element
 */
function getChildComponentHTML(el: HTMLElement): string {
  try {
    const childHtml = (el as { lastHtmlStringForJitCSS?: string })
      .lastHtmlStringForJitCSS;
    return childHtml && typeof childHtml === 'string' && childHtml.trim()
      ? childHtml
      : '';
  } catch {
    return '';
  }
}

/**
 * Prepares style application by aggregating HTML and checking cache
 */
function prepareStyleApplication<
  S extends object,
  C extends object,
  P extends object,
  T extends object,
>(
  shadowRoot: ShadowRoot,
  context: ComponentContext<S, C, P, T>,
  htmlString: string,
): StyleApplicationResult {
  const aggregatedHtml = aggregateChildHTML(shadowRoot, htmlString);

  // Check if aggregated HTML has changed since last render
  const cachedHtml = aggregatedHtmlCache.get(shadowRoot);
  const shouldUpdateStyles = cachedHtml !== aggregatedHtml;

  if (shouldUpdateStyles) {
    aggregatedHtmlCache.set(shadowRoot, aggregatedHtml);
  }

  const jitCss = jitCSS(aggregatedHtml);
  const proseSheet = getProseSheet();
  const userStyle =
    (context as { _computedStyle?: string })._computedStyle || '';

  return {
    shouldUpdateStyles,
    aggregatedHtml,
    jitCss,
    proseSheet,
    userStyle,
  };
}

/**
 * Applies base styles when no custom styles are needed
 */
function applyBaseStyles(
  shadowRoot: ShadowRoot,
  proseSheet: CSSStyleSheet | null,
): void {
  const supportsAdopted =
    'adoptedStyleSheets' in shadowRoot && typeof CSSStyleSheet !== 'undefined';

  if (supportsAdopted) {
    const sheets = [getBaseResetSheet(), getTransitionStyleSheet()];
    if (proseSheet) sheets.push(proseSheet);
    shadowRoot.adoptedStyleSheets = sheets;
  } else {
    applyFallbackStyles(shadowRoot, '', proseSheet);
  }
}

/**
 * Applies custom styles using constructable stylesheets when available
 */
function applyConstructableStyles(
  shadowRoot: ShadowRoot,
  finalStyle: string,
  proseSheet: CSSStyleSheet | null,
  styleSheet: CSSStyleSheet | null,
  setStyleSheet: (sheet: CSSStyleSheet | null) => void,
): boolean {
  const supportsAdopted =
    'adoptedStyleSheets' in shadowRoot && typeof CSSStyleSheet !== 'undefined';

  if (!supportsAdopted) return false;

  let sheet = styleSheet;
  if (!sheet) sheet = new CSSStyleSheet();

  try {
    sheet.replaceSync(finalStyle);
  } catch {
    return false; // Fall back to style element
  }

  const sheets = [getBaseResetSheet(), getTransitionStyleSheet()];
  if (proseSheet) sheets.push(proseSheet);
  sheets.push(sheet);

  shadowRoot.adoptedStyleSheets = sheets;
  setStyleSheet(sheet);
  return true;
}

/**
 * Creates fallback CSS text from various style sources
 */
function createFallbackCSS(userStyle: string): string {
  const baseText = minifyCSS(baseReset);
  const transitionSheet = getTransitionStyleSheet();

  let transitionText = '';
  try {
    if (transitionSheet && 'cssRules' in transitionSheet) {
      transitionText = Array.from(transitionSheet.cssRules)
        .map((r) => r.cssText)
        .join('\n');
    }
  } catch {
    transitionText = '';
  }

  return minifyCSS(`${baseText}\n${transitionText}\n${userStyle}`);
}

/**
 * Applies styles via fallback <style> element for older browsers
 */
function applyFallbackStyles(
  shadowRoot: ShadowRoot,
  finalStyle: string,
  proseSheet: CSSStyleSheet | null,
): void {
  const combined = createFallbackCSS(finalStyle);

  let el = shadowRoot.querySelector(
    'style[data-cer-runtime]',
  ) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    setAttributeSmart(el, 'data-cer-runtime', 'true');
    shadowRoot.appendChild(el);
  }

  try {
    el.textContent = combined;
  } catch {
    // Ignore parse errors in test environments
  }

  // Provide stubbed adoptedStyleSheets for consistency in tests
  stubAdoptedStyleSheets(shadowRoot, finalStyle, proseSheet);
}

/**
 * Creates stub adoptedStyleSheets array for test compatibility
 */
function stubAdoptedStyleSheets(
  shadowRoot: ShadowRoot,
  finalStyle: string,
  proseSheet: CSSStyleSheet | null,
): void {
  try {
    const fallbackSheets: unknown[] = [
      getBaseResetSheet(),
      getTransitionStyleSheet(),
    ];
    if (proseSheet) fallbackSheets.push(proseSheet);

    if (typeof CSSStyleSheet !== 'undefined' && finalStyle) {
      try {
        const userSheet = new CSSStyleSheet();
        userSheet.replaceSync(finalStyle);
        fallbackSheets.push(userSheet);
      } catch {
        // Include harmless stub if replaceSync fails
        fallbackSheets.push({ cssRules: [], replaceSync: () => {} });
      }
    }

    (
      shadowRoot as unknown as { adoptedStyleSheets?: unknown[] }
    ).adoptedStyleSheets = fallbackSheets;
  } catch {
    // Ignore if assignment fails
  }
}

/**
 * Applies styles to the shadowRoot with improved structure and maintainability.
 */
export function applyStyle<
  S extends object,
  C extends object,
  P extends object,
  T extends object,
>(
  shadowRoot: ShadowRoot | null,
  context: ComponentContext<S, C, P, T>,
  htmlString: string,
  styleSheet: CSSStyleSheet | null,
  setStyleSheet: (sheet: CSSStyleSheet | null) => void,
): void {
  if (!shadowRoot) return;

  const { shouldUpdateStyles, jitCss, proseSheet, userStyle } =
    prepareStyleApplication(shadowRoot, context, htmlString);

  // Early return if HTML unchanged and no styles to apply
  if (!shouldUpdateStyles && !userStyle && !proseSheet) {
    return;
  }

  // If no custom styles are needed, apply only base styles
  if ((!jitCss || jitCss.trim() === '') && !userStyle && !proseSheet) {
    setStyleSheet(null);
    applyBaseStyles(shadowRoot, proseSheet);
    return;
  }

  // Prepare final custom styles
  const finalStyle = sanitizeCSS(`${userStyle}\n${jitCss}\n`);
  const minifiedStyle = minifyCSS(finalStyle);

  // Try constructable stylesheets first
  if (
    applyConstructableStyles(
      shadowRoot,
      minifiedStyle,
      proseSheet,
      styleSheet,
      setStyleSheet,
    )
  ) {
    return;
  }

  // Fall back to style element
  applyFallbackStyles(shadowRoot, minifiedStyle, proseSheet);
  setStyleSheet(null);
}
