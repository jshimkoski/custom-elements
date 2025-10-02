import { vdomRenderer } from "./vdom";
import { minifyCSS, getBaseResetSheet, sanitizeCSS, jitCSS } from "./style";
import { getTransitionStyleSheet } from "../transitions";
import type { ComponentConfig, ComponentContext, VNode, Refs } from "./types";
import { devWarn, devError } from "./logger";

// Module-level stack for context injection (scoped to render cycle, no global pollution)
export const contextStack: any[] = [];

/**
 * Renders the component output.
 */
export function renderComponent<S extends object, C extends object, P extends object, T extends object>(
  shadowRoot: ShadowRoot | null,
  cfg: ComponentConfig<S, C, P, T>,
  context: ComponentContext<S, C, P, T>,
  refs: Refs["refs"],
  setHtmlString: (html: string) => void,
  setLoading: (val: boolean) => void,
  setError: (err: Error | null) => void,
  applyStyle: (html: string) => void
): void {
  if (!shadowRoot) return;

  // Push context to stack before rendering
  contextStack.push(context);

  try {
    // Loading and error states are now handled directly in the functional components
    // rather than through config templates

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
          // Error handling is now done in the functional components directly
        });

      // Loading state is now handled in the functional components directly
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
export function renderOutput<S extends object, C extends object, P extends object, T extends object>(
  shadowRoot: ShadowRoot | null,
  output: VNode | VNode[],
  context: ComponentContext<S, C, P, T>,
  refs: Refs["refs"],
  setHtmlString: (html: string) => void
): void {
  if (!shadowRoot) return;
  vdomRenderer(
    shadowRoot,
    Array.isArray(output) ? output : [output],
    context,
    refs
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
  setRenderTimeoutId: (id: ReturnType<typeof setTimeout> | null) => void
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
        '  Component rendering will be throttled to prevent browser freeze.'
      );
    } else if (renderCount > 20) {
      // More aggressive limit for severe infinite loops
      devError(
        '🛑 Infinite loop detected in component render:\n' +
        '  • This might be caused by state updates during render\n' +
        '  • Ensure all state modifications are done in event handlers or effects\n' +
        'Stopping runaway component render to prevent browser freeze'
      );
      setRenderTimeoutId(null);
      return;
    }
  } else {
    setRenderCount(0);
  }

  const timeoutId = setTimeout(() => {
    setLastRenderTime(Date.now());
    renderFn();
    setRenderTimeoutId(null);
  }, renderCount > 10 ? 100 : 0); // Add delay for rapid renders
  setRenderTimeoutId(timeoutId);
}

/**
 * Applies styles to the shadowRoot.
 */
export function applyStyle<S extends object, C extends object, P extends object, T extends object>(
  shadowRoot: ShadowRoot | null,
  context: ComponentContext<S, C, P, T>,
  htmlString: string,
  styleSheet: CSSStyleSheet | null,
  setStyleSheet: (sheet: CSSStyleSheet | null) => void
): void {
  if (!shadowRoot) return;

  const jitCss = jitCSS(htmlString);

  if ((!jitCss || jitCss.trim() === "") && !(context as any)._computedStyle) {
    setStyleSheet(null);
    shadowRoot.adoptedStyleSheets = [getBaseResetSheet(), getTransitionStyleSheet()];
    return;
  }

  let userStyle = "";
  
  // Check for precomputed style from useStyle hook
  if ((context as any)._computedStyle) {
    userStyle = (context as any)._computedStyle;
  }

  let finalStyle = sanitizeCSS(`${userStyle}\n${jitCss}\n`);
  finalStyle = minifyCSS(finalStyle);

  let sheet = styleSheet;
  if (!sheet) sheet = new CSSStyleSheet();
  
  // Compare by replacing the stylesheet entirely if rules changed
  // Avoid using .toString() which may not be reliable across browsers
  const needsUpdate = sheet.cssRules.length === 0 || 
    (sheet.cssRules.length > 0 && Array.from(sheet.cssRules).map(r => r.cssText).join('') !== finalStyle);
  
  if (needsUpdate) {
    sheet.replaceSync(finalStyle);
  }
  
  shadowRoot.adoptedStyleSheets = [getBaseResetSheet(), getTransitionStyleSheet(), sheet];
  setStyleSheet(sheet);
}