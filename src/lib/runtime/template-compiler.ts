export type { ParsePropsResult } from './template-compiler/props-parser';
export { h, isAnchorBlock, isElementVNode, ensureKey } from './template-compiler/vnode-utils';
export { LRUCache, getCacheSize, TEMPLATE_COMPILE_CACHE, clearTemplateCompileCache } from './template-compiler/lru-cache';
export { parseProps, validateEventHandler } from './template-compiler/props-parser';
export { transformWhenDirective, htmlImpl } from './template-compiler/impl';

import type { VNode } from './types';
import { htmlImpl } from './template-compiler/impl';
import { isDiscoveryRender } from './discovery-state';

/**
 * Default export: plain html.
 */
export function html(
  strings: TemplateStringsArray,
  ...values: unknown[]
): VNode | VNode[] {
  // Short-circuit during discovery renders to avoid template parsing side effects.
  // useProps() and other hook registrations still run because they happen before
  // the html`` call in the render function body.
  if (isDiscoveryRender()) return [];

  // If last value is a context object, use it
  const last = values[values.length - 1];
  const context =
    typeof last === 'object' && last && !Array.isArray(last)
      ? (last as Record<string, unknown>)
      : undefined;

  return htmlImpl(strings, values, context);
}
