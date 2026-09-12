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
  const selector = `.${className}`;
  const excluded = ':not(.not-prose,.not-prose *)';
  const rules: string[] = [];
  const scoped = (target: string): string => `${selector} ${target}${excluded}`;
  const add = (targets: string, body: string): void => {
    rules.push(`${targets.split(',').map(scoped).join(',')}{${body}}`);
  };

  // Base prose container styles with CSS variables
  rules.push(
    `${selector}{--cer-prose-body:var(--cer-color-neutral-900);--cer-prose-headings:var(--cer-color-neutral-900);--cer-prose-lead:var(--cer-color-neutral-700);--cer-prose-links:var(--cer-color-neutral-700);--cer-prose-links-hover:var(--cer-color-neutral-500);--cer-prose-bold:var(--cer-color-neutral-900);--cer-prose-quotes:var(--cer-color-neutral-700);--cer-prose-quote-border:var(--cer-color-neutral-200);--cer-prose-code:var(--cer-color-neutral-800);--cer-prose-code-bg:var(--cer-color-neutral-100);--cer-prose-pre-code:var(--cer-color-neutral-800);--cer-prose-pre-bg:var(--cer-color-neutral-100);--cer-prose-pre-border:var(--cer-color-neutral-200);--cer-prose-hr:var(--cer-color-neutral-200);--cer-prose-caps:var(--cer-color-neutral-600);--cer-prose-list-marker:var(--cer-color-neutral-600);--cer-prose-list-marker-strong:var(--cer-color-neutral-700);--cer-prose-counters:var(--cer-color-neutral-600);--cer-prose-bullets:var(--cer-color-neutral-400);--cer-prose-img-caption:var(--cer-color-neutral-600);--cer-prose-table-border:var(--cer-color-neutral-200);--cer-prose-table-head:var(--cer-color-neutral-700);color:var(--cer-prose-body);font-size:${size.fontSize};line-height:${size.lineHeight};max-width:65ch;}`,
  );

  // Paragraphs
  add('p', `margin:${size.p} 0;`);

  // Lead text
  add(
    '.lead,[class~="lead"]',
    `font-size:1.25em;line-height:1.6;margin-top:${size.lead};margin-bottom:${size.lead};color:var(--cer-prose-lead);`,
  );

  // Headings
  add(
    'h1,h2,h3,h4,h5,h6',
    'color:var(--cer-prose-headings);font-weight:700;line-height:1.25;',
  );
  add(
    'h1',
    `font-size:${size.h1};margin-top:0;margin-bottom:0.8888889em;line-height:1.1111111;`,
  );
  add(
    'h2',
    `font-size:${size.h2};margin-top:2em;margin-bottom:1em;line-height:1.3333333;`,
  );
  add(
    'h3',
    `font-size:${size.h3};margin-top:1.6em;margin-bottom:0.6em;line-height:1.6;`,
  );
  add(
    'h4',
    `font-size:${size.h4};margin-top:1.5em;margin-bottom:0.5em;line-height:1.5;`,
  );
  add('h5,h6', 'margin-top:1.5em;margin-bottom:0.5em;');

  // Links
  add(
    'a',
    'color:var(--cer-prose-links);text-decoration:underline;text-decoration-thickness:.08em;text-underline-offset:.15em;font-weight:500;',
  );
  add('a:hover,a:focus', 'color:var(--cer-prose-links-hover);');

  // Strong and emphasis
  add('strong', 'color:var(--cer-prose-bold);font-weight:600;');
  add('em', 'font-style:italic;');

  // Ordered lists
  const ol = scoped('ol');
  const ul = scoped('ul');
  const li = `li${excluded}`;
  const paragraph = `p${excluded}`;
  rules.push(
    `${ol}{list-style-type:decimal;margin-top:${size.ol};margin-bottom:${size.ol};padding-left:1.625em;}`,
  );
  for (const [type, style] of [
    ['A', 'upper-alpha'],
    ['a', 'lower-alpha'],
    ['I', 'upper-roman'],
    ['i', 'lower-roman'],
  ]) {
    rules.push(`${ol}[type="${type}"]{list-style-type:${style};}`);
  }
  rules.push(`${ol}>${li}{position:relative;padding-left:${size.li};}`);
  rules.push(
    `${ol}>${li}::marker{color:var(--cer-prose-counters);font-weight:400;}`,
  );

  // Unordered lists
  rules.push(
    `${ul}{list-style-type:disc;margin-top:${size.ul};margin-bottom:${size.ul};padding-left:1.625em;}`,
  );
  rules.push(`${ul}>${li}{position:relative;padding-left:${size.li};}`);
  rules.push(`${ul}>${li}::marker{color:var(--cer-prose-bullets);}`);

  // Nested lists and list item content
  rules.push(
    `${ol}>${li}>*:first-child,${ul}>${li}>*:first-child{margin-top:${size.ol};}`,
  );
  rules.push(
    `${ol}>${li}>*:last-child,${ul}>${li}>*:last-child{margin-bottom:${size.ol};}`,
  );
  rules.push(
    `${ul} ul${excluded},${ul} ol${excluded},${ol} ul${excluded},${ol} ol${excluded}{margin-top:0.75em;margin-bottom:0.75em;}`,
  );
  rules.push(
    `${scoped('li')}>${paragraph}{margin-top:${size.ol};margin-bottom:${size.ol};}`,
  );

  // Inline code
  add(
    'code',
    `color:var(--cer-prose-code);background-color:var(--cer-prose-code-bg);border-radius:0.25rem;padding:0.125rem 0.25rem;font-size:${size.code};font-weight:600;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;`,
  );

  // Code blocks
  const pre = scoped('pre');
  rules.push(
    `${pre}{color:var(--cer-prose-pre-code);background-color:var(--cer-prose-pre-bg);border:1px solid var(--cer-prose-pre-border);overflow-x:auto;font-size:${size.pre};line-height:1.7142857;margin-top:1.7142857em;margin-bottom:1.7142857em;border-radius:0.375rem;padding:0.8571429em 1.1428571em;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;white-space:pre;overflow-wrap:normal;}`,
  );
  rules.push(
    `${pre} code${excluded}{background-color:transparent;border-width:0;border-radius:0;padding:0;font-weight:inherit;color:inherit;font-size:inherit;line-height:inherit;}`,
  );

  // Blockquotes
  const blockquote = scoped('blockquote');
  rules.push(
    `${blockquote}{font-weight:500;font-style:italic;color:var(--cer-prose-quotes);border-left-width:0.25rem;border-left-color:var(--cer-prose-quote-border);quotes:"\\201C""\\201D""\\2018""\\2019";margin-top:${size.blockquote};margin-bottom:${size.blockquote};padding-left:1em;}`,
  );
  rules.push(
    `${blockquote} ${paragraph}:first-of-type::before{content:open-quote;}`,
  );
  rules.push(
    `${blockquote} ${paragraph}:last-of-type::after{content:close-quote;}`,
  );

  // Horizontal rules
  add(
    'hr',
    `border-color:var(--cer-prose-hr);border-top-width:1px;margin-top:${size.hr};margin-bottom:${size.hr};`,
  );

  // Figures and standalone media use paragraph rhythm. The previous figure
  // scale added roughly twice the surrounding text gap above and below.
  const figure = scoped('figure');
  rules.push(`${figure}{margin-top:${size.p};margin-bottom:${size.p};}`);
  rules.push(`${figure}>*{margin-top:0;margin-bottom:0;}`);
  add(
    'figcaption',
    'color:var(--cer-prose-img-caption);font-size:0.875em;line-height:1.4285714;margin-top:0.75em;',
  );
  const media = ['img', 'video', 'picture'].map(scoped).join(',');
  rules.push(
    `${media}{margin-top:${size.p};margin-bottom:${size.p};max-width:100%;height:auto;}`,
  );
  rules.push(
    `${['img', 'video', 'picture']
      .map((target) => `${figure}>${target}${excluded}`)
      .join(',')}{margin-top:0;margin-bottom:0;}`,
  );

  // Tables
  const table = scoped('table');
  const thead = scoped('thead');
  const tbody = scoped('tbody');
  const row = `tr${excluded}`;
  rules.push(
    `${table}{width:100%;table-layout:auto;text-align:left;margin-top:${size.table};margin-bottom:${size.table};font-size:0.875em;line-height:1.7142857;}`,
  );
  rules.push(
    `${thead}{border-bottom-width:1px;border-bottom-color:var(--cer-prose-table-border);}`,
  );
  rules.push(
    `${thead} th${excluded}{color:var(--cer-prose-table-head);font-weight:600;vertical-align:bottom;padding-right:0.5714286em;padding-bottom:0.5714286em;padding-left:0.5714286em;}`,
  );
  rules.push(
    `${tbody} ${row}{border-bottom-width:1px;border-bottom-color:var(--cer-prose-table-border);}`,
  );
  rules.push(`${tbody} ${row}:last-child{border-bottom-width:0;}`);
  rules.push(
    `${tbody} td${excluded}{vertical-align:baseline;padding:0.5714286em;}`,
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
