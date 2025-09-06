/**
 * CSS template literal
 *
 * This doesn't sanitize CSS values.
 * Runtime does that for us.
 * 
 * @param strings
 * @param values
 * @returns
 */
export function css(strings: TemplateStringsArray, ...values: unknown[]): string {
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
export function minifyCSS(css: string): string {
  return css
    // Remove comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove unnecessary whitespace
    .replace(/\s+/g, ' ')
    // Remove spaces around specific characters
    .replace(/\s*([{}:;,>+~])\s*/g, '$1')
    // Remove trailing semicolons before closing braces
    .replace(/;}/g, '}')
    // Remove leading/trailing whitespace
    .trim();
}

// --- Shared baseReset stylesheet ---
let baseResetSheet: CSSStyleSheet | null = null;
export function getBaseResetSheet(): CSSStyleSheet {
  if (!baseResetSheet) {
    baseResetSheet = new CSSStyleSheet();
    baseResetSheet.replaceSync(minifyCSS(baseReset));
  }
  return baseResetSheet;
}

  // (debug logging via console.error is used above when needed)

export function sanitizeCSS(css: string): string {
  // Remove any url(javascript:...) and <script> tags
  return css
    .replace(/url\s*\(\s*['"]?javascript:[^)]*\)/gi, "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/expression\s*\([^)]*\)/gi, "");
}


/**
 * Minimal Shadow DOM reset
 */
export const baseReset = css`
  :host, *, ::before, ::after {
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
  }
  :host {
    display: contents;
    font: 16px/1.5 ui-sans-serif, system-ui, sans-serif;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }
  button, input, select, textarea {
    background: transparent;
    outline: none;
  }
  textarea { resize: vertical }
  progress { vertical-align: baseline }
  button, textarea { overflow: visible }
  img, svg, video, canvas, audio, iframe, embed, object {
    display: block;
    max-width: 100%;
    height: auto;
  }
  svg { fill: currentColor; stroke: none }
  a { text-decoration: inherit; cursor: pointer }
  button, [type=button], [type=reset], [type=submit] {
    cursor: pointer;
    appearance: button;
    background: none;
    -webkit-user-select: none;
    user-select: none;
  }
  ::-webkit-input-placeholder, ::placeholder {
    color: inherit; opacity: .5;
  }
  *:focus-visible {
    outline: 2px solid var(--color-primary-500, #3b82f6);
    outline-offset: 2px;
  }
  ol, ul { list-style: none }
  table { border-collapse: collapse }
  sub, sup {
    font-size: .75em;
    line-height: 0;
    position: relative;
  }
  sub { bottom: -.25em }
  sup { top: -.5em }
  [disabled], [aria-disabled=true] { cursor: not-allowed }
  [hidden] { display: none }
`;

/**
 * JIT CSS implementation
 */

type CSSMap = Record<string, string>;
type SelectorVariantMap = Record<string, (selector: string, body: string) => string>;
type MediaVariantMap = Record<string, string>;

type Shade = 50|100|200|300|400|500|600|700|800|900|950;
type ColorShades = Partial<Record<Shade, string>> & { DEFAULT?: string };

const fallbackHex: Record<string, ColorShades> = {
  neutral: {
    50:  "#fafafa",
    100: "#f4f4f5",
    200: "#e4e4e7",
    300: "#d4d4d8",
    400: "#9f9fa9",
    500: "#71717b",
    600: "#52525c",
    700: "#3f3f46",
    800: "#27272a",
    900: "#18181b",
    950: "#09090b"
  },
  primary: {
    50:  "#eff6ff",
    100: "#dbeafe",
    200: "#bfdbfe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
    800: "#1e40af",
    900: "#1e3a8a",
    950: "#172554"
  },
  secondary: {
    50:  "#eef2ff",
    100: "#e0e7ff",
    200: "#c7d2fe",
    300: "#a5b4fc",
    400: "#818cf8",
    500: "#6366f1",
    600: "#4f46e5",
    700: "#4338ca",
    800: "#3730a3",
    900: "#312e81",
    950: "#1e1b4b"
  },
  success: {
    50:  "#f0fdf4",
    100: "#dcfce7",
    200: "#bbf7d0",
    300: "#86efac",
    400: "#4ade80",
    500: "#22c55e",
    600: "#16a34a",
    700: "#15803d",
    800: "#166534",
    900: "#14532d",
    950: "#052e16"
  },
  info: {
    50:  "#f0f9ff",
    100: "#e0f2fe",
    200: "#bae6fd",
    300: "#7dd3fc",
    400: "#38bdf8",
    500: "#0ea5e9",
    600: "#0284c7",
    700: "#0369a1",
    800: "#075985",
    900: "#0c4a6e",
    950: "#082f49"
  },
  warning: {
    50:  "#fffbeb",
    100: "#fef3c7",
    200: "#fde68a",
    300: "#fcd34d",
    400: "#fbbf24",
    500: "#f59e0b",
    600: "#d97706",
    700: "#b45309",
    800: "#92400e",
    900: "#78350f",
    950: "#451a03"
  },
  error: {
    50:  "#fef2f2",
    100: "#fee2e2",
    200: "#fecaca",
    300: "#fca5a5",
    400: "#f87171",
    500: "#ef4444",
    600: "#dc2626",
    700: "#b91c1c",
    800: "#991b1b",
    900: "#7f1d1d",
    950: "#450a0a"
  },
  white: { DEFAULT: "#ffffff" },
  black: { DEFAULT: "#000000" },
  transparent: { DEFAULT: "transparent" },
  current: { DEFAULT: "currentColor" }
};

export const colors: Record<string, Record<string, string>> =
  Object.fromEntries(
    Object.entries(fallbackHex).map(([name, shades]) => [
      name,
      Object.fromEntries(
        Object.entries(shades).map(([shade, hex]) => [
          shade,
          `var(--color-${name}${shade === "DEFAULT" ? "" : `-${shade}`}, ${hex})`
        ])
      )
    ])
  );

export const utilityMap: CSSMap = {
  /* Display */
  block: "display:block;",
  inline: "display:inline;",
  "inline-block": "display:inline-block;",
  flex: "display:flex;",
  "inline-flex": "display:inline-flex;",
  grid: "display:grid;",
  hidden: "display:none;",

  /* Sizing & Spacing */
  "w-full": "width:100%;",
  "w-screen": "width:100dvw;",
  "h-full": "height:100%;",
  "h-screen": "height:100dvw;",
  "max-w-full": "max-width:100%;",
  "max-h-full": "max-height:100%;",
  "min-w-0": "min-width:0;",
  "min-h-0": "min-height:0;",
  "m-auto": "margin:auto;",
  "mx-auto": "margin-inline:auto;",
  "my-auto": "margin-block:auto;",

  /* Overflow */
  "overflow-auto": "overflow:auto;",
  "overflow-hidden": "overflow:hidden;",
  "overflow-visible": "overflow:visible;",
  "overflow-scroll": "overflow:scroll;",

  /* Pointer Events */
  "pointer-events-none": "pointer-events:none;",
  "pointer-events-auto": "pointer-events:auto;",

  /* Accessibility */
  "sr-only": "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border-width:0;",
  "not-sr-only": "position:static;width:auto;height:auto;padding:0;margin:0;overflow:visible;clip:auto;white-space:normal;",

  /* Grid Layout */
  "grid-cols-1": "grid-template-columns:repeat(1,minmax(0,1fr));",
  "grid-cols-2": "grid-template-columns:repeat(2,minmax(0,1fr));",
  "grid-cols-3": "grid-template-columns:repeat(3,minmax(0,1fr));",
  "grid-cols-4": "grid-template-columns:repeat(4,minmax(0,1fr));",
  "grid-cols-5": "grid-template-columns:repeat(5,minmax(0,1fr));",
  "grid-cols-6": "grid-template-columns:repeat(6,minmax(0,1fr));",
  "grid-cols-7": "grid-template-columns:repeat(7,minmax(0,1fr));",
  "grid-cols-8": "grid-template-columns:repeat(8,minmax(0,1fr));",
  "grid-cols-9": "grid-template-columns:repeat(9,minmax(0,1fr));",
  "grid-cols-10": "grid-template-columns:repeat(10,minmax(0,1fr));",
  "grid-cols-11": "grid-template-columns:repeat(11,minmax(0,1fr));",
  "grid-cols-12": "grid-template-columns:repeat(12,minmax(0,1fr));",
  "grid-rows-1": "grid-template-rows:repeat(1,minmax(0,1fr));",
  "grid-rows-2": "grid-template-rows:repeat(2,minmax(0,1fr));",
  "grid-rows-3": "grid-template-rows:repeat(3,minmax(0,1fr));",
  "grid-rows-4": "grid-template-rows:repeat(4,minmax(0,1fr));",
  "grid-rows-5": "grid-template-rows:repeat(5,minmax(0,1fr));",
  "grid-rows-6": "grid-template-rows:repeat(6,minmax(0,1fr));",
  "grid-rows-7": "grid-template-rows:repeat(7,minmax(0,1fr));",
  "grid-rows-8": "grid-template-rows:repeat(8,minmax(0,1fr));",
  "grid-rows-9": "grid-template-rows:repeat(9,minmax(0,1fr));",
  "grid-rows-10": "grid-template-rows:repeat(10,minmax(0,1fr));",
  "grid-rows-11": "grid-template-rows:repeat(11,minmax(0,1fr));",
  "grid-rows-12": "grid-template-rows:repeat(12,minmax(0,1fr));",

  /* Grid Placement */
  "col-span-1": "grid-column:span 1 / span 1;",
  "col-span-2": "grid-column:span 2 / span 2;",
  "col-span-3": "grid-column:span 3 / span 3;",
  "col-span-4": "grid-column:span 4 / span 4;",
  "col-span-5": "grid-column:span 5 / span 5;",
  "col-span-6": "grid-column:span 6 / span 6;",
  "col-span-7": "grid-column:span 7 / span 7;",
  "col-span-8": "grid-column:span 8 / span 8;",
  "col-span-9": "grid-column:span 9 / span 9;",
  "col-span-10": "grid-column:span 10 / span 10;",
  "col-span-11": "grid-column:span 11 / span 11;",
  "col-span-12": "grid-column:span 12 / span 12;",
  "row-span-1": "grid-row:span 1 / span 1;",
  "row-span-2": "grid-row:span 2 / span 2;",
  "row-span-3": "grid-row:span 3 / span 3;",
  "row-span-4": "grid-row:span 4 / span 4;",
  "row-span-6": "grid-row:span 6 / span 6;",
  "row-span-7": "grid-row:span 7 / span 7;",
  "row-span-8": "grid-row:span 8 / span 8;",
  "row-span-9": "grid-row:span 9 / span 9;",
  "row-span-10": "grid-row:span 10 / span 10;",
  "row-span-11": "grid-row:span 11 / span 11;",
  "row-span-12": "grid-row:span 12 / span 12;",

  /* Positioning */
  absolute: "position:absolute;",
  relative: "position:relative;",
  fixed: "position:fixed;",
  sticky: "position:sticky;",

  /* Typography */
  "font-bold": "font-weight:700;",
  "font-semibold": "font-weight:600;",
  "font-medium": "font-weight:500;",
  "font-light": "font-weight:300;",
  underline: "text-decoration-line:underline;",
  overline: "text-decoration-line:overline;",
  "line-through": "text-decoration-line:line-through;",
  "no-underline": "text-decoration-line:none;",
  italic: "font-style:italic;",
  "not-italic": "font-style:normal;",
  uppercase: "text-transform:uppercase;",
  lowercase: "text-transform:lowercase;",
  capitalize: "text-transform:capitalize;",
  "normal-case": "text-transform:none;",
  "text-left": "text-align:left;",
  "text-center": "text-align:center;",
  "text-right": "text-align:right;",
  "text-xs": "font-size:0.75rem;line-height:calc(1 / 0.75)",
  "text-sm": "font-size:0.875rem;line-height:calc(1.25 / 0.875)",
  "text-base": "font-size:1rem;line-height:calc(1.5 / 1)",
  "text-lg": "font-size:1.125rem;line-height:calc(1.75 / 1.125)",
  "text-xl": "font-size:1.25rem;line-height:calc(1.75 / 1.25)",
  "text-2xl": "font-size:1.5rem;line-height:calc(2 / 1.5)",
  "text-3xl": "font-size:1.875rem;line-height:calc(2.25 / 1.875)",
  "text-4xl": "font-size:2.25rem;line-height:calc(2.5 / 2.25)",
  "text-5xl": "font-size:3rem;line-height:1",
  "text-6xl": "font-size:3.75rem;line-height:1",
  "text-7xl": "font-size:4.5rem;line-height:1",
  "text-8xl": "font-size:6rem;line-height:1",

  /* Borders */
  border: "border-width:1px;",
  "border-2": "border-width:2px;",
  "border-4": "border-width:4px;",
  "border-6": "border-width:6px;",
  "border-8": "border-width:8px;",
  "rounded-none": "border-radius:0;",
  "rounded-xs": "border-radius:0.125rem;",
  "rounded-sm": "border-radius:0.25rem;",
  "rounded-md": "border-radius:0.375rem;",
  "rounded-lg": "border-radius:0.5rem;",
  "rounded-full": "border-radius:9999px;",

  /* Shadow and effects */
  // Shadows use a CSS variable for color so color utilities can modify --ce-shadow-color
  "shadow-none": "--ce-shadow-color: rgb(0 0 0 / 0);box-shadow:0 0 var(--ce-shadow-color, #0000);",
  "shadow-xs": "--ce-shadow-color: rgb(0 0 0 / 0.05);box-shadow:0 1px 2px 0 var(--ce-shadow-color, rgb(0 0 0 / 0.05));",
  "shadow-sm": "--ce-shadow-color: rgb(0 0 0 / 0.1);box-shadow:0 1px 3px 0 var(--ce-shadow-color, rgb(0 0 0 / 0.1)),0 1px 2px -1px var(--ce-shadow-color, rgb(0 0 0 / 0.1));",
  "shadow-md": "--ce-shadow-color: rgb(0 0 0 / 0.1);box-shadow:0 4px 6px -1px var(--ce-shadow-color, rgb(0 0 0 / 0.1)),0 2px 4px -2px var(--ce-shadow-color, rgb(0 0 0 / 0.1));",
  "shadow-lg": "--ce-shadow-color: rgb(0 0 0 / 0.1);box-shadow:0 10px 15px -3px var(--ce-shadow-color, rgb(0 0 0 / 0.1)),0 4px 6px -4px var(--ce-shadow-color, rgb(0 0 0 / 0.1));",
  "shadow-xl": "--ce-shadow-color: rgb(0 0 0 / 0.1);box-shadow:0 20px 25px -5px var(--ce-shadow-color, rgb(0 0 0 / 0.1)),0 8px 10px -6px var(--ce-shadow-color, rgb(0 0 0 / 0.1));",
  "shadow-2xl": "--ce-shadow-color: rgb(0 0 0 / 0.25);box-shadow:0 25px 50px -12px var(--ce-shadow-color, rgb(0 0 0 / 0.25));",

  /* Text Overflow & Whitespace */
  truncate: "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;",

  /* Visibility */
  "visible": "visibility:visible;",
  "invisible": "visibility:hidden;",

  /* Flex Grow/Shrink/Basis */
  "items-center": "align-items:center;",
  "items-start": "align-items:flex-start;",
  "items-end": "align-items:flex-end;",
  "items-baseline": "align-items:baseline;",
  "items-stretch": "align-items:stretch;",
  "justify-center": "justify-content:center;",
  "justify-start": "justify-content:flex-start;",
  "justify-between": "justify-content:space-between;",
  "justify-around": "justify-content:space-around;",
  "justify-evenly": "justify-content:space-evenly;",
  "justify-end": "justify-content:flex-end;",
  "flex-wrap": "flex-wrap:wrap;",
  "flex-nowrap": "flex-wrap:nowrap;",
  "flex-wrap-reverse": "flex-wrap:wrap-reverse;",
  "content-center": "align-content:center;",
  "content-start": "align-content:flex-start;",
  "content-end": "align-content:flex-end;",
  "content-between": "align-content:space-between;",
  "content-around": "align-content:space-around;",
  "content-stretch": "align-content:stretch;",
  "self-auto": "align-self:auto;",
  "self-start": "align-self:flex-start;",
  "self-end": "align-self:flex-end;",
  "self-center": "align-self:center;",
  "self-stretch": "align-self:stretch;",
  "flex-1": "flex:1 1 0%;",
  "flex-auto": "flex:1 1 auto;",
  "flex-initial": "flex:0 1 auto;",
  "flex-none": "flex:0 0 auto;",
  "flex-col": "flex-direction:column;",
  "flex-row": "flex-direction:row;",
  "grow": "flex-grow:1;",
  "shrink": "flex-shrink:1;",
  "grow-0": "flex-grow:0;",
  "shrink-0": "flex-shrink:0;",

  /* Font Family */
  "font-sans": "font-family:ui-sans-serif,system-ui,sans-serif;",
  "font-serif": "font-family:ui-serif,Georgia,serif;",
  "font-mono": "font-family:ui-monospace,SFMono-Regular,monospace;",

  /* Line Clamp (for webkit) */
  "line-clamp-1": "display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;",
  "line-clamp-2": "display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;",
  "line-clamp-3": "display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;",
  "line-clamp-4": "display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;",

  /* Transitions */
  transition: "transition-property:all;transition-duration:150ms;transition-timing-function:ease-in-out;",
  "transition-all": "transition-property:all;",
  "transition-colors": "transition-property:color,background-color,border-color,text-decoration-color,fill,stroke;",
  "transition-shadow": "transition-property:box-shadow;",
  "transition-opacity": "transition-property:opacity;",
  "transition-transform": "transition-property:transform;",
  "transition-none": "transition-property:none;",

  /* Cursor */
  "cursor-auto": "cursor:auto;",
  "cursor-default": "cursor:default;",
  "cursor-pointer": "cursor:pointer;",
  "cursor-wait": "cursor:wait;",
  "cursor-text": "cursor:text;",
  "cursor-move": "cursor:move;",
  "cursor-help": "cursor:help;",
  "cursor-not-allowed": "cursor:not-allowed;",

  /* Z-index */
  "z-0": "z-index:0;",
  "z-10": "z-index:10;",
  "z-20": "z-index:20;",
  "z-30": "z-index:30;",
  "z-40": "z-index:40;",
  "z-50": "z-index:50;",
};

export const spacing = "0.25rem";

export const spacingProps: Record<string, string[]> = {
  m: ["margin"],
  mx: ["margin-inline"],
  my: ["margin-block"],
  mt: ["margin-top"],
  mr: ["margin-right"],
  mb: ["margin-bottom"],
  ml: ["margin-left"],
  p: ["padding"],
  px: ["padding-inline"],
  py: ["padding-block"],
  pt: ["padding-top"],
  pr: ["padding-right"],
  pb: ["padding-bottom"],
  pl: ["padding-left"],
  inset: ["inset"],
  "inset-x": ["inset-inline"],
  "inset-y": ["inset-block"],
  h: ["height"],
  w: ["width"],
  "min-h": ["min-height"],
  "min-w": ["min-width"],
  "max-h": ["max-height"],
  "max-w": ["max-width"],
  top: ["top"],
  bottom: ["bottom"],
  left: ["left"],
  right: ["right"],
  gap: ["gap"],
  "gap-x": ["column-gap"],
  "gap-y": ["row-gap"]
};

function insertPseudoBeforeCombinator(sel: string, pseudo: string): string {
  let depthSquare = 0;
  let depthParen = 0;
  for (let i = 0; i < sel.length; i++) {
    const ch = sel[i];
    if (ch === "[") depthSquare++;
    else if (ch === "]" && depthSquare > 0) depthSquare--;
    else if (ch === "(") depthParen++;
    else if (ch === ")" && depthParen > 0) depthParen--;
    else if (depthSquare === 0 && depthParen === 0 && (ch === ">" || ch === "+" || ch === "~" || ch === " ")) {
      return sel.slice(0, i) + pseudo + sel.slice(i);
    }
  }
  return sel + pseudo;
}

export const selectorVariants: SelectorVariantMap = {
  before: (sel, body) => `${sel}::before{${body}}`,
  after: (sel, body) => `${sel}::after{${body}}`,
  hover: (sel, body) => `${insertPseudoBeforeCombinator(sel, ":hover")}{${body}}`,
  focus: (sel, body) => `${insertPseudoBeforeCombinator(sel, ":focus")}{${body}}`,
  active: (sel, body) => `${insertPseudoBeforeCombinator(sel, ":active")}{${body}}`,
  disabled: (sel, body) => `${insertPseudoBeforeCombinator(sel, ":disabled")}{${body}}`,
  visited: (sel, body) => `${insertPseudoBeforeCombinator(sel, ":visited")}{${body}}`,
  checked: (sel, body) => `${insertPseudoBeforeCombinator(sel, ":checked")}{${body}}`,
  first: (sel, body) => `${insertPseudoBeforeCombinator(sel, ":first-child")}{${body}}`,
  last: (sel, body) => `${insertPseudoBeforeCombinator(sel, ":last-child")}{${body}}`,
  odd: (sel, body) => `${insertPseudoBeforeCombinator(sel, ":nth-child(odd)")}{${body}}`,
  even: (sel, body) => `${insertPseudoBeforeCombinator(sel, ":nth-child(even)")}{${body}}`,
  "focus-within": (sel, body) => `${insertPseudoBeforeCombinator(sel, ":focus-within")}{${body}}`,
  "focus-visible": (sel, body) => `${insertPseudoBeforeCombinator(sel, ":focus-visible")}{${body}}`,

  "group-hover": (sel, body) => `.group:hover ${sel}{${body}}`,
  "group-focus": (sel, body) => `.group:focus ${sel}{${body}}`,
  "group-active": (sel, body) => `.group:active ${sel}{${body}}`,
  "group-disabled": (sel, body) => `.group:disabled ${sel}{${body}}`,

  "peer-hover": (sel, body) => `.peer:hover ~ ${sel}{${body}}`,
  "peer-focus": (sel, body) => `.peer:focus ~ ${sel}{${body}}`,
  "peer-checked": (sel, body) => `.peer:checked ~ ${sel}{${body}}`,
  "peer-disabled": (sel, body) => `.peer:disabled ~ ${sel}{${body}}`,
};


export const mediaVariants: MediaVariantMap = {
  // Responsive
  "sm": "(min-width:640px)",
  "md": "(min-width:768px)",
  "lg": "(min-width:1024px)",
  "xl": "(min-width:1280px)",
  "2xl": "(min-width:1536px)",

  // Dark mode (now plain string)
  "dark": "(prefers-color-scheme: dark)"
};

export const responsiveOrder = ["sm", "md", "lg", "xl", "2xl"];

export function parseSpacing(className: string): string | null {
  const negative = className.startsWith("-");
  const raw = negative ? className.slice(1) : className;
  const parts = raw.split("-");

  if (parts.length < 2) return null;

  const key = parts.slice(0, -1).join("-");
  const numStr = parts[parts.length - 1];
  const num = parseFloat(numStr);

  if (Number.isNaN(num) || !spacingProps[key]) return null;

  const sign = negative ? "-" : "";
  return spacingProps[key]
    .map(prop => `${prop}:calc(${sign}${spacing} * ${num});`)
    .join("");
}

export function hexToRgb(hex: string): string {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r} ${g} ${b}`;
}

export function parseColorClass(className: string): string | null {
  // Match bg-red-500, text-gray-200, border-blue-600, etc.
  const match = /^(bg|text|border|decoration|shadow|outline|caret|accent|fill|stroke)-([a-z]+)-?(\d{2,3}|DEFAULT)?$/.exec(className);
  if (!match) return null;

  const [, type, colorName, shade = "DEFAULT"] = match;
  const colorValue = colors[colorName]?.[shade];
  if (!colorValue) return null;

  // Special-case shadow: we set a CSS variable so shadow-size utilities can compose with color
  if (type === 'shadow') return `--ce-shadow-color:${colorValue};`;

  const propMap: Record<string, string> = {
    bg: "background-color",
    decoration: "text-decoration-color",
    text: "color",
    border: "border-color",
    outline: "outline-color",
    caret: "caret-color",
    accent: "accent-color",
    fill: "fill",
    stroke: "stroke",
  };

  const prop = propMap[type];
  if (!prop) return null;
  return `${prop}:${colorValue};`;
}

export function parseOpacityModifier(className: string): { base: string; opacity?: number } {
  const [base, opacityStr] = className.split("/");
  if (!opacityStr) return { base };

  const opacity = parseInt(opacityStr, 10);
  if (isNaN(opacity) || opacity < 0 || opacity > 100) return { base };

  return { base, opacity: opacity / 100 };
}

export function parseColorWithOpacity(className: string): string | null {
  const { base, opacity } = parseOpacityModifier(className);

  // Try palette first
  const paletteRule = parseColorClass(base); // e.g., "background-color:#ef4444;"
  if (paletteRule) {
    if (opacity !== undefined) {
      const match = /#([0-9a-f]{6})/i.exec(paletteRule);
      if (match) {
        const rgb = hexToRgb(match[0]);
        return paletteRule.replace(/#([0-9a-f]{6})/i, `rgb(${rgb} / ${opacity})`);
      }
    }
    return paletteRule;
  }

  // Try arbitrary color: [bg:#ff0000]/50
  const arbitraryRule = parseArbitrary(base);
  if (arbitraryRule && opacity !== undefined) {
    const match = /#([0-9a-f]{6})/i.exec(arbitraryRule);
    if (match) {
      const rgb = hexToRgb(match[0]);
      return arbitraryRule.replace(/#([0-9a-f]{6})/i, `rgb(${rgb} / ${opacity})`);
    }
  }

  return arbitraryRule;
}

/**
 * Parse opacity utility class (e.g., opacity-25)
 * Returns CSS rule string or null if not valid
 */
export function parseOpacity(className: string): string | null {
  const match = /^opacity-(\d{1,3})$/.exec(className);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  if (value < 0 || value > 100) return null;
  return `opacity:${value / 100};`;
}

/**
 * Arbitrary value parser — supports:
 * - prop-[value]
 */
export function parseArbitrary(className: string): string | null {
  // 1) [prop:value] — only when "prop" is a valid CSS property name (not a selector)
  if (className.startsWith("[") && className.endsWith("]") && !className.includes("-[")) {
    const inner = className.slice(1, -1).trim();

    // prop must be at the very start, and must be a CSS identifier (letters + hyphens)
    const m = inner.match(/^([a-zA-Z][a-zA-Z0-9-]*)\s*:(.*)$/);
    if (m) {
      const prop = m[1].trim();
      let value = m[2].trim();
      // normalize url('...') to url("...") and whole-value single-quotes to double
      value = value.replace(/url\('\s*([^']*?)\s*'\)/g, 'url("$1")');
      value = value.replace(/^'([^']*)'$/g, '"$1"');
      return `${prop}:${value};`;
    }
    // If it didn't match a property, it's an arbitrary variant selector (e.g. [&>h2:hover]) — not a utility
    return null;
  }

  // 2) prop-[value] — arbitrary values for known properties
  const bracketStart = className.indexOf("-[");
  const bracketEnd = className.endsWith("]");
  if (bracketStart > 0 && bracketEnd) {
    const prop = className.slice(0, bracketStart);
    let value = className.slice(bracketStart + 2, -1);

    // Convert underscores to spaces
    value = value.replace(/_/g, " ");

    // Map common abbreviations to CSS properties
    const propMap: Record<string, string> = {
      bg: "background-color",
      text: "color",
      shadow: "box-shadow",
      p: "padding",
      px: "padding-inline",
      py: "padding-block",
      m: "margin",
      mx: "margin-inline",
      my: "margin-block",
      w: "width",
      h: "height",
      "min-w": "min-width",
      "max-w": "max-width",
      "min-h": "min-height",
      "max-h": "max-height",
      "border-t": "border-top",
      "border-b": "border-bottom",
      "border-l": "border-left",
      "border-r": "border-right",
      "border-x": "border-inline",
      "border-y": "border-block",
      transition: "transition-property",
      ease: "transition-timing-function",
      delay: "transition-delay",
      duration: "transition-duration",
      list: "list-style",
      break: "word-break",
      flex: "flex-direction",
      items: "align-items",
      justify: "justify-content",
      whitespace: "white-space",
      select: "user-select",
      content: "align-content",
      self: "align-self",
      basis: "flex-basis",
      tracking: "letter-spacing",
      scroll: "scroll-behavior",
      weight: "font-weight",
      leading: "line-height",
      z: "z-index",
    };

    // Tailwind-like rotate behavior for arbitrary values
    if (prop === "rotate") {
      return `transform:rotate(${value});`;
    }

    const cssProp = propMap[prop] ?? prop.replace(/_/g, "-");
    if (cssProp && value) return `${cssProp}:${value};`;
  }

  return null;
}

/**
 * Parse arbitrary variant from class name.
 * Supports [attr=value]:utility or foo-[bar]:utility
 */
export function parseArbitraryVariant(token: string): string | null {
  // [attr=value] or [&...]
  if (token.startsWith("[") && token.endsWith("]")) {
    const inner = token.slice(1, -1);
    // If it contains &, return without brackets so & can be replaced
    return inner.includes("&") ? inner : token;
  }

  // foo-[bar] style
  const bracketStart = token.indexOf("-[");
  if (bracketStart > 0 && token.endsWith("]")) {
    const inner = token.slice(bracketStart + 2, -1).replace(/_/g, "-");
    return inner.includes("&") ? inner : token.replace(/_/g, "-");
  }

  return null;
}

export function escapeClassName(name: string): string {
  // Escape only selector-relevant characters, not brackets
  return name.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
}

export function extractClassesFromHTML(html: string): string[] {
  // Match class attributes robustly by capturing the opening quote and
  // using a backreference to the same quote for the closing boundary.
  // This ensures embedded single quotes (e.g. url('/icons/mask.svg')) do
  // not prematurely terminate the match.
  const classAttrRegex = /class\s*=\s*(['"])(.*?)\1/g;
  const classList: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = classAttrRegex.exec(html))) {
    // Split on whitespace to preserve complex tokens containing colons,
    // brackets, parentheses and quotes (e.g. [mask-image:url('/icons/mask.svg')]).
    const tokens = match[2].split(/\s+/).filter(Boolean);
    if (tokens.length) classList.push(...tokens);
  }
  return classList.filter(Boolean);
}

/**
 * JIT CSS generation with throttling and memoization.
 * Only regenerates CSS if HTML changes and enough time has passed.
 * Caches results for repeated HTML inputs.
 */
export const jitCssCache = new Map<string, { css: string; timestamp: number }>();
export const JIT_CSS_THROTTLE_MS = 16; // 60fps

export function jitCSS(html: string): string {
  const now = Date.now();
  const cached = jitCssCache.get(html);
  if (cached && now - cached.timestamp < JIT_CSS_THROTTLE_MS) return cached.css;

  const classes = extractClassesFromHTML(html);
  const seen = new Set(classes);

  const bucket1: string[] = [];
  const bucket2: string[] = [];
  const bucket3: string[] = [];
  const bucket4: string[] = [];
  const ruleCache: Record<string, string | null> = {};

  function generateRuleCached(cls: string, stripDark = false): string | null {
    const cacheKey = (stripDark ? "dark|" : "") + cls;
    if (cacheKey in ruleCache) return ruleCache[cacheKey];
    const result = generateRule(cls, stripDark);
    ruleCache[cacheKey] = result;
    return result;
  }

  function classify(before: string[]): number {
    const hasResponsive = before.some(t => responsiveOrder.includes(t));
    const hasDark = before.includes("dark");
    if (before.length === 0) return 1;
    if (!hasResponsive && !hasDark) return 2;
    if (hasResponsive && !hasDark) return 3;
    return 4;
  }

  function splitVariants(input: string): string[] {
    const out: string[] = [];
    let buf = "";
    let depthSquare = 0;
    let depthParen = 0;
    for (let i = 0; i < input.length; i++) {
      const ch = input[i];
      if (ch === "[") depthSquare++;
      else if (ch === "]" && depthSquare > 0) depthSquare--;
      else if (ch === "(") depthParen++;
      else if (ch === ")" && depthParen > 0) depthParen--;
      if (ch === ":" && depthSquare === 0 && depthParen === 0) {
        out.push(buf);
        buf = "";
      } else {
        buf += ch;
      }
    }
    if (buf) out.push(buf);
    return out;
  }

  // Map Tailwind pseudo-variant tokens to their CSS pseudo class strings
  function tokenToPseudo(token: string): string | null {
    switch (token) {
      case "hover": return ":hover";
      case "focus": return ":focus";
      case "active": return ":active";
      case "visited": return ":visited";
      case "disabled": return ":disabled";
      case "checked": return ":checked";
      case "first": return ":first-child";
      case "last": return ":last-child";
      case "odd": return ":nth-child(odd)";
      case "even": return ":nth-child(even)";
      case "focus-within": return ":focus-within";
      case "focus-visible": return ":focus-visible";
      default: return null;
    }
  }

  function generateRule(cls: string, stripDark = false): string | null {
    const parts = splitVariants(cls);

    // Find base utility
    let important = false;
    const basePart = parts.find(p => {
      if (p.startsWith("!")) {
        important = true;
        p = p.slice(1);
      }
      return (
        utilityMap[p] ||
        parseSpacing(p) ||
        parseOpacity(p) ||
        parseColorWithOpacity(p) ||
        parseArbitrary(p)
      );
    });
    if (!basePart) return null;

    const cleanBase = basePart.replace(/^!/, "");
    const baseRule =
      utilityMap[cleanBase] ??
      parseSpacing(cleanBase) ??
      parseOpacity(cleanBase) ??
      parseColorWithOpacity(cleanBase) ??
      parseArbitrary(cleanBase);

    if (!baseRule) return null;

    const baseIndex = parts.indexOf(basePart);
    let before = baseIndex >= 0 ? parts.slice(0, baseIndex) : [];
    if (stripDark) before = before.filter(t => t !== "dark");

    const escapedClass = `.${escapeClassName(cls)}`;
    const SUBJECT = "__SUBJECT__";
    const body = important ? baseRule.replace(/;$/, " !important;") : baseRule;

    // Start with a SUBJECT placeholder we will replace later with the real class
    let selector = SUBJECT;

    // Handle structural wrappers (group/peer) first (preserve order)
    const structural: string[] = [];
    for (const token of before) {
      if (token.startsWith("group-")) {
        selector = `.group:${token.slice(6)} ${selector}`;
        structural.push(token);
      } else if (token.startsWith("peer-")) {
        selector = selector.replace(SUBJECT, `.peer:${token.slice(5)}~${SUBJECT}`);
        structural.push(token);
      }
    }
    before = before.filter(t => !structural.includes(t));

    // Collect pseudos in left-to-right order, but don't mutate SUBJECT yet to preserve order.
    const subjectPseudos: string[] = [];
    const innerPseudos: string[] = [];
    let wrapperVariant: string | null = null;

    for (const token of before) {
      if (token === "dark" || responsiveOrder.includes(token)) continue;

      const variantSelector = parseArbitraryVariant(token);
      if (variantSelector) {
        wrapperVariant = variantSelector;
        continue;
      }

      const pseudo = tokenToPseudo(token);
      if (pseudo) {
        if (!wrapperVariant) subjectPseudos.push(pseudo);
        else innerPseudos.push(pseudo);
        continue;
      }

      const fn = selectorVariants[token];
      if (typeof fn === "function") {
        // apply structural variant immediately
        selector = fn(selector, body).split("{")[0];
      }
    }

    // helper: insert inner pseudos into the 'post' part after the first simple selector
    function insertPseudosIntoPost(post: string, pseudos: string): string {
      if (!pseudos) return post;
      let depthSquare = 0;
      let depthParen = 0;
      // If post starts with a combinator, insert pseudos after the first simple selector
      if (post.length && (post[0] === '>' || post[0] === '+' || post[0] === '~' || post[0] === ' ')) {
        // find end of first simple selector after the combinator
        let i = 1;
        // skip initial whitespace
        while (i < post.length && post[i] === ' ') i++;
        for (; i < post.length; i++) {
          const ch = post[i];
          if (ch === '[') depthSquare++;
          else if (ch === ']' && depthSquare > 0) depthSquare--;
          else if (ch === '(') depthParen++;
          else if (ch === ')' && depthParen > 0) depthParen--;
          // stop at next combinator at depth 0
          if (depthSquare === 0 && depthParen === 0 && (post[i] === '>' || post[i] === '+' || post[i] === '~' || post[i] === ' ')) {
            return post.slice(0, i) + pseudos + post.slice(i);
          }
        }
        // reached end: append pseudos at end
        return post + pseudos;
      }

      for (let i = 0; i < post.length; i++) {
        const ch = post[i];
        if (ch === "[") depthSquare++;
        else if (ch === "]" && depthSquare > 0) depthSquare--;
        else if (ch === "(") depthParen++;
        else if (ch === ")" && depthParen > 0) depthParen--;
        // break at first combinator at depth 0 (space, >, +, ~)
        if (depthSquare === 0 && depthParen === 0 && (ch === '>' || ch === '+' || ch === '~' || ch === ' ')) {
          return post.slice(0, i) + pseudos + post.slice(i);
        }
      }
      return post + pseudos;
    }

    const subjectPseudoStr = subjectPseudos.join("");
    const innerPseudoStr = innerPseudos.join("");

    // Build selector by applying wrapper if present, inserting pseudos in the right spots
    if (wrapperVariant) {
      if (wrapperVariant.includes("&")) {
        const idx = wrapperVariant.indexOf("&");
        const pre = wrapperVariant.slice(0, idx);
        const post = wrapperVariant.slice(idx + 1);
        // place subject with its pseudos where & sits
        const subjectWithPseudos = SUBJECT + subjectPseudoStr;
        // If there are no subject pseudos (nothing attached before the wrapper),
        // inner pseudos should apply to the subject. Otherwise they target the
        // element inside the wrapper (the post), so insert them into the post.
        // Preserve any structural wrappers that were applied earlier by
        // replacing the SUBJECT placeholder in the current selector.
        const currentSelector = selector;
        if (subjectPseudos.length === 0) {
          // attach inner pseudos to the subject
          selector = currentSelector.replace(SUBJECT, pre + subjectWithPseudos + innerPseudoStr + post);
        } else {
          // insert inner pseudos into post after its first simple selector
          const postWithInner = insertPseudosIntoPost(post, innerPseudoStr);
          selector = currentSelector.replace(SUBJECT, pre + subjectWithPseudos + postWithInner);
        }
      } else {
        // prefix-style wrapper like [data-open=true]
        // Insert the wrapper around the existing selector's SUBJECT so structural
        // prefixes remain on the outside.
        const currentSelector = selector;
        selector = currentSelector.replace(SUBJECT, `${wrapperVariant}${SUBJECT + subjectPseudoStr}`);
        if (innerPseudoStr) selector = selector.replace(SUBJECT, `${SUBJECT}${innerPseudoStr}`);
      }
    } else {
      // no wrapper: just attach subject and inner pseudos directly to SUBJECT
      selector = SUBJECT + subjectPseudoStr + innerPseudoStr;
    }

    // re-apply any previously applied structural wrappers (they were applied to the placeholder earlier)
    // At this point 'selector' is a string containing SUBJECT (or actual class replacement next).
    // Replace any remaining SUBJECT with escaped class
    selector = selector.replace(new RegExp(SUBJECT, "g"), escapedClass);

    // Emit final rule
    let rule = `${selector}{${body}}`;

    // Wrap in media queries
    const responsiveTokens = before.filter(t => responsiveOrder.includes(t));
    const lastResponsive = responsiveTokens.length
      ? responsiveTokens[responsiveTokens.length - 1]
      : null;
    const hasDark = before.includes("dark");

    if (stripDark && lastResponsive) {
      rule = `@media (prefers-color-scheme: dark) and ${mediaVariants[lastResponsive]}{${rule}}`;
    } else if (stripDark) {
      rule = `@media (prefers-color-scheme: dark){${rule}}`;
    } else if (hasDark && lastResponsive) {
      rule = `@media (prefers-color-scheme: dark) and ${mediaVariants[lastResponsive]}{${rule}}`;
    } else if (hasDark) {
      rule = `@media (prefers-color-scheme: dark){${rule}}`;
    } else if (lastResponsive) {
      rule = `@media ${mediaVariants[lastResponsive]}{${rule}}`;
    }

    return rule;
  }

  // Use safe splitting in the outer loop as well
  for (const cls of seen) {
    const parts = splitVariants(cls);
    const basePart = parts.find(
      p => utilityMap[p] || parseSpacing(p) || parseOpacity(p) || parseColorWithOpacity(p) || parseArbitrary(p)
    );
    if (!basePart) continue;
    const baseIndex = parts.indexOf(basePart);
    const before = baseIndex >= 0 ? parts.slice(0, baseIndex) : [];
    const bucketNum = classify(before);

    if (bucketNum === 4) {
      const rule = generateRuleCached(cls, true);
      if (rule) bucket4.push(rule);
    } else {
      const rule = generateRuleCached(cls);
      if (rule) {
        if (bucketNum === 1) bucket1.push(rule);
        else if (bucketNum === 2) bucket2.push(rule);
        else if (bucketNum === 3) bucket3.push(rule);
      }
    }
  }

  const css = [...bucket1, ...bucket2, ...bucket3, ...bucket4].join("");
  jitCssCache.set(html, { css, timestamp: now });
  return css;
}
