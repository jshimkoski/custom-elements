import type { VNode } from "./runtime/types";

/* --- When --- */
export function when(cond: boolean, children: VNode | VNode[]): VNode;
export function when(cond: boolean, factory: () => VNode | VNode[]): VNode;
export function when(cond: boolean, childrenOrFactory: any): VNode {
  const anchorKey = "when-block"; // stable key regardless of condition
  if (typeof childrenOrFactory === "function") {
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
      typeof item === "object"
        ? ((item as any)?.key ?? (item as any)?.id ?? `idx-${i}`)
        : String(item);
    return anchorBlock(render(item, i), `each-${itemKey}`);
  });
}

/* --- match --- */
export function match() {
  const branches: Branch[] = [];
  return {
    when(cond: any, content: VNode | VNode[] | (() => VNode | VNode[])) {
      branches.push([cond, content]);
      return this;
    },
    otherwise(content: VNode | VNode[]) {
      branches.push([true, content]);
      return this;
    },
    done() {
      return whenChain(...branches);
    },
  };
}

/* --- WhenChain --- */
type Branch = [condition: any, content: VNode | VNode[] | (() => VNode | VNode[])];

function whenChain(...branches: Branch[]): VNode[] {
  for (let idx = 0; idx < branches.length; idx++) {
    const [cond, content] = branches[idx];
    if (cond) {
      const payload = typeof content === 'function' ? (content as () => VNode | VNode[])() : content;
      return [anchorBlock(payload, `whenChain-branch-${idx}`)];
    }
  }
  return [anchorBlock([], "whenChain-empty")];
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
    tag: "#anchor",
    key: anchorKey,
    children: childArray,
  };
}