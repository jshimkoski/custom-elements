import type { VNode } from './vdom-v2';

/**
 * Wrap dynamic content in a stable anchor block and propagate the key to children.
 */
export function anchorBlock(
  children: VNode | VNode[] | null | undefined,
  anchorKey: string
): VNode {
  function assignKeys(
    nodeOrArray: VNode | VNode[],
    parentKey: string
  ): VNode | VNode[] {
    if (Array.isArray(nodeOrArray)) {
      const used = new Set<string>();
      return nodeOrArray.map((child) => {
        if (!child || typeof child !== 'object') return child;

        // Keep explicit key if present
        let key: string | undefined = child.props?.key ?? child.key;
        if (!key) {
          // Fallback: derive from tag + stable attrs
          const tagPart = child.tag || 'node';
          const idPart =
            child.props?.attrs?.id ??
            child.props?.attrs?.name ??
            child.props?.attrs?.['data-key'] ??
            '';
          key = idPart
            ? `${parentKey}:${tagPart}:${idPart}`
            : `${parentKey}:${tagPart}`;
        }

        // Ensure uniqueness among siblings
        let uniqueKey = key;
        let counter = 1;
        while (used.has(uniqueKey)) {
          uniqueKey = `${key}#${counter++}`;
        }
        used.add(uniqueKey);

        // Recurse into children
        let newChildren = child.children;
        if (Array.isArray(newChildren)) {
          newChildren = assignKeys(newChildren, uniqueKey) as VNode[];
        }

        return { ...child, key: `${uniqueKey}:child`, children: newChildren };
      });
    }

    const node = nodeOrArray;
    let key: string = node.props?.key ?? node.key ?? parentKey;

    let newChildren = node.children;
    if (Array.isArray(newChildren)) {
      newChildren = assignKeys(newChildren, key) as VNode[];
    }

    return { ...node, key: `${key}:child`, children: newChildren };
  }

  const keyedChildren = assignKeys(children ?? [], anchorKey);

  return {
    tag: '#anchor',
    key: anchorKey,
    children: Array.isArray(keyedChildren) ? keyedChildren : [keyedChildren]
  };
}



/* --- vIf --- */
export function vIf(cond: boolean, children: VNode | VNode[]): VNode {
  const anchorKey = 'vIf-block'; // stable key regardless of condition
  return anchorBlock(cond ? children : [], anchorKey);
}

/* --- vFor --- */
export function vFor<T extends { id?: string | number; key?: string }>(
  list: T[],
  render: (item: T, index: number) => VNode | VNode[]
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
  return { attrs: { style: `display: ${visible ? '' : 'none'}` } };
}

/* --- vClass --- */
export function vClass(...classes: Array<string | false | null | undefined>) {
  return { attrs: { class: classes.filter(Boolean).join(' ') } };
}

/* --- vModel --- */
export function vModel<T>(value: T, onInput: (val: T) => void) {
  return {
    props: {
      value,
      onInput: (e: Event) => {
        const target = e.target as HTMLInputElement | HTMLTextAreaElement;
        onInput(target.value as unknown as T);
      }
    }
  };
}

/* --- vIfChain --- */
type Branch = [condition: any, content: VNode | VNode[]];

export function vIfChain(...branches: Branch[]): VNode[] {
  for (let idx = 0; idx < branches.length; idx++) {
    const [cond, content] = branches[idx];
    if (cond) return [anchorBlock(content, `vIfChain-branch-${idx}`)];
  }
  return [anchorBlock({ tag: '#text', children: [] } as VNode, 'vIfChain-empty')];
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
    }
  };
}

/* --- vSwitch --- */
type CaseBranch = [matchValue: any, content: VNode | VNode[]];

export function vSwitch(
  value: any,
  cases: CaseBranch[],
  defaultContent?: VNode | VNode[]
): VNode[] {
  const anchorKey = 'vSwitch-block'; // stable container key
  for (const [matchValue, content] of cases) {
    if (value === matchValue) {
      return [anchorBlock(content, anchorKey)];
    }
  }
  return [anchorBlock(defaultContent || { tag: '#text', children: [] } as VNode, anchorKey)];
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
    }
  };
}
