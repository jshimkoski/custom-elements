import type { VNode } from './vdom-v2';

/**
 * Wrap dynamic content in a stable anchor block and propagate the key to children.
 */
export function anchorBlock(
  children: VNode | VNode[] | null | undefined,
  anchorKey: string
): VNode {
  function assignKeys(nodeOrArray: VNode | VNode[], path: string): VNode | VNode[] {
    if (Array.isArray(nodeOrArray)) {
      // Flatten any nested arrays returned by assignKeys
      return nodeOrArray
        .map((child, i) => assignKeys(child, `${path}_${i}`))
        .flat();
    }
    if (!nodeOrArray) return [];

    const cloned: VNode = {
      ...nodeOrArray,
      key: `${path}` // always overwrite here
    };

    if (Array.isArray(cloned.children)) {
      cloned.children = assignKeys(cloned.children, `${path}c`) as VNode[];
    }
    return cloned;
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
  return {
    tag: '#anchor',
    key: anchorKey,
    children: cond ? (Array.isArray(children) ? children : [children]) : []
  };
}



/* --- vFor --- */
export function vFor<T extends { id?: string | number }>(
  list: T[],
  render: (item: T, index: number) => VNode | VNode[]
): VNode[] {
  return list.map((item, i) => {
    const itemKey = (item as any)?.key ?? item.id ?? i;
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
  return [anchorBlock({ tag: '#text', children: '' }, 'vIfChain-empty')];
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
  for (const [matchValue, content] of cases) {
    if (value === matchValue) {
      return [anchorBlock(content, `vSwitch-case-${matchValue}`)];
    }
  }
  return [anchorBlock(defaultContent || { tag: '#text', children: '' }, 'vSwitch-default')];
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
