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
export const baseReset = `
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
  *:focus {
    outline: 2px solid var(--color-blue-500, #3b82f6);
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

const colors: Record<string, Record<string, string>> = {
  gray: {
    50:  "var(--color-gray-50, #f9fafb)",
    100: "var(--color-gray-100, #f3f4f6)",
    200: "var(--color-gray-200, #e5e7eb)",
    300: "var(--color-gray-300, #d1d5db)",
    400: "var(--color-gray-400, #9ca3af)",
    500: "var(--color-gray-500, #6b7280)",
    600: "var(--color-gray-600, #4b5563)",
    700: "var(--color-gray-700, #374151)",
    800: "var(--color-gray-800, #1f2937)",
    900: "var(--color-gray-900, #111827)",
  },
  neutral: {
    50:  "var(--color-neutral-50, #fafafa)",
    100: "var(--color-neutral-100, #f5f5f5)",
    200: "var(--color-neutral-200, #e5e5e5)",
    300: "var(--color-neutral-300, #d4d4d4)",
    400: "var(--color-neutral-400, #a3a3a3)",
    500: "var(--color-neutral-500, #737373)",
    600: "var(--color-neutral-600, #525252)",
    700: "var(--color-neutral-700, #404040)",
    800: "var(--color-neutral-800, #262626)",
    900: "var(--color-neutral-900, #171717)",
  },
  slate: {
    50:  "var(--color-slate-50, #f8fafc)",
    100: "var(--color-slate-100, #f1f5f9)",
    200: "var(--color-slate-200, #e2e8f0)",
    300: "var(--color-slate-300, #cbd5e1)",
    400: "var(--color-slate-400, #94a3b8)",
    500: "var(--color-slate-500, #64748b)",
    600: "var(--color-slate-600, #475569)",
    700: "var(--color-slate-700, #334155)",
    800: "var(--color-slate-800, #1e293b)",
    900: "var(--color-slate-900, #0f172a)",
  },
  zinc: {
    50:  "var(--color-zinc-50, #fafafa)",
    100: "var(--color-zinc-100, #f4f4f5)",
    200: "var(--color-zinc-200, #e4e4e7)",
    300: "var(--color-zinc-300, #d4d4d8)",
    400: "var(--color-zinc-400, #a1a1aa)",
    500: "var(--color-zinc-500, #71717a)",
    600: "var(--color-zinc-600, #52525b)",
    700: "var(--color-zinc-700, #3f3f46)",
    800: "var(--color-zinc-800, #27272a)",
    900: "var(--color-zinc-900, #18181b)",
  },
  red: {
    50:  "var(--color-red-50, #fef2f2)",
    100: "var(--color-red-100, #fee2e2)",
    200: "var(--color-red-200, #fecaca)",
    300: "var(--color-red-300, #fca5a5)",
    400: "var(--color-red-400, #f87171)",
    500: "var(--color-red-500, #ef4444)",
    600: "var(--color-red-600, #dc2626)",
    700: "var(--color-red-700, #b91c1c)",
    800: "var(--color-red-800, #991b1b)",
    900: "var(--color-red-900, #7f1d1d)",
  },
  blue: {
    50:  "var(--color-blue-50, #eff6ff)",
    100: "var(--color-blue-100, #dbeafe)",
    200: "var(--color-blue-200, #bfdbfe)",
    300: "var(--color-blue-300, #93c5fd)",
    400: "var(--color-blue-400, #60a5fa)",
    500: "var(--color-blue-500, #3b82f6)",
    600: "var(--color-blue-600, #2563eb)",
    700: "var(--color-blue-700, #1d4ed8)",
    800: "var(--color-blue-800, #1e40af)",
    900: "var(--color-blue-900, #1e3a8a)",
  },
  green: {
    50:  "var(--color-green-50, #f0fdf4)",
    100: "var(--color-green-100, #dcfce7)",
    200: "var(--color-green-200, #bbf7d0)",
    300: "var(--color-green-300, #86efac)",
    400: "var(--color-green-400, #4ade80)",
    500: "var(--color-green-500, #22c55e)",
    600: "var(--color-green-600, #16a34a)",
    700: "var(--color-green-700, #15803d)",
    800: "var(--color-green-800, #166534)",
    900: "var(--color-green-900, #14532d)",
  },
  amber: {
    50:  "var(--color-amber-50, #fffbeb)",
    100: "var(--color-amber-100, #fef3c7)",
    200: "var(--color-amber-200, #fde68a)",
    300: "var(--color-amber-300, #fcd34d)",
    400: "var(--color-amber-400, #fbbf24)",
    500: "var(--color-amber-500, #f59e0b)",
    600: "var(--color-amber-600, #d97706)",
    700: "var(--color-amber-700, #b45309)",
    800: "var(--color-amber-800, #92400e)",
    900: "var(--color-amber-900, #78350f)",
  },
  indigo: {
    50:  "var(--color-indigo-50, #eef2ff)",
    100: "var(--color-indigo-100, #e0e7ff)",
    200: "var(--color-indigo-200, #c7d2fe)",
    300: "var(--color-indigo-300, #a5b4fc)",
    400: "var(--color-indigo-400, #818cf8)",
    500: "var(--color-indigo-500, #6366f1)",
    600: "var(--color-indigo-600, #4f46e5)",
    700: "var(--color-indigo-700, #4338ca)",
    800: "var(--color-indigo-800, #3730a3)",
    900: "var(--color-indigo-900, #312e81)",
  },
  emerald: {
    50:  "var(--color-emerald-50, #ecfdf5)",
    100: "var(--color-emerald-100, #d1fae5)",
    200: "var(--color-emerald-200, #a7f3d0)",
    300: "var(--color-emerald-300, #6ee7b7)",
    400: "var(--color-emerald-400, #34d399)",
    500: "var(--color-emerald-500, #10b981)",
    600: "var(--color-emerald-600, #059669)",
    700: "var(--color-emerald-700, #047857)",
    800: "var(--color-emerald-800, #065f46)",
    900: "var(--color-emerald-900, #064e3b)",
  },
  rose: {
    50:  "var(--color-rose-50, #fff1f2)",
    100: "var(--color-rose-100, #ffe4e6)",
    200: "var(--color-rose-200, #fecdd3)",
    300: "var(--color-rose-300, #fda4af)",
    400: "var(--color-rose-400, #fb7185)",
    500: "var(--color-rose-500, #f43f5e)",
    600: "var(--color-rose-600, #e11d48)",
    700: "var(--color-rose-700, #be123c)",
    800: "var(--color-rose-800, #9f1239)",
    900: "var(--color-rose-900, #881337)",
  },
  white: { DEFAULT: "var(--color-white, #ffffff)" },
  black: { DEFAULT: "var(--color-black, #000000)" }
};

const utilityMap: CSSMap = {
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
  "grid-cols-12": "grid-template-columns:repeat(12,minmax(0,1fr));",
  "grid-rows-1": "grid-template-rows:repeat(1,minmax(0,1fr));",
  "grid-rows-2": "grid-template-rows:repeat(2,minmax(0,1fr));",
  "grid-rows-3": "grid-template-rows:repeat(3,minmax(0,1fr));",
  "grid-rows-4": "grid-template-rows:repeat(4,minmax(0,1fr));",
  "grid-rows-6": "grid-template-rows:repeat(6,minmax(0,1fr));",
  "grid-rows-12": "grid-template-rows:repeat(12,minmax(0,1fr));",

  /* Grid Placement */
  "col-span-1": "grid-column:span 1 / span 1;",
  "col-span-2": "grid-column:span 2 / span 2;",
  "col-span-3": "grid-column:span 3 / span 3;",
  "col-span-4": "grid-column:span 4 / span 4;",
  "col-span-5": "grid-column:span 5 / span 5;",
  "col-span-6": "grid-column:span 6 / span 6;",
  "col-span-12": "grid-column:span 12 / span 12;",
  "row-span-1": "grid-row:span 1 / span 1;",
  "row-span-2": "grid-row:span 2 / span 2;",
  "row-span-3": "grid-row:span 3 / span 3;",
  "row-span-4": "grid-row:span 4 / span 4;",
  "row-span-6": "grid-row:span 6 / span 6;",
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
  "rounded-none": "border-radius:0;",
  "rounded-xs": "border-radius:0.125rem;",
  "rounded": "border-radius:0.25rem;",
  "rounded-sm": "border-radius:0.25rem;",
  "rounded-md": "border-radius:0.375rem;",
  "rounded-lg": "border-radius:0.5rem;",
  "rounded-full": "border-radius:9999px;",

  /* Ring (box-shadow for focus) */
  "ring-0": "box-shadow:none;",
  "ring-1": "box-shadow:0 0 0 1px rgba(59,130,246,0.5);",
  "ring-2": "box-shadow:0 0 0 2px rgba(59,130,246,0.5);",
  "ring-4": "box-shadow:0 0 0 4px rgba(59,130,246,0.5);",
  "ring-8": "box-shadow:0 0 0 8px rgba(59,130,246,0.5);",

  /* Shadow and effects */
  "shadow-none": "box-shadow:0 0 #0000;",
  "shadow-xs": "box-shadow:0 1px 2px 0 rgb(0 0 0 / 0.05);",
  "shadow-sm": "box-shadow:0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);",
  "shadow-md": "box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);",
  "shadow-lg": "box-shadow:0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);",
  "shadow-xl": "box-shadow:0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);",
  "shadow-2xl": "box-shadow:0 25px 50px -12px rgb(0 0 0 / 0.25);",

  /* Transitions */
  transition: "transition-property:all;transition-duration:150ms;transition-timing-function:cubic-bezier(0.4,0,0.2,1);",

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

  /* Transition Delay/Property */
  "transition-colors": "transition-property:color,background-color,border-color,text-decoration-color,fill,stroke;",
  "transition-opacity": "transition-property:opacity;",
  "transition-transform": "transition-property:transform;",
};

const spacing = "var(--spacing, 0.25rem)";

const spacingProps: Record<string, string[]> = {
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

const selectorVariants: SelectorVariantMap = {
  // State variants
  before: (sel, body) => `${sel}::before{${body}}`,
  after: (sel, body) => `${sel}::after{${body}}`,
  hover: (sel, body) => `${sel}:hover{${body}}`,
  focus: (sel, body) => `${sel}:focus{${body}}`,
  active: (sel, body) => `${sel}:active{${body}}`,
  disabled: (sel, body) => `${sel}:disabled{${body}}`,
  visited: (sel, body) => `${sel}:visited{${body}}`,
  checked: (sel, body) => `${sel}:checked{${body}}`,
  first: (sel, body) => `${sel}:first-child{${body}}`,
  last: (sel, body) => `${sel}:last-child{${body}}`,
  odd: (sel, body) => `${sel}:nth-child(odd){${body}}`,
  even: (sel, body) => `${sel}:nth-child(even){${body}}`,
  "focus-within": (sel, body) => `${sel}:focus-within{${body}}`,
  "focus-visible": (sel, body) => `${sel}:focus-visible{${body}}`,

  // Group variants
  "group-hover": (sel, body) => `.group:hover ${sel}{${body}}`,
  "group-focus": (sel, body) => `.group:focus ${sel}{${body}}`,
  "group-active": (sel, body) => `.group:active ${sel}{${body}}`,
  "group-disabled": (sel, body) => `.group:disabled ${sel}{${body}}`,

  // Peer variants
  "peer-hover": (sel, body) => `.peer:hover ~ ${sel}{${body}}`,
  "peer-focus": (sel, body) => `.peer:focus ~ ${sel}{${body}}`,
  "peer-checked": (sel, body) => `.peer:checked ~ ${sel}{${body}}`,
  "peer-disabled": (sel, body) => `.peer:disabled ~ ${sel}{${body}}`,
};

const mediaVariants: MediaVariantMap = {
  // Responsive
  "sm": "(min-width:640px)",
  "md": "(min-width:768px)",
  "lg": "(min-width:1024px)",
  "xl": "(min-width:1280px)",
  "2xl": "(min-width:1536px)",

  // Dark mode (now plain string)
  "dark": "(prefers-color-scheme: dark)"
};

const responsiveOrder = ["sm", "md", "lg", "xl", "2xl"];

function parseSpacing(className: string): string | null {
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

function hexToRgb(hex: string): string {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r} ${g} ${b}`;
}

function parseColorClass(className: string): string | null {
  // Match bg-red-500, text-gray-200, border-blue-600, etc.
  const match = /^(bg|text|border|shadow|outline|caret|accent)-([a-z]+)-?(\d{2,3}|DEFAULT)?$/.exec(className);
  if (!match) return null;

  const [, type, colorName, shade = "DEFAULT"] = match;
  const colorValue = colors[colorName]?.[shade];
  if (!colorValue) return null;

  const propMap: Record<string, string> = {
    bg: "background-color",
    text: "color",
    border: "border-color",
    shadow: "box-shadow",
    outline: "outline-color",
    caret: "caret-color",
    accent: "accent-color",
  };

  return `${propMap[type]}:${colorValue};`;
}

function parseOpacityModifier(className: string): { base: string; opacity?: number } {
  const [base, opacityStr] = className.split("/");
  if (!opacityStr) return { base };

  const opacity = parseInt(opacityStr, 10);
  if (isNaN(opacity) || opacity < 0 || opacity > 100) return { base };

  return { base, opacity: opacity / 100 };
}

function parseColorWithOpacity(className: string): string | null {
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
 * Arbitrary value parser — supports:
 * - prop-[value]
 */
function parseArbitrary(className: string): string | null {
  // prop-[value] syntax
  const bracketStart = className.indexOf("-[");
  const bracketEnd = className.endsWith("]");
  if (bracketStart > 0 && bracketEnd) {
    const prop = className.slice(0, bracketStart);
    let value = className.slice(bracketStart + 2, -1);

    // Convert underscores to spaces for valid CSS
    value = value.replace(/_/g, " ");

    // Map common abbreviations to CSS properties
    const propMap: Record<string, string> = {
      bg: "background-color",
      text: "color",
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
      shadow: "box-shadow",
      "duration": "transition-duration",
      "list": "list-style",
      "break": "word-break",
      "flex": "flex-direction",
      "items": "align-items",
      "justify": "justify-content",
      "whitespace": "white-space",
      "select": "user-select",
      "content": "align-content",
      "self": "align-self",
      "basis": "flex-basis",
      "tracking": "letter-spacing",
      "scroll": "scroll-behavior",
      "delay": "transition-delay",
      "weight": "font-weight",
      "leading": "line-height",
      z: "z-index"
    };

    const cssProp = propMap[prop] ?? prop.replace(/_/g, "-");
    if (cssProp && value) return `${cssProp}:${value};`;
  }

  return null;
}

function escapeClassName(name: string): string {
  // Escape only selector-relevant characters, not brackets
  return name.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
}

function extractClassesFromHTML(html: string): string[] {
  const classAttrRegex = /class\s*=\s*["']([^"']+)["']/g;
  const classList: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = classAttrRegex.exec(html))) {
    // Split on spaces not inside brackets
    let buffer = '';
    let inBracket = false;
    for (const char of match[1]) {
      if (char === '[') inBracket = true;
      if (char === ']') inBracket = false;
      if (char === ' ' && !inBracket) {
        if (buffer) classList.push(buffer);
        buffer = '';
      } else buffer += char;
    }
    if (buffer) classList.push(buffer);
  }
  return classList.filter(Boolean);
}

/**
 * JIT CSS generation with throttling and memoization.
 * Only regenerates CSS if HTML changes and enough time has passed.
 * Caches results for repeated HTML inputs.
 */
const jitCssCache = new Map<string, { css: string; timestamp: number }>();
const JIT_CSS_THROTTLE_MS = 16; // 60fps

export function jitCSS(html: string): string {
  const now = Date.now();
  const cached = jitCssCache.get(html);

  // Use cached CSS if within throttle window
  if (cached && now - cached.timestamp < JIT_CSS_THROTTLE_MS) return cached.css;

  // ...existing JIT CSS logic...
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

  function generateRule(cls: string, stripDark = false): string | null {
    const parts = cls.split(":");
    const basePart = parts.find(
      p => utilityMap[p] || parseSpacing(p) || parseColorWithOpacity(p) || parseArbitrary(p)
    );
    if (!basePart) return null;

    const baseRule =
      utilityMap[basePart] ??
      parseSpacing(basePart) ??
      parseColorWithOpacity(basePart) ??
      parseArbitrary(basePart);

    if (!baseRule) return null;

    let selector = `.${escapeClassName(cls)}`;
    let body = baseRule;

    const baseIndex = parts.indexOf(basePart);
    let before = baseIndex >= 0 ? parts.slice(0, baseIndex) : [];

    if (stripDark) before = before.filter(t => t !== "dark");

    const responsiveTokens = before.filter(t => responsiveOrder.includes(t));
    const lastResponsive = responsiveTokens.length
      ? responsiveTokens[responsiveTokens.length - 1]
      : null;

    for (const token of before) {
      if (responsiveOrder.includes(token)) continue;
      const variantFn = selectorVariants[token];
      if (typeof variantFn === "function") {
        selector = variantFn(selector, body).replace(/\{.*$/, "");
      }
    }

    let rule = `${selector}{${body}}`;

    if (stripDark && lastResponsive) {
      const responsiveQuery = mediaVariants[lastResponsive] as string;
      rule = `@media (prefers-color-scheme: dark) and ${responsiveQuery}{${rule}}`;
    } else if (stripDark) {
      rule = `@media (prefers-color-scheme: dark){${rule}}`;
    } else if (lastResponsive) {
      const responsiveQuery = mediaVariants[lastResponsive] as string;
      rule = `@media ${responsiveQuery}{${rule}}`;
    }

    return rule;
  }

  for (const cls of seen) {
    const parts = cls.split(":");
    const basePart = parts.find(
      p => utilityMap[p] || parseSpacing(p) || parseColorWithOpacity(p) || parseArbitrary(p)
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