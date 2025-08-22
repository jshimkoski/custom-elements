import type { VNode } from "./vdom-v2";

/**
 * Create a stable anchor block with consistent boundaries.
 * This works like Vue's fragments - always has start/end boundaries.
 */
export function anchorBlock(
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

/* --- vIf --- */
export function vIf(cond: boolean, children: VNode | VNode[]): VNode {
  const anchorKey = "vIf-block"; // stable key regardless of condition
  return anchorBlock(cond ? children : [], anchorKey);
}

/* --- vFor --- */
export function vFor<T extends { id?: string | number; key?: string }>(
  list: T[],
  render: (item: T, index: number) => VNode | VNode[],
): VNode[] {
  return list.map((item, i) => {
    const itemKey =
      (item as any)?.key ??
      (item.id !== undefined ? String(item.id) : undefined) ??
      `idx-${i}`;
    return anchorBlock(render(item, i), `vFor-${itemKey}`);
  });
}

/* --- vBind --- */
export function vBind(bindings: Record<string, any>) {
  const props: Record<string, any> = {};
  const attrs: Record<string, any> = {};
  for (const key in bindings) {
    props[key] = bindings[key];
  }
  return { props, attrs };
}

/* --- vShow --- */
export function vShow(visible: boolean) {
  return { attrs: { style: `display: ${visible ? "" : "none"}` } };
}

/* --- vClass --- */
export function vClass(...classes: Array<string | false | null | undefined>) {
  return { attrs: { class: classes.filter(Boolean).join(" ") } };
}

/* --- vModel --- */
export function vModel<T>(value: T, onInput: (val: T) => void) {
  return {
    props: {
      value,
      onInput: (e: Event) => {
        const target = e.target as HTMLInputElement | HTMLTextAreaElement;
        onInput(target.value as unknown as T);
      },
    },
  };
}

/* --- vIfChain --- */
type Branch = [condition: any, content: VNode | VNode[]];

export function vIfChain(...branches: Branch[]): VNode[] {
  for (let idx = 0; idx < branches.length; idx++) {
    const [cond, content] = branches[idx];
    if (cond) return [anchorBlock(content, `vIfChain-branch-${idx}`)];
  }
  return [anchorBlock([], "vIfChain-empty")];
}

/* --- vIfBuilder --- */
export function vIfBuilder() {
  const branches: Branch[] = [];
  return {
    if(cond: any, content: VNode | VNode[]) {
      branches.push([cond, content]);
      return this;
    },
    elseIf(cond: any, content: VNode | VNode[]) {
      branches.push([cond, content]);
      return this;
    },
    else(content: VNode | VNode[]) {
      branches.push([true, content]);
      return this;
    },
    done() {
      return vIfChain(...branches);
    },
  };
}

/* --- vSwitch --- */
type CaseBranch = [matchValue: any, content: VNode | VNode[]];

export function vSwitch(
  value: any,
  cases: CaseBranch[],
  defaultContent?: VNode | VNode[],
): VNode[] {
  const anchorKey = "vSwitch-block"; // stable container key
  for (const [matchValue, content] of cases) {
    if (value === matchValue) {
      return [anchorBlock(content, anchorKey)];
    }
  }
  return [anchorBlock(defaultContent || [], anchorKey)];
}

/* --- vSwitchBuilder --- */
export function vSwitchBuilder(value: any) {
  const cases: CaseBranch[] = [];
  let defaultContent: VNode | VNode[] | undefined;
  return {
    case(matchValue: any, content: VNode | VNode[]) {
      cases.push([matchValue, content]);
      return this;
    },
    default(content: VNode | VNode[]) {
      defaultContent = content;
      return this;
    },
    done() {
      return vSwitch(value, cases, defaultContent);
    },
  };
}
