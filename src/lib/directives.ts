import type { VNode } from "./vdom";

/* --- When --- */
export function when(cond: boolean, children: VNode | VNode[]): VNode {
  const anchorKey = "when-block"; // stable key regardless of condition
  return anchorBlock(cond ? children : [], anchorKey);
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
    when(cond: any, content: VNode | VNode[]) {
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
type Branch = [condition: any, content: VNode | VNode[]];

function whenChain(...branches: Branch[]): VNode[] {
  for (let idx = 0; idx < branches.length; idx++) {
    const [cond, content] = branches[idx];
    if (cond) return [anchorBlock(content, `whenChain-branch-${idx}`)];
  }
  return [anchorBlock([], "whenChain-empty")];
}

/**
 * Create a stable anchor block with consistent boundaries.
 * Always has start/end boundaries.
 */
function anchorBlock(
  children: VNode | VNode[] | null | undefined,
  anchorKey: string,
): VNode {
  // Normalize children to array, filtering out null/undefined
  const childArray = !children
    ? []
    : Array.isArray(children)
      ? children.filter(Boolean)
      : [children].filter(Boolean);

  return {
    tag: "#anchor",
    key: anchorKey,
    children: childArray,
  };
}