/**
 * Pure CSS utility functions — no JIT dependencies, no module-level side effects.
 *
 * Extracted so that render.ts and hooks.ts can import lightweight CSS helpers
 * without pulling the entire JIT CSS engine into every consumer's bundle.
 */

import variables from '../css/variables.css?raw';

/**
 * CSS template literal tag
 */
export function css(
  strings: TemplateStringsArray,
  ...values: unknown[]
): string {
  let result = '';
  for (let i = 0; i < strings.length; i++) {
    result += strings[i];
    if (i < values.length) result += values[i];
  }
  return result;
}

/**
 * CSS minification utility (basic)
 */
export function minifyCSS(input: string): string {
  return input
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>~])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

/**
 * Sanitize CSS to prevent injection attacks (XSS, javascript: URLs, expression())
 */
export function sanitizeCSS(input: string): string {
  return input
    .replace(/url\s*\(\s*['"]?javascript:[^)]*\)/gi, '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/expression\s*\([^)]*\)/gi, '');
}

/**
 * Polyfill for CSS.escape() for SSR environments.
 * Based on https://drafts.csswg.org/cssom/#serialize-an-identifier
 */
export function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && CSS.escape) {
    return CSS.escape(value);
  }

  const str = String(value);
  const length = str.length;
  let result = '';
  let i = 0;

  while (i < length) {
    const char = str.charAt(i);
    const code = str.charCodeAt(i);

    if (code === 0x0000) {
      result += '\uFFFD';
    } else if (
      (code >= 0x0001 && code <= 0x001f) ||
      code === 0x007f ||
      (i === 0 && code >= 0x0030 && code <= 0x0039) ||
      (i === 1 &&
        code >= 0x0030 &&
        code <= 0x0039 &&
        str.charCodeAt(0) === 0x002d)
    ) {
      result += '\\' + code.toString(16) + ' ';
    } else if (i === 0 && length === 1 && code === 0x002d) {
      result += '\\' + char;
    } else if (
      code >= 0x0080 ||
      code === 0x002d ||
      code === 0x005f ||
      (code >= 0x0030 && code <= 0x0039) ||
      (code >= 0x0041 && code <= 0x005a) ||
      (code >= 0x0061 && code <= 0x007a)
    ) {
      result += char;
    } else {
      result += '\\' + char;
    }

    i++;
  }

  return result;
}

/** Escape a class name and prefix it with a dot for use in CSS selectors. */
export function escapeClassName(name: string): string {
  return '.' + cssEscape(name);
}

/** Escape a string for use in a RegExp. */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// --- Base reset stylesheet ---

export const baseReset = css`
  ${variables}
  :host,
  *,
  ::before,
  ::after {
    all: isolate;
    box-sizing: border-box;
    border: 0 solid currentColor;
    margin: 0;
    padding: 0;
    font: inherit;
    vertical-align: baseline;
    background: transparent;
    color: inherit;
    -webkit-tap-highlight-color: transparent;
    /* Transform composition variables (reset per-element for composability) */
    --cer-translate-x: 0px;
    --cer-translate-y: 0px;
    --cer-rotate: 0deg;
    --cer-skew-x: 0deg;
    --cer-skew-y: 0deg;
    --cer-scale-x: 1;
    --cer-scale-y: 1;
    /* Ring variables */
    --cer-ring-color: rgb(59 130 246 / 0.5);
    /* Filter composition variables (empty = no-op in filter chain) */
    --cer-blur: ;
    --cer-brightness: ;
    --cer-contrast: ;
    --cer-grayscale: ;
    --cer-hue-rotate: ;
    --cer-invert: ;
    --cer-saturate: ;
    --cer-sepia: ;
    --cer-drop-shadow: ;
    --cer-backdrop-blur: ;
    --cer-backdrop-brightness: ;
    --cer-backdrop-contrast: ;
    --cer-backdrop-grayscale: ;
    --cer-backdrop-hue-rotate: ;
    --cer-backdrop-invert: ;
    --cer-backdrop-saturate: ;
    --cer-backdrop-sepia: ;
  }
  :host {
    display: contents;
    font: 16px/1.5 var(--cer-font-sans, ui-sans-serif, system-ui, sans-serif);
    /* Default CE line-height variable so leading-* can reliably override */
    --cer-line-height: 1.5;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    /* Default gradient variables to avoid undefined var() usage in generated utilities */
    --cer-gradient-from-position: 0%;
    --cer-gradient-to-position: 100%;
    --cer-gradient-via-position: 50%;
    --cer-gradient-from: rgba(255, 255, 255, 0);
    --cer-gradient-to: rgba(255, 255, 255, 0);
    --cer-gradient-stops: var(--cer-gradient-from), var(--cer-gradient-to);
    /* Default outline style variable */
    --cer-outline-style: solid;
  }
  button,
  input,
  select,
  textarea {
    background: transparent;
    outline: none;
  }
  textarea {
    resize: vertical;
  }
  progress {
    vertical-align: baseline;
  }
  button,
  textarea {
    overflow: visible;
  }
  img,
  svg,
  video,
  canvas,
  audio,
  iframe,
  embed,
  object {
    display: block;
    max-width: 100%;
    height: auto;
  }
  svg {
    fill: currentColor;
    stroke: none;
  }
  a {
    text-decoration: inherit;
    cursor: pointer;
  }
  button,
  [type='button'],
  [type='reset'],
  [type='submit'] {
    cursor: pointer;
    appearance: button;
    background: none;
    -webkit-user-select: none;
    user-select: none;
  }
  ::-webkit-input-placeholder,
  ::placeholder {
    color: inherit;
    opacity: 0.5;
  }
  *:focus-visible {
    outline: 2px solid var(--cer-color-primary-500, #3b82f6);
    outline-offset: 2px;
  }
  ol,
  ul {
    list-style: none;
  }
  table {
    border-collapse: collapse;
  }
  sub,
  sup {
    font-size: 0.75em;
    line-height: 0;
    position: relative;
  }
  sub {
    bottom: -0.25em;
  }
  sup {
    top: -0.5em;
  }
  [disabled],
  [aria-disabled='true'] {
    cursor: not-allowed;
  }
  [hidden] {
    display: none;
  }
`;

/** Default spacing unit used by the JIT spacing scale. */
export const spacing = '0.25rem';

// --- Base reset stylesheet singleton ---

let baseResetSheet: CSSStyleSheet | null = null;

export function getBaseResetSheet(): CSSStyleSheet {
  if (!baseResetSheet) {
    if (typeof CSSStyleSheet === 'undefined') {
      baseResetSheet = {
        cssRules: [],
        replaceSync: () => {},
        toString: () => minifyCSS(baseReset),
      } as unknown as CSSStyleSheet;
    } else {
      baseResetSheet = new CSSStyleSheet();
      baseResetSheet.replaceSync(minifyCSS(baseReset));
    }
  }
  return baseResetSheet;
}

/** Reset the base reset sheet singleton (for HMR). @internal */
export function _resetBaseResetSheet(): void {
  baseResetSheet = null;
}
