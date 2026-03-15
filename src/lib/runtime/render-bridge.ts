/**
 * Lazy render bridge — populated by style.ts when the JIT engine is imported.
 *
 * render.ts always imports this module (so it is always bundled), but
 * style.ts (the full JIT engine, ~24 KB gzip) is only bundled when the
 * consumer explicitly imports JIT CSS symbols such as `enableJITCSS` or
 * `useJITCSS`. When style.ts IS imported it registers itself here so that
 * render.ts can call back into the JIT engine without a static dependency.
 *
 * Result: consumers that never use JIT CSS get zero JIT code in their bundle.
 */

type JITChecker = (root: ShadowRoot) => boolean;
type JITProcessor = (html: string) => string;
type ProseSheetGetter = () => CSSStyleSheet | null;

let _jitChecker: JITChecker | null = null;
let _jitProcessor: JITProcessor | null = null;
let _proseGetter: ProseSheetGetter | null = null;

/**
 * Register the JIT CSS engine with the render pipeline.
 * Called by style.ts at module load time so renders automatically get
 * JIT processing without render.ts needing to import style.ts directly.
 * @internal
 */
export function _registerRenderBridge(
  checker: JITChecker,
  processor: JITProcessor,
  proseGetter: ProseSheetGetter,
): void {
  _jitChecker = checker;
  _jitProcessor = processor;
  _proseGetter = proseGetter;
}

/**
 * Returns true when JIT CSS should run for the given shadow root.
 * Returns false if the JIT engine is not loaded.
 */
export function isJITCSSActiveFor(root: ShadowRoot): boolean {
  return _jitChecker ? _jitChecker(root) : false;
}

/**
 * Run JIT CSS processing over the aggregated HTML string.
 * Returns empty string if the JIT engine is not loaded.
 */
export function processJITCSS(html: string): string {
  return _jitProcessor ? _jitProcessor(html) : '';
}

/**
 * Get the prose stylesheet singleton.
 * Returns null if the JIT engine is not loaded or no prose classes detected.
 */
export function getProseStyleSheet(): CSSStyleSheet | null {
  return _proseGetter ? _proseGetter() : null;
}
