import type { VNode } from './runtime/types';

/* --- Directive call counter (per-render, reset by the component renderer) --- */
let _directiveCallIndex = 0;

/**
 * Reset the per-render directive call counter.
 * Must be called once at the start of every component render pass so that
 * all sibling directive calls automatically receive stable, unique positional keys.
 * @internal
 */
export function resetWhenCounter(): void {
  _directiveCallIndex = 0;
}

/**
 * Get the next per-render directive call index and increment the counter.
 * Used by directives in directive-enhancements.ts to generate unique anchor keys.
 * @internal
 */
export function nextDirectiveIndex(): number {
  return _directiveCallIndex++;
}

/* --- When --- */
export function when(
  cond: boolean,
  children: VNode | VNode[],
  key?: string,
): VNode;
export function when(
  cond: boolean,
  factory: () => VNode | VNode[],
  key?: string,
): VNode;
export function when(
  cond: boolean,
  childrenOrFactory: VNode | VNode[] | (() => VNode | VNode[]),
  key?: string,
): VNode {
  const anchorKey = key ?? `when-block-${_directiveCallIndex++}`;
  if (typeof childrenOrFactory === 'function') {
    return anchorBlock(cond ? childrenOrFactory() : [], anchorKey);
  }
  return anchorBlock(cond ? childrenOrFactory : [], anchorKey);
}

/* --- Each --- */
export function each<
  T extends string | number | boolean | { id?: string | number; key?: string },
>(list: T[], render: (item: T, index: number) => VNode | VNode[]): VNode[] {
  return list.map((item, i) => {
    // For primitives, use value as key; for objects, prefer key/id
    const itemKey =
      typeof item === 'object'
        ? ((item as Record<string, unknown>)?.key ??
          (item as Record<string, unknown>)?.id ??
          `idx-${i}`)
        : String(item);
    return anchorBlock(render(item, i), `each-${itemKey}`);
  });
}

/* --- match --- */
type Branch = [
  condition: unknown,
  content: VNode | VNode[] | (() => VNode | VNode[]),
];

export function match() {
  const branches: Branch[] = [];
  return {
    when(cond: unknown, content: VNode | VNode[] | (() => VNode | VNode[])) {
      branches.push([cond, content]);
      return this;
    },
    otherwise(content: VNode | VNode[]) {
      branches.push([true, content]);
      return this;
    },
    done() {
      const mi = _directiveCallIndex++;
      for (let idx = 0; idx < branches.length; idx++) {
        const [cond, content] = branches[idx];
        if (cond) {
          const payload =
            typeof content === 'function'
              ? (content as () => VNode | VNode[])()
              : content;
          return [anchorBlock(payload, `match-${mi}-branch-${idx}`)];
        }
      }
      return [anchorBlock([], `match-${mi}-empty`)];
    },
  };
}

/**
 * Create a stable anchor block with consistent boundaries.
 * Always has start/end boundaries.
 */
export function anchorBlock(
  children: VNode | VNode[] | null | undefined,
  anchorKey: string,
): VNode {
  // Normalize children to array, filtering out only null/undefined values.
  // Preserve meaningful falsy values such as 0, false, and empty string.
  const childArray = !children
    ? []
    : Array.isArray(children)
      ? children.filter((c) => c !== null && c !== undefined)
      : [children].filter((c) => c !== null && c !== undefined);

  return {
    tag: '#anchor',
    key: anchorKey,
    children: childArray,
  };
}
