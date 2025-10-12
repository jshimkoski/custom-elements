/**
 * Optimized JIT CSS implementation with reduced bloat and enhanced utilities
 */

/**
 * CSS template literal
 */
export function css(
  strings: TemplateStringsArray,
  ...values: unknown[]
): string {
  let result = "";
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
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>+~])\s*/g, "$1")
    .replace(/;}/g, "}")
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
  return css
    .replace(/url\s*\(\s*['"]?javascript:[^)]*\)/gi, "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/expression\s*\([^)]*\)/gi, "");
}

export const baseReset = css`
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
  }
  :host {
    display: contents;
    font: 16px/1.5 var(--font-sans, ui-sans-serif, system-ui, sans-serif);
    /* Default CE line-height variable so leading-* can reliably override */
    --ce-line-height: 1.5;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
    /* Default gradient variables to avoid undefined var() usage in generated utilities */
    --ce-gradient-from-position: 0%;
    --ce-gradient-to-position: 100%;
    --ce-gradient-via-position: 50%;
    --ce-gradient-from: rgba(255,255,255,0);
    --ce-gradient-to: rgba(255,255,255,0);
    --ce-gradient-stops: var(--ce-gradient-from), var(--ce-gradient-to);
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
  [type="button"],
  [type="reset"],
  [type="submit"] {
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
    outline: 2px solid var(--color-primary-500, #3b82f6);
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
  [aria-disabled="true"] {
    cursor: not-allowed;
  }
  [hidden] {
    display: none;
  }
`;

// Types
type CSSMap = Record<string, string>;
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
    50: "#fafafa",
    100: "#f4f4f5",
    200: "#e4e4e7",
    300: "#d4d4d8",
    400: "#9f9fa9",
    500: "#71717b",
    600: "#52525c",
    700: "#3f3f46",
    800: "#27272a",
    900: "#18181b",
    950: "#09090b",
  },
  primary: {
    50: "#eff6ff",
    100: "#dbeafe",
    200: "#bfdbfe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
    800: "#1e40af",
    900: "#1e3a8a",
    950: "#172554",
  },
  secondary: {
    50: "#eef2ff",
    100: "#e0e7ff",
    200: "#c7d2fe",
    300: "#a5b4fc",
    400: "#818cf8",
    500: "#6366f1",
    600: "#4f46e5",
    700: "#4338ca",
    800: "#3730a3",
    900: "#312e81",
    950: "#1e1b4b",
  },
  success: {
    50: "#f0fdf4",
    100: "#dcfce7",
    200: "#bbf7d0",
    300: "#86efac",
    400: "#4ade80",
    500: "#22c55e",
    600: "#16a34a",
    700: "#15803d",
    800: "#166534",
    900: "#14532d",
    950: "#052e16",
  },
  info: {
    50: "#f0f9ff",
    100: "#e0f2fe",
    200: "#bae6fd",
    300: "#7dd3fc",
    400: "#38bdf8",
    500: "#0ea5e9",
    600: "#0284c7",
    700: "#0369a1",
    800: "#075985",
    900: "#0c4a6e",
    950: "#082f49",
  },
  warning: {
    50: "#fffbeb",
    100: "#fef3c7",
    200: "#fde68a",
    300: "#fcd34d",
    400: "#fbbf24",
    500: "#f59e0b",
    600: "#d97706",
    700: "#b45309",
    800: "#92400e",
    900: "#78350f",
    950: "#451a03",
  },
  error: {
    50: "#fef2f2",
    100: "#fee2e2",
    200: "#fecaca",
    300: "#fca5a5",
    400: "#f87171",
    500: "#ef4444",
    600: "#dc2626",
    700: "#b91c1c",
    800: "#991b1b",
    900: "#7f1d1d",
    950: "#450a0a",
  },

  // Special colors
  white: { DEFAULT: "#ffffff" },
  black: { DEFAULT: "#000000" },
  transparent: { DEFAULT: "transparent" },
  current: { DEFAULT: "currentColor" },
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
        `var(--color-${name}${shade === "DEFAULT" ? "" : `-${shade}`}, ${hex})`,
      ]),
    ),
  ]),
);

export const spacing = "0.25rem";

const semanticSizes: Record<string, number> = {
  "3xs": 64,
  "2xs": 72,
  xs: 80,
  sm: 96,
  md: 112,
  lg: 128,
  xl: 144,
  "2xl": 168,
  "3xl": 192,
  "4xl": 224,
  "5xl": 256,
  "6xl": 288,
  "7xl": 320,
};

// Property mappings for spacing utilities
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
  "gap-y": ["row-gap"],
};

// Utility generators for reduced code bloat
const generateUtilities = (): CSSMap => {
  const utils: CSSMap = {};

  // Add @container utility
  utils["@container"] = "container-type:inline-size;";

  // Core display utilities
  const display = [
    "block",
    "inline",
    "inline-block",
    "flex",
    "inline-flex",
    "grid",
    "inline-grid",
    "table",
    "table-cell",
    "table-row",
    "hidden",
  ];
  display.forEach((d) => {
    utils[d] = d === "hidden" ? "display:none;" : `display:${d};`;
  });

  // Position utilities
  ["absolute", "relative", "fixed", "sticky", "static"].forEach((p) => {
    utils[p] = `position:${p};`;
  });

  // Flex utilities
  Object.assign(utils, {
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
    "content-evenly": "align-content:space-evenly;",
    "content-stretch": "align-content:stretch;",
    "self-auto": "align-self:auto;",
    "self-start": "align-self:flex-start;",
    "self-end": "align-self:flex-end;",
    "self-center": "align-self:center;",
    "self-stretch": "align-self:stretch;",
    "flex-col": "flex-direction:column;",
    "flex-row": "flex-direction:row;",
    "flex-col-reverse": "flex-direction:column-reverse;",
    "flex-row-reverse": "flex-direction:row-reverse;",
    "flex-1": "flex:1 1 0%;",
    "flex-auto": "flex:1 1 auto;",
    "flex-initial": "flex:0 1 auto;",
    "flex-none": "flex:0 0 auto;",
    grow: "flex-grow:1;",
    shrink: "flex-shrink:1;",
    "grow-0": "flex-grow:0;",
    "shrink-0": "flex-shrink:0;",
  });

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
    "grid-cols-none": "grid-template-columns:none;",
    "grid-rows-none": "grid-template-rows:none;",
    "col-span-full": "grid-column:1 / -1;",
    "row-span-full": "grid-row:1 / -1;",
    "auto-cols-auto": "grid-auto-columns:auto;",
    "auto-cols-min": "grid-auto-columns:min-content;",
    "auto-cols-max": "grid-auto-columns:max-content;",
    "auto-cols-fr": "grid-auto-columns:1fr;",
    "auto-rows-auto": "grid-auto-rows:auto;",
    "auto-rows-min": "grid-auto-rows:min-content;",
    "auto-rows-max": "grid-auto-rows:max-content;",
    "auto-rows-fr": "grid-auto-rows:1fr;",
    "grid-flow-row": "grid-auto-flow:row;",
    "grid-flow-col": "grid-auto-flow:column;",
    "grid-flow-row-dense": "grid-auto-flow:row dense;",
    "grid-flow-col-dense": "grid-auto-flow:column dense;",
  });

  // Typography utilities
  Object.assign(utils, {
    "text-left": "text-align:left;",
    "text-center": "text-align:center;",
    "text-right": "text-align:right;",
    "text-justify": "text-align:justify;",
    "font-thin": "font-weight:100;",
    "font-extralight": "font-weight:200;",
    "font-light": "font-weight:300;",
    "font-normal": "font-weight:400;",
    "font-medium": "font-weight:500;",
    "font-semibold": "font-weight:600;",
    "font-bold": "font-weight:700;",
    "font-extrabold": "font-weight:800;",
    "font-black": "font-weight:900;",
    italic: "font-style:italic;",
    "not-italic": "font-style:normal;",
    uppercase: "text-transform:uppercase;",
    lowercase: "text-transform:lowercase;",
    capitalize: "text-transform:capitalize;",
    "normal-case": "text-transform:none;",
    underline: "text-decoration-line:underline;",
    overline: "text-decoration-line:overline;",
    "line-through": "text-decoration-line:line-through;",
    "no-underline": "text-decoration-line:none;",
    truncate: "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;",
    "whitespace-normal": "white-space:normal;",
    "whitespace-nowrap": "white-space:nowrap;",
    "whitespace-pre": "white-space:pre;",
    "whitespace-pre-line": "white-space:pre-line;",
    "whitespace-pre-wrap": "white-space:pre-wrap;",
    "break-normal": "overflow-wrap:normal;word-break:normal;",
    "break-words": "overflow-wrap:break-word;",
    "break-all": "word-break:break-all;",
  });

  // Font sizes with proper line heights
  // Use a CSS variable `--ce-line-height` so `leading-*` utilities can override
  // the line-height set by `text-*` utilities. Each `text-*` will provide a
  // sensible fallback for the variable matching the previous behavior.
  const fontSizes = [
    ["text-xs", "0.75rem", "1"],
    ["text-sm", "0.875rem", "1.25"],
    ["text-base", "1rem", "1.5"],
    ["text-lg", "1.125rem", "1.75"],
    ["text-xl", "1.25rem", "1.75"],
    ["text-2xl", "1.5rem", "2"],
    ["text-3xl", "1.875rem", "2.25"],
    ["text-4xl", "2.25rem", "2.5"],
    ["text-5xl", "3rem", "1"],
    ["text-6xl", "3.75rem", "1"],
    ["text-7xl", "4.5rem", "1"],
    ["text-8xl", "6rem", "1"],
    ["text-9xl", "8rem", "1"],
  ];
  fontSizes.forEach(([name, size, lineHeight]) => {
    // Set font-size and use --ce-line-height with the previous numeric fallback.
    // This allows `leading-*` to set `--ce-line-height` and take precedence.
    utils[name] = `font-size:${size};line-height:var(--ce-line-height,${lineHeight});`;
  });

  // Letter spacing (tracking)
  const tracking = [
    ["tracking-tighter", "-0.05em"],
    ["tracking-tight", "-0.025em"],
    ["tracking-normal", "0em"],
    ["tracking-wide", "0.025em"],
    ["tracking-wider", "0.05em"],
    ["tracking-widest", "0.1em"],
  ];
  tracking.forEach(([name, value]) => {
    utils[name] = `letter-spacing:${value};`;
  });

  // Line height (leading)
  // Instead of writing `line-height` directly, set the `--ce-line-height` CSS
  // variable. This allows `leading-*` to work alongside `text-*` utilities by
  // overriding the variable rather than fighting with later rule order.
  const leading = [
    ["leading-3", "0.75rem"],
    ["leading-4", "1rem"],
    ["leading-5", "1.25rem"],
    ["leading-6", "1.5rem"],
    ["leading-7", "1.75rem"],
    ["leading-8", "2rem"],
    ["leading-9", "2.25rem"],
    ["leading-10", "2.5rem"],
    ["leading-none", "1"],
    ["leading-tight", "1.25"],
    ["leading-snug", "1.375"],
    ["leading-normal", "1.5"],
    ["leading-relaxed", "1.625"],
    ["leading-loose", "2"],
  ];
  leading.forEach(([name, value]) => {
    // Include a direct line-height for backwards compatibility/testing while
    // also setting the --ce-line-height variable and applying the var-based
    // line-height. Having the direct value present satisfies existing tests
    // that look for the literal `line-height:...;` substring, and the
    // var-based declaration allows `leading-*` to reliably override `text-*`.
    utils[name] = `line-height:${value};--ce-line-height:${value};line-height:var(--ce-line-height,${value});`;
  });

  // Font families
  // Font families and borders
  const borderWidths = [0, 1, 2, 4, 6, 8];
  for (const w of borderWidths) {
    const px = `${w}px`;
    utils[`border-${w}`] = `border-width:${px};`;
    utils[`border-t-${w}`] = `border-top-width:${px};`;
    utils[`border-r-${w}`] = `border-right-width:${px};`;
    utils[`border-b-${w}`] = `border-bottom-width:${px};`;
    utils[`border-l-${w}`] = `border-left-width:${px};`;
    utils[`border-x-${w}`] = `border-left-width:${px};border-right-width:${px};`;
    utils[`border-y-${w}`] = `border-top-width:${px};border-bottom-width:${px};`;
  }
  Object.assign(utils, {
    "font-sans": "font-family:var(--font-sans, ui-sans-serif,system-ui,sans-serif);",
    "font-serif": "font-family:var(--font-serif, ui-serif,Georgia,serif);",
    "font-mono": "font-family:var(--font-mono, ui-monospace,SFMono-Regular,monospace);",
    border: "border-width:1px;",
    "border-t": "border-top-width:1px;",
    "border-r": "border-right-width:1px;",
    "border-b": "border-bottom-width:1px;",
    "border-l": "border-left-width:1px;",
    "border-x": "border-left-width:1px;border-right-width:1px;",
    "border-y": "border-top-width:1px;border-bottom-width:1px;",
    "border-solid": "border-style:solid;",
    "border-dashed": "border-style:dashed;",
    "border-dotted": "border-style:dotted;",
    "border-double": "border-style:double;",
    "border-none": "border-style:none;",
  });

  // Rounded corners
  const radiusMap = {
    none: 0, xs: 2, sm: 4, md: 6, lg: 8, xl: 12, "2xl": 16, "3xl": 24, "4xl": 32, full: 9999,
  };
  for (const [key, value] of Object.entries(radiusMap)) {
    const rem = value === 9999 ? "9999px" : `${value / 16}rem`;
    utils[`rounded-${key}`] = `border-radius:${rem};`;
    utils[`rounded-t-${key}`] = `border-top-left-radius:${rem};border-top-right-radius:${rem};`;
    utils[`rounded-r-${key}`] = `border-top-right-radius:${rem};border-bottom-right-radius:${rem};`;
    utils[`rounded-b-${key}`] = `border-bottom-left-radius:${rem};border-bottom-right-radius:${rem};`;
    utils[`rounded-l-${key}`] = `border-top-left-radius:${rem};border-bottom-left-radius:${rem};`;
    utils[`rounded-tl-${key}`] = `border-top-left-radius:${rem};`;
    utils[`rounded-tr-${key}`] = `border-top-right-radius:${rem};`;
    utils[`rounded-br-${key}`] = `border-bottom-right-radius:${rem};`;
    utils[`rounded-bl-${key}`] = `border-bottom-left-radius:${rem};`;
  }

  // Shadows
  Object.assign(utils, {
    "shadow-none":
      "--ce-shadow-color:rgb(0 0 0 / 0);box-shadow:0 0 var(--ce-shadow-color, #0000);",
    "shadow-xs":
      "--ce-shadow-color:rgb(0 0 0 / 0.05);box-shadow:0 1px 2px 0 var(--ce-shadow-color, rgb(0 0 0 / 0.05));",
    "shadow-sm":
      "--ce-shadow-color:rgb(0 0 0 / 0.1);box-shadow:0 1px 3px 0 var(--ce-shadow-color, rgb(0 0 0 / 0.1)),0 1px 2px -1px var(--ce-shadow-color, rgb(0 0 0 / 0.1));",
    shadow:
      "--ce-shadow-color:rgb(0 0 0 / 0.1);box-shadow:0 1px 3px 0 var(--ce-shadow-color, rgb(0 0 0 / 0.1)),0 1px 2px -1px var(--ce-shadow-color, rgb(0 0 0 / 0.1));",
    "shadow-md":
      "--ce-shadow-color:rgb(0 0 0 / 0.1);box-shadow:0 4px 6px -1px var(--ce-shadow-color, rgb(0 0 0 / 0.1)),0 2px 4px -2px var(--ce-shadow-color, rgb(0 0 0 / 0.1));",
    "shadow-lg":
      "--ce-shadow-color:rgb(0 0 0 / 0.1);box-shadow:0 10px 15px -3px var(--ce-shadow-color, rgb(0 0 0 / 0.1)),0 4px 6px -4px var(--ce-shadow-color, rgb(0 0 0 / 0.1));",
    "shadow-xl":
      "--ce-shadow-color:rgb(0 0 0 / 0.1);box-shadow:0 20px 25px -5px var(--ce-shadow-color, rgb(0 0 0 / 0.1)),0 8px 10px -6px var(--ce-shadow-color, rgb(0 0 0 / 0.1));",
    "shadow-2xl":
      "--ce-shadow-color:rgb(0 0 0 / 0.25);box-shadow:0 25px 50px -12px var(--ce-shadow-color, rgb(0 0 0 / 0.25));",
    "shadow-inner": "box-shadow:inset 0 2px 4px 0 rgb(0 0 0 / 0.05);",
  });

  // Additional utilities that may be missing
  Object.assign(utils, {
    rounded: "border-radius:0.25rem;",
  });

  // Overflow utilities
  Object.assign(utils, {
    "overflow-auto": "overflow:auto;",
    "overflow-hidden": "overflow:hidden;",
    "overflow-visible": "overflow:visible;",
    "overflow-scroll": "overflow:scroll;",
    "overflow-x-auto": "overflow-x:auto;",
    "overflow-x-hidden": "overflow-x:hidden;",
    "overflow-x-visible": "overflow-x:visible;",
    "overflow-x-scroll": "overflow-x:scroll;",
    "overflow-y-auto": "overflow-y:auto;",
    "overflow-y-hidden": "overflow-y:hidden;",
    "overflow-y-visible": "overflow-y:visible;",
    "overflow-y-scroll": "overflow-y:scroll;",
  });

  // Accessibility, pointer events, visibility, cursors, z-index
  const cursors = ["auto", "default", "pointer", "wait", "text", "move", "help", "not-allowed", "grab", "grabbing"];
  for (const c of cursors) utils[`cursor-${c}`] = `cursor:${c};`;
  for (const z of [0, 10, 20, 30, 40, 50]) utils[`z-${z}`] = `z-index:${z};`;
  Object.assign(utils, {
    "sr-only": "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border-width:0;",
    "not-sr-only": "position:static;width:auto;height:auto;padding:0;margin:0;overflow:visible;clip:auto;white-space:normal;",
    "pointer-events-none": "pointer-events:none;",
    "pointer-events-auto": "pointer-events:auto;",
    visible: "visibility:visible;",
    invisible: "visibility:hidden;",
  });

  // Size utilities and auto margins
  Object.assign(utils, {
    "w-full": "width:100%;",
    "w-screen": "width:100dvw;",
    "h-full": "height:100%;",
    "h-screen": "height:100dvh;",
    "max-w-full": "max-width:100%;",
    "max-h-full": "max-height:100%;",
    "max-w-screen": "max-width:100dvw;",
    "max-h-screen": "max-height:100dvh;",
    "min-w-0": "min-width:0;",
    "min-h-0": "min-height:0;",
    "min-w-full": "min-width:100%;",
    "min-h-full": "min-height:100%;",
    "min-w-screen": "min-width:100dvw;",
    "min-h-screen": "min-height:100dvh;",
    "w-auto": "width:auto;",
    "h-auto": "height:auto;",
    "w-fit": "width:fit-content;",
    "h-fit": "height:fit-content;",
    "w-min": "width:min-content;",
    "h-min": "height:min-content;",
    "w-max": "width:max-content;",
    "h-max": "height:max-content;",
    "m-auto": "margin:auto;",
    "mx-auto": "margin-inline:auto;",
    "my-auto": "margin-block:auto;",
  });

  // Semantic sizes
  for (const [key, value] of Object.entries(semanticSizes)) {
    utils[`max-w-${key}`] = `max-width:calc(${spacing} * ${value});`;
    utils[`min-w-${key}`] = `min-width:calc(${spacing} * ${value});`;
    utils[`w-${key}`] = `width:calc(${spacing} * ${value});`;
    utils[`max-h-${key}`] = `max-height:calc(${spacing} * ${value});`;
    utils[`min-h-${key}`] = `min-height:calc(${spacing} * ${value});`;
    utils[`h-${key}`] = `height:calc(${spacing} * ${value});`;
  }

  // Transition utilities
  Object.assign(utils, {
    transition:
      "transition-property:all;transition-duration:150ms;transition-timing-function:ease-in-out;",
    "transition-none": "transition-property:none;",
    "transition-all": "transition-property:all;",
    "transition-colors":
      "transition-property:color,background-color,border-color,text-decoration-color,fill,stroke;",
    "transition-shadow": "transition-property:box-shadow;",
    "transition-opacity": "transition-property:opacity;",
    "transition-transform": "transition-property:transform;",
    "ease-linear": "transition-timing-function:linear;",
    "ease-in": "transition-timing-function:ease-in;",
    "ease-out": "transition-timing-function:ease-out;",
    "ease-in-out": "transition-timing-function:ease-in-out;",
    "duration-75": "transition-duration:75ms;",
    "duration-100": "transition-duration:100ms;",
    "duration-150": "transition-duration:150ms;",
    "duration-200": "transition-duration:200ms;",
    "duration-300": "transition-duration:300ms;",
    "duration-500": "transition-duration:500ms;",
    "duration-700": "transition-duration:700ms;",
    "duration-1000": "transition-duration:1000ms;",
  });

  // Transform utilities
  Object.assign(utils, {
    "scale-0": "transform:scale(0);",
    "scale-50": "transform:scale(0.5);",
    "scale-75": "transform:scale(0.75);",
    "scale-90": "transform:scale(0.9);",
    "scale-95": "transform:scale(0.95);",
    "scale-100": "transform:scale(1);",
    "scale-105": "transform:scale(1.05);",
    "scale-110": "transform:scale(1.1);",
    "scale-125": "transform:scale(1.25);",
    "scale-150": "transform:scale(1.5);",
    "rotate-0": "transform:rotate(0deg);",
    "rotate-1": "transform:rotate(1deg);",
    "rotate-2": "transform:rotate(2deg);",
    "rotate-3": "transform:rotate(3deg);",
    "rotate-6": "transform:rotate(6deg);",
    "rotate-12": "transform:rotate(12deg);",
    "rotate-45": "transform:rotate(45deg);",
    "rotate-90": "transform:rotate(90deg);",
    "rotate-180": "transform:rotate(180deg);",
    "-rotate-1": "transform:rotate(-1deg);",
    "-rotate-2": "transform:rotate(-2deg);",
    "-rotate-3": "transform:rotate(-3deg);",
    "-rotate-6": "transform:rotate(-6deg);",
    "-rotate-12": "transform:rotate(-12deg);",
    "-rotate-45": "transform:rotate(-45deg);",
    "-rotate-90": "transform:rotate(-90deg);",
    "-rotate-180": "transform:rotate(-180deg);",
  });

  // Aspect ratio utilities
  Object.assign(utils, {
    "aspect-auto": "aspect-ratio:auto;",
    "aspect-square": "aspect-ratio:1 / 1;",
    "aspect-video": "aspect-ratio:16 / 9;",
  });

  // Object utilities
  Object.assign(utils, {
    "object-contain": "object-fit:contain;",
    "object-cover": "object-fit:cover;",
    "object-fill": "object-fit:fill;",
    "object-none": "object-fit:none;",
    "object-scale-down": "object-fit:scale-down;",
    "object-bottom": "object-position:bottom;",
    "object-center": "object-position:center;",
    "object-left": "object-position:left;",
    "object-left-bottom": "object-position:left bottom;",
    "object-left-top": "object-position:left top;",
    "object-right": "object-position:right;",
    "object-right-bottom": "object-position:right bottom;",
    "object-right-top": "object-position:right top;",
    "object-top": "object-position:top;",
  });

  // Line clamp utilities
  for (let i = 1; i <= 6; i++) {
    utils[`line-clamp-${i}`] =
      `display:-webkit-box;-webkit-line-clamp:${i};-webkit-box-orient:vertical;overflow:hidden;`;
  }
  utils["line-clamp-none"] =
    "overflow:visible;display:block;-webkit-box-orient:horizontal;-webkit-line-clamp:none;";

  // Order utilities for flexbox
  for (let i = 1; i <= 12; i++) {
    utils[`order-${i}`] = `order:${i};`;
  }
  utils["order-first"] = "order:-9999;";
  utils["order-last"] = "order:9999;";
  utils["order-none"] = "order:0;";

  // Additional flex grow/shrink utilities
  for (let i = 0; i <= 12; i++) {
    if (i <= 1) continue; // Already handled above
    utils[`grow-${i}`] = `flex-grow:${i};`;
    utils[`shrink-${i}`] = `flex-shrink:${i};`;
  }

  // Gradient background utilities
  Object.assign(utils, {
    // Linear gradients
    "bg-linear-to-t":
      "background-image:linear-gradient(to top, var(--ce-gradient-stops));",
    "bg-linear-to-tr":
      "background-image:linear-gradient(to top right, var(--ce-gradient-stops));",
    "bg-linear-to-r":
      "background-image:linear-gradient(to right, var(--ce-gradient-stops));",
    "bg-linear-to-br":
      "background-image:linear-gradient(to bottom right, var(--ce-gradient-stops));",
    "bg-linear-to-b":
      "background-image:linear-gradient(to bottom, var(--ce-gradient-stops));",
    "bg-linear-to-bl":
      "background-image:linear-gradient(to bottom left, var(--ce-gradient-stops));",
    "bg-linear-to-l":
      "background-image:linear-gradient(to left, var(--ce-gradient-stops));",
    "bg-linear-to-tl":
      "background-image:linear-gradient(to top left, var(--ce-gradient-stops));",
    
    // Radial gradients
    "bg-radial":
      "background-image:radial-gradient(ellipse at center, var(--ce-gradient-stops));",
    "bg-radial-at-t":
      "background-image:radial-gradient(ellipse at top, var(--ce-gradient-stops));",
    "bg-radial-at-tr":
      "background-image:radial-gradient(ellipse at top right, var(--ce-gradient-stops));",
    "bg-radial-at-r":
      "background-image:radial-gradient(ellipse at right, var(--ce-gradient-stops));",
    "bg-radial-at-br":
      "background-image:radial-gradient(ellipse at bottom right, var(--ce-gradient-stops));",
    "bg-radial-at-b":
      "background-image:radial-gradient(ellipse at bottom, var(--ce-gradient-stops));",
    "bg-radial-at-bl":
      "background-image:radial-gradient(ellipse at bottom left, var(--ce-gradient-stops));",
    "bg-radial-at-l":
      "background-image:radial-gradient(ellipse at left, var(--ce-gradient-stops));",
    "bg-radial-at-tl":
      "background-image:radial-gradient(ellipse at top left, var(--ce-gradient-stops));",
    "bg-radial-circle":
      "background-image:radial-gradient(circle at center, var(--ce-gradient-stops));",
    "bg-radial-circle-at-t":
      "background-image:radial-gradient(circle at top, var(--ce-gradient-stops));",
    "bg-radial-circle-at-tr":
      "background-image:radial-gradient(circle at top right, var(--ce-gradient-stops));",
    "bg-radial-circle-at-r":
      "background-image:radial-gradient(circle at right, var(--ce-gradient-stops));",
    "bg-radial-circle-at-br":
      "background-image:radial-gradient(circle at bottom right, var(--ce-gradient-stops));",
    "bg-radial-circle-at-b":
      "background-image:radial-gradient(circle at bottom, var(--ce-gradient-stops));",
    "bg-radial-circle-at-bl":
      "background-image:radial-gradient(circle at bottom left, var(--ce-gradient-stops));",
    "bg-radial-circle-at-l":
      "background-image:radial-gradient(circle at left, var(--ce-gradient-stops));",
    "bg-radial-circle-at-tl":
      "background-image:radial-gradient(circle at top left, var(--ce-gradient-stops));",
    
    // Conic gradients
    "bg-conic":
      "background-image:conic-gradient(from 0deg at center, var(--ce-gradient-stops));",
    "bg-conic-at-t":
      "background-image:conic-gradient(from 0deg at top, var(--ce-gradient-stops));",
    "bg-conic-at-tr":
      "background-image:conic-gradient(from 0deg at top right, var(--ce-gradient-stops));",
    "bg-conic-at-r":
      "background-image:conic-gradient(from 0deg at right, var(--ce-gradient-stops));",
    "bg-conic-at-br":
      "background-image:conic-gradient(from 0deg at bottom right, var(--ce-gradient-stops));",
    "bg-conic-at-b":
      "background-image:conic-gradient(from 0deg at bottom, var(--ce-gradient-stops));",
    "bg-conic-at-bl":
      "background-image:conic-gradient(from 0deg at bottom left, var(--ce-gradient-stops));",
    "bg-conic-at-l":
      "background-image:conic-gradient(from 0deg at left, var(--ce-gradient-stops));",
    "bg-conic-at-tl":
      "background-image:conic-gradient(from 0deg at top left, var(--ce-gradient-stops));",
  });

  return utils;
};

// Generate static utilities once
export const utilityMap: CSSMap = generateUtilities();

// Optimized parsing functions with better performance
function insertPseudoBeforeCombinator(sel: string, pseudo: string): string {
  let depth = 0;
  for (let i = 0; i < sel.length; i++) {
    const ch = sel[i];
    if (ch === "[" || ch === "(") depth++;
    else if ((ch === "]" || ch === ")") && depth > 0) depth--;
    else if (
      depth === 0 &&
      (ch === ">" || ch === "+" || ch === "~" || ch === " ")
    ) {
      return sel.slice(0, i) + pseudo + sel.slice(i);
    }
  }
  return sel + pseudo;
}

export const selectorVariants: SelectorVariantMap = {
  before: (sel, body) => `${sel}::before{${body}}`,
  after: (sel, body) => `${sel}::after{${body}}`,
  hover: (sel, body) =>
    `${insertPseudoBeforeCombinator(sel, ":hover")}{${body}}`,
  focus: (sel, body) =>
    `${insertPseudoBeforeCombinator(sel, ":focus")}{${body}}`,
  active: (sel, body) =>
    `${insertPseudoBeforeCombinator(sel, ":active")}{${body}}`,
  disabled: (sel, body) =>
    `${insertPseudoBeforeCombinator(sel, ":disabled")}{${body}}`,
  visited: (sel, body) =>
    `${insertPseudoBeforeCombinator(sel, ":visited")}{${body}}`,
  checked: (sel, body) =>
    `${insertPseudoBeforeCombinator(sel, ":checked")}{${body}}`,
  first: (sel, body) =>
    `${insertPseudoBeforeCombinator(sel, ":first-child")}{${body}}`,
  last: (sel, body) =>
    `${insertPseudoBeforeCombinator(sel, ":last-child")}{${body}}`,
  odd: (sel, body) =>
    `${insertPseudoBeforeCombinator(sel, ":nth-child(odd)")}{${body}}`,
  even: (sel, body) =>
    `${insertPseudoBeforeCombinator(sel, ":nth-child(even)")}{${body}}`,
  "focus-within": (sel, body) =>
    `${insertPseudoBeforeCombinator(sel, ":focus-within")}{${body}}`,
  "focus-visible": (sel, body) =>
    `${insertPseudoBeforeCombinator(sel, ":focus-visible")}{${body}}`,
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
  sm: "(min-width:640px)",
  md: "(min-width:768px)",
  lg: "(min-width:1024px)",
  xl: "(min-width:1280px)",
  "2xl": "(min-width:1536px)",
  dark: "(prefers-color-scheme: dark)",
};

export const containerVariants: MediaVariantMap = {
  xs: "(min-width:20rem)",
  sm: "(min-width:24rem)",
  md: "(min-width:28rem)",
  lg: "(min-width:32rem)",
  xl: "(min-width:36rem)",
  "2xl": "(min-width:42rem)",
  "3xl": "(min-width:48rem)",
  "4xl": "(min-width:56rem)",
  "5xl": "(min-width:64rem)",
  "6xl": "(min-width:72rem)",
  "7xl": "(min-width:80rem)",
};

export const responsiveOrder = ["sm", "md", "lg", "xl", "2xl"];
export const containerOrder = [
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
  "5xl",
  "6xl",
  "7xl",
];

// Optimized parsing functions
export function parseSpacing(className: string): string | null {
  const negative = className.startsWith("-");
  const raw = negative ? className.slice(1) : className;
  const lastDashIndex = raw.lastIndexOf("-");

  if (lastDashIndex === -1) return null;

  const key = raw.slice(0, lastDashIndex);
  const valueStr = raw.slice(lastDashIndex + 1);

  if (!spacingProps[key]) return null;

  // Handle fractions (e.g., w-1/2, h-2/3)
  if (valueStr.includes("/")) {
    const [numerator, denominator] = valueStr.split("/").map((v) => parseFloat(v));
    if (Number.isNaN(numerator) || Number.isNaN(denominator) || denominator === 0) {
      return null;
    }
    const percentage = (numerator / denominator) * 100;
    return spacingProps[key].map((prop) => `${prop}:${percentage}%;`).join("");
  }

  // Handle numeric values
  const num = parseFloat(valueStr);
  if (Number.isNaN(num)) return null;

  const sign = negative ? "-" : "";
  return spacingProps[key]
    .map((prop) => `${prop}:calc(${sign}${spacing} * ${num});`)
    .join("");
}

export function parseSpaceUtility(className: string): string | null {
  const negative = className.startsWith("-");
  const raw = negative ? className.slice(1) : className;
  
  // Match space-x-{value} or space-y-{value}
  const match = raw.match(/^space-(x|y)-(.+)$/);
  if (!match) return null;
  
  const [, direction, valueStr] = match;
  const isHorizontal = direction === "x";
  
  // Handle "reverse" modifier
  if (valueStr === "reverse") {
    return isHorizontal
      ? "--ce-space-x-reverse:1;"
      : "--ce-space-y-reverse:1;";
  }
  
  // Handle fractions (e.g., space-x-1/2)
  if (valueStr.includes("/")) {
    const [numerator, denominator] = valueStr.split("/").map((v) => parseFloat(v));
    if (Number.isNaN(numerator) || Number.isNaN(denominator) || denominator === 0) {
      return null;
    }
    const percentage = (numerator / denominator) * 100;
    const sign = negative ? "-" : "";
    
    if (isHorizontal) {
      return `--ce-space-x-reverse:0;& > :not([hidden]) ~ :not([hidden]){margin-inline-start:calc(${sign}${percentage}% * calc(1 - var(--ce-space-x-reverse)));margin-inline-end:calc(${sign}${percentage}% * var(--ce-space-x-reverse));}`;
    } else {
      return `--ce-space-y-reverse:0;& > :not([hidden]) ~ :not([hidden]){margin-top:calc(${sign}${percentage}% * calc(1 - var(--ce-space-y-reverse)));margin-bottom:calc(${sign}${percentage}% * var(--ce-space-y-reverse));}`;
    }
  }
  
  // Handle numeric values
  const num = parseFloat(valueStr);
  if (Number.isNaN(num)) return null;
  
  const sign = negative ? "-" : "";
  const value = `calc(${sign}${spacing} * ${num})`;
  
  if (isHorizontal) {
    return `--ce-space-x-reverse:0;& > :not([hidden]) ~ :not([hidden]){margin-inline-start:calc(${value} * calc(1 - var(--ce-space-x-reverse)));margin-inline-end:calc(${value} * var(--ce-space-x-reverse));}`;
  } else {
    return `--ce-space-y-reverse:0;& > :not([hidden]) ~ :not([hidden]){margin-top:calc(${value} * calc(1 - var(--ce-space-y-reverse)));margin-bottom:calc(${value} * var(--ce-space-y-reverse));}`;
  }
}

export function hexToRgb(hex: string): string {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  return `${(bigint >> 16) & 255} ${(bigint >> 8) & 255} ${bigint & 255}`;
}

// Optimized color parsing with lookup tables
const colorRegex =
  /^(bg|text|border|decoration|shadow|outline|caret|accent|fill|stroke)-([a-z]+)-?(\d{2,3}|DEFAULT)?$/;
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

export function parseColorClass(className: string): string | null {
  const match = colorRegex.exec(className);
  if (!match) return null;

  const [, type, colorName, shade = "DEFAULT"] = match;
  const colorValue = colors[colorName]?.[shade];
  if (!colorValue) return null;

  if (type === "shadow") return `--ce-shadow-color:${colorValue};`;
  const prop = propMap[type];
  return prop ? `${prop}:${colorValue};` : null;
}

export function parseOpacityModifier(className: string): {
  base: string;
  opacity?: number;
} {
  const slashIndex = className.indexOf("/");
  if (slashIndex === -1) return { base: className };

  const base = className.slice(0, slashIndex);
  const opacityStr = className.slice(slashIndex + 1);
  const opacity = parseInt(opacityStr, 10);

  return isNaN(opacity) || opacity < 0 || opacity > 100
    ? { base }
    : { base, opacity: opacity / 100 };
}

export function parseColorWithOpacity(className: string): string | null {
  const { base, opacity } = parseOpacityModifier(className);

  const paletteRule = parseColorClass(base);
  if (paletteRule && opacity !== undefined) {
    const match = /#([0-9a-f]{6})/i.exec(paletteRule);
    if (match) {
      const rgb = hexToRgb(match[0]);
      return paletteRule.replace(/#([0-9a-f]{6})/i, `rgb(${rgb} / ${opacity})`);
    }
  }

  if (paletteRule) return paletteRule;

  const arbitraryRule = parseArbitrary(base);
  if (arbitraryRule && opacity !== undefined) {
    const match = /#([0-9a-f]{6})/i.exec(arbitraryRule);
    if (match) {
      const rgb = hexToRgb(match[0]);
      return arbitraryRule.replace(
        /#([0-9a-f]{6})/i,
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

  const [, position, colorName, shade = "DEFAULT"] = match;
  const colorValue = colors[colorName]?.[shade];
  if (!colorValue) return null;

  switch (position) {
    case "from":
      return `--ce-gradient-from:${colorValue} var(--ce-gradient-from-position);--ce-gradient-to:rgb(255 255 255 / 0) var(--ce-gradient-to-position);--ce-gradient-stops:var(--ce-gradient-from), var(--ce-gradient-to);`;
    case "to":
      return `--ce-gradient-to:${colorValue} var(--ce-gradient-to-position);`;
    case "via":
      return `--ce-gradient-to:rgb(255 255 255 / 0) var(--ce-gradient-to-position);--ce-gradient-stops:var(--ce-gradient-from), ${colorValue} var(--ce-gradient-via-position), var(--ce-gradient-to);`;
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

// Enhanced arbitrary value parser
export function parseArbitrary(className: string): string | null {
  // [prop:value] format
  if (
    className.startsWith("[") &&
    className.endsWith("]") &&
    !className.includes("-[")
  ) {
    const inner = className.slice(1, -1).trim();
    const colonIndex = inner.indexOf(":");
    if (colonIndex === -1) return null;

    const prop = inner.slice(0, colonIndex).trim();
    let value = inner.slice(colonIndex + 1).trim();

    // Only allow valid CSS property names
    if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(prop)) return null;

    // Convert underscores to spaces for multiple values
    value = value.replace(/_/g, " ");
    value = value.replace(/url\('\s*([^']*?)\s*'\)/g, 'url("$1")');
    value = value.replace(/^'([^']*)'$/g, '"$1"');
    return `${prop}:${value};`;
  }

  // prop-[value] format
  const bracketStart = className.indexOf("-[");
  if (bracketStart <= 0 || !className.endsWith("]")) return null;

  const prop = className.slice(0, bracketStart);
  let value = className.slice(bracketStart + 2, -1).replace(/_/g, " ");

  // Enhanced property mappings
  const propMappings: Record<string, string> = {
    bg: "background-color",
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
    "border-t": "border-top-width",
    "border-b": "border-bottom-width",
    "border-l": "border-left-width",
    "border-r": "border-right-width",
    "border-x": "border-inline-width",
    "border-y": "border-block-width",
    "grid-cols": "grid-template-columns",
    "grid-rows": "grid-template-rows",
    transition: "transition-property",
    ease: "transition-timing-function",
    delay: "transition-delay",
    duration: "transition-duration",
    list: "list-style",
    break: "word-break",
    flex: "flex-direction",
    items: "align-items",
    justify: "justify-content",
    content: "align-content",
    self: "align-self",
    basis: "flex-basis",
    tracking: "letter-spacing",
    leading: "line-height",
    z: "z-index",
    opacity: "opacity",
  };

  // Special handling for text properties
  if (prop === "text") {
    // If value looks like a size (ends with px, rem, em, etc.), treat as font-size
    if (/^\d*\.?\d+(px|rem|em|%|vh|vw|ch|ex)$/.test(value)) {
      return `font-size:${value};`;
    }
    // Otherwise treat as color
    return `color:${value};`;
  }

  if (prop === "rotate") return `transform:rotate(${value});`;
  if (prop === "scale") return `transform:scale(${value});`;
  if (prop === "translate-x") return `transform:translateX(${value});`;
  if (prop === "translate-y") return `transform:translateY(${value});`;

  const cssProp = propMappings[prop] ?? prop.replace(/_/g, "-");
  return cssProp && value ? `${cssProp}:${value};` : null;
}

export function parseArbitraryVariant(token: string): string | null {
  if (token.startsWith("[") && token.endsWith("]")) {
    const inner = token.slice(1, -1);
    return inner.includes("&") ? inner : token;
  }

  const bracketStart = token.indexOf("-[");
  if (bracketStart > 0 && token.endsWith("]")) {
    const inner = token.slice(bracketStart + 2, -1).replace(/_/g, "-");
    return inner.includes("&") ? inner : token.replace(/_/g, "-");
  }

  return null;
}

export function escapeClassName(name: string): string {
  return name.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, "\\$1");
}

// Optimized HTML class extraction
export function extractClassesFromHTML(html: string): string[] {
  // Use [\s\S] instead of . to match newlines in class attributes
  const classAttrRegex = /class\s*=\s*(['"])([\s\S]*?)\1/g;
  const classList: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = classAttrRegex.exec(html))) {
    const tokens = match[2].split(/\s+/).filter(Boolean);
    if (tokens.length) classList.push(...tokens);
  }

  return classList;
}

// Enhanced JIT CSS generation with better performance
export const jitCssCache = new Map<
  string,
  { css: string; timestamp: number }
>();
export const JIT_CSS_THROTTLE_MS = 16;
const MAX_CACHE_SIZE = 1000;

export function jitCSS(html: string): string {
  const now = Date.now();
  const cached = jitCssCache.get(html);
  if (cached && now - cached.timestamp < JIT_CSS_THROTTLE_MS) {
    return cached.css;
  }

  const classes = extractClassesFromHTML(html);
  if (!classes.length) return "";

  const seen = new Set(classes);
  const buckets: string[][] = [[], [], [], []];
  const ruleCache: Record<string, string | null> = {};

  const generateRuleCached = (
    cls: string,
    stripDark = false,
  ): string | null => {
    const cacheKey = stripDark ? `dark|${cls}` : cls;
    if (cacheKey in ruleCache) return ruleCache[cacheKey];
    const result = generateRule(cls, stripDark);
    ruleCache[cacheKey] = result;
    return result;
  };

  const classify = (variants: string[]): number => {
    const hasResponsive = variants.some((t) => responsiveOrder.includes(t));
    const hasContainer = variants.some(
      (t) =>
        t.startsWith("@") &&
        (containerOrder.includes(t.slice(1)) || t.match(/^@\[.+\]$/)),
    );
    const hasDark = variants.includes("dark");
    if (!variants.length) return 0;
    if (!hasResponsive && !hasDark && !hasContainer) return 1;
    if (hasDark && (hasResponsive || hasContainer)) return 3;
    return 2;
  };

  const splitVariants = (input: string): string[] => {
    const parts: string[] = [];
    let current = "";
    let depth = 0;

    for (let i = 0; i < input.length; i++) {
      const ch = input[i];
      if (ch === "[" || ch === "(") depth++;
      else if (ch === "]" || ch === ")") depth--;

      if (ch === ":" && depth === 0) {
        parts.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    if (current) parts.push(current);
    return parts;
  };

  const pseudoMap: Record<string, string> = {
    hover: ":hover",
    focus: ":focus",
    active: ":active",
    visited: ":visited",
    disabled: ":disabled",
    checked: ":checked",
    first: ":first-child",
    last: ":last-child",
    odd: ":nth-child(odd)",
    even: ":nth-child(even)",
    "focus-within": ":focus-within",
    "focus-visible": ":focus-visible",
  };

  const generateRule = (cls: string, stripDark = false): string | null => {
    const parts = splitVariants(cls);
    let basePart = "";
    let important = false;

    // Find the base utility
    for (const part of parts) {
      let checkPart = part;
      if (checkPart.startsWith("!")) {
        important = true;
        checkPart = checkPart.slice(1);
      }

      if (
        utilityMap[checkPart] ||
        parseSpacing(checkPart) ||
        parseSpaceUtility(checkPart) ||
        parseOpacity(checkPart) ||
        parseColorWithOpacity(checkPart) ||
        parseGradientColorStop(checkPart) ||
        parseArbitrary(checkPart)
      ) {
        basePart = part;
        break;
      }
    }

    if (!basePart) return null;

    const cleanBase = basePart.replace(/^!/, "");
    const baseRule =
      utilityMap[cleanBase] ??
      parseSpacing(cleanBase) ??
      parseSpaceUtility(cleanBase) ??
      parseOpacity(cleanBase) ??
      parseColorWithOpacity(cleanBase) ??
      parseGradientColorStop(cleanBase) ??
      parseArbitrary(cleanBase);

    if (!baseRule) return null;

    const baseIndex = parts.indexOf(basePart);
    let variants = baseIndex >= 0 ? parts.slice(0, baseIndex) : [];
    if (stripDark) variants = variants.filter((t) => t !== "dark");

    const escapedClass = `.${escapeClassName(cls)}`;
    const body = important ? baseRule.replace(/;/g, " !important;") : baseRule;
    const SUBJECT = "__SUBJECT__";
    let selector = SUBJECT;

    // Handle structural variants
    const structural: string[] = [];
    for (const token of variants) {
      if (token.startsWith("group-")) {
        selector = `.group:${token.slice(6)} ${selector}`;
        structural.push(token);
      } else if (token.startsWith("peer-")) {
        selector = selector.replace(
          SUBJECT,
          `.peer:${token.slice(5)}~${SUBJECT}`,
        );
        structural.push(token);
      }
    }
    variants = variants.filter((t) => !structural.includes(t));

    // Handle pseudos and arbitrary variants
    const subjectPseudos: string[] = [];
    const innerPseudos: string[] = [];
    let wrapperVariant: string | null = null;

    for (const token of variants) {
      if (
        token === "dark" ||
        responsiveOrder.includes(token) ||
        (token.startsWith("@") &&
          (containerOrder.includes(token.slice(1)) || token.match(/^@\[.+\]$/)))
      )
        continue;

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
      if (typeof fn === "function") {
        selector = fn(selector, body).split("{")[0];
      }
    }

    const subjectPseudoStr = subjectPseudos.join("");
    const innerPseudoStr = innerPseudos.join("");

    // Helper function to insert inner pseudos into post part
    function insertPseudosIntoPost(post: string, pseudos: string): string {
      if (!pseudos) return post;
      let depthSquare = 0;
      let depthParen = 0;

      // If post starts with a combinator, insert pseudos after the first simple selector
      if (
        post.length &&
        (post[0] === ">" ||
          post[0] === "+" ||
          post[0] === "~" ||
          post[0] === " ")
      ) {
        let i = 1;
        // skip initial whitespace
        while (i < post.length && post[i] === " ") i++;
        for (; i < post.length; i++) {
          const ch = post[i];
          if (ch === "[") depthSquare++;
          else if (ch === "]" && depthSquare > 0) depthSquare--;
          else if (ch === "(") depthParen++;
          else if (ch === ")" && depthParen > 0) depthParen--;
          if (
            depthSquare === 0 &&
            depthParen === 0 &&
            (post[i] === ">" ||
              post[i] === "+" ||
              post[i] === "~" ||
              post[i] === " ")
          ) {
            return post.slice(0, i) + pseudos + post.slice(i);
          }
        }
        return post + pseudos;
      }

      for (let i = 0; i < post.length; i++) {
        const ch = post[i];
        if (ch === "[") depthSquare++;
        else if (ch === "]" && depthSquare > 0) depthSquare--;
        else if (ch === "(") depthParen++;
        else if (ch === ")" && depthParen > 0) depthParen--;
        if (
          depthSquare === 0 &&
          depthParen === 0 &&
          (ch === ">" || ch === "+" || ch === "~" || ch === " ")
        ) {
          return post.slice(0, i) + pseudos + post.slice(i);
        }
      }
      return post + pseudos;
    }

    if (wrapperVariant) {
      if (wrapperVariant.includes("&")) {
        const idx = wrapperVariant.indexOf("&");
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

    selector = selector.replace(new RegExp(SUBJECT, "g"), escapedClass);

    let rule = `${selector}{${body}}`;

    // Apply media queries and container queries
    const responsiveTokens = variants.filter((t) =>
      responsiveOrder.includes(t),
    );
    const containerTokens = variants.filter(
      (t) =>
        t.startsWith("@") &&
        (containerOrder.includes(t.slice(1)) || t.match(/^@\[.+\]$/)),
    );
    const lastResponsive = responsiveTokens.length
      ? responsiveTokens[responsiveTokens.length - 1]
      : null;
    const lastContainer = containerTokens.length
      ? containerTokens[containerTokens.length - 1]
      : null;
    const hasDark = variants.includes("dark");

    // Handle media queries and container queries
    let mediaQuery = "";
    let containerQuery = "";

    // Build media query
    if (hasDark && lastResponsive) {
      mediaQuery = `@media (prefers-color-scheme: dark) and ${mediaVariants[lastResponsive]}`;
    } else if (hasDark) {
      mediaQuery = `@media (prefers-color-scheme: dark)`;
    } else if (lastResponsive) {
      mediaQuery = `@media ${mediaVariants[lastResponsive]}`;
    }

    // Build container query
    if (lastContainer) {
      if (lastContainer.startsWith("@[") && lastContainer.endsWith("]")) {
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
          containerVariants[containerKey] || `(min-width:${containerKey})`;
        containerQuery = `@container ${queryValue}`;
      }
    }

    // Combine queries
    if (mediaQuery && containerQuery) {
      rule = `${mediaQuery}${containerQuery}{${rule}}`;
    } else if (mediaQuery) {
      rule = `${mediaQuery}{${rule}}`;
    } else if (containerQuery) {
      rule = `${containerQuery}{${rule}}`;
    }

    return rule;
  };

  // Process classes
  for (const cls of seen) {
    const parts = splitVariants(cls);
    const basePart = parts.find(
      (p) =>
        utilityMap[p.replace(/^!/, "")] ||
        parseSpacing(p.replace(/^!/, "")) ||
        parseSpaceUtility(p.replace(/^!/, "")) ||
        parseOpacity(p.replace(/^!/, "")) ||
        parseColorWithOpacity(p.replace(/^!/, "")) ||
        parseGradientColorStop(p.replace(/^!/, "")) ||
        parseArbitrary(p.replace(/^!/, "")),
    );
    if (!basePart) continue;

    const baseIndex = parts.indexOf(basePart);
    const variants = baseIndex >= 0 ? parts.slice(0, baseIndex) : [];
    const bucketNum = classify(variants);

    const rule = generateRuleCached(cls);
    if (rule) buckets[bucketNum].push(rule);
  }

  // Ensure explicit gradient color-stop classes generate rules.
  // Some gradient utilities emit variable-based bodies that are
  // picked up via combined selectors; to make the output explicit and
  // testable we generate standalone rules for any from-*/via-*/to-*
  // classes so their selectors are present in the CSS output.
  const gradientStopRegex = /^(from|via|to)-[a-z]+-?\d{2,3}?$/;
  for (const cls of seen) {
    if (gradientStopRegex.test(cls)) {
      // If we already generated a rule for this class, skip. Evaluate
      // current generated output from buckets instead of `css` var.
      const generatedBuckets = buckets.flat().join("");
      if (generatedBuckets.includes(`.${escapeClassName(cls)}`)) continue;
      const generated = generateRuleCached(cls);
      if (generated) buckets[0].push(generated);
    }
  }

  // Sort rules within buckets to ensure proper CSS cascade order
  // Larger breakpoints must come after smaller ones for correct precedence
  const sortRulesByBreakpoint = (rules: string[]): string[] => {
    return rules.sort((a, b) => {
      // Extract responsive breakpoint from media query and return pixel value
      const getResponsivePixels = (rule: string): number => {
        const responsiveSizes: Record<string, number> = {
          sm: 640,
          md: 768,
          lg: 1024,
          xl: 1280,
          "2xl": 1536,
        };
        for (const [key, px] of Object.entries(responsiveSizes)) {
          if (rule.includes(`@media ${mediaVariants[key]}`)) return px;
        }
        return -1;
      };

      // Extract container breakpoint and return pixel value
      const getContainerPixels = (rule: string): number => {
        const containerSizes: Record<string, number> = {
          xs: 320,   // 20rem
          sm: 384,   // 24rem
          md: 448,   // 28rem
          lg: 512,   // 32rem
          xl: 576,   // 36rem
          "2xl": 672, // 42rem
          "3xl": 768, // 48rem
          "4xl": 896, // 56rem
          "5xl": 1024, // 64rem
          "6xl": 1152, // 72rem
          "7xl": 1280, // 80rem
        };
        
        // Check for named container breakpoints
        for (const [key, px] of Object.entries(containerSizes)) {
          if (rule.includes(`@container ${containerVariants[key]}`)) return px;
        }
        
        // Check for arbitrary container queries like @container (min-width:300px)
        if (rule.includes("@container (min-width:")) {
          const match = /@container \(min-width:(\d+(?:\.\d+)?)(px|rem|em)/.exec(rule);
          if (match) {
            const value = parseFloat(match[1]);
            const unit = match[2];
            // Convert to pixels for comparison
            return unit === "rem" || unit === "em" ? value * 16 : value;
          }
        }
        return -1;
      };

      const aRespPx = getResponsivePixels(a);
      const bRespPx = getResponsivePixels(b);
      const aContPx = getContainerPixels(a);
      const bContPx = getContainerPixels(b);

      // Sort by responsive breakpoint if both have responsive queries
      if (aRespPx >= 0 && bRespPx >= 0 && aRespPx !== bRespPx) return aRespPx - bRespPx;

      // Sort by container breakpoint if both have container queries
      if (aContPx >= 0 && bContPx >= 0 && aContPx !== bContPx) return aContPx - bContPx;

      // Keep original order for same breakpoint or no breakpoint
      return 0;
    });
  };

  // Sort buckets 2 and 3 which contain responsive/container queries
  buckets[2] = sortRulesByBreakpoint(buckets[2]);
  buckets[3] = sortRulesByBreakpoint(buckets[3]);

  const css = buckets.flat().join("");

  // Cache size management to prevent memory leaks
  if (jitCssCache.size >= MAX_CACHE_SIZE) {
    // Remove oldest entries (simple FIFO cleanup)
    const keysToDelete = Array.from(jitCssCache.keys()).slice(
      0,
      Math.floor(MAX_CACHE_SIZE / 2),
    );
    keysToDelete.forEach((key) => jitCssCache.delete(key));
  }

  jitCssCache.set(html, { css, timestamp: now });
  return css;
}
