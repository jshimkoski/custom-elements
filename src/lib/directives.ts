import type { VNode } from "./vdom";

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
export function vFor<
  T extends string | number | boolean | { id?: string | number; key?: string },
>(list: T[], render: (item: T, index: number) => VNode | VNode[]): VNode[] {
  return list.map((item, i) => {
    // For primitives, use value as key; for objects, prefer key/id
    const itemKey =
      typeof item === "object"
        ? ((item as any)?.key ?? (item as any)?.id ?? `idx-${i}`)
        : String(item);
    return anchorBlock(render(item, i), `vFor-${itemKey}`);
  });
}

/* --- vBind --- */
export function vBind(bindings: Record<string, any>): {
  attrs: Record<string, any>;
} {
  const attrs: Record<string, any> = {};

  // Process each binding
  for (const [key, value] of Object.entries(bindings)) {
    if (value != null) {
      // Handle boolean attributes
      if (typeof value === "boolean") {
        if (value) {
          attrs[key] = key; // For boolean attributes like disabled, checked
        }
        // false values are omitted entirely
      } else {
        attrs[key] = String(value);
      }
    }
  }

  return { attrs };
}

/* --- vShow --- */
export function vShow(visible: boolean): { attrs: { style: string } } {
  return {
    attrs: {
      style: visible ? "" : "display: none !important;",
    },
  };
}

/* --- vClass --- */
export function vClass(
  classes:
    | string
    | string[]
    | Record<string, boolean>
    | (string | Record<string, boolean>)[],
): { attrs: { class: string } } {
  const classNames: string[] = [];

  function processClassValue(
    value:
      | string
      | string[]
      | Record<string, boolean>
      | (string | Record<string, boolean>)[],
  ): void {
    if (typeof value === "string") {
      // String: split by spaces and add all
      classNames.push(...value.split(/\s+/).filter(Boolean));
    } else if (Array.isArray(value)) {
      // Array: process each item recursively
      for (const item of value) {
        if (typeof item === "string") {
          classNames.push(...item.split(/\s+/).filter(Boolean));
        } else if (item && typeof item === "object") {
          for (const [className, condition] of Object.entries(item)) {
            if (condition) {
              classNames.push(...className.split(/\s+/).filter(Boolean));
            }
          }
        }
      }
    } else if (value && typeof value === "object") {
      // Object: add keys where value is truthy
      for (const [className, condition] of Object.entries(value)) {
        if (condition) {
          classNames.push(...className.split(/\s+/).filter(Boolean));
        }
      }
    }
  }

  processClassValue(classes);

  // Remove duplicates and join
  const uniqueClasses = [...new Set(classNames)];

  return {
    attrs: {
      class: uniqueClasses.join(" "),
    },
  };
}

/* --- vStyle --- */
export function vStyle(
  styles: string | Record<string, string | number | null | undefined>,
): { attrs: { style: string } } {
  if (typeof styles === "string") {
    return { attrs: { style: styles } };
  }

  const styleRules: string[] = [];

  for (const [property, value] of Object.entries(styles)) {
    if (value != null && value !== "") {
      // Convert camelCase to kebab-case for CSS properties
      const kebabProperty = property.replace(
        /[A-Z]/g,
        (match) => `-${match.toLowerCase()}`,
      );

      // Handle numeric values that should have 'px' unit (common CSS properties)
      const needsPx = [
        "width",
        "height",
        "top",
        "right",
        "bottom",
        "left",
        "margin",
        "margin-top",
        "margin-right",
        "margin-bottom",
        "margin-left",
        "padding",
        "padding-top",
        "padding-right",
        "padding-bottom",
        "padding-left",
        "font-size",
        "line-height",
        "border-width",
        "border-radius",
        "min-width",
        "max-width",
        "min-height",
        "max-height",
      ];

      let cssValue = String(value);
      if (typeof value === "number" && needsPx.includes(kebabProperty)) {
        cssValue = `${value}px`;
      }

      styleRules.push(`${kebabProperty}: ${cssValue}`);
    }
  }

  return {
    attrs: {
      style: styleRules.join("; ") + (styleRules.length > 0 ? ";" : ""),
    },
  };
}

/* --- vModel --- */
export function vModel<T>(value: T, onInput: (val: T) => void) {
  return {
    props: {
      value,
      onInput: (e: Event) => {
        // Skip if this is a programmatic change (not user-initiated)
        if ((e as any).isTrusted === false) return;

        const target = e.target as
          | HTMLInputElement
          | HTMLTextAreaElement
          | HTMLSelectElement;

        // Get current value to prevent unnecessary updates
        const currentValue =
          target.type === "checkbox"
            ? ((target as HTMLInputElement).checked as unknown as T)
            : target.type === "number" || target.type === "range"
              ? (parseFloat((target as HTMLInputElement).value) as unknown as T)
              : (target.value as unknown as T);

        // Only update if value has changed
        if (currentValue !== value) {
          onInput(currentValue);
        }
      },
      onChange: (e: Event) => {
        // Skip if this is a programmatic change (not user-initiated)
        if ((e as any).isTrusted === false) return;

        // Also handle onChange for some input types
        const target = e.target as
          | HTMLInputElement
          | HTMLTextAreaElement
          | HTMLSelectElement;
        if (target.type === "checkbox" || target.type === "radio") {
          const currentValue =
            target.type === "checkbox"
              ? ((target as HTMLInputElement).checked as unknown as T)
              : (target.value as unknown as T);

          // Only update if value has changed
          if (currentValue !== value) {
            onInput(currentValue);
          }
        }
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
