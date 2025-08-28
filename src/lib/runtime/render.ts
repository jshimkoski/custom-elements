import { vdomRenderer } from "./vdom";
import { minifyCSS, getBaseResetSheet, sanitizeCSS, jitCSS } from "./style";
import type { ComponentConfig, ComponentContext, VNode, Refs } from "./types";

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

  if (cfg.loadingTemplate && context.isLoading) {
    renderOutput(shadowRoot, cfg.loadingTemplate(context), context, refs, setHtmlString);
    return;
  }

  if (cfg.errorTemplate && context.hasError) {
    if (context.error instanceof Error) {
      renderOutput(shadowRoot, cfg.errorTemplate(context.error, context), context, refs, setHtmlString);
    }
    return;
  }

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
        if (cfg.errorTemplate)
          renderOutput(shadowRoot, cfg.errorTemplate(error, context), context, refs, setHtmlString);
      });

    if (cfg.loadingTemplate)
      renderOutput(shadowRoot, cfg.loadingTemplate(context), context, refs, setHtmlString);
    return;
  }

  renderOutput(shadowRoot, outputOrPromise, context, refs, setHtmlString);
  applyStyle(shadowRoot.innerHTML);
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
 * Debounced render request.
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
  if (now - lastRenderTime < 16) {
    setRenderCount(renderCount + 1);
    if (renderCount > 10) {
      console.warn("Potential infinite render loop detected. Skipping render.");
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
  }, 0);
  setRenderTimeoutId(timeoutId);
}

/**
 * Applies styles to the shadowRoot.
 */
export function applyStyle<S extends object, C extends object, P extends object, T extends object>(
  shadowRoot: ShadowRoot | null,
  cfg: ComponentConfig<S, C, P, T>,
  context: ComponentContext<S, C, P, T>,
  htmlString: string,
  styleSheet: CSSStyleSheet | null,
  setStyleSheet: (sheet: CSSStyleSheet | null) => void
): void {
  if (!shadowRoot) return;

  const jitCss = jitCSS(htmlString);

  if (!cfg.style && (!jitCss || jitCss.trim() === "")) {
    setStyleSheet(null);
    shadowRoot.adoptedStyleSheets = [getBaseResetSheet()];
    return;
  }

  let userStyle = "";
  if (cfg.style) {
    if (typeof cfg.style === "string") userStyle = cfg.style;
    else if (typeof cfg.style === "function") userStyle = cfg.style(context);
  }

  let finalStyle = sanitizeCSS(`${userStyle}\n${jitCss}\n`);
  finalStyle = minifyCSS(finalStyle);

  let sheet = styleSheet;
  if (!sheet) sheet = new CSSStyleSheet();
  if (sheet.cssRules.length === 0 || sheet.toString() !== finalStyle) {
    sheet.replaceSync(finalStyle);
  }
  shadowRoot.adoptedStyleSheets = [getBaseResetSheet(), sheet];
  setStyleSheet(sheet);
}