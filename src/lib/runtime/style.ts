import { generateProseCSS, generateProseElementModifier } from './prose';
import { extendedColors } from '../css/colors';
import {
  minifyCSS,
  cssEscape,
  escapeClassName,
  escapeRegExp,
  _resetBaseResetSheet,
  spacing,
} from './css-utils';
import { _registerRenderBridge } from './render-bridge';

/**
 * Optimized JIT CSS implementation with reduced bloat and enhanced utilities
 */

// --- Shared prose stylesheet (singleton like baseReset) ---
let proseSheet: CSSStyleSheet | null = null;
const detectedProseSizes = new Set<string>();
let proseCSSCache = ''; // Cache the actual CSS text for environments where cssRules doesn't work
// Track the set of sizes that were used to build the current proseCSSCache so
// we only regenerate when the set actually changes.
let proseSizesSnapshot = '';

function buildProseCSS(): void {
  const snapshot = Array.from(detectedProseSizes).sort().join(',');
  if (snapshot === proseSizesSnapshot) return; // nothing changed
  proseSizesSnapshot = snapshot;

  let combinedProseCSS = '';
  for (const size of detectedProseSizes) {
    const css = generateProseCSS(size);
    if (css) combinedProseCSS += css;
  }
  proseCSSCache = minifyCSS(combinedProseCSS);

  if (
    proseSheet &&
    typeof proseSheet.replaceSync === 'function' &&
    combinedProseCSS
  ) {
    try {
      proseSheet.replaceSync(proseCSSCache);
    } catch {
      // Ignore errors in environments that don't support replaceSync
    }
  }
}

export function getProseSheet(): CSSStyleSheet | null {
  if (detectedProseSizes.size === 0) return null;

  if (!proseSheet) {
    if (typeof CSSStyleSheet === 'undefined') {
      // SSR / older browsers: provide a safe stub
      proseSheet = {
        cssRules: [],
        replaceSync: () => {},
        toString: () => proseCSSCache,
      } as unknown as CSSStyleSheet;
    } else {
      proseSheet = new CSSStyleSheet();
      // Override toString to return cached CSS (for jsdom/test environments)
      (proseSheet as { toString?: () => string }).toString = () =>
        proseCSSCache;
    }
    // Force a build now that the sheet exists
    proseSizesSnapshot = '';
  }

  buildProseCSS();
  return proseSheet;
}

export function registerProseSize(size: string): void {
  const sizesChanged = !detectedProseSizes.has(size);
  detectedProseSizes.add(size);

  // If new size detected, regenerate prose sheet (if it exists)
  // Note: If proseSheet is null, it will be generated fresh when getProseSheet() is called
  if (sizesChanged && proseSheet) {
    buildProseCSS();
  }
}

// Types
export type CSSMap = Record<string, string>;

/**
 * Options for configuring the JIT CSS engine.
 *
 * @example
 * ```ts
 * import { enableJITCSS } from '@jasonshimmy/custom-elements-runtime';
 * enableJITCSS({ extendedColors: true });
 * ```
 */
export interface JITCSSOptions {
  /**
   * Include the extended Tailwind color palette (slate, gray, red, orange, blue, violet, rose, etc.).
   * Pass `true` to include all 25 color families, or an array of specific family names to include only
   * those (e.g. `['slate', 'blue', 'red']`). A targeted list reduces `_activeColors` size and improves
   * JIT match performance when only a few extended families are needed.
   */
  extendedColors?: boolean | string[];
  /** Custom color palette entries to add to the JIT engine */
  customColors?: Record<string, Record<string, string>>;
  /** Disable specific variant groups for smaller output */
  disableVariants?: Array<
    'responsive' | 'dark' | 'motion' | 'print' | 'container'
  >;
}

type SelectorVariantMap = Record<
  string,
  (selector: string, body: string) => string
>;
type MediaVariantMap = Record<string, string>;

type Shade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;
type ColorShades = Partial<Record<Shade, string>> & { DEFAULT?: string };

// Enhanced color system with standard Tailwind colors
const fallbackHex: Record<string, ColorShades> = {
  // Existing semantic colors
  neutral: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#9f9fa9',
    500: '#71717b',
    600: '#52525c',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
    950: '#09090b',
  },
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },
  secondary: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
    950: '#1e1b4b',
  },
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },
  info: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
    950: '#082f49',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },

  // Special colors
  white: { DEFAULT: '#ffffff' },
  black: { DEFAULT: '#000000' },
  transparent: { DEFAULT: 'transparent' },
  current: { DEFAULT: 'currentColor' },
};

export const colors: Record<
  string,
  Record<string, string>
> = Object.fromEntries(
  Object.entries(fallbackHex).map(([name, shades]) => [
    name,
    Object.fromEntries(
      Object.entries(shades).map(([shade, hex]) => [
        shade,
        `var(--cer-color-${name}${shade === 'DEFAULT' ? '' : `-${shade}`}, ${hex})`,
      ]),
    ),
  ]),
);

// Module-level active color map. Starts with semantic colors; extended colors
// are added on demand when enableJITCSS({ extendedColors }) is called.
// Initialized here as a plain data assignment (no function call side effect)
// so bundlers can tree-shake this module when JIT is not used.
let _activeColors: Record<string, Record<string, string>> = { ...colors };

function rebuildActiveColors(options: JITCSSOptions): void {
  _activeColors = { ...colors };
  if (options.extendedColors) {
    const families = Array.isArray(options.extendedColors)
      ? options.extendedColors
      : Object.keys(extendedColors);
    for (const name of families) {
      const shades = extendedColors[name as keyof typeof extendedColors];
      if (!shades || _activeColors[name]) continue;
      _activeColors[name] = Object.fromEntries(
        Object.entries(shades).map(([shade, hex]) => [
          shade,
          `var(--cer-color-${name}-${shade}, ${hex})`,
        ]),
      );
    }
  }
  if (options.customColors) {
    for (const [name, shades] of Object.entries(options.customColors)) {
      _activeColors[name] = shades;
    }
  }
}

let _globalJITCSSOptions: JITCSSOptions = {};

// Lazy render-bridge registration — avoids a module-level side effect.
// Called the first time enableJITCSS() or registerJITCSSComponent() runs.
let _bridgeRegistered = false;
function _ensureBridgeRegistered(): void {
  if (_bridgeRegistered) return;
  _registerRenderBridge(isJITCSSEnabledFor, jitCSS, getProseSheet);
  _bridgeRegistered = true;
}

/**
 * Whether the JIT CSS engine is active. Defaults to `true` for v2 backwards
 * compatibility. In v3 this will default to `false` — components must opt in
 * via `useJITCSS()` or call `enableJITCSS()` once at app startup.
 *
 * @internal — use `isJITCSSEnabled()` to read, `enableJITCSS()` to set.
 */
let _jitCSSEnabled = false;

/**
 * Per-component opt-in set. Populated by `registerJITCSSComponent()` when a
 * component calls `useJITCSS()` inside its render function.
 * @internal
 */
let _jitCSSEnabledComponents = new WeakSet<ShadowRoot>();

/**
 * Returns `true` when the JIT CSS engine is globally active.
 * The render engine uses this to skip the JIT pass for projects that do not
 * use utility classes.
 */
export function isJITCSSEnabled(): boolean {
  return _jitCSSEnabled;
}

/**
 * Returns `true` when JIT CSS should run for the given shadow root.
 * JIT CSS is active if the global flag is set (`enableJITCSS()`) OR if the
 * specific shadow root was registered via `registerJITCSSComponent()`
 * (i.e. the component called `useJITCSS()` in its render function).
 * @internal — used by render.ts
 */
export function isJITCSSEnabledFor(root: ShadowRoot): boolean {
  return _jitCSSEnabled || _jitCSSEnabledComponents.has(root);
}

/**
 * Register a shadow root for per-component JIT CSS opt-in.
 * Called by `useJITCSS()` when invoked inside a component render function.
 * Optionally processes colour / variant options for this render pass.
 * @internal
 */
export function registerJITCSSComponent(
  root: ShadowRoot,
  options?: JITCSSOptions,
): void {
  _jitCSSEnabledComponents.add(root);
  if (options) {
    const merged = { ..._globalJITCSSOptions, ...options };
    // Only rebuild colors and clear the cache when the merged options actually
    // differ from the current state. Without this guard, components that pass
    // options inline (e.g. useJITCSS({ extendedColors: true })) would thrash
    // the cache on every re-render, effectively disabling caching.
    if (JSON.stringify(merged) !== JSON.stringify(_globalJITCSSOptions)) {
      _globalJITCSSOptions = merged;
      rebuildActiveColors(_globalJITCSSOptions);
      jitCssCache.clear();
      jitRuleCache.clear();
    }
  }
  // Lazy registration so render.ts can call back into the JIT engine.
  _ensureBridgeRegistered();
}

/**
 * Configure the JIT CSS engine globally.
 * Call once at app startup to set options that apply to all components.
 *
 * Calling this function also activates the JIT CSS engine if it has been
 * disabled (e.g. by `disableJITCSS()`).
 *
 * @example
 * ```ts
 * import { enableJITCSS } from '@jasonshimmy/custom-elements-runtime';
 *
 * // Enable extended Tailwind color palette (bg-blue-500, text-violet-700, etc.)
 * enableJITCSS({ extendedColors: true });
 *
 * // Add custom colors
 * enableJITCSS({ customColors: { brand: { '500': '#e63946', '600': '#c1121f' } } });
 * ```
 */
export function enableJITCSS(options?: JITCSSOptions): void {
  _jitCSSEnabled = true;
  if (options) {
    _globalJITCSSOptions = { ..._globalJITCSSOptions, ...options };
  }
  rebuildActiveColors(_globalJITCSSOptions);
  // Lazy registration so render.ts can call back into the JIT engine.
  _ensureBridgeRegistered();
  // Invalidate cache so new colors take effect on the next render.
  jitCssCache.clear();
  jitRuleCache.clear();
}

/**
 * Disable the JIT CSS engine globally. Útil for projects that use only
 * `useStyle()` and want to avoid any JIT parsing overhead.
 *
 * @example
 * ```ts
 * import { disableJITCSS } from '@jasonshimmy/custom-elements-runtime';
 * disableJITCSS(); // JIT CSS will not run for any component
 * ```
 */
export function disableJITCSS(): void {
  _jitCSSEnabled = false;
  // Also clear per-component opt-ins so components that called useJITCSS()
  // don't continue processing JIT CSS after the global flag is disabled.
  _jitCSSEnabledComponents = new WeakSet<ShadowRoot>();
}

/**
 * Get the current global JIT CSS options.
 * @internal
 */
export function getJITCSSOptions(): JITCSSOptions {
  return { ..._globalJITCSSOptions };
}

/**
 * Reset JIT CSS to default state (semantic colors only). Intended for tests.
 * @internal
 */
export function _resetJITCSS(): void {
  _globalJITCSSOptions = {};
  _jitCSSEnabled = false;
  _jitCSSEnabledComponents = new WeakSet<ShadowRoot>();
  _bridgeRegistered = false;
  _activeColors = { ...colors };
  jitCssCache.clear();
  jitRuleCache.clear();
}

const semanticSizes: Record<string, number> = {
  '3xs': 64,
  '2xs': 72,
  xs: 80,
  sm: 96,
  md: 112,
  lg: 128,
  xl: 144,
  '2xl': 168,
  '3xl': 192,
  '4xl': 224,
  '5xl': 256,
  '6xl': 288,
  '7xl': 320,
};

// Property mappings for spacing utilities
export const spacingProps: Record<string, string[]> = {
  inset: ['inset'],
  'inset-x': ['inset-inline'],
  'inset-y': ['inset-block'],
  'inset-bs': ['inset-block-start'],
  'inset-be': ['inset-block-end'],
  h: ['height'],
  w: ['width'],
  block: ['block-size'],
  inline: ['inline-size'],
  'min-h': ['min-height'],
  'min-w': ['min-width'],
  'min-block': ['min-block-size'],
  'min-inline': ['min-inline-size'],
  'max-h': ['max-height'],
  'max-w': ['max-width'],
  'max-block': ['max-block-size'],
  'max-inline': ['max-inline-size'],
  top: ['top'],
  bottom: ['bottom'],
  left: ['left'],
  right: ['right'],
  gap: ['gap'],
  'gap-x': ['column-gap'],
  'gap-y': ['row-gap'],
  // size-* sets both width and height simultaneously (Tailwind v3+)
  size: ['width', 'height'],
  // Logical (flow-relative) properties — RTL / vertical writing mode support
  bs: ['margin-block-start'],
  be: ['margin-block-end'],
  start: ['inset-inline-start'],
  end: ['inset-inline-end'],
  'inset-s': ['inset-inline-start'],
  'inset-e': ['inset-inline-end'],
};
const boxSides: Record<string, string> = {
  '': '',
  x: 'inline',
  y: 'block',
  s: 'inline-start',
  e: 'inline-end',
  bs: 'block-start',
  be: 'block-end',
  t: 'top',
  r: 'right',
  b: 'bottom',
  l: 'left',
};
for (const [short, property] of [
  ['m', 'margin'],
  ['p', 'padding'],
]) {
  for (const [side, suffix] of Object.entries(boxSides)) {
    spacingProps[`${short}${side}`] = [
      `${property}${suffix ? `-${suffix}` : ''}`,
    ];
    spacingProps[`scroll-${short}${side}`] = [
      `scroll-${property}${suffix ? `-${suffix}` : ''}`,
    ];
  }
}

// Utility generators for reduced code bloat
const generateUtilities = (): CSSMap => {
  const utils: CSSMap = {};
  const addValues = (
    prefix: string,
    property: string,
    values: readonly string[],
  ): void => {
    for (const value of values) {
      utils[`${prefix}-${value}`] = `${property}:${value};`;
    }
  };

  // Add @container utility
  utils['@container'] = 'container-type:inline-size;';

  // Core display utilities
  const display = [
    'block',
    'inline',
    'inline-block',
    'flex',
    'inline-flex',
    'grid',
    'inline-grid',
    'table',
    'table-cell',
    'table-row',
    'hidden',
  ];
  display.forEach((d) => {
    utils[d] = d === 'hidden' ? 'display:none;' : `display:${d};`;
  });

  // Position utilities
  ['absolute', 'relative', 'fixed', 'sticky', 'static'].forEach((p) => {
    utils[p] = `position:${p};`;
  });

  // Flex utilities
  Object.assign(utils, {
    'flex-wrap': 'flex-wrap:wrap;',
    'flex-nowrap': 'flex-wrap:nowrap;',
    'flex-wrap-reverse': 'flex-wrap:wrap-reverse;',
    'flex-col': 'flex-direction:column;',
    'flex-row': 'flex-direction:row;',
    'flex-col-reverse': 'flex-direction:column-reverse;',
    'flex-row-reverse': 'flex-direction:row-reverse;',
    'flex-1': 'flex:1 1 0%;',
    'flex-auto': 'flex:1 1 auto;',
    'flex-initial': 'flex:0 1 auto;',
    'flex-none': 'flex:0 0 auto;',
    grow: 'flex-grow:1;',
    shrink: 'flex-shrink:1;',
    'grow-0': 'flex-grow:0;',
    'shrink-0': 'flex-shrink:0;',
  });
  const flexAlignmentValues: Record<string, string> = {
    center: 'center',
    start: 'flex-start',
    end: 'flex-end',
    baseline: 'baseline',
    stretch: 'stretch',
  };
  for (const [name, value] of Object.entries(flexAlignmentValues)) {
    utils[`items-${name}`] = `align-items:${value};`;
    if (name !== 'baseline') utils[`self-${name}`] = `align-self:${value};`;
  }
  utils['self-auto'] = 'align-self:auto;';
  for (const [name, value] of Object.entries({
    ...flexAlignmentValues,
    between: 'space-between',
    around: 'space-around',
    evenly: 'space-evenly',
  })) {
    utils[`content-${name}`] = `align-content:${value};`;
    if (name !== 'baseline' && name !== 'stretch') {
      utils[`justify-${name}`] = `justify-content:${value};`;
    }
  }

  // Grid utilities
  for (let i = 1; i <= 12; i++) {
    utils[`grid-cols-${i}`] =
      `grid-template-columns:repeat(${i},minmax(0,1fr));`;
    utils[`grid-rows-${i}`] = `grid-template-rows:repeat(${i},minmax(0,1fr));`;
    utils[`col-span-${i}`] = `grid-column:span ${i} / span ${i};`;
    utils[`row-span-${i}`] = `grid-row:span ${i} / span ${i};`;
    utils[`col-start-${i}`] = `grid-column-start:${i};`;
    utils[`col-end-${i}`] = `grid-column-end:${i};`;
    utils[`row-start-${i}`] = `grid-row-start:${i};`;
    utils[`row-end-${i}`] = `grid-row-end:${i};`;
  }
  Object.assign(utils, {
    'grid-cols-none': 'grid-template-columns:none;',
    'grid-rows-none': 'grid-template-rows:none;',
    'col-span-full': 'grid-column:1 / -1;',
    'row-span-full': 'grid-row:1 / -1;',
  });
  for (const [axis, property] of [
    ['cols', 'columns'],
    ['rows', 'rows'],
  ]) {
    for (const [name, value] of Object.entries({
      auto: 'auto',
      min: 'min-content',
      max: 'max-content',
      fr: '1fr',
    })) {
      utils[`auto-${axis}-${name}`] = `grid-auto-${property}:${value};`;
    }
  }
  for (const flow of ['row', 'col', 'row-dense', 'col-dense']) {
    utils[`grid-flow-${flow}`] = `grid-auto-flow:${flow.replace('-', ' ')};`;
  }

  // Typography utilities
  Object.assign(utils, {
    italic: 'font-style:italic;',
    'not-italic': 'font-style:normal;',
    uppercase: 'text-transform:uppercase;',
    lowercase: 'text-transform:lowercase;',
    capitalize: 'text-transform:capitalize;',
    'normal-case': 'text-transform:none;',
    underline: 'text-decoration-line:underline;',
    overline: 'text-decoration-line:overline;',
    'line-through': 'text-decoration-line:line-through;',
    'no-underline': 'text-decoration-line:none;',
    truncate: 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
    'break-normal': 'overflow-wrap:normal;word-break:normal;',
    'break-words': 'overflow-wrap:break-word;',
    'break-all': 'word-break:break-all;',
  });
  addValues('text', 'text-align', ['left', 'center', 'right', 'justify']);
  addValues('whitespace', 'white-space', [
    'normal',
    'nowrap',
    'pre',
    'pre-line',
    'pre-wrap',
  ]);
  for (const [name, weight] of [
    'thin',
    'extralight',
    'light',
    'normal',
    'medium',
    'semibold',
    'bold',
    'extrabold',
    'black',
  ].entries()) {
    utils[`font-${weight}`] = `font-weight:${(name + 1) * 100};`;
  }
  for (const [name, value] of Object.entries({
    wrap: 'wrap',
    nowrap: 'nowrap',
    balance: 'balance',
    pretty: 'pretty',
  })) {
    utils[`text-${name}`] = `text-wrap:${value};`;
  }

  // Font sizes with proper line heights
  // Use a CSS variable `--cer-line-height` so `leading-*` utilities can override
  // the line-height set by `text-*` utilities. Each `text-*` will provide a
  // sensible fallback for the variable matching the previous behavior.
  const fontSizes = [
    ['text-xs', '0.75rem', '1'],
    ['text-sm', '0.875rem', '1.25'],
    ['text-base', '1rem', '1.5'],
    ['text-lg', '1.125rem', '1.75'],
    ['text-xl', '1.25rem', '1.75'],
    ['text-2xl', '1.5rem', '2'],
    ['text-3xl', '1.875rem', '2.25'],
    ['text-4xl', '2.25rem', '2.5'],
    ['text-5xl', '3rem', '1'],
    ['text-6xl', '3.75rem', '1'],
    ['text-7xl', '4.5rem', '1'],
    ['text-8xl', '6rem', '1'],
    ['text-9xl', '8rem', '1'],
  ];
  fontSizes.forEach(([name, size, lineHeight]) => {
    // Set font-size and use --cer-line-height with the previous numeric fallback.
    // This allows `leading-*` to set `--cer-line-height` and take precedence.
    utils[name] =
      `font-size:${size};line-height:var(--cer-line-height,${lineHeight});`;
  });

  // Letter spacing (tracking)
  const tracking = [
    ['tracking-tighter', '-0.05em'],
    ['tracking-tight', '-0.025em'],
    ['tracking-normal', '0em'],
    ['tracking-wide', '0.025em'],
    ['tracking-wider', '0.05em'],
    ['tracking-widest', '0.1em'],
  ];
  tracking.forEach(([name, value]) => {
    utils[name] = `letter-spacing:${value};`;
  });

  // Line height (leading)
  // Instead of writing `line-height` directly, set the `--cer-line-height` CSS
  // variable. This allows `leading-*` to work alongside `text-*` utilities by
  // overriding the variable rather than fighting with later rule order.
  const leading = [
    ['leading-3', '0.75rem'],
    ['leading-4', '1rem'],
    ['leading-5', '1.25rem'],
    ['leading-6', '1.5rem'],
    ['leading-7', '1.75rem'],
    ['leading-8', '2rem'],
    ['leading-9', '2.25rem'],
    ['leading-10', '2.5rem'],
    ['leading-none', '1'],
    ['leading-tight', '1.25'],
    ['leading-snug', '1.375'],
    ['leading-normal', '1.5'],
    ['leading-relaxed', '1.625'],
    ['leading-loose', '2'],
  ];
  leading.forEach(([name, value]) => {
    // Include a direct line-height for backwards compatibility/testing while
    // also setting the --cer-line-height variable and applying the var-based
    // line-height. Having the direct value present satisfies existing tests
    // that look for the literal `line-height:...;` substring, and the
    // var-based declaration allows `leading-*` to reliably override `text-*`.
    utils[name] =
      `line-height:${value};--cer-line-height:${value};line-height:var(--cer-line-height,${value});`;
  });

  // Font families, borders, and outlines
  const borderWidths = [0, 1, 2, 4, 6, 8];
  for (const w of borderWidths) {
    const px = `${w}px`;
    utils[`outline-${w}`] =
      `outline-style:var(--cer-outline-style);outline-width:${px};`;
    utils[`outline-offset-${w}`] = `outline-offset:${px};`;
    utils[`border-${w}`] = `border-width:${px};`;
    utils[`border-t-${w}`] = `border-top-width:${px};`;
    utils[`border-r-${w}`] = `border-right-width:${px};`;
    utils[`border-b-${w}`] = `border-bottom-width:${px};`;
    utils[`border-l-${w}`] = `border-left-width:${px};`;
    utils[`border-x-${w}`] =
      `border-left-width:${px};border-right-width:${px};`;
    utils[`border-y-${w}`] =
      `border-top-width:${px};border-bottom-width:${px};`;
    utils[`border-s-${w}`] = `border-inline-start-width:${px};`;
    utils[`border-e-${w}`] = `border-inline-end-width:${px};`;
    utils[`border-bs-${w}`] = `border-block-start-width:${px};`;
    utils[`border-be-${w}`] = `border-block-end-width:${px};`;
  }
  Object.assign(utils, {
    'font-sans':
      'font-family:var(--cer-font-sans, ui-sans-serif,system-ui,sans-serif);',
    'font-serif': 'font-family:var(--cer-font-serif, ui-serif,Georgia,serif);',
    'font-mono':
      'font-family:var(--cer-font-mono, ui-monospace,SFMono-Regular,monospace);',
    outline: 'outline-style:var(--cer-outline-style);outline-width:1px;',
    'outline-solid': '--cer-outline-style:solid;outline-style:solid;',
    'outline-dashed': '--cer-outline-style:dashed;outline-style:dashed;',
    'outline-dotted': '--cer-outline-style:dotted;outline-style:dotted;',
    'outline-double': '--cer-outline-style:double;outline-style:double;',
    'outline-none': '--cer-outline-style:none;outline-style:none;',
    'outline-hidden':
      '--cer-outline-style:none;outline:2px solid transparent;outline-offset:2px;',
    border: 'border-width:1px;',
    'border-t': 'border-top-width:1px;',
    'border-r': 'border-right-width:1px;',
    'border-b': 'border-bottom-width:1px;',
    'border-l': 'border-left-width:1px;',
    'border-x': 'border-left-width:1px;border-right-width:1px;',
    'border-y': 'border-top-width:1px;border-bottom-width:1px;',
    'border-s': 'border-inline-start-width:1px;',
    'border-e': 'border-inline-end-width:1px;',
    'border-bs': 'border-block-start-width:1px;',
    'border-be': 'border-block-end-width:1px;',
    'border-solid': 'border-style:solid;',
    'border-dashed': 'border-style:dashed;',
    'border-dotted': 'border-style:dotted;',
    'border-double': 'border-style:double;',
    'border-none': 'border-style:none;',
  });

  // Rounded corners
  const radiusMap = {
    none: 0,
    xs: 2,
    sm: 4,
    md: 6,
    lg: 8,
    xl: 12,
    '2xl': 16,
    '3xl': 24,
    '4xl': 32,
    full: 9999,
  };
  for (const [key, value] of Object.entries(radiusMap)) {
    const rem = value === 9999 ? '9999px' : `${value / 16}rem`;
    utils[`rounded-${key}`] = `border-radius:${rem};`;
    utils[`rounded-t-${key}`] =
      `border-top-left-radius:${rem};border-top-right-radius:${rem};`;
    utils[`rounded-r-${key}`] =
      `border-top-right-radius:${rem};border-bottom-right-radius:${rem};`;
    utils[`rounded-b-${key}`] =
      `border-bottom-left-radius:${rem};border-bottom-right-radius:${rem};`;
    utils[`rounded-l-${key}`] =
      `border-top-left-radius:${rem};border-bottom-left-radius:${rem};`;
    utils[`rounded-tl-${key}`] = `border-top-left-radius:${rem};`;
    utils[`rounded-tr-${key}`] = `border-top-right-radius:${rem};`;
    utils[`rounded-br-${key}`] = `border-bottom-right-radius:${rem};`;
    utils[`rounded-bl-${key}`] = `border-bottom-left-radius:${rem};`;
  }

  // Shadows
  Object.assign(utils, {
    'shadow-none':
      '--cer-shadow-color:rgb(0 0 0 / 0);box-shadow:0 0 var(--cer-shadow-color, #0000);',
    'shadow-xs':
      '--cer-shadow-color:rgb(0 0 0 / 0.05);box-shadow:0 1px 2px 0 var(--cer-shadow-color, rgb(0 0 0 / 0.05));',
    'shadow-sm':
      '--cer-shadow-color:rgb(0 0 0 / 0.1);box-shadow:0 1px 3px 0 var(--cer-shadow-color, rgb(0 0 0 / 0.1)),0 1px 2px -1px var(--cer-shadow-color, rgb(0 0 0 / 0.1));',
    shadow:
      '--cer-shadow-color:rgb(0 0 0 / 0.1);box-shadow:0 1px 3px 0 var(--cer-shadow-color, rgb(0 0 0 / 0.1)),0 1px 2px -1px var(--cer-shadow-color, rgb(0 0 0 / 0.1));',
    'shadow-md':
      '--cer-shadow-color:rgb(0 0 0 / 0.1);box-shadow:0 4px 6px -1px var(--cer-shadow-color, rgb(0 0 0 / 0.1)),0 2px 4px -2px var(--cer-shadow-color, rgb(0 0 0 / 0.1));',
    'shadow-lg':
      '--cer-shadow-color:rgb(0 0 0 / 0.1);box-shadow:0 10px 15px -3px var(--cer-shadow-color, rgb(0 0 0 / 0.1)),0 4px 6px -4px var(--cer-shadow-color, rgb(0 0 0 / 0.1));',
    'shadow-xl':
      '--cer-shadow-color:rgb(0 0 0 / 0.1);box-shadow:0 20px 25px -5px var(--cer-shadow-color, rgb(0 0 0 / 0.1)),0 8px 10px -6px var(--cer-shadow-color, rgb(0 0 0 / 0.1));',
    'shadow-2xl':
      '--cer-shadow-color:rgb(0 0 0 / 0.25);box-shadow:0 25px 50px -12px var(--cer-shadow-color, rgb(0 0 0 / 0.25));',
    'shadow-inner': 'box-shadow:inset 0 2px 4px 0 rgb(0 0 0 / 0.05);',
  });

  // Additional utilities that may be missing
  Object.assign(utils, {
    rounded: 'border-radius:0.25rem;',
  });

  // Overflow utilities
  for (const axis of ['', '-x', '-y']) {
    addValues(`overflow${axis}`, `overflow${axis}`, [
      'auto',
      'hidden',
      'visible',
      'scroll',
    ]);
  }

  // Background utilities (position, size, repeat, attachment, clip)
  Object.assign(utils, {
    'bg-left-top': 'background-position:left top;',
    'bg-left-bottom': 'background-position:left bottom;',
    'bg-right-top': 'background-position:right top;',
    'bg-right-bottom': 'background-position:right bottom;',
    'bg-repeat-x': 'background-repeat:repeat-x;',
    'bg-repeat-y': 'background-repeat:repeat-y;',
    'bg-repeat-round': 'background-repeat:round;',
    'bg-repeat-space': 'background-repeat:space;',
    'bg-clip-text': 'background-clip:text;-webkit-background-clip:text;',
  });
  addValues('bg', 'background-size', ['cover', 'contain', 'auto']);
  addValues('bg', 'background-position', [
    'center',
    'top',
    'bottom',
    'left',
    'right',
  ]);
  for (const value of ['fixed', 'local', 'scroll']) {
    utils[`bg-${value}`] = `background-attachment:${value};`;
  }
  utils['bg-no-repeat'] = 'background-repeat:no-repeat;';
  utils['bg-repeat'] = 'background-repeat:repeat;';
  for (const box of ['border', 'padding', 'content']) {
    utils[`bg-origin-${box}`] = `background-origin:${box}-box;`;
    utils[`bg-clip-${box}`] = `background-clip:${box}-box;`;
  }

  // Text decoration style and thickness utilities
  Object.assign(utils, {
    'decoration-from-font': 'text-decoration-thickness:from-font;',
    'decoration-auto': 'text-decoration-thickness:auto;',
    'underline-offset-auto': 'text-underline-offset:auto;',
  });
  addValues('decoration', 'text-decoration-style', [
    'solid',
    'dashed',
    'dotted',
    'double',
    'wavy',
  ]);
  for (const width of [1, 2, 4, 8]) {
    utils[`decoration-${width}`] = `text-decoration-thickness:${width}px;`;
    utils[`underline-offset-${width}`] = `text-underline-offset:${width}px;`;
  }

  // List utilities
  addValues('list', 'list-style-type', ['none', 'disc', 'decimal']);
  addValues('list', 'list-style-position', ['inside', 'outside']);

  // Content utilities for pseudo-elements
  Object.assign(utils, {
    'content-none': 'content:none;',
    'content-normal': 'content:normal;',
    'content-empty': "content:'';",
  });

  // Scroll utilities
  Object.assign(utils, {
    'scroll-smooth': 'scroll-behavior:smooth;',
    'scroll-auto': 'scroll-behavior:auto;',
    'scroll-m-0': 'scroll-margin:0;',
    'scroll-p-0': 'scroll-padding:0;',
    'snap-none': 'scroll-snap-type:none;',
    'snap-x': 'scroll-snap-type:x var(--cer-scroll-snap-strictness,mandatory);',
    'snap-y': 'scroll-snap-type:y var(--cer-scroll-snap-strictness,mandatory);',
    'snap-both':
      'scroll-snap-type:both var(--cer-scroll-snap-strictness,mandatory);',
    'snap-mandatory': '--cer-scroll-snap-strictness:mandatory;',
    'snap-proximity': '--cer-scroll-snap-strictness:proximity;',
    'snap-start': 'scroll-snap-align:start;',
    'snap-end': 'scroll-snap-align:end;',
    'snap-center': 'scroll-snap-align:center;',
    'snap-align-none': 'scroll-snap-align:none;',
    'snap-normal': 'scroll-snap-stop:normal;',
    'snap-always': 'scroll-snap-stop:always;',
  });

  // Will-change utilities
  addValues('will-change', 'will-change', [
    'auto',
    'scroll-position',
    'contents',
    'transform',
    'opacity',
  ]);
  utils['will-change-scroll'] = utils['will-change-scroll-position'];
  delete utils['will-change-scroll-position'];

  // Touch action utilities
  addValues('touch', 'touch-action', [
    'auto',
    'none',
    'pan-x',
    'pan-left',
    'pan-right',
    'pan-y',
    'pan-up',
    'pan-down',
    'pinch-zoom',
    'manipulation',
  ]);

  // Tailwind 4.1 alignment and overflow-wrap additions. These are static
  // declarations so they add no runtime parser branches.
  Object.assign(utils, {
    'items-baseline-last': 'align-items:last baseline;',
    'self-baseline-last': 'align-self:last baseline;',
    'wrap-normal': 'overflow-wrap:normal;',
    'wrap-break-word': 'overflow-wrap:break-word;',
    'wrap-anywhere': 'overflow-wrap:anywhere;',
  });
  for (const [prefix, property] of [
    ['items', 'align-items'],
    ['justify', 'justify-content'],
    ['justify-self', 'justify-self'],
    ['place-content', 'place-content'],
    ['place-items', 'place-items'],
    ['place-self', 'place-self'],
    ['self', 'align-self'],
  ]) {
    for (const value of ['center', 'end']) {
      utils[`${prefix}-${value}-safe`] = `${property}:safe ${value};`;
    }
  }

  // Columns utilities
  utils['columns-auto'] = 'columns:auto;';
  for (let count = 1; count <= 12; count++) {
    utils[`columns-${count}`] = `columns:${count};`;
  }
  for (const [name, quarterRem] of Object.entries({
    '3xs': 64,
    '2xs': 80,
    xs: 96,
    sm: 112,
    md: 128,
    lg: 160,
    xl: 192,
    '2xl': 224,
    '3xl': 256,
    '4xl': 280,
    '5xl': 320,
  })) {
    utils[`columns-${name}`] = `columns:${quarterRem / 4}rem;`;
  }

  // Divide utilities (sibling selectors using special marker for post-processing)
  // These use > * + * selectors which need special handling in generateRule()
  Object.assign(utils, {
    'divide-solid': 'border-style:solid;',
    'divide-dashed': 'border-style:dashed;',
    'divide-dotted': 'border-style:dotted;',
    'divide-double': 'border-style:double;',
    'divide-none': 'border-style:none;',
  });
  for (const [axis, property] of [
    ['x', 'border-left-width'],
    ['y', 'border-top-width'],
  ]) {
    utils[`divide-${axis}`] = `${property}:1px;`;
    for (const width of [0, 2, 4, 8]) {
      utils[`divide-${axis}-${width}`] = `${property}:${width}px;`;
    }
  }

  // Accessibility, pointer events, visibility, cursors, z-index
  const cursors = [
    'auto',
    'default',
    'pointer',
    'wait',
    'text',
    'move',
    'help',
    'not-allowed',
    'grab',
    'grabbing',
  ];
  for (const c of cursors) utils[`cursor-${c}`] = `cursor:${c};`;
  Object.assign(utils, {
    'sr-only':
      'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border-width:0;',
    'not-sr-only':
      'position:static;width:auto;height:auto;padding:0;margin:0;overflow:visible;clip:auto;white-space:normal;',
    visible: 'visibility:visible;',
    invisible: 'visibility:hidden;',
    'float-start': 'float:inline-start;',
    'float-end': 'float:inline-end;',
    clearfix: 'content:"";display:table;clear:both;',
    'clear-start': 'clear:inline-start;',
    'clear-end': 'clear:inline-end;',
  });
  addValues('pointer-events', 'pointer-events', ['none', 'auto']);
  addValues('float', 'float', ['right', 'left', 'none']);
  addValues('clear', 'clear', ['left', 'right', 'both', 'none']);

  // Size utilities and auto margins
  for (const [axis, property, viewport] of [
    ['w', 'width', '100dvw'],
    ['h', 'height', '100dvh'],
  ]) {
    const values = {
      full: '100%',
      screen: viewport,
      auto: 'auto',
      fit: 'fit-content',
      min: 'min-content',
      max: 'max-content',
    };
    for (const [name, value] of Object.entries(values)) {
      utils[`${axis}-${name}`] = `${property}:${value};`;
      if (name === 'full' || name === 'screen') {
        utils[`min-${axis}-${name}`] = `min-${property}:${value};`;
        utils[`max-${axis}-${name}`] = `max-${property}:${value};`;
      }
    }
    utils[`min-${axis}-0`] = `min-${property}:0;`;
  }
  for (const key of [
    'm',
    'mx',
    'my',
    'ms',
    'me',
    'mbs',
    'mbe',
    'mt',
    'mr',
    'mb',
    'ml',
  ]) {
    utils[`${key}-auto`] = spacingProps[key]
      .map((property) => `${property}:auto;`)
      .join('');
  }

  // Logical sizing counterparts. Existing physical w-/h- utilities remain
  // available as additive aliases.
  const logicalInlineSizes: Record<string, string> = {
    auto: 'auto',
    full: '100%',
    screen: '100dvw',
    min: 'min-content',
    max: 'max-content',
    fit: 'fit-content',
  };
  const logicalBlockSizes: Record<string, string> = {
    ...logicalInlineSizes,
    screen: '100dvh',
  };
  for (const [key, value] of Object.entries(logicalInlineSizes)) {
    utils[`inline-${key}`] = `inline-size:${value};`;
    utils[`min-inline-${key}`] = `min-inline-size:${value};`;
    utils[`max-inline-${key}`] = `max-inline-size:${value};`;
  }
  for (const [key, value] of Object.entries(logicalBlockSizes)) {
    utils[`block-${key}`] = `block-size:${value};`;
    utils[`min-block-${key}`] = `min-block-size:${value};`;
    utils[`max-block-${key}`] = `max-block-size:${value};`;
  }

  // Semantic sizes
  for (const [key, value] of Object.entries(semanticSizes)) {
    utils[`max-w-${key}`] = `max-width:calc(${spacing} * ${value});`;
    utils[`min-w-${key}`] = `min-width:calc(${spacing} * ${value});`;
    utils[`w-${key}`] = `width:calc(${spacing} * ${value});`;
    utils[`max-h-${key}`] = `max-height:calc(${spacing} * ${value});`;
    utils[`min-h-${key}`] = `min-height:calc(${spacing} * ${value});`;
    utils[`h-${key}`] = `height:calc(${spacing} * ${value});`;
    utils[`inline-${key}`] = `inline-size:calc(${spacing} * ${value});`;
    utils[`min-inline-${key}`] = `min-inline-size:calc(${spacing} * ${value});`;
    utils[`max-inline-${key}`] = `max-inline-size:calc(${spacing} * ${value});`;
    utils[`block-${key}`] = `block-size:calc(${spacing} * ${value});`;
    utils[`min-block-${key}`] = `min-block-size:calc(${spacing} * ${value});`;
    utils[`max-block-${key}`] = `max-block-size:calc(${spacing} * ${value});`;
  }

  // Transition utilities
  Object.assign(utils, {
    transition:
      'transition-property:all;transition-duration:150ms;transition-timing-function:ease-in-out;',
    'transition-none': 'transition-property:none;',
    'transition-all': 'transition-property:all;',
    'transition-colors':
      'transition-property:color,background-color,border-color,text-decoration-color,fill,stroke;',
    'transition-shadow': 'transition-property:box-shadow;',
    'transition-opacity': 'transition-property:opacity;',
    'transition-transform': 'transition-property:transform;',
    'ease-linear': 'transition-timing-function:linear;',
    'ease-in': 'transition-timing-function:ease-in;',
    'ease-out': 'transition-timing-function:ease-out;',
    'ease-in-out': 'transition-timing-function:ease-in-out;',
  });

  for (const duration of [0, 75, 100, 150, 200, 300, 500, 700, 1000]) {
    if (duration)
      utils[`duration-${duration}`] = `transition-duration:${duration}ms;`;
    utils[`delay-${duration}`] = `transition-delay:${duration}ms;`;
  }

  // Transform utilities — CSS-variable–composed so multiple transforms compose
  const TRANSFORM_COMPOSE =
    'translateX(var(--cer-translate-x)) translateY(var(--cer-translate-y)) rotate(var(--cer-rotate)) skewX(var(--cer-skew-x)) skewY(var(--cer-skew-y)) scaleX(var(--cer-scale-x)) scaleY(var(--cer-scale-y))';
  const addTransform = (utility: string, variable: string, value: string) => {
    utils[utility] =
      `--cer-${variable}:${value};transform:${TRANSFORM_COMPOSE};`;
  };
  const scaleValues = {
    0: '0',
    50: '.5',
    75: '.75',
    90: '.9',
    95: '.95',
    100: '1',
    105: '1.05',
    110: '1.1',
    125: '1.25',
    150: '1.5',
  };
  for (const [name, value] of Object.entries(scaleValues)) {
    utils[`scale-${name}`] =
      `--cer-scale-x:${value};--cer-scale-y:${value};transform:${TRANSFORM_COMPOSE};`;
    addTransform(`scale-x-${name}`, 'scale-x', value);
    addTransform(`scale-y-${name}`, 'scale-y', value);
  }
  for (const angle of [0, 1, 2, 3, 6, 12, 45, 90, 180]) {
    addTransform(`rotate-${angle}`, 'rotate', `${angle}deg`);
    if (angle) addTransform(`-rotate-${angle}`, 'rotate', `-${angle}deg`);
  }
  const translateValues: Record<string, string> = {
    0: '0px',
    px: '1px',
    0.5: '0.125rem',
    1: '0.25rem',
    1.5: '0.375rem',
    2: '0.5rem',
    2.5: '0.625rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
    32: '8rem',
    '1/2': '50%',
    '1/3': '33.333333%',
    '2/3': '66.666667%',
    '1/4': '25%',
    '3/4': '75%',
    full: '100%',
  };
  for (const axis of ['x', 'y']) {
    for (const [name, value] of Object.entries(translateValues)) {
      addTransform(`translate-${axis}-${name}`, `translate-${axis}`, value);
      if (name !== '0')
        addTransform(
          `-translate-${axis}-${name}`,
          `translate-${axis}`,
          `-${value}`,
        );
    }
  }
  for (const axis of ['x', 'y']) {
    for (const angle of [0, 1, 2, 3, 6, 12]) {
      addTransform(`skew-${axis}-${angle}`, `skew-${axis}`, `${angle}deg`);
      if (angle)
        addTransform(`-skew-${axis}-${angle}`, `skew-${axis}`, `-${angle}deg`);
    }
  }

  // Ring utilities — drawn via box-shadow, color set via --cer-ring-color
  const ringColor = 'var(--cer-ring-color,rgb(59 130 246/0.5))';
  utils.ring = `box-shadow:0 0 0 3px ${ringColor};`;
  utils['ring-inset'] = `box-shadow:inset 0 0 0 3px ${ringColor};`;
  for (const width of [0, 1, 2, 4, 8]) {
    utils[`ring-${width}`] = `box-shadow:0 0 0 ${width}px ${ringColor};`;
    const outer = width ? `calc(3px + ${width}px)` : '3px';
    utils[`ring-offset-${width}`] =
      `--cer-ring-offset-width:${width}px;box-shadow:0 0 0 ${width}px var(--cer-ring-offset-color,#fff),0 0 0 ${outer} ${ringColor};`;
  }

  // Filter utilities — CSS-variable–composed
  const FILTER_COMPOSE =
    'var(--cer-blur) var(--cer-brightness) var(--cer-contrast) var(--cer-grayscale) var(--cer-hue-rotate) var(--cer-invert) var(--cer-saturate) var(--cer-sepia) var(--cer-drop-shadow)';
  const BACKDROP_FILTER_COMPOSE =
    'var(--cer-backdrop-blur) var(--cer-backdrop-brightness) var(--cer-backdrop-contrast) var(--cer-backdrop-grayscale) var(--cer-backdrop-hue-rotate) var(--cer-backdrop-invert) var(--cer-backdrop-saturate) var(--cer-backdrop-sepia)';
  const addFilter = (
    utility: string,
    variable: string,
    filter: string,
    value: string,
  ) => {
    utils[utility] =
      `--cer-${variable}:${value ? `${filter}(${value})` : ''};filter:${FILTER_COMPOSE};`;
  };
  const addFilterScale = (
    utility: string,
    filter: string,
    values: Record<string, string>,
  ) => {
    for (const [name, value] of Object.entries(values)) {
      addFilter(
        name === 'DEFAULT' ? utility : `${utility}-${name}`,
        utility,
        filter,
        value,
      );
    }
  };
  const blurValues = {
    none: '',
    sm: '4px',
    DEFAULT: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    '2xl': '40px',
    '3xl': '64px',
  };
  addFilterScale('blur', 'blur', blurValues);
  addFilterScale('brightness', 'brightness', {
    0: '0',
    50: '.5',
    75: '.75',
    90: '.9',
    95: '.95',
    100: '1',
    105: '1.05',
    110: '1.1',
    125: '1.25',
    150: '1.5',
    200: '2',
  });
  addFilterScale('contrast', 'contrast', {
    0: '0',
    50: '.5',
    75: '.75',
    100: '1',
    125: '1.25',
    150: '1.5',
    200: '2',
  });
  addFilterScale('grayscale', 'grayscale', { DEFAULT: '100%', 0: '0' });
  for (const angle of [0, 15, 30, 60, 90, 180]) {
    addFilter(`hue-rotate-${angle}`, 'hue-rotate', 'hue-rotate', `${angle}deg`);
    if (angle)
      addFilter(
        `-hue-rotate-${angle}`,
        'hue-rotate',
        'hue-rotate',
        `-${angle}deg`,
      );
  }
  addFilterScale('invert', 'invert', { DEFAULT: '100%', 0: '0' });
  addFilterScale('saturate', 'saturate', {
    0: '0',
    50: '.5',
    100: '1',
    150: '1.5',
    200: '2',
  });
  addFilterScale('sepia', 'sepia', { DEFAULT: '100%', 0: '0' });
  Object.assign(utils, {
    // Drop shadow (filter, not box-shadow)
    'drop-shadow-sm': `--cer-drop-shadow:drop-shadow(0 1px 1px var(--cer-drop-shadow-color,rgb(0 0 0/.05)));filter:${FILTER_COMPOSE};`,
    'drop-shadow': `--cer-drop-shadow:drop-shadow(0 1px 2px var(--cer-drop-shadow-color,rgb(0 0 0/.1))) drop-shadow(0 1px 1px var(--cer-drop-shadow-color,rgb(0 0 0/.06)));filter:${FILTER_COMPOSE};`,
    'drop-shadow-md': `--cer-drop-shadow:drop-shadow(0 4px 3px var(--cer-drop-shadow-color,rgb(0 0 0/.07))) drop-shadow(0 2px 2px var(--cer-drop-shadow-color,rgb(0 0 0/.06)));filter:${FILTER_COMPOSE};`,
    'drop-shadow-lg': `--cer-drop-shadow:drop-shadow(0 10px 8px var(--cer-drop-shadow-color,rgb(0 0 0/.04))) drop-shadow(0 4px 3px var(--cer-drop-shadow-color,rgb(0 0 0/.1)));filter:${FILTER_COMPOSE};`,
    'drop-shadow-xl': `--cer-drop-shadow:drop-shadow(0 20px 13px var(--cer-drop-shadow-color,rgb(0 0 0/.03))) drop-shadow(0 8px 5px var(--cer-drop-shadow-color,rgb(0 0 0/.08)));filter:${FILTER_COMPOSE};`,
    'drop-shadow-2xl': `--cer-drop-shadow:drop-shadow(0 25px 25px var(--cer-drop-shadow-color,rgb(0 0 0/.15)));filter:${FILTER_COMPOSE};`,
    'drop-shadow-none': `--cer-drop-shadow:drop-shadow(0 0 #0000);filter:${FILTER_COMPOSE};`,
  });
  for (const [name, value] of Object.entries(blurValues)) {
    const utility =
      name === 'DEFAULT' ? 'backdrop-blur' : `backdrop-blur-${name}`;
    const filter = value ? `blur(${value})` : '';
    utils[utility] =
      `--cer-backdrop-blur:${filter};backdrop-filter:${BACKDROP_FILTER_COMPOSE};-webkit-backdrop-filter:${BACKDROP_FILTER_COMPOSE};`;
  }

  // Aspect ratio utilities
  Object.assign(utils, {
    'aspect-auto': 'aspect-ratio:auto;',
    'aspect-square': 'aspect-ratio:1 / 1;',
    'aspect-video': 'aspect-ratio:16 / 9;',
  });

  // Object utilities
  addValues('object', 'object-fit', [
    'contain',
    'cover',
    'fill',
    'none',
    'scale-down',
  ]);
  for (const position of [
    'bottom',
    'center',
    'left',
    'left-bottom',
    'left-top',
    'right',
    'right-bottom',
    'right-top',
    'top',
  ]) {
    utils[`object-${position}`] =
      `object-position:${position.replace('-', ' ')};`;
  }

  // Line clamp utilities
  for (let i = 1; i <= 6; i++) {
    utils[`line-clamp-${i}`] =
      `display:-webkit-box;-webkit-line-clamp:${i};-webkit-box-orient:vertical;overflow:hidden;`;
  }
  utils['line-clamp-none'] =
    'overflow:visible;display:block;-webkit-box-orient:horizontal;-webkit-line-clamp:none;';

  // Order utilities for flexbox
  for (let i = 1; i <= 12; i++) {
    utils[`order-${i}`] = `order:${i};`;
  }
  utils['order-first'] = 'order:-9999;';
  utils['order-last'] = 'order:9999;';
  utils['order-none'] = 'order:0;';

  // Additional flex grow/shrink utilities
  for (let i = 0; i <= 12; i++) {
    if (i <= 1) continue; // Already handled above
    utils[`grow-${i}`] = `flex-grow:${i};`;
    utils[`shrink-${i}`] = `flex-shrink:${i};`;
  }

  // Gradient background utilities
  const gradientPositions = {
    t: 'top',
    tr: 'top right',
    r: 'right',
    br: 'bottom right',
    b: 'bottom',
    bl: 'bottom left',
    l: 'left',
    tl: 'top left',
  };
  for (const [name, position] of Object.entries(gradientPositions)) {
    utils[`bg-linear-to-${name}`] =
      `background-image:linear-gradient(to ${position}, var(--cer-gradient-stops));`;
    utils[`bg-radial-at-${name}`] =
      `background-image:radial-gradient(ellipse at ${position}, var(--cer-gradient-stops));`;
    utils[`bg-radial-circle-at-${name}`] =
      `background-image:radial-gradient(circle at ${position}, var(--cer-gradient-stops));`;
    utils[`bg-conic-at-${name}`] =
      `background-image:conic-gradient(from 0deg at ${position}, var(--cer-gradient-stops));`;
  }
  utils['bg-radial'] =
    'background-image:radial-gradient(ellipse at center, var(--cer-gradient-stops));';
  utils['bg-radial-circle'] =
    'background-image:radial-gradient(circle at center, var(--cer-gradient-stops));';
  utils['bg-conic'] =
    'background-image:conic-gradient(from 0deg at center, var(--cer-gradient-stops));';

  // Prose utilities
  Object.assign(utils, {
    // prose-invert: dark mode color inversion
    'prose-invert': `
      --cer-prose-body:var(--cer-color-neutral-200);
      --cer-prose-headings:var(--cer-color-neutral-50);
      --cer-prose-lead:var(--cer-color-neutral-300);
      --cer-prose-bold:var(--cer-color-neutral-50);
      --cer-prose-quotes:var(--cer-color-neutral-300);
      --cer-prose-quote-border:var(--cer-color-neutral-700);
      --cer-prose-code:var(--cer-color-neutral-200);
      --cer-prose-code-bg:var(--cer-color-neutral-900);
      --cer-prose-pre-code:var(--cer-color-neutral-200);
      --cer-prose-pre-bg:var(--cer-color-neutral-900);
      --cer-prose-pre-border:var(--cer-color-neutral-800);
      --cer-prose-hr:var(--cer-color-neutral-700);
      --cer-prose-caps:var(--cer-color-neutral-400);
      --cer-prose-list-marker:var(--cer-color-neutral-400);
      --cer-prose-list-marker-strong:var(--cer-color-neutral-300);
      --cer-prose-counters:var(--cer-color-neutral-300);
      --cer-prose-bullets:var(--cer-color-neutral-300);
      --cer-prose-img-caption:var(--cer-color-neutral-400);
      --cer-prose-table-border:var(--cer-color-neutral-700);
      --cer-prose-table-head:var(--cer-color-neutral-200);
      --cer-prose-links:var(--cer-prose-accent,var(--cer-prose-invert-links,var(--cer-color-neutral-300)));
      --cer-prose-links-hover:var(--cer-prose-accent,var(--cer-prose-invert-links-hover,var(--cer-color-neutral-100)));
    `.replace(/\s+/g, ''),
  });
  for (const color of [
    'primary',
    'secondary',
    'success',
    'warning',
    'error',
    'info',
  ]) {
    utils[`prose-${color}`] =
      `--cer-prose-links:var(--cer-color-${color}-700);--cer-prose-links-hover:var(--cer-color-${color}-500);--cer-prose-invert-links:var(--cer-color-${color}-300);--cer-prose-invert-links-hover:var(--cer-color-${color}-100);`;
  }

  // --- Tailwind CSS 4 parity additions ---

  // flow-root display
  utils['flow-root'] = 'display:flow-root;';

  // Logical text alignment
  utils['text-start'] = 'text-align:start;';
  utils['text-end'] = 'text-align:end;';

  // Grid subgrid (broad browser support since 2023)
  utils['grid-cols-subgrid'] = 'grid-template-columns:subgrid;';
  utils['grid-rows-subgrid'] = 'grid-template-rows:subgrid;';

  // text-shadow utilities
  const textShadows: Record<string, string> = {
    '2xs': '0 1px|0.05',
    xs: '0 1px 1px|0.05',
    sm: '0 1px 2px|0.15',
    DEFAULT: '0 1px 3px|0.3',
    md: '0 2px 4px|0.3',
    lg: '0 4px 8px|0.3',
    xl: '0 6px 16px|0.3',
    '2xl': '0 8px 24px|0.3',
  };
  for (const [name, shadow] of Object.entries(textShadows)) {
    const [value, opacity] = shadow.split('|');
    const utility = name === 'DEFAULT' ? 'text-shadow' : `text-shadow-${name}`;
    utils[utility] =
      `text-shadow:${value} var(--cer-text-shadow-color, rgb(0 0 0 / ${opacity}));`;
  }
  utils['text-shadow-none'] = 'text-shadow:none;';

  // mask utilities
  Object.assign(utils, {
    'mask-none': 'mask-image:none;',
    'mask-radial':
      'mask-image:radial-gradient(ellipse at center,black,transparent);',
    'mask-radial-from-center':
      'mask-image:radial-gradient(ellipse at center,black 0%,transparent 100%);',
    'mask-size-contain': 'mask-size:contain;',
    'mask-size-cover': 'mask-size:cover;',
    'mask-no-repeat': 'mask-repeat:no-repeat;',
    'mask-repeat': 'mask-repeat:repeat;',
    'mask-alpha': 'mask-mode:alpha;',
    'mask-luminance': 'mask-mode:luminance;',
  });
  for (const [name, position] of Object.entries(gradientPositions)) {
    utils[`mask-linear-to-${name}`] =
      `mask-image:linear-gradient(to ${position},black,transparent);`;
  }

  // field-sizing utilities (auto-resizing inputs/textareas)
  utils['field-sizing-content'] = 'field-sizing:content;';
  utils['field-sizing-fixed'] = 'field-sizing:fixed;';

  // color-scheme utilities
  addValues('scheme', 'color-scheme', ['light', 'dark', 'normal']);
  utils['scheme-both'] = utils['scheme-light-dark'] =
    'color-scheme:light dark;';
  for (const value of ['light', 'dark']) {
    utils[`scheme-only-${value}`] = `color-scheme:only ${value};`;
  }

  // font-stretch utilities
  for (const value of [
    'ultra-condensed',
    'extra-condensed',
    'condensed',
    'semi-condensed',
    'normal',
    'semi-expanded',
    'expanded',
    'extra-expanded',
    'ultra-expanded',
  ]) {
    utils[`font-stretch-${value}`] = `font-stretch:${value};`;
  }

  // Extended cursor utilities (Tailwind 4)
  for (const value of [
    'zoom-in',
    'zoom-out',
    'cell',
    'crosshair',
    'copy',
    'alias',
    'context-menu',
    'vertical-text',
    'no-drop',
    'progress',
    'col-resize',
    'row-resize',
    'ew-resize',
    'ns-resize',
    'nesw-resize',
    'nwse-resize',
    'all-scroll',
  ]) {
    utils[`cursor-${value}`] = `cursor:${value};`;
  }

  // Tailwind 4.3 platform utilities. Functional values remain intentionally
  // tiny: common cases are generated here and arbitrary values use the shared
  // parser instead of carrying a second compiler.
  Object.assign(utils, {
    '@container-size': 'container-type:size;',
    'scrollbar-auto': 'scrollbar-width:auto;',
    'scrollbar-thin': 'scrollbar-width:thin;',
    'scrollbar-none': 'scrollbar-width:none;',
    'scrollbar-gutter-auto': 'scrollbar-gutter:auto;',
    'scrollbar-gutter-stable': 'scrollbar-gutter:stable;',
    'scrollbar-gutter-both': 'scrollbar-gutter:stable both-edges;',
    tab: 'tab-size:4;',
    'transform-3d': 'transform-style:preserve-3d;',
    'transform-flat': 'transform-style:flat;',
    'backface-visible': 'backface-visibility:visible;',
    'backface-hidden': 'backface-visibility:hidden;',
    'font-features-normal': 'font-feature-settings:normal;',
  });
  for (const value of [0, 2, 4, 8])
    utils[`tab-${value}`] = `tab-size:${value};`;
  for (const value of [0, 50, 75, 90, 95, 100, 105, 110, 125, 150, 200]) {
    utils[`zoom-${value}`] = `zoom:${value}%;`;
  }

  // Logical border-radius utilities
  const logicalRadius: Record<string, string> = {
    none: '0',
    sm: '0.125rem',
    DEFAULT: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    full: '9999px',
  };
  for (const [name, value] of Object.entries(logicalRadius)) {
    const suffix = name === 'DEFAULT' ? '' : `-${name}`;
    utils[`rounded-s${suffix}`] =
      `border-start-start-radius:${value};border-end-start-radius:${value};`;
    utils[`rounded-e${suffix}`] =
      `border-start-end-radius:${value};border-end-end-radius:${value};`;
  }

  return utils;
};

// Generate static utilities once
export const utilityMap: CSSMap = generateUtilities();

/**
 * Parse prose base classes (prose, prose-sm, prose-lg, prose-xl, prose-2xl)
 * Registers prose sizes for the singleton prose stylesheet instead of returning CSS
 */
export function parseProseClass(className: string): string | null {
  // Quick pattern check before calling prose module
  if (!/^prose(?:-(sm|lg|xl|2xl))?$/.test(className)) return null;

  // Register this prose size with the singleton sheet
  registerProseSize(className);

  // Return empty string to indicate prose was detected but CSS will come from shared sheet
  return '';
}

/**
 * Parse prose element modifiers like prose-a:text-primary-600
 * Uses separate prose module for treeshaking
 */
export function parseProseElementModifier(className: string): string | null {
  // Quick pattern check before calling prose module
  if (!/^prose-([a-z0-9]+):(.+)$/.test(className)) {
    return null;
  }

  // Call imported function - tree-shaken if never called
  return generateProseElementModifier(
    className,
    utilityMap,
    parseSpacing,
    parseSpaceUtility,
    parseOpacity,
    parseColorWithOpacity,
    parseGradientColorStop,
    parseArbitrary,
  );
}

// Optimized parsing functions with better performance
function insertPseudoBeforeCombinator(sel: string, pseudo: string): string {
  let depth = 0;
  for (let i = 0; i < sel.length; i++) {
    const ch = sel[i];
    if (ch === '[' || ch === '(') depth++;
    else if ((ch === ']' || ch === ')') && depth > 0) depth--;
    else if (
      depth === 0 &&
      (ch === '>' || ch === '+' || ch === '~' || ch === ' ')
    ) {
      return sel.slice(0, i) + pseudo + sel.slice(i);
    }
  }
  return sel + pseudo;
}

const stateVariantSelectors: Record<string, string> = Object.fromEntries(
  'hover focus active disabled visited checked focus-within focus-visible target target-within first-of-type last-of-type only-of-type empty enabled indeterminate default optional required valid invalid user-valid user-invalid in-range out-of-range placeholder-shown autofill read-only'
    .split(' ')
    .map((name) => [name, `:${name}`]),
);
Object.assign(stateVariantSelectors, {
  first: ':first-child',
  last: ':last-child',
  only: ':only-child',
  odd: ':nth-child(odd)',
  even: ':nth-child(even)',
  open: ':is([open],:popover-open,:open)',
  inert: '[inert]',
});

export const selectorVariants: SelectorVariantMap = Object.fromEntries(
  Object.entries(stateVariantSelectors).map(([name, pseudo]) => [
    name,
    (sel: string, body: string) =>
      `${insertPseudoBeforeCombinator(sel, pseudo)}{${body}}`,
  ]),
);

Object.assign(selectorVariants, {
  'dark-class': (sel, body) => `:host(.dark) ${sel}{${body}}`,
  rtl: (sel, body) => `[dir=rtl] ${sel}{${body}}`,
  ltr: (sel, body) => `[dir=ltr] ${sel}{${body}}`,
  '*': (sel, body) => `${sel}>*{${body}}`,
  '**': (sel, body) => `${sel} *{${body}}`,
} satisfies SelectorVariantMap);
for (const state of ['hover', 'focus', 'active', 'disabled']) {
  selectorVariants[`group-${state}`] = (sel, body) =>
    `.group:${state} ${sel}{${body}}`;
}
for (const state of ['hover', 'focus', 'checked', 'disabled']) {
  selectorVariants[`peer-${state}`] = (sel, body) =>
    `.peer:${state} ~ ${sel}{${body}}`;
}
for (const [name, pseudo] of Object.entries({
  before: 'before',
  after: 'after',
  placeholder: 'placeholder',
  file: 'file-selector-button',
  marker: 'marker',
  selection: 'selection',
  'first-letter': 'first-letter',
  'first-line': 'first-line',
  backdrop: 'backdrop',
  'details-content': 'details-content',
})) {
  selectorVariants[name] = (sel, body) => `${sel}::${pseudo}{${body}}`;
}

export const mediaVariants: MediaVariantMap = {
  sm: '(min-width:640px)',
  md: '(min-width:768px)',
  lg: '(min-width:1024px)',
  xl: '(min-width:1280px)',
  '2xl': '(min-width:1536px)',
  dark: '(prefers-color-scheme: dark)',
  'motion-reduce': '(prefers-reduced-motion: reduce)',
  'motion-safe': '(prefers-reduced-motion: no-preference)',
  print: 'print',
  'forced-colors': '(forced-colors: active)',
  'contrast-more': '(prefers-contrast: more)',
  'contrast-less': '(prefers-contrast: less)',
  'inverted-colors': '(inverted-colors: inverted)',
  portrait: '(orientation: portrait)',
  landscape: '(orientation: landscape)',
  noscript: '(scripting: none)',
};
for (const pointer of ['pointer', 'any-pointer']) {
  for (const value of ['fine', 'coarse', 'none']) {
    mediaVariants[`${pointer}-${value}`] = `(${pointer}: ${value})`;
  }
}

export const containerVariants: MediaVariantMap = Object.fromEntries(
  '3xs:16 2xs:18 xs:20 sm:24 md:28 lg:32 xl:36 2xl:42 3xl:48 4xl:56 5xl:64 6xl:72 7xl:80'
    .split(' ')
    .map((entry) => {
      const [name, rem] = entry.split(':');
      return [name, `(min-width:${rem}rem)`];
    }),
);

export const responsiveOrder = Object.keys(mediaVariants).filter(
  (name) => name !== 'dark',
);
export const containerOrder = Object.keys(containerVariants);

const viewportBreakpointRem: Record<string, number> = {
  sm: 40,
  md: 48,
  lg: 64,
  xl: 80,
  '2xl': 96,
};

function resolveMediaVariant(token: string): string | undefined {
  if (mediaVariants[token]) return mediaVariants[token];
  const range = /^(min|max)-(.+)$/.exec(token);
  const value = range && viewportBreakpointRem[range[2]];
  return value
    ? `(width ${range[1] === 'max' ? '<' : '>='} ${value}rem)`
    : undefined;
}

function isResponsiveVariant(token: string): boolean {
  return token !== 'dark' && resolveMediaVariant(token) !== undefined;
}

function resolveContainerVariant(token: string): string | undefined {
  if (containerVariants[token]) return containerVariants[token];
  const range = /^max-(.+)$/.exec(token);
  const minQuery = range && containerVariants[range[1]];
  return minQuery?.replace('min-width:', 'width < ');
}

function isContainerVariantToken(token: string): boolean {
  return (
    token.startsWith('@') &&
    (resolveContainerVariant(token.slice(1)) !== undefined ||
      /^@\[.+\]$/.test(token))
  );
}

// Optimized parsing functions
export function parseSpacing(className: string): string | null {
  const negative = className.startsWith('-');
  const raw = negative ? className.slice(1) : className;
  const lastDashIndex = raw.lastIndexOf('-');

  if (lastDashIndex === -1) return null;

  const key = raw.slice(0, lastDashIndex);
  const valueStr = raw.slice(lastDashIndex + 1);

  if (!spacingProps[key]) return null;

  // Handle fractions (e.g., w-1/2, h-2/3)
  if (valueStr.includes('/')) {
    const [numerator, denominator] = valueStr
      .split('/')
      .map((v) => parseFloat(v));
    if (
      Number.isNaN(numerator) ||
      Number.isNaN(denominator) ||
      denominator === 0
    ) {
      return null;
    }
    const percentage = (numerator / denominator) * 100;
    return spacingProps[key].map((prop) => `${prop}:${percentage}%;`).join('');
  }

  // Handle numeric values
  const num = parseFloat(valueStr);
  if (Number.isNaN(num)) return null;

  const sign = negative ? '-' : '';
  return spacingProps[key]
    .map((prop) => `${prop}:calc(${sign}${spacing} * ${num});`)
    .join('');
}

export function parseSpaceUtility(className: string): string | null {
  const negative = className.startsWith('-');
  const raw = negative ? className.slice(1) : className;

  // Match space-x-{value} or space-y-{value}
  const match = raw.match(/^space-(x|y)-(.+)$/);
  if (!match) return null;

  const [, direction, valueStr] = match;
  const isHorizontal = direction === 'x';

  // Handle "reverse" modifier
  if (valueStr === 'reverse') {
    return isHorizontal
      ? '--cer-space-x-reverse:1;'
      : '--cer-space-y-reverse:1;';
  }

  // Handle fractions (e.g., space-x-1/2)
  if (valueStr.includes('/')) {
    const [numerator, denominator] = valueStr
      .split('/')
      .map((v) => parseFloat(v));
    if (
      Number.isNaN(numerator) ||
      Number.isNaN(denominator) ||
      denominator === 0
    ) {
      return null;
    }
    const percentage = (numerator / denominator) * 100;
    const sign = negative ? '-' : '';

    if (isHorizontal) {
      return `--cer-space-x-reverse:0;& > :not([hidden]) ~ :not([hidden]){margin-inline-start:calc(${sign}${percentage}% * calc(1 - var(--cer-space-x-reverse)));margin-inline-end:calc(${sign}${percentage}% * var(--cer-space-x-reverse));}`;
    } else {
      return `--cer-space-y-reverse:0;& > :not([hidden]) ~ :not([hidden]){margin-top:calc(${sign}${percentage}% * calc(1 - var(--cer-space-y-reverse)));margin-bottom:calc(${sign}${percentage}% * var(--cer-space-y-reverse));}`;
    }
  }

  // Handle numeric values
  const num = parseFloat(valueStr);
  if (Number.isNaN(num)) return null;

  const sign = negative ? '-' : '';
  const value = `calc(${sign}${spacing} * ${num})`;

  if (isHorizontal) {
    return `--cer-space-x-reverse:0;& > :not([hidden]) ~ :not([hidden]){margin-inline-start:calc(${value} * calc(1 - var(--cer-space-x-reverse)));margin-inline-end:calc(${value} * var(--cer-space-x-reverse));}`;
  } else {
    return `--cer-space-y-reverse:0;& > :not([hidden]) ~ :not([hidden]){margin-top:calc(${value} * calc(1 - var(--cer-space-y-reverse)));margin-bottom:calc(${value} * var(--cer-space-y-reverse));}`;
  }
}

export function hexToRgb(hex: string): string {
  let clean = hex.replace('#', '');
  // Support 3-digit shorthand like #09f -> #0099ff
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const bigint = parseInt(clean, 16);
  return `${(bigint >> 16) & 255} ${(bigint >> 8) & 255} ${bigint & 255}`;
}

// Optimized color parsing with lookup tables
const colorRegex =
  /^(drop-shadow|scrollbar-thumb|scrollbar-track|text-shadow|bg|text|border|decoration|shadow|outline|caret|accent|fill|stroke|ring|divide|prose)-([a-z]+)-?(\d{2,3}|DEFAULT)?$/;
const propMap: Record<string, string> = {
  bg: 'background-color',
  decoration: 'text-decoration-color',
  text: 'color',
  border: 'border-color',
  outline: 'outline-color',
  caret: 'caret-color',
  accent: 'accent-color',
  fill: 'fill',
  stroke: 'stroke',
  prose: '--cer-prose-accent',
};

export function parseColorClass(className: string): string | null {
  const match = colorRegex.exec(className);
  if (!match) return null;

  const [, type, colorName, shade = 'DEFAULT'] = match;
  const colorValue = _activeColors[colorName]?.[shade];
  if (!colorValue) return null;

  if (type === 'shadow') return `--cer-shadow-color:${colorValue};`;
  if (type === 'ring') return `--cer-ring-color:${colorValue};`;
  if (type === 'divide') return `border-color:${colorValue};`;
  if (type === 'text-shadow') return `--cer-text-shadow-color:${colorValue};`;
  if (type === 'drop-shadow') return `--cer-drop-shadow-color:${colorValue};`;
  if (type === 'scrollbar-thumb') {
    return `--cer-scrollbar-thumb:${colorValue};scrollbar-color:var(--cer-scrollbar-thumb) var(--cer-scrollbar-track,transparent);`;
  }
  if (type === 'scrollbar-track') {
    return `--cer-scrollbar-track:${colorValue};scrollbar-color:var(--cer-scrollbar-thumb,currentColor) var(--cer-scrollbar-track);`;
  }
  const prop = propMap[type];
  return prop ? `${prop}:${colorValue};` : null;
}

export function parseOpacityModifier(className: string): {
  base: string;
  opacity?: number;
} {
  const slashIndex = className.indexOf('/');
  if (slashIndex === -1) return { base: className };

  const base = className.slice(0, slashIndex);
  const opacityStr = className.slice(slashIndex + 1);
  const opacity = parseInt(opacityStr, 10);

  return isNaN(opacity) || opacity < 0 || opacity > 100
    ? { base }
    : { base, opacity: opacity / 100 };
}

function extractVarExpression(value: string): string | null {
  const start = value.indexOf('var(');
  if (start < 0) return null;
  let depth = 0;
  for (let index = start; index < value.length; index++) {
    if (value[index] === '(') depth++;
    else if (value[index] === ')' && --depth === 0) {
      return value.slice(start, index + 1);
    }
  }
  return null;
}

export function parseColorWithOpacity(className: string): string | null {
  const { base, opacity } = parseOpacityModifier(className);

  const paletteRule = parseColorClass(base);
  if (paletteRule) {
    if (opacity !== undefined) {
      // If the palette uses a CSS variable (e.g. var(--cer-color-...[, fallback])),
      // prefer applying opacity via color-mix to ensure the variable path gets
      // the requested alpha (otherwise a defined custom property would override
      // a rgb(...) fallback and lose the alpha).
      if (paletteRule.includes('var(')) {
        const varExpr = extractVarExpression(paletteRule);
        if (varExpr) {
          const pct = opacity * 100;
          const mix = `color-mix(in srgb, ${varExpr} ${pct}%, rgba(0 0 0 / 0) ${100 - pct}%)`;
          // If the var(...) includes a hex fallback, extract it to emit a
          // direct rgb(...) fallback before the color-mix declaration. This
          // preserves existing tests that expect an rgb(...) result while
          // allowing the variable-based color to be used (with alpha) in
          // browsers that support color-mix.
          const fallbackHexMatch = /#([0-9a-f]{6}|[0-9a-f]{3})/i.exec(varExpr);
          const propMatch = /^((?:--)?[a-z][a-z-]*):/.exec(paletteRule);
          const prop = propMatch ? propMatch[1] : 'background-color';
          if (fallbackHexMatch) {
            const rgb = hexToRgb(fallbackHexMatch[0]);
            const rgbExpr = `rgb(${rgb} / ${opacity})`;
            // Replace the hex fallback inside the var(...) with the computed rgb(...) fallback
            const varWithRgbFallback = varExpr.replace(
              /#([0-9a-f]{6}|[0-9a-f]{3})/i,
              rgbExpr,
            );
            // Insert a special split token so the rule generator can emit the
            // fallback and the color-mix override as two separate wrapped rules.
            // This preserves existing tests that expect a single-declaration
            // wrapped block while still providing the color-mix runtime fix.
            return `${prop}:${varWithRgbFallback};__CE_COLOR_MIX_SPLIT__${prop}:${mix};`;
          }
          return `${prop}:${mix};`;
        }
      }

      // Otherwise, try to find a hex literal (6- or 3-digit) and convert it to rgb(... / alpha)
      const match = /#([0-9a-f]{6}|[0-9a-f]{3})/i.exec(paletteRule);
      if (match) {
        const rgb = hexToRgb(match[0]);
        return paletteRule.replace(
          /#([0-9a-f]{6}|[0-9a-f]{3})/i,
          `rgb(${rgb} / ${opacity})`,
        );
      }
    }

    return paletteRule;
  }

  const arbitraryRule = parseArbitrary(base);
  if (arbitraryRule && opacity !== undefined) {
    // Prefer handling CSS variables first so a defined custom property gets
    // the requested alpha via color-mix (instead of replacing a fallback hex
    // and leaving the var(...) wrapper intact which would override the alpha).
    if (arbitraryRule.includes('var(')) {
      const varMatch = /var\([^)]*\)/.exec(arbitraryRule);
      if (varMatch) {
        const varExpr = varMatch[0];
        const pct = opacity * 100;
        const mix = `color-mix(in srgb, ${varExpr} ${pct}%, rgba(0 0 0 / 0) ${100 - pct}%)`;

        // If the var(...) includes a hex fallback, replace that fallback
        // with an rgb(... / alpha) in a fallback declaration, and emit a
        // split-token so the generator will emit the fallback and the
        // color-mix override as separate wrapped rules (preserving exact
        // test expectations while providing the runtime color-mix fix).
        const fallbackHexMatch = /#([0-9a-f]{6}|[0-9a-f]{3})/i.exec(varExpr);
        const propMatch = /^([a-z-]+):/.exec(arbitraryRule);
        const prop = propMatch ? propMatch[1] : null;
        if (fallbackHexMatch && prop) {
          const rgb = hexToRgb(fallbackHexMatch[0]);
          const rgbExpr = `rgb(${rgb} / ${opacity})`;
          const varWithRgbFallback = varExpr.replace(
            /#([0-9a-f]{6}|[0-9a-f]{3})/i,
            rgbExpr,
          );
          return `${prop}:${varWithRgbFallback};__CE_COLOR_MIX_SPLIT__${prop}:${mix};`;
        }

        return arbitraryRule.replace(varExpr, mix);
      }
    }

    // Support 6- and 3-digit hexes in arbitrary values
    const match = /#([0-9a-f]{6}|[0-9a-f]{3})/i.exec(arbitraryRule);
    if (match) {
      const rgb = hexToRgb(match[0]);
      return arbitraryRule.replace(
        /#([0-9a-f]{6}|[0-9a-f]{3})/i,
        `rgb(${rgb} / ${opacity})`,
      );
    }
  }

  return arbitraryRule;
}

/**
 * Parse gradient color stop utilities like from-error-500, to-primary-600, via-success-400
 */
export function parseGradientColorStop(className: string): string | null {
  const match = /^(from|to|via)-([a-z]+)-?(\d{2,3}|DEFAULT)?$/.exec(className);
  if (!match) return null;

  const [, position, colorName, shade = 'DEFAULT'] = match;
  const colorValue = _activeColors[colorName]?.[shade];
  if (!colorValue) return null;

  switch (position) {
    case 'from':
      return `--cer-gradient-from:${colorValue} var(--cer-gradient-from-position);--cer-gradient-to:rgb(255 255 255 / 0) var(--cer-gradient-to-position);--cer-gradient-stops:var(--cer-gradient-from), var(--cer-gradient-to);`;
    case 'to':
      return `--cer-gradient-to:${colorValue} var(--cer-gradient-to-position);`;
    case 'via':
      return `--cer-gradient-to:rgb(255 255 255 / 0) var(--cer-gradient-to-position);--cer-gradient-stops:var(--cer-gradient-from), ${colorValue} var(--cer-gradient-via-position), var(--cer-gradient-to);`;
    default:
      return null;
  }
}

export function parseOpacity(className: string): string | null {
  const match = /^opacity-(\d{1,3})$/.exec(className);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  return value < 0 || value > 100 ? null : `opacity:${value / 100};`;
}

export function parseZIndex(className: string): string | null {
  if (className === 'z-auto') return 'z-index:auto;';
  const negative = className.startsWith('-');
  const raw = negative ? className.slice(1) : className;
  const match = /^z-(\d+)$/.exec(raw);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  return `z-index:${negative ? -value : value};`;
}

// Enhanced arbitrary value parser
export function parseArbitrary(className: string): string | null {
  // Normalize prop-(--custom-property) → prop-[var(--custom-property)]
  // e.g. bg-(--my-color) → bg-[var(--my-color)]
  const parenVarStart = className.indexOf('-(--');
  if (parenVarStart > 0 && className.endsWith(')')) {
    const varName = className.slice(parenVarStart + 2, -1); // --my-color
    if (!/^--[a-zA-Z_][\w-]*$/.test(varName)) return null;
    className = `${className.slice(0, parenVarStart)}-[var(${varName})]`;
  }

  // [prop:value] format
  if (
    className.startsWith('[') &&
    className.endsWith(']') &&
    !className.includes('-[')
  ) {
    const inner = className.slice(1, -1).trim();
    const colonIndex = inner.indexOf(':');
    if (colonIndex === -1) return null;

    const prop = inner.slice(0, colonIndex).trim();
    let value = inner.slice(colonIndex + 1).trim();

    // Only allow valid CSS property names
    if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(prop)) return null;

    // Convert underscores to spaces for multiple values
    value = value.replace(/_/g, ' ');
    value = value.replace(/url\('\s*([^']*?)\s*'\)/g, 'url("$1")');
    value = value.replace(/^'([^']*)'$/g, '"$1"');
    return `${prop}:${value};`;
  }

  // prop-[value] format
  const bracketStart = className.indexOf('-[');
  if (bracketStart <= 0 || !className.endsWith(']')) return null;

  const prop = className.slice(0, bracketStart);
  const value = className.slice(bracketStart + 2, -1).replace(/_/g, ' ');

  if (spacingProps[prop]) {
    return spacingProps[prop].map((name) => `${name}:${value};`).join('');
  }

  // Enhanced property mappings
  const propMappings: Record<string, string> = {
    bg: 'background-color',
    shadow: 'box-shadow',
    p: 'padding',
    px: 'padding-inline',
    py: 'padding-block',
    m: 'margin',
    mx: 'margin-inline',
    my: 'margin-block',
    w: 'width',
    h: 'height',
    'min-w': 'min-width',
    'max-w': 'max-width',
    'min-h': 'min-height',
    'max-h': 'max-height',
    'border-t': 'border-top-width',
    'border-b': 'border-bottom-width',
    'border-l': 'border-left-width',
    'border-r': 'border-right-width',
    'border-x': 'border-inline-width',
    'border-y': 'border-block-width',
    'grid-cols': 'grid-template-columns',
    'grid-rows': 'grid-template-rows',
    transition: 'transition-property',
    ease: 'transition-timing-function',
    delay: 'transition-delay',
    duration: 'transition-duration',
    list: 'list-style',
    break: 'word-break',
    flex: 'flex-direction',
    items: 'align-items',
    justify: 'justify-content',
    content: 'content',
    self: 'align-self',
    basis: 'flex-basis',
    tracking: 'letter-spacing',
    leading: 'line-height',
    z: 'z-index',
    opacity: 'opacity',
    prose: '--cer-prose-accent',
    'font-features': 'font-feature-settings',
    tab: 'tab-size',
    zoom: 'zoom',
    inline: 'inline-size',
    block: 'block-size',
    'min-inline': 'min-inline-size',
    'max-inline': 'max-inline-size',
    'min-block': 'min-block-size',
    'max-block': 'max-block-size',
  };

  // Special handling for text properties
  if (prop === 'text') {
    // If value looks like a size (ends with px, rem, em, etc.), treat as font-size
    if (/^\d*\.?\d+(px|rem|em|%|vh|vw|ch|ex)$/.test(value)) {
      return `font-size:${value};`;
    }
    // Otherwise treat as color
    return `color:${value};`;
  }

  if (prop === 'rotate') return `transform:rotate(${value});`;
  if (prop === 'scale') return `transform:scale(${value});`;
  if (prop === 'translate-x') return `transform:translateX(${value});`;
  if (prop === 'translate-y') return `transform:translateY(${value});`;

  const cssProp = propMappings[prop] ?? prop.replace(/_/g, '-');
  return cssProp && value ? `${cssProp}:${value};` : null;
}

/**
 * Low-level compatibility parser for prose accents.
 *
 * JIT compilation calls the shared color and arbitrary-value parsers directly
 * so applications do not pay for a separate prose parsing branch.
 */
export function parseProseAccent(className: string): string | null {
  return className.startsWith('prose-')
    ? (utilityMap[className] ?? parseColorWithOpacity(className))
    : null;
}

/** Parse small functional utility families added in Tailwind 4.2/4.3. */
export function parseFunctionalUtility(className: string): string | null {
  const namedContainer = /^@(container(?:-size)?)\/([a-z_][\w-]*)$/i.exec(
    className,
  );
  if (namedContainer) {
    const type =
      namedContainer[1] === 'container-size' ? 'size' : 'inline-size';
    return `container-type:${type};container-name:${namedContainer[2]};`;
  }

  const tab = /^tab-(\d+)$/.exec(className);
  if (tab) return `tab-size:${tab[1]};`;

  const zoom = /^zoom-(\d+(?:\.\d+)?)$/.exec(className);
  if (zoom) return `zoom:${zoom[1]}%;`;

  return null;
}

function parseUtilityBody(className: string): string | null {
  return (
    utilityMap[className] ??
    parseSpacing(className) ??
    parseSpaceUtility(className) ??
    parseOpacity(className) ??
    parseZIndex(className) ??
    parseColorWithOpacity(className) ??
    parseGradientColorStop(className) ??
    parseFunctionalUtility(className) ??
    parseArbitrary(className)
  );
}

export function parseArbitraryVariant(token: string): string | null {
  if (token.startsWith('[') && token.endsWith(']')) {
    const inner = token.slice(1, -1);
    return inner.includes('&') ? inner : token;
  }

  const bracketStart = token.indexOf('-[');
  if (bracketStart > 0 && token.endsWith(']')) {
    const inner = token.slice(bracketStart + 2, -1).replace(/_/g, '-');
    return inner.includes('&') ? inner : token.replace(/_/g, '-');
  }

  return null;
}

// Optimized HTML class extraction
export function extractClassesFromHTML(html: string): string[] {
  const classList: string[] = [];
  let match: RegExpExecArray | null;
  // Reset the shared regex before use (required because of the `g` flag)
  _classAttrRegex.lastIndex = 0;

  while ((match = _classAttrRegex.exec(html))) {
    const tokens = match[2].split(/\s+/).filter(Boolean);
    if (tokens.length) classList.push(...tokens);
  }

  return classList;
}

// Module-level regex for extracting class attributes from HTML strings.
// Defined here so the regex object is compiled once, not on every call to
// extractClassesFromHTML(). lastIndex must be reset before each use.
const _classAttrRegex = /class\s*=\s*(['"])([\s\S]*?)\1/g;

// Only conflicting shorthand families need an explicit order. Deriving their
// broad/axis/side rank is smaller and faster to initialize than shipping a
// framework-sized global property table.
const cascadeFamilies: Array<[string, number]> = [
  ['inset', 10],
  ['margin', 20],
  ['scroll-margin', 30],
  ['padding', 100],
  ['scroll-padding', 110],
];

function cascadePropertyRank(property: string): number {
  if (property === 'z-index') return 0;
  if (property === 'box-shadow') return 1000;
  if (/^(top|right|bottom|left)$/.test(property)) return 13;

  for (const [family, order] of cascadeFamilies) {
    if (property === family) return order;
    if (!property.startsWith(`${family}-`)) continue;
    const suffix = property.slice(family.length + 1);
    const specificity = /^(block|inline)$/.test(suffix)
      ? 1
      : /^(block|inline)-(start|end)$/.test(suffix)
        ? 2
        : 3;
    return order + specificity;
  }

  if (property === 'border') return 60;
  if (property === 'border-radius') return 61;
  if (property.endsWith('-radius')) return 64;
  for (const [index, kind] of ['style', 'width', 'color'].entries()) {
    if (property === `border-${kind}`) return 70 + index * 10;
    if (property.startsWith('border-') && property.endsWith(`-${kind}`)) {
      const middle = property.slice(7, -(kind.length + 1));
      const specificity = /^(block|inline)$/.test(middle)
        ? 1
        : /^(block|inline)-(start|end)$/.test(middle)
          ? 2
          : 3;
      return 70 + index * 10 + specificity;
    }
  }
  return 500;
}

function _getCascadeSortKey(rule: string): [number, number] {
  if (rule.startsWith(':where(')) return [-1, 0];
  let first = Number.MAX_SAFE_INTEGER;
  let count = 0;
  const declarations = /(?:^|[;{])([\w-]+):[^;{}]*;/g;
  let match: RegExpExecArray | null;
  while ((match = declarations.exec(rule))) {
    if (match[1].startsWith('--')) continue;
    count++;
    const index = cascadePropertyRank(match[1]);
    if (index < first) first = index;
  }
  return [first, count];
}

function getQueryPixels(rule: string, atRule: '@media' | '@container'): number {
  const start = rule.indexOf(atRule);
  if (start < 0) return Number.NaN;
  const end = rule.indexOf('{', start);
  const match =
    /(?:min-width:|width\s*([<>])=?\s*)(\d+(?:\.\d+)?)(px|rem|em)/.exec(
      rule.slice(start, end),
    );
  if (!match) return Number.NaN;
  const pixels = Number(match[2]) * (match[3] === 'px' ? 1 : 16);
  return match[1] === '<' ? -pixels : pixels;
}

// Enhanced JIT CSS generation with better performance
export const jitCssCache = new Map<string, string>();
const jitRuleCache = new Map<string, string | null>();
export const JIT_CSS_THROTTLE_MS = 16;
const MAX_CACHE_SIZE = 1000;
const MAX_RULE_CACHE_SIZE = 4096;

// HMR: Clear all caches on hot update to prevent stale CSS
// Wrapped in function to avoid side effects at module load time
if (typeof import.meta !== 'undefined' && import.meta.hot) {
  import.meta.hot.dispose(() => {
    jitCssCache.clear();
    jitRuleCache.clear();
    detectedProseSizes.clear();
    proseSheet = null;
    proseCSSCache = '';
    _resetBaseResetSheet();
    _bridgeRegistered = false;
  });

  // Also clear on accept to force regeneration
  import.meta.hot.accept(() => {
    jitCssCache.clear();
    jitRuleCache.clear();
    detectedProseSizes.clear();
    proseSheet = null;
    proseCSSCache = '';
  });
}

export function jitCSS(html: string): string {
  // Extract classes first so we can derive a stable, compact cache key.
  const classes = extractClassesFromHTML(html);
  if (!classes.length) return '';

  // Use sorted unique class names as cache key instead of the full HTML string.
  // This way, non-class content changes (text nodes, ARIA attributes, data
  // attributes) don't cause cache misses when the set of utility classes is
  // identical — a significant performance win for reactive components.
  const seen = new Set(classes);
  const cacheKey = Array.from(seen).sort().join('\x00');
  const cached = jitCssCache.get(cacheKey);
  if (cached !== undefined) {
    // Maintain LRU order: delete + re-insert moves this entry to the end of
    // the Map so the eviction path (which removes from the front) always
    // evicts the least-recently-used entry.
    jitCssCache.delete(cacheKey);
    jitCssCache.set(cacheKey, cached);
    return cached;
  }
  // Bucket layout:
  //   0 — base (no variants)
  //   1 — pseudo / structural variants (hover:, focus:, group-*, etc.)
  //   2 — responsive / container queries without dark (sm:, @lg:, …)
  //   3 — dark: only (@media prefers-color-scheme: dark, no breakpoint)
  //   4 — dark: combined with responsive / container (dark:sm:, dark:@lg:, …)
  // Keeping dark-only in its own bucket (3) ensures it always comes after all
  // responsive rules (bucket 2) so dark-mode overrides are deterministic
  // regardless of the order classes appear in the HTML.
  const buckets: string[][] = [[], [], [], [], []];
  const compositionClasses = {
    transform: new Set<string>(),
    filter: new Set<string>(),
    backdropFilter: new Set<string>(),
    ring: new Set<string>(),
    gradient: new Set<string>(),
  };

  const registerCompositionClass = (cls: string, body: string): void => {
    const selector = escapeClassName(cls);
    if (/(?:^|;)transform:/.test(body) && body.includes('--cer-')) {
      compositionClasses.transform.add(selector);
    }
    if (/(?:^|;)filter:/.test(body) && body.includes('--cer-')) {
      compositionClasses.filter.add(selector);
    }
    if (/(?:^|;)backdrop-filter:/.test(body) && body.includes('--cer-')) {
      compositionClasses.backdropFilter.add(selector);
    }
    if (
      body.includes('--cer-ring-color') ||
      body.includes('var(--cer-ring-color')
    ) {
      compositionClasses.ring.add(selector);
    }
    if (
      body.includes('--cer-gradient-') ||
      body.includes('var(--cer-gradient-stops)')
    ) {
      compositionClasses.gradient.add(selector);
    }
  };

  const generateRuleCached = (
    cls: string,
    stripDark = false,
  ): string | null => {
    const cacheKey = stripDark ? `dark\x00${cls}` : cls;
    if (jitRuleCache.has(cacheKey)) return jitRuleCache.get(cacheKey) ?? null;
    const result = generateRule(cls, stripDark);
    if (jitRuleCache.size >= MAX_RULE_CACHE_SIZE) {
      let evictCount = MAX_RULE_CACHE_SIZE / 2;
      for (const key of jitRuleCache.keys()) {
        if (evictCount-- === 0) break;
        jitRuleCache.delete(key);
      }
    }
    jitRuleCache.set(cacheKey, result);
    return result;
  };

  const classify = (variants: string[]): number => {
    const hasResponsive = variants.some(isResponsiveVariant);
    const hasContainer = variants.some(isContainerVariantToken);
    const hasDark = variants.includes('dark');
    if (!variants.length) return 0;
    if (!hasResponsive && !hasDark && !hasContainer) return 1;
    if (hasDark && (hasResponsive || hasContainer)) return 4;
    if (hasDark) return 3; // dark-only — comes after responsive, before dark+responsive
    return 2;
  };

  const splitVariants = (input: string): string[] => {
    const parts: string[] = [];
    let current = '';
    let depth = 0;

    for (let i = 0; i < input.length; i++) {
      const ch = input[i];
      if (ch === '[' || ch === '(') depth++;
      else if (ch === ']' || ch === ')') depth--;

      if (ch === ':' && depth === 0) {
        parts.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    if (current) parts.push(current);
    return parts;
  };

  const pseudoMap = stateVariantSelectors;

  const generateRule = (cls: string, stripDark = false): string | null => {
    const parts = splitVariants(cls);
    const basePart = parts[parts.length - 1] ?? '';
    let important = false;

    // A utility is always the final top-level segment. Resolving only that
    // segment prevents unknown variants such as `typo:block` from silently
    // degrading into unconditional CSS.
    let checkPart = basePart;
    if (checkPart.startsWith('!')) {
      important = true;
      checkPart = checkPart.slice(1);
    }
    if (checkPart.endsWith('!')) {
      important = true;
      checkPart = checkPart.slice(0, -1);
    }
    if (!checkPart || !parseUtilityBody(checkPart)) return null;

    // Prose element modifiers are handled separately by parseProseElementModifier
    // This is checked in parseClassName() before reaching here

    const cleanBase = basePart.replace(/^!/, '').replace(/!$/, '');
    const baseRule = parseUtilityBody(cleanBase);

    if (!baseRule) return null;

    let variants = parts.slice(0, -1);
    if (stripDark) variants = variants.filter((t) => t !== 'dark');

    // Build escaped class name from the original class token so any
    // leading or trailing '!' remains in the selector (escaped).
    const escapedClass = escapeClassName(cls);
    const body = important ? baseRule.replace(/;/g, ' !important;') : baseRule;
    const SUBJECT = '__SUBJECT__';
    let selector = SUBJECT;

    // Handle structural variants
    const structural: string[] = [];
    for (const token of variants) {
      if (token.startsWith('group-')) {
        const state = token.slice(6);
        const pseudo = pseudoMap[state];
        if (!pseudo) return null;
        selector = `.group${pseudo} ${selector}`;
        structural.push(token);
      } else if (token.startsWith('peer-')) {
        const state = token.slice(5);
        const pseudo = pseudoMap[state];
        if (!pseudo) return null;
        selector = selector.replace(SUBJECT, `.peer${pseudo}~${SUBJECT}`);
        structural.push(token);
      }
    }
    variants = variants.filter((t) => !structural.includes(t));

    // Handle pseudos and arbitrary variants
    const subjectPseudos: string[] = [];
    const innerPseudos: string[] = [];
    let wrapperVariant: string | null = null;
    let hasStartingStyle = false;
    const supportsTokens: string[] = [];

    for (const token of variants) {
      if (
        token === 'dark' ||
        isResponsiveVariant(token) ||
        isContainerVariantToken(token)
      )
        continue;

      // Handle data-[*]: attribute variant → [data-key] or [data-key="value"]
      if (token.startsWith('data-[') && token.endsWith(']')) {
        const inner = token.slice(6, -1);
        const attrSel = inner.includes('=')
          ? '[data-' + inner.replace(/^([^=]+)=(.+)$/, '$1="$2"') + ']'
          : '[data-' + inner + ']';
        subjectPseudos.push(attrSel);
        continue;
      }

      // Boolean ARIA/data variants and arbitrary ARIA attribute values.
      if (token.startsWith('aria-[') && token.endsWith(']')) {
        const inner = token.slice(6, -1);
        const attrSel = inner.includes('=')
          ? '[aria-' + inner.replace(/^([^=]+)=(.+)$/, '$1="$2"') + ']'
          : '[aria-' + inner + ']';
        subjectPseudos.push(attrSel);
        continue;
      }
      if (/^aria-[a-z][\w-]*$/.test(token)) {
        subjectPseudos.push(`[${token}="true"]`);
        continue;
      }
      if (/^data-[a-z][\w-]*$/.test(token)) {
        subjectPseudos.push(`[${token}]`);
        continue;
      }

      // Functional child-position variants.
      const nth = /^(nth|nth-last|nth-of-type|nth-last-of-type)-\[(.+)\]$/.exec(
        token,
      );
      if (nth) {
        const name: Record<string, string> = {
          nth: 'nth-child',
          'nth-last': 'nth-last-child',
          'nth-of-type': 'nth-of-type',
          'nth-last-of-type': 'nth-last-of-type',
        };
        subjectPseudos.push(`:${name[nth[1]]}(${nth[2].replace(/_/g, ' ')})`);
        continue;
      }

      // Handle has-[*]: pseudo-class variant → :has(...)
      if (token.startsWith('has-[') && token.endsWith(']')) {
        const inner = token.slice(5, -1).replace(/_/g, ' ');
        subjectPseudos.push(`:has(${inner})`);
        continue;
      }

      // Handle not-[*]: pseudo-class variant → :not(...)
      if (token.startsWith('not-[') && token.endsWith(']')) {
        const inner = token.slice(5, -1).replace(/_/g, ' ');
        subjectPseudos.push(`:not(${inner})`);
        continue;
      }

      // Handle in-[*]: ancestor variant → :is(selector) .element
      if (token.startsWith('in-[') && token.endsWith(']')) {
        const inner = token.slice(4, -1).replace(/_/g, ' ');
        selector = ':is(' + inner + ') ' + selector;
        continue;
      }

      // Handle starting: → @starting-style{} wrapper
      if (token === 'starting') {
        hasStartingStyle = true;
        continue;
      }

      // Handle supports-[*]: → @supports(...){} wrapper
      if (token.startsWith('supports-[') && token.endsWith(']')) {
        supportsTokens.push(token);
        continue;
      }

      const variantSelector = parseArbitraryVariant(token);
      if (variantSelector) {
        wrapperVariant = variantSelector;
        continue;
      }

      const pseudo = pseudoMap[token];
      if (pseudo) {
        if (!wrapperVariant) {
          subjectPseudos.push(pseudo);
        } else {
          innerPseudos.push(pseudo);
        }
        continue;
      }

      const fn = selectorVariants[token];
      if (typeof fn === 'function') {
        selector = fn(selector, body).split('{')[0];
        continue;
      }

      // Unsupported variants fail closed. Dropping an unknown condition and
      // emitting the utility unconditionally is surprising and unsafe.
      return null;
    }

    const subjectPseudoStr = subjectPseudos.join('');
    const innerPseudoStr = innerPseudos.join('');

    // Helper function to insert inner pseudos into post part
    function insertPseudosIntoPost(post: string, pseudos: string): string {
      if (!pseudos) return post;
      let depthSquare = 0;
      let depthParen = 0;

      // If post starts with a combinator, insert pseudos after the first simple selector
      if (
        post.length &&
        (post[0] === '>' ||
          post[0] === '+' ||
          post[0] === '~' ||
          post[0] === ' ')
      ) {
        let i = 1;
        // skip initial whitespace
        while (i < post.length && post[i] === ' ') i++;
        for (; i < post.length; i++) {
          const ch = post[i];
          if (ch === '[') depthSquare++;
          else if (ch === ']' && depthSquare > 0) depthSquare--;
          else if (ch === '(') depthParen++;
          else if (ch === ')' && depthParen > 0) depthParen--;
          if (
            depthSquare === 0 &&
            depthParen === 0 &&
            (post[i] === '>' ||
              post[i] === '+' ||
              post[i] === '~' ||
              post[i] === ' ')
          ) {
            return post.slice(0, i) + pseudos + post.slice(i);
          }
        }
        return post + pseudos;
      }

      for (let i = 0; i < post.length; i++) {
        const ch = post[i];
        if (ch === '[') depthSquare++;
        else if (ch === ']' && depthSquare > 0) depthSquare--;
        else if (ch === '(') depthParen++;
        else if (ch === ')' && depthParen > 0) depthParen--;
        if (
          depthSquare === 0 &&
          depthParen === 0 &&
          (ch === '>' || ch === '+' || ch === '~' || ch === ' ')
        ) {
          return post.slice(0, i) + pseudos + post.slice(i);
        }
      }
      return post + pseudos;
    }

    if (wrapperVariant) {
      if (wrapperVariant.includes('&')) {
        const idx = wrapperVariant.indexOf('&');
        const pre = wrapperVariant.slice(0, idx);
        const post = wrapperVariant.slice(idx + 1);
        const subjectWithPseudos = SUBJECT + subjectPseudoStr;

        if (subjectPseudos.length === 0) {
          // attach inner pseudos to the subject
          selector = selector.replace(
            SUBJECT,
            pre + subjectWithPseudos + innerPseudoStr + post,
          );
        } else {
          // insert inner pseudos into post after its first simple selector
          const postWithInner = insertPseudosIntoPost(post, innerPseudoStr);
          selector = selector.replace(
            SUBJECT,
            pre + subjectWithPseudos + postWithInner,
          );
        }
      } else {
        selector = selector.replace(
          SUBJECT,
          `${wrapperVariant}${SUBJECT + subjectPseudoStr}`,
        );
        if (innerPseudoStr) {
          selector = selector.replace(SUBJECT, `${SUBJECT}${innerPseudoStr}`);
        }
      }
    } else {
      selector = selector.replace(
        SUBJECT,
        SUBJECT + subjectPseudoStr + innerPseudoStr,
      );
    }

    selector = selector.replace(new RegExp(SUBJECT, 'g'), escapedClass);

    // Support a special split token that allows parseColorWithOpacity to
    // request emitting two separate rules for the same selector. This is
    // used to emit a var(..., rgb(...)) fallback in one rule while emitting
    // a color-mix(...) rule separately so tests that assert an exact single
    // declaration still pass while runtime gets the color-mix override.
    const DUAL_TOKEN = '__CE_COLOR_MIX_SPLIT__';

    const rulesArray: string[] = body.includes(DUAL_TOKEN)
      ? body.split(DUAL_TOKEN).map((part) => `${selector}{${part}}`)
      : [`${selector}{${body}}`];

    // Apply media queries and container queries
    const responsiveTokens = variants.filter(isResponsiveVariant);
    const containerTokens = variants.filter(isContainerVariantToken);
    const lastResponsive = responsiveTokens.length
      ? responsiveTokens[responsiveTokens.length - 1]
      : null;
    const lastContainer = containerTokens.length
      ? containerTokens[containerTokens.length - 1]
      : null;
    const hasDark = variants.includes('dark');

    // Respect disableVariants option — skip rules that use disabled variant groups
    const _disabledGroups = _globalJITCSSOptions.disableVariants ?? [];
    if (_disabledGroups.length > 0) {
      if (_disabledGroups.includes('dark') && hasDark) return null;
      if (_disabledGroups.includes('responsive') && responsiveTokens.length > 0)
        return null;
      if (_disabledGroups.includes('container') && containerTokens.length > 0)
        return null;
      if (
        _disabledGroups.includes('motion') &&
        variants.some((v) => v === 'motion-reduce' || v === 'motion-safe')
      )
        return null;
      if (_disabledGroups.includes('print') && variants.includes('print'))
        return null;
    }

    // Handle media queries and container queries
    let mediaQuery = '';
    let containerQuery = '';

    // Build media query
    if (hasDark && lastResponsive) {
      mediaQuery = `@media (prefers-color-scheme: dark) and ${resolveMediaVariant(lastResponsive)}`;
    } else if (hasDark) {
      mediaQuery = `@media (prefers-color-scheme: dark)`;
    } else if (lastResponsive) {
      mediaQuery = `@media ${resolveMediaVariant(lastResponsive)}`;
    }

    // Build container query
    if (lastContainer) {
      if (lastContainer.startsWith('@[') && lastContainer.endsWith(']')) {
        // Arbitrary container query like @[300px]
        const value = lastContainer.slice(2, -1);
        // Validate that the value is a valid CSS length (px, rem, em, %, etc.)
        if (
          !/^-?\d*\.?\d+(px|rem|em|%|vh|vw|ch|ex|cm|mm|in|pt|pc)$/.test(value)
        ) {
          return null; // Invalid arbitrary container query value
        }
        containerQuery = `@container (min-width:${value})`;
      } else {
        // Named container query like @md
        const containerKey = lastContainer.slice(1);
        const queryValue =
          resolveContainerVariant(containerKey) ||
          `(min-width:${containerKey})`;
        containerQuery = `@container ${queryValue}`;
      }
    }

    // Build @supports query from supportsTokens
    let supportsQuery = '';
    if (supportsTokens.length > 0) {
      const lastSupports = supportsTokens[supportsTokens.length - 1];
      const supportsValue = lastSupports.slice(10, -1).replace(/_/g, ' ');
      supportsQuery = `@supports ${
        supportsValue.startsWith('not(') ||
        supportsValue.startsWith('selector(') ||
        supportsValue.startsWith('(')
          ? supportsValue
          : `(${supportsValue})`
      }`;
    }

    // Combine queries by wrapping each generated rule separately. If we
    // produced multiple rules (rulesArray), wrap each one and concatenate
    // them so tests can match the expected single-declaration block while
    // we still emit a second, overriding block for color-mix.
    const wrapRule = (r: string): string => {
      let rule = r;
      if (hasStartingStyle) rule = `@starting-style{${rule}}`;
      if (supportsQuery) rule = `${supportsQuery}{${rule}}`;
      if (mediaQuery && containerQuery)
        return `${mediaQuery}${containerQuery}{${rule}}`;
      if (mediaQuery) return `${mediaQuery}{${rule}}`;
      if (containerQuery) return `${containerQuery}{${rule}}`;
      return rule;
    };

    return rulesArray.map(wrapRule).join('');
  };

  // Process classes
  for (const cls of seen) {
    // Check for prose base classes first (prose, prose-sm, prose-lg, prose-xl, prose-2xl) - before splitting
    const parts = splitVariants(cls);
    const variants = parts.slice(0, -1);
    const base = parts[parts.length - 1];
    const proseDetected = parseProseClass(base);
    if (proseDetected !== null) {
      // Prose base class detected
      if (variants.length === 0) {
        // No variants - register with singleton prose sheet
        // Add placeholder to mark class as processed but no actual CSS
        buckets[0].push(`${escapeClassName(cls)}{}`);
      } else {
        // Has variants (e.g., 2xl:prose-lg, dark:prose)
        // Must generate inline CSS with variants applied since singleton sheet doesn't support variants
        const proseCSS = generateProseCSS(base);
        if (!proseCSS) continue;

        const escapedClass = escapeClassName(cls);

        // Replace the base class selector with the full variant class
        // e.g., replace ".prose-lg" with "[class~="2xl:prose-lg"]"
        const baseClassEscaped = escapeClassName(base);
        let variantCSS = proseCSS.replace(
          new RegExp(escapeRegExp(baseClassEscaped), 'g'),
          escapedClass,
        );

        // Apply responsive variants (wrap in media query)
        const responsiveVariants = variants.filter(isResponsiveVariant);
        if (responsiveVariants.length > 0) {
          const lastResponsive =
            responsiveVariants[responsiveVariants.length - 1];
          const mediaQuery = `@media ${resolveMediaVariant(lastResponsive)}`;
          variantCSS = `${mediaQuery}{${variantCSS}}`;
        }

        // Apply dark mode
        if (variants.includes('dark')) {
          variantCSS = `@media (prefers-color-scheme: dark){${variantCSS}}`;
        }

        const bucketNum = classify(variants);
        buckets[bucketNum].push(variantCSS);
      }
      continue;
    }

    // Check for prose element modifiers (prose-a:text-blue-600, hover:prose-a:text-blue-600)
    // Detect by finding 'prose-{element}' pattern in any part
    let proseModIndex = -1;
    for (let i = parts.length - 1; i >= 0; i--) {
      const potentialProseMod = parts.slice(i).join(':');
      if (parseProseElementModifier(potentialProseMod)) {
        proseModIndex = i;
        break;
      }
    }

    if (proseModIndex >= 0) {
      // Found prose element modifier - generate CSS with variants applied
      const proseModBase = parts.slice(proseModIndex).join(':');
      const variants = parts.slice(0, proseModIndex);

      // Generate the base prose CSS (without variants)
      const baseProseCSS = parseProseElementModifier(proseModBase);

      if (!baseProseCSS) continue;

      // If no variants, use the generated CSS as-is without modification
      if (variants.length === 0) {
        buckets[0].push(baseProseCSS);
        continue;
      }

      // Has variants - replace the base class selector with the full escaped class name
      const fullEscaped = cssEscape(cls);
      const baseEscaped = cssEscape(proseModBase);

      // Replace all occurrences of the base class with the full class
      // e.g., ".prose-h1\:text-4xl" → ".md\:prose-h1\:text-4xl"
      const fullProseCSS = baseProseCSS.replace(
        new RegExp(
          `\\.${baseEscaped.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
          'g',
        ),
        `.${fullEscaped}`,
      );

      // Extract each rule and apply media/pseudo variants
      const ruleRegex = /(.+?)\s+(.+?)\{([^}]+)\}/g;
      const matches = [...fullProseCSS.matchAll(ruleRegex)];

      if (matches.length === 0) {
        // Can't parse, use as-is
        buckets[0].push(baseProseCSS);
        continue;
      }

      const bucketNum = classify(variants);

      // Define pseudo map inline for prose variant handling
      const prosePseudoMap: Record<string, string> = {
        hover: ':hover',
        focus: ':focus',
        active: ':active',
        visited: ':visited',
        disabled: ':disabled',
        checked: ':checked',
        first: ':first-child',
        last: ':last-child',
        odd: ':nth-child(odd)',
        even: ':nth-child(even)',
        'focus-within': ':focus-within',
        'focus-visible': ':focus-visible',
      };

      // Separate variants by type (once for all rules)
      const structuralVariants: string[] = [];
      const pseudoVariants: string[] = [];
      const arbitraryVariants: string[] = [];
      const responsiveVariants: string[] = [];
      const containerVariants: string[] = [];
      let hasDark = false;

      for (const v of variants) {
        if (v.startsWith('group-')) {
          structuralVariants.push(v);
        } else if (v.startsWith('peer-')) {
          structuralVariants.push(v);
        } else if (v === 'dark' || v === 'dark-class') {
          hasDark = true;
        } else if (isResponsiveVariant(v)) {
          responsiveVariants.push(v);
        } else if (isContainerVariantToken(v)) {
          containerVariants.push(v);
        } else if (v.startsWith('[') && v.endsWith(']')) {
          arbitraryVariants.push(v);
        } else if (prosePseudoMap[v] || selectorVariants[v]) {
          pseudoVariants.push(v);
        }
      }

      // Process each rule with variants
      for (const match of matches) {
        const [, baseClassSelector, elementSelector, body] = match;

        // Apply variants to the element selector
        let finalSelector = `${baseClassSelector} ${elementSelector}`;

        // Apply structural variants (group, peer)
        for (const v of structuralVariants) {
          if (v.startsWith('group-')) {
            const pseudo = v.slice(6);
            const pseudoSelector = prosePseudoMap[pseudo] || `:${pseudo}`;
            finalSelector = `.group${pseudoSelector} ${finalSelector}`;
          } else if (v.startsWith('peer-')) {
            const pseudo = v.slice(5);
            const pseudoSelector = prosePseudoMap[pseudo] || `:${pseudo}`;
            finalSelector = `.peer${pseudoSelector}~${finalSelector}`;
          }
        }

        // Apply pseudo-class variants (append to element, not class)
        if (pseudoVariants.length > 0) {
          const pseudoStr = pseudoVariants
            .map((v) => prosePseudoMap[v] || `:${v}`)
            .join('');
          // Append pseudos to the end of the element selector
          // .prose-a\:text-error-600 a:not(...) → .prose-a\:text-error-600 a:not(...):hover
          finalSelector = `${finalSelector}${pseudoStr}`;
        }

        // Apply arbitrary variants
        for (const v of arbitraryVariants) {
          const arbVariant = parseArbitraryVariant(v);
          if (arbVariant && arbVariant.includes('&')) {
            const idx = arbVariant.indexOf('&');
            const pre = arbVariant.slice(0, idx);
            const post = arbVariant.slice(idx + 1);
            finalSelector = `${pre}${finalSelector}${post}`;
          }
        }

        let wrappedCSS = `${finalSelector}{${body}}`;

        // Apply dark mode
        if (hasDark) {
          wrappedCSS = `@media (prefers-color-scheme: dark){${wrappedCSS}}`;
        }

        // Apply container queries
        if (containerVariants.length > 0) {
          const lastContainer = containerVariants[containerVariants.length - 1];
          if (lastContainer.startsWith('@[') && lastContainer.endsWith(']')) {
            const value = lastContainer.slice(2, -1);
            if (
              /^-?\d*\.?\d+(px|rem|em|%|vh|vw|ch|ex|cm|mm|in|pt|pc)$/.test(
                value,
              )
            ) {
              wrappedCSS = `@container (min-width:${value}){${wrappedCSS}}`;
            }
          } else {
            const containerKey = lastContainer.slice(1);
            const sizes: Record<string, string> = {
              xs: '20rem',
              sm: '24rem',
              md: '28rem',
              lg: '32rem',
              xl: '36rem',
              '2xl': '42rem',
              '3xl': '48rem',
              '4xl': '56rem',
              '5xl': '64rem',
              '6xl': '72rem',
              '7xl': '80rem',
            };
            const breakpoint = sizes[containerKey];
            if (breakpoint) {
              // Extract container name from class if present (e.g., @container-name/lg)
              const containerName = cls.match(/@([^/]+)\//)?.[1] || '';
              wrappedCSS = containerName
                ? `@container ${containerName} (min-width: ${breakpoint}){${wrappedCSS}}`
                : `@container (min-width: ${breakpoint}){${wrappedCSS}}`;
            }
          }
        }

        // Apply responsive variants
        if (responsiveVariants.length > 0) {
          const lastResponsive =
            responsiveVariants[responsiveVariants.length - 1];
          const mediaQuery = `@media ${resolveMediaVariant(lastResponsive)}`;
          wrappedCSS = `${mediaQuery}{${wrappedCSS}}`;
        }

        buckets[bucketNum].push(wrappedCSS);
      }
      continue;
    }

    // Regular utilities always occupy the final top-level segment.
    const basePart = parts[parts.length - 1];
    if (!basePart) continue;
    const cleanBase = basePart.replace(/^!/, '').replace(/!$/, '');
    const baseRule = parseUtilityBody(cleanBase);
    if (!baseRule) continue;

    const variantsForBucket = parts.slice(0, -1);
    const bucketNum = classify(variantsForBucket);

    const rule = generateRuleCached(cls);
    if (rule) {
      registerCompositionClass(cls, baseRule);
      buckets[bucketNum].push(rule);
    }
  }

  // Ensure explicit gradient color-stop classes generate rules.
  // Some gradient utilities emit variable-based bodies that are
  // picked up via combined selectors; to make the output explicit and
  // testable we generate standalone rules for any from-*/via-*/to-*
  // classes so their selectors are present in the CSS output.
  const gradientStopRegex = /^(from|via|to)-[a-z]+-?\d{2,3}?$/;
  // Snapshot the generated CSS once before iterating — avoids calling
  // buckets.flat().join('') O(N) times inside the loop.
  const preGradientCSS = buckets.flat().join('');
  for (const cls of seen) {
    if (gradientStopRegex.test(cls)) {
      if (preGradientCSS.includes(escapeClassName(cls))) continue;
      const generated = generateRuleCached(cls);
      if (generated) buckets[0].push(generated);
    }
  }

  const addCompositionDefaults = (
    selectors: Set<string>,
    declarations: string,
  ): void => {
    if (selectors.size === 0) return;
    buckets[0].unshift(
      `:where(${Array.from(selectors).join(',')}){${declarations}}`,
    );
  };

  // Composition variables must not inherit from an ancestor using a similar
  // utility. Initialize them only on class-bearing elements instead of every
  // element in every shadow root. :where() keeps these defaults at zero
  // specificity so the utility declarations always win.
  addCompositionDefaults(
    compositionClasses.gradient,
    '--cer-gradient-from-position:0%;--cer-gradient-to-position:100%;--cer-gradient-via-position:50%;--cer-gradient-from:rgba(255,255,255,0);--cer-gradient-to:rgba(255,255,255,0);--cer-gradient-stops:var(--cer-gradient-from),var(--cer-gradient-to);',
  );
  addCompositionDefaults(
    compositionClasses.ring,
    '--cer-ring-color:rgb(59 130 246/0.5);',
  );
  addCompositionDefaults(
    compositionClasses.backdropFilter,
    '--cer-backdrop-blur:;--cer-backdrop-brightness:;--cer-backdrop-contrast:;--cer-backdrop-grayscale:;--cer-backdrop-hue-rotate:;--cer-backdrop-invert:;--cer-backdrop-saturate:;--cer-backdrop-sepia:;',
  );
  addCompositionDefaults(
    compositionClasses.filter,
    '--cer-blur:;--cer-brightness:;--cer-contrast:;--cer-grayscale:;--cer-hue-rotate:;--cer-invert:;--cer-saturate:;--cer-sepia:;--cer-drop-shadow:;',
  );
  addCompositionDefaults(
    compositionClasses.transform,
    '--cer-translate-x:0px;--cer-translate-y:0px;--cer-rotate:0deg;--cer-skew-x:0deg;--cer-skew-y:0deg;--cer-scale-x:1;--cer-scale-y:1;',
  );

  // Sort every bucket in canonical property order. Breakpoint order remains
  // the primary key inside responsive buckets; declaration count is the tie
  // breaker Tailwind uses to place multi-side utilities before single sides.
  const sortRules = (rules: string[]): string[] => {
    if (rules.length < 2) return rules;
    const decorated = rules.map((rule) => {
      const [property, count] = _getCascadeSortKey(rule);
      return {
        rule,
        property,
        count,
        responsive: getQueryPixels(rule, '@media'),
        container: getQueryPixels(rule, '@container'),
      };
    });
    decorated.sort((a, b) => {
      if (
        !Number.isNaN(a.responsive) &&
        !Number.isNaN(b.responsive) &&
        a.responsive !== b.responsive
      ) {
        return a.responsive - b.responsive;
      }
      if (
        !Number.isNaN(a.container) &&
        !Number.isNaN(b.container) &&
        a.container !== b.container
      ) {
        return a.container - b.container;
      }
      if (a.property !== b.property) return a.property - b.property;
      if (a.count !== b.count) return b.count - a.count;
      return a.rule < b.rule ? -1 : a.rule > b.rule ? 1 : 0;
    });
    return decorated.map(({ rule }) => rule);
  };

  for (let index = 0; index < buckets.length; index++) {
    buckets[index] = sortRules(buckets[index]);
  }

  const css = buckets.flat().join('');

  // Cache size management: evict the LRU half when the cache is full.
  // Map preserves insertion order and the hit path (delete + re-insert)
  // promotes accessed entries to the end, so entries at the front are
  // always the least-recently-used ones. Iterate keys directly to avoid
  // allocating an intermediate array.
  if (jitCssCache.size >= MAX_CACHE_SIZE) {
    let evictCount = Math.floor(MAX_CACHE_SIZE / 2);
    for (const key of jitCssCache.keys()) {
      if (evictCount-- === 0) break;
      jitCssCache.delete(key);
    }
  }

  jitCssCache.set(cacheKey, css);
  return css;
}
