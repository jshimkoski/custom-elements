// Enhanced collection directives for better developer experience

import type { VNode } from './runtime/types';
import { when, anchorBlock } from './directives';

/**
 * Conditional rendering with negated condition (opposite of when)
 * @param cond - Boolean condition to negate
 * @param children - Content to render when condition is false
 */
export function unless(cond: boolean, children: VNode | VNode[]): VNode {
  return when(!cond, children);
}

/**
 * Render content only if array/collection is empty
 * @param collection - Array or collection to check
 * @param children - Content to render when empty
 */
export function whenEmpty<T>(
  collection: T[] | null | undefined,
  children: VNode | VNode[],
): VNode {
  const isEmpty = !collection || collection.length === 0;
  return when(isEmpty, children);
}

/**
 * Render content only if array/collection has items
 * @param collection - Array or collection to check
 * @param children - Content to render when not empty
 */
export function whenNotEmpty<T>(
  collection: T[] | null | undefined,
  children: VNode | VNode[],
): VNode {
  const hasItems = Boolean(collection && collection.length > 0);
  return when(hasItems, children);
}

/**
 * Enhanced each with filtering capability
 * @param list - Array to iterate over
 * @param predicate - Filter function (optional)
 * @param render - Render function for each item
 */
export function eachWhere<T>(
  list: T[],
  predicate: (item: T, index: number) => boolean,
  render: (item: T, index: number, filteredIndex: number) => VNode | VNode[],
): VNode[] {
  const filtered: Array<{ item: T; originalIndex: number }> = [];

  list.forEach((item, index) => {
    if (predicate(item, index)) {
      filtered.push({ item, originalIndex: index });
    }
  });

  return filtered.map(({ item, originalIndex }, filteredIndex) => {
    const itemKey =
      typeof item === 'object' && item != null
        ? ((item as Record<string, unknown>)?.key ??
          (item as Record<string, unknown>)?.id ??
          `filtered-${originalIndex}`)
        : `filtered-${originalIndex}`;

    return anchorBlock(
      render(item, originalIndex, filteredIndex),
      `each-where-${itemKey}`,
    );
  });
}

/**
 * Render different content based on array length
 * @param list - Array to check
 * @param cases - Object with length-based cases
 */
export function switchOnLength<T>(
  list: T[],
  cases: {
    empty?: VNode | VNode[];
    one?: (item: T) => VNode | VNode[];
    many?: (items: T[]) => VNode | VNode[];
    exactly?: { [count: number]: (items: T[]) => VNode | VNode[] };
  },
): VNode {
  const length = list?.length ?? 0;

  if (length === 0 && cases.empty) {
    return anchorBlock(cases.empty, 'switch-length-empty');
  }

  if (length === 1 && cases.one) {
    return anchorBlock(cases.one(list[0]), 'switch-length-one');
  }

  if (cases.exactly?.[length]) {
    return anchorBlock(cases.exactly[length](list), `switch-length-${length}`);
  }

  if (length > 1 && cases.many) {
    return anchorBlock(cases.many(list), 'switch-length-many');
  }

  return anchorBlock([], 'switch-length-fallback');
}

/**
 * Group array items and render each group
 * @param list - Array to group
 * @param groupBy - Function to determine group key
 * @param renderGroup - Function to render each group
 */
export function eachGroup<T, K extends string | number>(
  list: T[],
  groupBy: (item: T) => K,
  renderGroup: (groupKey: K, items: T[], groupIndex: number) => VNode | VNode[],
): VNode[] {
  const groups = new Map<K, T[]>();

  list.forEach((item) => {
    const key = groupBy(item);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  });

  return Array.from(groups.entries()).map(([groupKey, items], groupIndex) => {
    return anchorBlock(
      renderGroup(groupKey, items, groupIndex),
      `each-group-${groupKey}`,
    );
  });
}

/**
 * Render with pagination/chunking
 * @param list - Array to chunk
 * @param pageSize - Items per page/chunk
 * @param currentPage - Current page (0-based)
 * @param render - Render function for visible items
 */
export function eachPage<T>(
  list: T[],
  pageSize: number,
  currentPage: number,
  render: (item: T, index: number, pageIndex: number) => VNode | VNode[],
): VNode[] {
  const startIndex = currentPage * pageSize;
  const endIndex = Math.min(startIndex + pageSize, list.length);
  const pageItems = list.slice(startIndex, endIndex);

  return pageItems.map((item, pageIndex) => {
    const globalIndex = startIndex + pageIndex;
    const itemKey =
      typeof item === 'object' && item != null
        ? ((item as Record<string, unknown>)?.key ??
          (item as Record<string, unknown>)?.id ??
          `page-${globalIndex}`)
        : `page-${globalIndex}`;

    return anchorBlock(
      render(item, globalIndex, pageIndex),
      `each-page-${itemKey}`,
    );
  });
}

/* --- Async & Loading State Directives --- */

/**
 * Render content based on Promise state
 * @param promiseState - Object with loading, data, error states
 * @param cases - Render functions for each state
 */
export function switchOnPromise<T, E = Error>(
  promiseState: {
    loading?: boolean;
    data?: T;
    error?: E;
  },
  cases: {
    loading?: VNode | VNode[];
    success?: (data: T) => VNode | VNode[];
    error?: (error: E) => VNode | VNode[];
    idle?: VNode | VNode[];
  },
): VNode {
  if (promiseState.loading && cases.loading) {
    return anchorBlock(cases.loading, 'promise-loading');
  }

  if (promiseState.error && cases.error) {
    return anchorBlock(cases.error(promiseState.error), 'promise-error');
  }

  if (promiseState.data !== undefined && cases.success) {
    return anchorBlock(cases.success(promiseState.data), 'promise-success');
  }

  if (cases.idle) {
    return anchorBlock(cases.idle, 'promise-idle');
  }

  return anchorBlock([], 'promise-fallback');
}

/* --- Utility Directives --- */

/**
 * Render content based on screen size/media query
 * @param mediaQuery - CSS media query string
 * @param children - Content to render when media query matches
 */
export function whenMedia(
  mediaQuery: string,
  children: VNode | VNode[],
): VNode {
  const matches =
    typeof window !== 'undefined' && window.matchMedia?.(mediaQuery)?.matches;
  return when(Boolean(matches), children);
}

/* --- Responsive & Media Query Directives (aligned with style.ts) --- */

/**
 * Media variants matching those in style.ts
 */
export const mediaVariants = {
  // Responsive breakpoints (matching style.ts)
  sm: '(min-width:640px)',
  md: '(min-width:768px)',
  lg: '(min-width:1024px)',
  xl: '(min-width:1280px)',
  '2xl': '(min-width:1536px)',

  // Dark mode (matching style.ts)
  dark: '(prefers-color-scheme: dark)',
} as const;

/**
 * Responsive order matching style.ts
 */
export const responsiveOrder = ['sm', 'md', 'lg', 'xl', '2xl'] as const;

/**
 * Individual responsive directives matching the style.ts breakpoint system
 */
export const responsive = {
  // Breakpoint-based rendering (matching style.ts exactly)
  sm: (children: VNode | VNode[]) => whenMedia(mediaVariants.sm, children),
  md: (children: VNode | VNode[]) => whenMedia(mediaVariants.md, children),
  lg: (children: VNode | VNode[]) => whenMedia(mediaVariants.lg, children),
  xl: (children: VNode | VNode[]) => whenMedia(mediaVariants.xl, children),
  '2xl': (children: VNode | VNode[]) =>
    whenMedia(mediaVariants['2xl'], children),

  // Dark mode (matching style.ts)
  dark: (children: VNode | VNode[]) => whenMedia(mediaVariants.dark, children),
  light: (children: VNode | VNode[]) =>
    whenMedia('(prefers-color-scheme: light)', children),

  // Accessibility and interaction preferences
  touch: (children: VNode | VNode[]) =>
    whenMedia('(hover: none) and (pointer: coarse)', children),
  mouse: (children: VNode | VNode[]) =>
    whenMedia('(hover: hover) and (pointer: fine)', children),
  reducedMotion: (children: VNode | VNode[]) =>
    whenMedia('(prefers-reduced-motion: reduce)', children),
  highContrast: (children: VNode | VNode[]) =>
    whenMedia('(prefers-contrast: high)', children),

  // Orientation
  portrait: (children: VNode | VNode[]) =>
    whenMedia('(orientation: portrait)', children),
  landscape: (children: VNode | VNode[]) =>
    whenMedia('(orientation: landscape)', children),
} as const;

/**
 * Advanced responsive directive that matches the style.ts multi-variant processing
 * Allows chaining responsive and dark mode conditions like in CSS classes
 * @param variants - Array of variant keys (e.g., ['dark', 'lg'])
 * @param children - Content to render when all variants match
 */
export function whenVariants(
  variants: Array<keyof typeof mediaVariants | 'light'>,
  children: VNode | VNode[],
): VNode {
  const conditions: string[] = [];

  // Process dark/light mode
  if (variants.includes('dark')) {
    conditions.push(mediaVariants.dark);
  } else if (variants.includes('light')) {
    conditions.push('(prefers-color-scheme: light)');
  }

  // Process responsive variants (take the last one, matching style.ts behavior)
  const responsiveVariants = variants.filter((v) =>
    responsiveOrder.includes(v as (typeof responsiveOrder)[number]),
  );
  const lastResponsive = responsiveVariants[responsiveVariants.length - 1];
  if (lastResponsive && lastResponsive in mediaVariants) {
    conditions.push(
      mediaVariants[lastResponsive as keyof typeof mediaVariants],
    );
  }

  const mediaQuery = conditions.length > 0 ? conditions.join(' and ') : 'all';
  return whenMedia(mediaQuery, children);
}

/**
 * Responsive switch directive - render different content for different breakpoints
 * Mirrors the responsive behavior from the style system
 * @param content - Object with breakpoint keys and corresponding content
 */
export function responsiveSwitch(content: {
  base?: VNode | VNode[];
  sm?: VNode | VNode[];
  md?: VNode | VNode[];
  lg?: VNode | VNode[];
  xl?: VNode | VNode[];
  '2xl'?: VNode | VNode[];
}): VNode[] {
  const results: VNode[] = [];

  // Handle light mode variants
  if (content.base) {
    // Base content (no media query)
    results.push(anchorBlock(content.base, 'responsive-base'));
  }

  // Add responsive variants in order
  responsiveOrder.forEach((breakpoint) => {
    const breakpointContent = content[breakpoint];
    if (breakpointContent) {
      results.push(responsive[breakpoint](breakpointContent));
    }
  });

  return results;
}

/* --- Enhanced Match Directive --- */

/**
 * Enhanced match directive with more fluent API
 * @param value - Value to match against
 */
export function switchOn<T>(value: T) {
  const branches: Array<{
    condition: (val: T) => boolean;
    content: VNode | VNode[];
  }> = [];
  let otherwiseContent: VNode | VNode[] | null = null;

  return {
    case(matcher: T | ((val: T) => boolean), content: VNode | VNode[]) {
      const condition =
        typeof matcher === 'function'
          ? (matcher as (val: T) => boolean)
          : (val: T) => val === matcher;

      branches.push({ condition, content });
      return this;
    },

    when(predicate: (val: T) => boolean, content: VNode | VNode[]) {
      branches.push({ condition: predicate, content });
      return this;
    },

    otherwise(content: VNode | VNode[]) {
      otherwiseContent = content;
      return this;
    },

    done() {
      for (let i = 0; i < branches.length; i++) {
        const { condition, content } = branches[i];
        if (condition(value)) {
          return anchorBlock(content, `switch-case-${i}`);
        }
      }
      return anchorBlock(otherwiseContent || [], 'switch-otherwise');
    },
  };
}
