import { cssEscape } from './css-utils';

/**
 * Prose typography plugin - tree-shaken if never used
 * Provides beautiful typography defaults for long-form content
 */
import type { CSSMap } from './style';

/**
 * Prose size configurations
 */
const proseSizes = {
  base: {
    fontSize: '1rem',
    lineHeight: '1.75',
    p: '1.25em',
    lead: '1.25em',
    h1: '2.25em',
    h2: '1.5em',
    h3: '1.25em',
    h4: '1em',
    blockquote: '1.6em',
    figure: '2em',
    code: '0.875em',
    pre: '0.875em',
    ol: '1.25em',
    ul: '1.25em',
    li: '0.5em',
    hr: '3em',
    table: '2em',
  },
  sm: {
    fontSize: '0.875rem',
    lineHeight: '1.7142857',
    p: '1.1428571em',
    lead: '1.1428571em',
    h1: '2.1428571em',
    h2: '1.4285714em',
    h3: '1.2857143em',
    h4: '1em',
    blockquote: '1.4285714em',
    figure: '1.7142857em',
    code: '0.8571429em',
    pre: '0.8571429em',
    ol: '1.1428571em',
    ul: '1.1428571em',
    li: '0.4285714em',
    hr: '2.5714286em',
    table: '1.7142857em',
  },
  lg: {
    fontSize: '1.125rem',
    lineHeight: '1.7777778',
    p: '1.3333333em',
    lead: '1.3333333em',
    h1: '2.6666667em',
    h2: '1.7777778em',
    h3: '1.5555556em',
    h4: '1.1111111em',
    blockquote: '1.7777778em',
    figure: '2.2222222em',
    code: '0.8888889em',
    pre: '0.8888889em',
    ol: '1.3333333em',
    ul: '1.3333333em',
    li: '0.5555556em',
    hr: '3.3333333em',
    table: '2.2222222em',
  },
  xl: {
    fontSize: '1.25rem',
    lineHeight: '1.8',
    p: '1.4em',
    lead: '1.4em',
    h1: '2.8em',
    h2: '1.8em',
    h3: '1.6em',
    h4: '1.2em',
    blockquote: '1.8em',
    figure: '2.4em',
    code: '0.9em',
    pre: '0.9em',
    ol: '1.4em',
    ul: '1.4em',
    li: '0.6em',
    hr: '3.6em',
    table: '2.4em',
  },
  '2xl': {
    fontSize: '1.5rem',
    lineHeight: '1.6666667',
    p: '1.3333333em',
    lead: '1.3333333em',
    h1: '2.6666667em',
    h2: '1.7777778em',
    h3: '1.5555556em',
    h4: '1.2222222em',
    blockquote: '1.7777778em',
    figure: '2.2222222em',
    code: '0.8333333em',
    pre: '0.8333333em',
    ol: '1.3333333em',
    ul: '1.3333333em',
    li: '0.5555556em',
    hr: '3.1111111em',
    table: '2.2222222em',
  },
};

/**
 * Generate prose base CSS on-demand for treeshakability
 * Only generates CSS when prose class is actually used
 */
export function generateProseCSS(className: string): string | null {
  const match = className.match(/^prose(?:-(sm|lg|xl|2xl))?$/);
  if (!match) return null;

  const variant = match[1] || 'base';
  const size = proseSizes[variant as keyof typeof proseSizes];
  const selector = `.${className}`; // Use actual className as selector

  // Generate CSS on-demand with size-specific values
  const rules: string[] = [];

  // Base prose container styles with CSS variables
  rules.push(
    `${selector}{--cer-prose-body:var(--cer-color-neutral-900);--cer-prose-headings:var(--cer-color-neutral-900);--cer-prose-lead:var(--cer-color-neutral-700);--cer-prose-links:var(--cer-color-neutral-700);--cer-prose-links-hover:var(--cer-color-neutral-500);--cer-prose-bold:var(--cer-color-neutral-900);--cer-prose-quotes:var(--cer-color-neutral-700);--cer-prose-quote-border:var(--cer-color-neutral-200);--cer-prose-code:var(--cer-color-neutral-800);--cer-prose-code-bg:var(--cer-color-neutral-100);--cer-prose-pre-code:var(--cer-color-neutral-800);--cer-prose-pre-bg:var(--cer-color-neutral-100);--cer-prose-pre-border:var(--cer-color-neutral-200);--cer-prose-hr:var(--cer-color-neutral-200);--cer-prose-caps:var(--cer-color-neutral-600);--cer-prose-list-marker:var(--cer-color-neutral-600);--cer-prose-list-marker-strong:var(--cer-color-neutral-700);--cer-prose-counters:var(--cer-color-neutral-600);--cer-prose-bullets:var(--cer-color-neutral-400);--cer-prose-img-caption:var(--cer-color-neutral-600);--cer-prose-table-border:var(--cer-color-neutral-200);--cer-prose-table-head:var(--cer-color-neutral-700);color:var(--cer-prose-body);font-size:${size.fontSize};line-height:${size.lineHeight};max-width:65ch;}`,
  );

  // Paragraphs
  rules.push(
    `${selector} p:not(.not-prose):not(.not-prose *){margin:${size.p} 0;}`,
  );

  // Lead text
  rules.push(
    `${selector} .lead:not(.not-prose):not(.not-prose *),${selector} [class~="lead"]:not(.not-prose):not(.not-prose *){font-size:1.25em;line-height:1.6;margin-top:${size.lead};margin-bottom:${size.lead};color:var(--cer-prose-lead);}`,
  );

  // Headings
  rules.push(
    `${selector} h1:not(.not-prose):not(.not-prose *),${selector} h2:not(.not-prose):not(.not-prose *),${selector} h3:not(.not-prose):not(.not-prose *),${selector} h4:not(.not-prose):not(.not-prose *),${selector} h5:not(.not-prose):not(.not-prose *),${selector} h6:not(.not-prose):not(.not-prose *){color:var(--cer-prose-headings);font-weight:700;line-height:1.25;}`,
  );
  rules.push(
    `${selector} h1:not(.not-prose):not(.not-prose *){font-size:${size.h1};margin-top:0;margin-bottom:0.8888889em;line-height:1.1111111;}`,
  );
  rules.push(
    `${selector} h2:not(.not-prose):not(.not-prose *){font-size:${size.h2};margin-top:2em;margin-bottom:1em;line-height:1.3333333;}`,
  );
  rules.push(
    `${selector} h3:not(.not-prose):not(.not-prose *){font-size:${size.h3};margin-top:1.6em;margin-bottom:0.6em;line-height:1.6;}`,
  );
  rules.push(
    `${selector} h4:not(.not-prose):not(.not-prose *){font-size:${size.h4};margin-top:1.5em;margin-bottom:0.5em;line-height:1.5;}`,
  );
  rules.push(
    `${selector} h5:not(.not-prose):not(.not-prose *){margin-top:1.5em;margin-bottom:0.5em;}`,
  );
  rules.push(
    `${selector} h6:not(.not-prose):not(.not-prose *){margin-top:1.5em;margin-bottom:0.5em;}`,
  );

  // Links
  rules.push(
    `${selector} a:not(.not-prose):not(.not-prose *){color:var(--cer-prose-links);text-decoration:underline;text-decoration-thickness:.08em;text-underline-offset:.15em;font-weight:500;}`,
  );
  rules.push(
    `${selector} a:not(.not-prose):not(.not-prose *):hover,${selector} a:not(.not-prose):not(.not-prose *):focus{color:var(--cer-prose-links-hover);}`,
  );

  // Strong and emphasis
  rules.push(
    `${selector} strong:not(.not-prose):not(.not-prose *){color:var(--cer-prose-bold);font-weight:600;}`,
  );
  rules.push(
    `${selector} em:not(.not-prose):not(.not-prose *){font-style:italic;}`,
  );

  // Ordered lists
  rules.push(
    `${selector} ol:not(.not-prose):not(.not-prose *){list-style-type:decimal;margin-top:${size.ol};margin-bottom:${size.ol};padding-left:1.625em;}`,
  );
  rules.push(
    `${selector} ol:not(.not-prose):not(.not-prose *)[type="A"]{list-style-type:upper-alpha;}`,
  );
  rules.push(
    `${selector} ol:not(.not-prose):not(.not-prose *)[type="a"]{list-style-type:lower-alpha;}`,
  );
  rules.push(
    `${selector} ol:not(.not-prose):not(.not-prose *)[type="I"]{list-style-type:upper-roman;}`,
  );
  rules.push(
    `${selector} ol:not(.not-prose):not(.not-prose *)[type="i"]{list-style-type:lower-roman;}`,
  );
  rules.push(
    `${selector} ol:not(.not-prose):not(.not-prose *)>li:not(.not-prose):not(.not-prose *){position:relative;padding-left:${size.li};}`,
  );
  rules.push(
    `${selector} ol:not(.not-prose):not(.not-prose *)>li:not(.not-prose):not(.not-prose *)::marker{color:var(--cer-prose-counters);font-weight:400;}`,
  );

  // Unordered lists
  rules.push(
    `${selector} ul:not(.not-prose):not(.not-prose *){list-style-type:disc;margin-top:${size.ul};margin-bottom:${size.ul};padding-left:1.625em;}`,
  );
  rules.push(
    `${selector} ul:not(.not-prose):not(.not-prose *)>li:not(.not-prose):not(.not-prose *){position:relative;padding-left:${size.li};}`,
  );
  rules.push(
    `${selector} ul:not(.not-prose):not(.not-prose *)>li:not(.not-prose):not(.not-prose *)::marker{color:var(--cer-prose-bullets);}`,
  );

  // Nested lists and list item content
  rules.push(
    `${selector} ol:not(.not-prose):not(.not-prose *)>li:not(.not-prose):not(.not-prose *)>*:first-child,${selector} ul:not(.not-prose):not(.not-prose *)>li:not(.not-prose):not(.not-prose *)>*:first-child{margin-top:${size.ol};}`,
  );
  rules.push(
    `${selector} ol:not(.not-prose):not(.not-prose *)>li:not(.not-prose):not(.not-prose *)>*:last-child,${selector} ul:not(.not-prose):not(.not-prose *)>li:not(.not-prose):not(.not-prose *)>*:last-child{margin-bottom:${size.ol};}`,
  );
  rules.push(
    `${selector} ul:not(.not-prose):not(.not-prose *) ul:not(.not-prose):not(.not-prose *),${selector} ul:not(.not-prose):not(.not-prose *) ol:not(.not-prose):not(.not-prose *),${selector} ol:not(.not-prose):not(.not-prose *) ul:not(.not-prose):not(.not-prose *),${selector} ol:not(.not-prose):not(.not-prose *) ol:not(.not-prose):not(.not-prose *){margin-top:0.75em;margin-bottom:0.75em;}`,
  );
  // Multiple paragraphs in list items need proper spacing
  rules.push(
    `${selector} li:not(.not-prose):not(.not-prose *)>p:not(.not-prose):not(.not-prose *){margin-top:${size.ol};margin-bottom:${size.ol};}`,
  );

  // Inline code
  rules.push(
    `${selector} code:not(.not-prose):not(.not-prose *){color:var(--cer-prose-code);background-color:var(--cer-prose-code-bg);border-radius:0.25rem;padding:0.125rem 0.25rem;font-size:${size.code};font-weight:600;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;}`,
  );

  // Code blocks
  rules.push(
    `${selector} pre:not(.not-prose):not(.not-prose *){color:var(--cer-prose-pre-code);background-color:var(--cer-prose-pre-bg);border:1px solid var(--cer-prose-pre-border);overflow-x:auto;font-size:${size.pre};line-height:1.7142857;margin-top:1.7142857em;margin-bottom:1.7142857em;border-radius:0.375rem;padding:0.8571429em 1.1428571em;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;white-space:pre;overflow-wrap:normal;}`,
  );
  rules.push(
    `${selector} pre:not(.not-prose):not(.not-prose *) code:not(.not-prose):not(.not-prose *){background-color:transparent;border-width:0;border-radius:0;padding:0;font-weight:inherit;color:inherit;font-size:inherit;line-height:inherit;}`,
  );

  // Blockquotes
  rules.push(
    `${selector} blockquote:not(.not-prose):not(.not-prose *){font-weight:500;font-style:italic;color:var(--cer-prose-quotes);border-left-width:0.25rem;border-left-color:var(--cer-prose-quote-border);quotes:"\\201C""\\201D""\\2018""\\2019";margin-top:${size.blockquote};margin-bottom:${size.blockquote};padding-left:1em;}`,
  );
  rules.push(
    `${selector} blockquote:not(.not-prose):not(.not-prose *) p:not(.not-prose):not(.not-prose *):first-of-type::before{content:open-quote;}`,
  );
  rules.push(
    `${selector} blockquote:not(.not-prose):not(.not-prose *) p:not(.not-prose):not(.not-prose *):last-of-type::after{content:close-quote;}`,
  );

  // Horizontal rules
  rules.push(
    `${selector} hr:not(.not-prose):not(.not-prose *){border-color:var(--cer-prose-hr);border-top-width:1px;margin-top:${size.hr};margin-bottom:${size.hr};}`,
  );

  // Figures and images
  rules.push(
    `${selector} figure:not(.not-prose):not(.not-prose *){margin-top:${size.figure};margin-bottom:${size.figure};}`,
  );
  rules.push(
    `${selector} figure:not(.not-prose):not(.not-prose *)>*{margin-top:0;margin-bottom:0;}`,
  );
  rules.push(
    `${selector} figcaption:not(.not-prose):not(.not-prose *){color:var(--cer-prose-img-caption);font-size:0.875em;line-height:1.4285714;margin-top:0.75em;}`,
  );
  rules.push(
    `${selector} img:not(.not-prose):not(.not-prose *),${selector} video:not(.not-prose):not(.not-prose *),${selector} picture:not(.not-prose):not(.not-prose *){margin-top:${size.figure};margin-bottom:${size.figure};max-width:100%;height:auto;}`,
  );
  rules.push(
    `${selector} figure:not(.not-prose):not(.not-prose *)>img:not(.not-prose):not(.not-prose *),${selector} figure:not(.not-prose):not(.not-prose *)>video:not(.not-prose):not(.not-prose *),${selector} figure:not(.not-prose):not(.not-prose *)>picture:not(.not-prose):not(.not-prose *){margin-top:0;margin-bottom:0;}`,
  );

  // Tables
  rules.push(
    `${selector} table:not(.not-prose):not(.not-prose *){width:100%;table-layout:auto;text-align:left;margin-top:${size.table};margin-bottom:${size.table};font-size:0.875em;line-height:1.7142857;}`,
  );
  rules.push(
    `${selector} thead:not(.not-prose):not(.not-prose *){border-bottom-width:1px;border-bottom-color:var(--cer-prose-table-border);}`,
  );
  rules.push(
    `${selector} thead:not(.not-prose):not(.not-prose *) th:not(.not-prose):not(.not-prose *){color:var(--cer-prose-table-head);font-weight:600;vertical-align:bottom;padding-right:0.5714286em;padding-bottom:0.5714286em;padding-left:0.5714286em;}`,
  );
  rules.push(
    `${selector} tbody:not(.not-prose):not(.not-prose *) tr:not(.not-prose):not(.not-prose *){border-bottom-width:1px;border-bottom-color:var(--cer-prose-table-border);}`,
  );
  rules.push(
    `${selector} tbody:not(.not-prose):not(.not-prose *) tr:not(.not-prose):not(.not-prose *):last-child{border-bottom-width:0;}`,
  );
  rules.push(
    `${selector} tbody:not(.not-prose):not(.not-prose *) td:not(.not-prose):not(.not-prose *){vertical-align:baseline;padding:0.5714286em;}`,
  );

  return rules.join('');
}

/**
 * List of prose element targets for element modifiers
 */
const proseElements: Record<string, string> = {
  headings: 'h1,h2,h3,h4,h5,h6,th',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  p: 'p',
  a: 'a',
  blockquote: 'blockquote',
  figure: 'figure',
  figcaption: 'figcaption',
  strong: 'strong',
  em: 'em',
  kbd: 'kbd',
  code: 'code',
  pre: 'pre',
  ol: 'ol',
  ul: 'ul',
  li: 'li',
  dl: 'dl',
  dt: 'dt',
  dd: 'dd',
  table: 'table',
  thead: 'thead',
  tbody: 'tbody',
  tr: 'tr',
  th: 'th',
  td: 'td',
  img: 'img',
  picture: 'picture',
  video: 'video',
  hr: 'hr',
  lead: '[class~="lead"]',
};

/**
 * Parse prose element modifiers like prose-a:text-blue-600
 * Returns the generated CSS rule with proper scoping
 */
export function generateProseElementModifier(
  className: string,
  utilityMap: CSSMap,
  parseSpacing: (className: string) => string | null,
  parseSpaceUtility: (className: string) => string | null,
  parseOpacity: (className: string) => string | null,
  parseColorWithOpacity: (className: string) => string | null,
  parseGradientColorStop: (className: string) => string | null,
  parseArbitrary: (className: string) => string | null,
): string | null {
  // Match pattern: prose-{element}:{utility}
  const match = className.match(/^prose-([a-z0-9]+):(.+)$/);
  if (!match) return null;

  const [, element, utility] = match;
  const elementSelector = proseElements[element];

  if (!elementSelector) return null;

  // Parse the utility part to get the CSS properties
  const utilityCSS =
    utilityMap[utility] ??
    parseSpacing(utility) ??
    parseSpaceUtility(utility) ??
    parseOpacity(utility) ??
    parseColorWithOpacity(utility) ??
    parseGradientColorStop(utility) ??
    parseArbitrary(utility);

  if (!utilityCSS) return null;

  // Browser CSS parsers collapse spaces after escaped colons before :is()
  // Use CSS.escape() on the full class name to properly escape the colon
  const escapedClass = cssEscape(className);

  // Build simple descendant selectors for each element
  // Format: .prose-a\:text-error-600 a:not(.not-prose):not(.not-prose *) { ... }
  const rules = elementSelector
    .split(',')
    .map((sel) => {
      const elementSel = sel.trim();
      const fullSelector = `.${escapedClass} ${elementSel}:not(.not-prose):not(.not-prose *)`;
      return `${fullSelector}{${utilityCSS}}`;
    })
    .join('');

  return rules;
}
