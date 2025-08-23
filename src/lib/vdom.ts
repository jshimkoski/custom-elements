/**
 * vdom.ts
 * Lightweight, strongly typed, functional virtual DOM renderer for custom elements.
 * Features: keyed diffing, incremental patching, focus/caret preservation, event delegation, SSR-friendly, no dependencies.
 */

export interface VNode {
  tag: string;
  key?: string;
  props?: {
    key?: string;
    props?: any;
    attrs?: Record<string, any>;
    directives?: Record<string, { value: string; modifiers: string[] }>;
  };
  children?: VNode[] | string;
}

export interface AnchorBlockVNode extends VNode {
  tag: "#anchor";
  key: string;
  children: VNode[];
  _startNode?: Comment;
  _endNode?: Comment;
}

/**
 * Get nested property value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

/**
 * Set nested property value in object using dot notation
 */
function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split(".");
  const lastKey = keys.pop();

  if (!lastKey) return;

  const target = keys.reduce((current, key) => {
    if (!(key in current)) {
      current[key] = {};
    }
    return current[key];
  }, obj);

  target[lastKey] = value;
}

/**
 * Process #model directive for two-way data binding
 */
function processModelDirective(
  value: string,
  modifiers: string[],
  props: Record<string, any>,
  attrs: Record<string, any>,
  listeners: Record<string, EventListener>,
  context?: any,
  el?: HTMLElement,
): void {
  if (!context) return;

  const hasLazy = modifiers.includes("lazy");
  const hasTrim = modifiers.includes("trim");
  const hasNumber = modifiers.includes("number");

  // Get current value from state - always get fresh value to avoid stale closures
  const getCurrentValue = () => {
    const actualState = context._state || context;
    return getNestedValue(actualState, value);
  };
  const currentValue = getCurrentValue();

  // Determine input type from attrs or element
  let inputType = "text";
  const attrInputType = attrs?.type;

  if (el instanceof HTMLInputElement) {
    inputType = attrInputType || el.type || "text";
  } else if (el instanceof HTMLSelectElement) {
    inputType = "select";
  } else if (el instanceof HTMLTextAreaElement) {
    inputType = "textarea";
  }

  // Set initial value only if different from current DOM value to prevent infinite loops
  if (inputType === "checkbox") {
    if (Array.isArray(currentValue)) {
      // Multiple checkboxes bound to array
      const checkboxValue = el?.getAttribute("value") || attrs?.value || "";
      const shouldBeChecked = currentValue.includes(checkboxValue);
      if (el && (el as HTMLInputElement).checked !== shouldBeChecked) {
        props.checked = shouldBeChecked;
      }
    } else {
      // Single checkbox bound to boolean or custom values
      const trueValue = el?.getAttribute("true-value") || true;
      const shouldBeChecked = currentValue === trueValue;
      if (el && (el as HTMLInputElement).checked !== shouldBeChecked) {
        props.checked = shouldBeChecked;
      }
    }
  } else if (inputType === "radio") {
    const radioValue = attrs?.value || "";
    const shouldBeChecked = currentValue === radioValue;
    if (el && (el as HTMLInputElement).checked !== shouldBeChecked) {
      props.checked = shouldBeChecked;
    }
  } else if (inputType === "select") {
    // Handle both single and multiple select
    if (el && el.hasAttribute("multiple")) {
      // Multiple select - currentValue should be an array
      const selectEl = el as HTMLSelectElement;
      const currentArray = Array.isArray(currentValue) ? currentValue : [];

      // Only update if different to prevent loops
      setTimeout(() => {
        Array.from(selectEl.options).forEach((option) => {
          const shouldBeSelected = currentArray.includes(option.value);
          if (option.selected !== shouldBeSelected) {
            option.selected = shouldBeSelected;
          }
        });
      }, 0);
    } else {
      // Single select
      setTimeout(() => {
        if (
          el instanceof HTMLSelectElement &&
          el.value !== String(currentValue)
        ) {
          el.value = String(currentValue);
        }
      }, 0);
    }
  } else {
    // Only set value prop if different from current DOM value to prevent infinite loops
    const stringValue = String(currentValue ?? "");
    if (
      !el ||
      (el as HTMLInputElement | HTMLTextAreaElement).value !== stringValue
    ) {
      props.value = currentValue;
    }
  }

  // Create event listener with loop prevention
  const eventType =
    hasLazy ||
    inputType === "checkbox" ||
    inputType === "radio" ||
    inputType === "select"
      ? "change"
      : "input";

  const eventListener: EventListener = (event: Event) => {
    // Skip during IME composition - check multiple ways
    if ((event as any).isComposing || (listeners as any)._isComposing) return;

    // Skip if this is a programmatic change (not user-initiated)
    if ((event as any).isTrusted === false) return;

    const target = event.target as
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement;

    // Skip if event is fired during our own value updates
    if ((target as any)._modelUpdating) return;

    // Always get fresh current value to avoid stale closures
    const freshCurrentValue = getCurrentValue();

    let newValue: any = target.value;

    // Handle different input types
    if (inputType === "checkbox") {
      if (Array.isArray(freshCurrentValue)) {
        // Multiple checkboxes bound to array
        const checkboxValue = target.getAttribute("value") || "";
        const currentArray = [...freshCurrentValue];
        if ((target as HTMLInputElement).checked) {
          if (!currentArray.includes(checkboxValue)) {
            currentArray.push(checkboxValue);
          }
        } else {
          const index = currentArray.indexOf(checkboxValue);
          if (index > -1) {
            currentArray.splice(index, 1);
          }
        }
        newValue = currentArray;
      } else {
        // Single checkbox
        const trueValue = target.getAttribute("true-value") || true;
        const falseValue = target.getAttribute("false-value") || false;
        newValue = (target as HTMLInputElement).checked
          ? trueValue
          : falseValue;
      }
    } else if (inputType === "radio") {
      newValue = target.getAttribute("value") || target.value;
    } else if (
      inputType === "select" &&
      (target as HTMLSelectElement).multiple
    ) {
      // Handle multiple select
      const selectEl = target as HTMLSelectElement;
      newValue = Array.from(selectEl.selectedOptions).map(
        (option) => option.value,
      );
    } else {
      // Apply modifiers for text inputs
      if (hasTrim) {
        newValue = newValue.trim();
      }
      if (hasNumber) {
        const numValue = Number(newValue);
        if (!isNaN(numValue)) {
          newValue = numValue;
        }
      }
    }

    // Get current state value to check if update is needed
    const actualState = context._state || context;
    const currentStateValue = getNestedValue(actualState, value);

    // Only update if the value has actually changed (prevent infinite loops)
    // For arrays, do a deep comparison
    const hasChanged =
      Array.isArray(newValue) && Array.isArray(currentStateValue)
        ? JSON.stringify([...newValue].sort()) !==
          JSON.stringify([...currentStateValue].sort())
        : newValue !== currentStateValue;

    if (hasChanged) {
      // Mark element as updating to prevent feedback loops
      const element = event.target as HTMLElement;
      (element as any)._modelUpdating = true;

      // Update using the actual state object for proper nested property support
      setNestedValue(actualState, value, newValue);

      // Clear the updating flag after a tick
      setTimeout(() => {
        (element as any)._modelUpdating = false;
      }, 0);

      // Trigger re-render if context has a render method
      if (context._requestRender) {
        context._requestRender();
      }
    }
  };

  listeners[eventType] = eventListener;

  // Handle IME composition for all input types (not just when !hasLazy)
  if (inputType === "text" || inputType === "textarea") {
    const compositionStartListener: EventListener = () => {
      // Flag to skip input events during composition
      (listeners as any)._isComposing = true;
    };

    const compositionEndListener: EventListener = (event: Event) => {
      (listeners as any)._isComposing = false;

      // Capture the target reference before setTimeout to avoid losing it
      const target = event.target as HTMLInputElement | HTMLTextAreaElement;
      // Manually trigger the update after composition ends
      setTimeout(() => {
        if (target) {
          let newValue: any = target.value;

          // Apply modifiers
          if (hasTrim) {
            newValue = newValue.trim();
          }
          if (hasNumber) {
            const numValue = Number(newValue);
            if (!isNaN(numValue)) {
              newValue = numValue;
            }
          }

          // Get current state value and only update if different
          const actualState = context._state || context;
          const currentStateValue = getNestedValue(actualState, value);

          // For arrays, do a deep comparison
          const hasChanged =
            Array.isArray(newValue) && Array.isArray(currentStateValue)
              ? JSON.stringify([...newValue].sort()) !==
                JSON.stringify([...currentStateValue].sort())
              : newValue !== currentStateValue;

          if (hasChanged) {
            // Mark element as updating to prevent feedback loops
            if (target) {
              (target as any)._modelUpdating = true;
              setTimeout(() => {
                (target as any)._modelUpdating = false;
              }, 0);
            }

            setNestedValue(actualState, value, newValue);

            if (context._requestRender) {
              context._requestRender();
            }
          }
        }
      }, 0);
    };

    listeners.compositionstart = compositionStartListener;
    listeners.compositionend = compositionEndListener;
  }
}

/**
 * Process #bind directive for attribute/property binding
 */
function processBindDirective(
  value: string,
  props: Record<string, any>,
  attrs: Record<string, any>,
  context?: any,
): void {
  if (!context) return;

  try {
    // Parse as object binding
    const bindings = JSON.parse(value);
    if (typeof bindings === "object") {
      for (const [key, val] of Object.entries(bindings)) {
        props[key] = val;
      }
    }
  } catch {
    // Parse as single property binding
    const currentValue = getNestedValue(context, value);
    // Default to binding as attribute
    attrs[value] = currentValue;
  }
}

/**
 * Process #show directive for conditional display
 */
function processShowDirective(
  value: string,
  attrs: Record<string, any>,
  context?: any,
): void {
  if (!context) return;

  const isVisible = getNestedValue(context, value);
  const currentStyle = attrs.style || "";
  const displayStyle = isVisible ? "" : "none";

  // Merge with existing styles
  if (currentStyle) {
    const styleRules = currentStyle.split(";").filter(Boolean);
    const displayIndex = styleRules.findIndex((rule: string) =>
      rule.trim().startsWith("display:"),
    );

    if (displayIndex >= 0) {
      styleRules[displayIndex] = `display: ${displayStyle}`;
    } else {
      styleRules.push(`display: ${displayStyle}`);
    }

    attrs.style = styleRules.join("; ");
  } else {
    attrs.style = `display: ${displayStyle}`;
  }
}

/**
 * Process #class directive for conditional CSS classes
 */
function processClassDirective(
  value: string,
  attrs: Record<string, any>,
  context?: any,
): void {
  if (!context) return;

  const classValue = getNestedValue(context, value);
  let classes: string[] = [];

  if (typeof classValue === "string") {
    classes = [classValue];
  } else if (Array.isArray(classValue)) {
    classes = classValue.filter(Boolean);
  } else if (typeof classValue === "object") {
    // Object syntax: { className: condition }
    classes = Object.entries(classValue)
      .filter(([, condition]) => Boolean(condition))
      .map(([className]) => className);
  }

  const existingClasses = attrs.class || "";
  const allClasses = existingClasses
    ? `${existingClasses} ${classes.join(" ")}`.trim()
    : classes.join(" ");

  if (allClasses) {
    attrs.class = allClasses;
  }
}

function processStyleDirective(
  value: any,
  attrs: Record<string, any>,
  context?: any,
): void {
  let styleValue: any;

  if (typeof value === "string") {
    if (!context) return;
    styleValue = getNestedValue(context, value);
  } else {
    styleValue = value;
  }

  let styleString = "";

  if (typeof styleValue === "string") {
    styleString = styleValue;
  } else if (styleValue && typeof styleValue === "object") {
    const styleRules: string[] = [];
    for (const [property, val] of Object.entries(styleValue)) {
      if (val != null && val !== "") {
        const kebabProperty = property.replace(
          /[A-Z]/g,
          (match) => `-${match.toLowerCase()}`,
        );
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
        let cssValue = String(val);
        if (typeof val === "number" && needsPx.includes(kebabProperty)) {
          cssValue = `${val}px`;
        }
        styleRules.push(`${kebabProperty}: ${cssValue}`);
      }
    }
    styleString = styleRules.join("; ") + (styleRules.length > 0 ? ";" : "");
  }

  const existingStyle = attrs.style || "";
  attrs.style =
    existingStyle +
    (existingStyle && !existingStyle.endsWith(";") ? "; " : "") +
    styleString;
}

/**
 * Process Vue-like directives and return merged props, attrs, and event listeners
 */
function processDirectives(
  directives: Record<string, { value: any; modifiers: string[] }>,
  context?: any,
  el?: HTMLElement,
  vnodeAttrs?: Record<string, any>,
): {
  props: Record<string, any>;
  attrs: Record<string, any>;
  listeners: Record<string, EventListener>;
} {
  const props: Record<string, any> = {};
  const attrs: Record<string, any> = { ...(vnodeAttrs || {}) };
  const listeners: Record<string, EventListener> = {};

  for (const [directiveName, directive] of Object.entries(directives)) {
    const { value, modifiers } = directive;

    switch (directiveName) {
      case "model":
        processModelDirective(
          typeof value === "string" ? value : String(value),
          modifiers,
          props,
          attrs,
          listeners,
          context,
          el,
        );
        break;
      case "bind":
        processBindDirective(value, props, attrs, context);
        break;
      case "show":
        processShowDirective(value, attrs, context);
        break;
      case "class":
        processClassDirective(value, attrs, context);
        break;
      case "style":
        processStyleDirective(value, attrs, context);
        break;
      // Add other directive cases here as needed
    }
  }

  return { props, attrs, listeners };
}

function assignKeysDeep(
  nodeOrNodes: VNode | VNode[],
  baseKey: string,
): VNode | VNode[] {
  if (Array.isArray(nodeOrNodes)) {
    const usedKeys = new Set<string>();

    return nodeOrNodes.map((child) => {
      if (!child || typeof child !== "object") return child;

      // Determine the starting key
      let key = child.props?.key ?? child.key;

      if (!key) {
        // Build a stable identity from tag + stable attributes
        const tagPart = child.tag || "node";
        const idPart =
          child.props?.attrs?.id ??
          child.props?.attrs?.name ??
          child.props?.attrs?.["data-key"] ??
          "";
        key = idPart
          ? `${baseKey}:${tagPart}:${idPart}`
          : `${baseKey}:${tagPart}`;
      }

      // Ensure uniqueness among siblings
      let uniqueKey = key;
      let counter = 1;
      while (usedKeys.has(uniqueKey)) {
        uniqueKey = `${key}#${counter++}`;
      }
      usedKeys.add(uniqueKey);

      // Recurse into children with this node's unique key
      let children = child.children;
      if (Array.isArray(children)) {
        children = assignKeysDeep(children, uniqueKey) as VNode[];
      }

      return { ...child, key: uniqueKey, children };
    });
  }

  // Single node case
  const node = nodeOrNodes as VNode;
  let key = node.props?.key ?? node.key ?? baseKey;

  let children = node.children;
  if (Array.isArray(children)) {
    children = assignKeysDeep(children, key) as VNode[];
  }

  return { ...node, key, children };
}

/**
 * Patch props on an element.
 * Only update changed props, remove old, add new.
 */
function patchProps(
  el: HTMLElement,
  oldProps: Record<string, any>,
  newProps: Record<string, any>,
  context?: any,
) {
  // Process directives first
  const newDirectives = newProps.directives ?? {};
  const processedDirectives = processDirectives(
    newDirectives,
    context,
    el,
    newProps.attrs,
  );

  // Merge processed directive results with existing props/attrs
  const mergedProps = {
    ...oldProps.props,
    ...newProps.props,
    ...processedDirectives.props,
  };
  const mergedAttrs = {
    ...oldProps.attrs,
    ...newProps.attrs,
    ...processedDirectives.attrs,
  };

  const oldPropProps = oldProps.props ?? {};
  const newPropProps = mergedProps;
  for (const key in { ...oldPropProps, ...newPropProps }) {
    const oldVal = oldPropProps[key];
    const newVal = newPropProps[key];
    if (oldVal !== newVal) {
      if (
        key === "value" &&
        (el instanceof HTMLInputElement ||
          el instanceof HTMLTextAreaElement ||
          el instanceof HTMLSelectElement)
      ) {
        if (el.value !== newVal) el.value = newVal ?? "";
      } else if (key === "checked" && el instanceof HTMLInputElement) {
        el.checked = !!newVal;
      } else if (key.startsWith("on") && typeof newVal === "function") {
        if (typeof oldVal === "function")
          el.removeEventListener(key.slice(2).toLowerCase(), oldVal);
        el.addEventListener(key.slice(2).toLowerCase(), newVal);
      } else if (newVal === undefined || newVal === null) {
        el.removeAttribute(key);
      } else {
        el.setAttribute(key, String(newVal));
      }
    }
  }

  // Handle directive event listeners
  for (const [eventType, listener] of Object.entries(
    processedDirectives.listeners || {},
  )) {
    el.addEventListener(eventType, listener as EventListener);
  }

  const oldAttrs = oldProps.attrs ?? {};
  const newAttrs = mergedAttrs;
  for (const key in { ...oldAttrs, ...newAttrs }) {
    const oldVal = oldAttrs[key];
    const newVal = newAttrs[key];
    if (oldVal !== newVal) {
      if (newVal === undefined || newVal === null) el.removeAttribute(key);
      else el.setAttribute(key, String(newVal));
    }
  }
}

function createElement(vnode: VNode | string, context?: any): Node {
  // String VNode → plain text node (no key)
  if (typeof vnode === "string") {
    return document.createTextNode(vnode);
  }

  // Text VNode
  if (vnode.tag === "#text") {
    const textNode = document.createTextNode(
      typeof vnode.children === "string" ? vnode.children : "",
    );
    if (vnode.key != null) (textNode as any).key = vnode.key; // attach key
    return textNode;
  }

  // Anchor block VNode - ALWAYS create start/end boundaries
  if (vnode.tag === "#anchor") {
    const anchorVNode = vnode as AnchorBlockVNode;
    const children = Array.isArray(anchorVNode.children)
      ? anchorVNode.children
      : [];

    // Always create start/end markers for stable boundaries
    const start = document.createTextNode("");
    const end = document.createTextNode("");

    if (anchorVNode.key != null) {
      (start as any).key = `${anchorVNode.key}:start`;
      (end as any).key = `${anchorVNode.key}:end`;
    }
    anchorVNode._startNode = start;
    anchorVNode._endNode = end;

    const frag = document.createDocumentFragment();
    frag.appendChild(start);
    for (const child of children) {
      frag.appendChild(createElement(child, context));
    }
    frag.appendChild(end);
    return frag;
  }

  // Standard element VNode
  const el = document.createElement(vnode.tag);
  if (vnode.key != null) (el as any).key = vnode.key; // attach key

  const { props = {}, attrs = {}, directives = {} } = vnode.props ?? {};

  // Process directives first to get merged props/attrs/listeners
  const processedDirectives = processDirectives(directives, context, el, attrs);

  // Merge processed directive results with existing props/attrs
  const mergedProps = {
    ...props,
    ...processedDirectives.props,
  };
  const mergedAttrs = {
    ...attrs,
    ...processedDirectives.attrs,
  };

  // Set attributes
  for (const key in mergedAttrs) {
    el.setAttribute(key, String(mergedAttrs[key]));
  }

  // Set props and event listeners
  for (const key in mergedProps) {
    const val = mergedProps[key];
    if (
      key === "value" &&
      (el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement)
    ) {
      el.value = val ?? "";
    } else if (key === "checked" && el instanceof HTMLInputElement) {
      el.checked = !!val;
    } else if (key.startsWith("on") && typeof val === "function") {
      el.addEventListener(key.slice(2).toLowerCase(), val);
    } else if (key.startsWith("on") && val === undefined) {
      continue; // skip undefined event handlers
    } else {
      el.setAttribute(key, String(val));
    }
  }

  // Handle directive event listeners
  for (const [eventType, listener] of Object.entries(
    processedDirectives.listeners || {},
  )) {
    el.addEventListener(eventType, listener as EventListener);
  }

  // Append children
  if (Array.isArray(vnode.children)) {
    for (const child of vnode.children) {
      el.appendChild(createElement(child, context));
    }
  } else if (typeof vnode.children === "string") {
    el.textContent = vnode.children;
  }

  return el;
}

/**
 * Patch children using keys for node matching.
 */
function patchChildren(
  parent: HTMLElement,
  oldChildren: VNode[] | string | undefined,
  newChildren: VNode[] | string | undefined,
  context?: any,
) {
  if (typeof newChildren === "string") {
    if (parent.textContent !== newChildren) parent.textContent = newChildren;
    return;
  }
  if (!Array.isArray(newChildren)) return;

  const oldNodes = Array.from(parent.childNodes);
  const oldVNodes: VNode[] = Array.isArray(oldChildren) ? oldChildren : [];

  // Map old VNodes by key
  const oldVNodeByKey = new Map<string | number, VNode>();
  for (const v of oldVNodes) {
    if (v && v.key != null) oldVNodeByKey.set(v.key, v);
  }

  // Map DOM nodes by key (elements, text, anchors)
  const oldNodeByKey = new Map<string | number, Node>();

  // Scan DOM for keyed nodes including anchor boundaries
  for (const node of oldNodes) {
    const k = (node as any).key;
    if (k != null) {
      oldNodeByKey.set(k, node);
    }
  }

  const usedNodes = new Set<Node>();
  let nextSibling: Node | null = parent.firstChild;

  function markRangeUsed(start: Comment, end?: Comment) {
    let cur: Node | null = start;
    while (cur) {
      usedNodes.add(cur);
      if (cur === end) break;
      cur = cur.nextSibling;
    }
  }

  // --- Integrated patchChildrenBetween ---
  function patchChildrenBetween(
    start: Comment,
    end: Comment,
    oldChildren: VNode[] | undefined,
    newChildren: VNode[],
  ) {
    const oldNodesInRange: Node[] = [];
    let cur: Node | null = start.nextSibling;
    while (cur && cur !== end) {
      oldNodesInRange.push(cur);
      cur = cur.nextSibling;
    }

    const oldVNodesInRange: VNode[] = Array.isArray(oldChildren)
      ? oldChildren
      : [];
    const hasKeys =
      newChildren.some((c) => c && c.key != null) ||
      oldVNodesInRange.some((c) => c && c.key != null);

    if (hasKeys) {
      // Keyed diff
      const oldVNodeByKeyRange = new Map<string | number, VNode>();
      const oldNodeByKeyRange = new Map<string | number, Node>();

      for (const v of oldVNodesInRange) {
        if (v && v.key != null) oldVNodeByKeyRange.set(v.key, v);
      }
      for (const node of oldNodesInRange) {
        const k = (node as any).key;
        if (k != null) oldNodeByKeyRange.set(k, node);
      }

      const usedInRange = new Set<Node>();
      let next: Node | null = start.nextSibling;

      for (const newVNode of newChildren) {
        let node: Node;
        if (newVNode.key != null && oldNodeByKeyRange.has(newVNode.key)) {
          const oldVNode = oldVNodeByKeyRange.get(newVNode.key)!;
          node = patch(
            oldNodeByKeyRange.get(newVNode.key)!,
            oldVNode,
            newVNode,
            context,
          );
          usedInRange.add(node);
          if (node !== next && parent.contains(node)) {
            parent.insertBefore(node, next);
          }
        } else {
          node = createElement(newVNode, context);
          parent.insertBefore(node, next);
          usedInRange.add(node);
        }
        next = node.nextSibling;
      }

      // Remove unused
      for (const node of oldNodesInRange) {
        if (!usedInRange.has(node) && parent.contains(node)) {
          parent.removeChild(node);
        }
      }
    } else {
      // Keyless fallback: index-based patch
      const commonLength = Math.min(
        oldVNodesInRange.length,
        newChildren.length,
      );

      for (let i = 0; i < commonLength; i++) {
        const oldVNode = oldVNodesInRange[i];
        const newVNode = newChildren[i];
        const node = patch(oldNodesInRange[i], oldVNode, newVNode, context);
        if (node !== oldNodesInRange[i]) {
          parent.insertBefore(node, oldNodesInRange[i]);
          parent.removeChild(oldNodesInRange[i]);
        }
      }

      // Add extra new
      for (let i = commonLength; i < newChildren.length; i++) {
        parent.insertBefore(createElement(newChildren[i], context), end);
      }

      // Remove extra old
      for (let i = commonLength; i < oldNodesInRange.length; i++) {
        parent.removeChild(oldNodesInRange[i]);
      }
    }
  }
  // --- End integrated patchChildrenBetween ---

  for (const newVNode of newChildren) {
    let node: Node;

    // Handle AnchorBlocks
    if (newVNode.tag === "#anchor") {
      const aKey = newVNode.key!;
      const startKey = `${aKey}:start`;
      const endKey = `${aKey}:end`;

      let start = oldNodeByKey.get(startKey) as Node;
      let end = oldNodeByKey.get(endKey) as Node;
      const children = Array.isArray(newVNode.children)
        ? newVNode.children
        : [];

      // Create boundaries if they don't exist
      if (!start) {
        start = document.createTextNode("");
        (start as any).key = startKey;
      }
      if (!end) {
        end = document.createTextNode("");
        (end as any).key = endKey;
      }

      // Preserve anchor references on the new VNode
      (newVNode as AnchorBlockVNode)._startNode = start as Comment;
      (newVNode as AnchorBlockVNode)._endNode = end as Comment;

      // If boundaries aren't in DOM, insert the whole fragment
      if (!parent.contains(start) || !parent.contains(end)) {
        parent.insertBefore(start, nextSibling);
        for (const child of children) {
          parent.insertBefore(createElement(child, context), nextSibling);
        }
        parent.insertBefore(end, nextSibling);
      } else {
        // Patch children between existing boundaries
        patchChildrenBetween(
          start as Comment,
          end as Comment,
          (oldVNodeByKey.get(aKey) as VNode)?.children as VNode[] | undefined,
          children,
        );
      }

      markRangeUsed(start as Comment, end as Comment);
      nextSibling = end.nextSibling;
      continue;
    }

    // Normal keyed element/text
    if (newVNode.key != null && oldNodeByKey.has(newVNode.key)) {
      const oldVNode = oldVNodeByKey.get(newVNode.key)!;
      node = patch(
        oldNodeByKey.get(newVNode.key)!,
        oldVNode,
        newVNode,
        context,
      );
      usedNodes.add(node);
      if (node !== nextSibling && parent.contains(node)) {
        if (nextSibling && !parent.contains(nextSibling)) nextSibling = null;
        parent.insertBefore(node, nextSibling);
      }
    } else {
      node = createElement(newVNode, context);
      if (nextSibling && !parent.contains(nextSibling)) nextSibling = null;
      parent.insertBefore(node, nextSibling);
      usedNodes.add(node);
    }

    nextSibling = node.nextSibling;
  }

  // Remove unused nodes
  for (const node of oldNodes) {
    if (!usedNodes.has(node) && parent.contains(node)) {
      parent.removeChild(node);
    }
  }
}

/**
 * Patch a node using keys for node matching.
 */
function patch(
  dom: Node,
  oldVNode: VNode | string | null,
  newVNode: VNode | string | null,
  context?: any,
): Node {
  if (oldVNode === newVNode) return dom;

  if (typeof newVNode === "string") {
    if (dom.nodeType === Node.TEXT_NODE) {
      if (dom.textContent !== newVNode) dom.textContent = newVNode;
      return dom;
    } else {
      const textNode = document.createTextNode(newVNode);
      dom.parentNode?.replaceChild(textNode, dom);
      return textNode;
    }
  }

  if (newVNode && typeof newVNode !== "string" && newVNode.tag === "#anchor") {
    const anchorVNode = newVNode as AnchorBlockVNode;
    const children = Array.isArray(anchorVNode.children)
      ? anchorVNode.children
      : [];

    const start = anchorVNode._startNode ?? document.createTextNode("");
    const end = anchorVNode._endNode ?? document.createTextNode("");

    if (anchorVNode.key != null) {
      (start as any).key = `${anchorVNode.key}:start`;
      (end as any).key = `${anchorVNode.key}:end`;
    }

    anchorVNode._startNode = start;
    anchorVNode._endNode = end;

    const frag = document.createDocumentFragment();
    frag.appendChild(start);
    for (const child of children) {
      frag.appendChild(createElement(child, context));
    }
    frag.appendChild(end);
    dom.parentNode?.replaceChild(frag, dom);
    return start;
  }

  if (!newVNode) {
    const placeholder = document.createComment("removed");
    dom.parentNode?.replaceChild(placeholder, dom);
    return placeholder;
  }

  if (!oldVNode || typeof oldVNode === "string") {
    const newEl = createElement(newVNode, context);
    dom.parentNode?.replaceChild(newEl, dom);
    return newEl;
  }

  if (newVNode.tag === "#anchor") {
    const children = Array.isArray(newVNode.children) ? newVNode.children : [];
    const start = (newVNode as any)._startNode ?? document.createTextNode("");
    const end = (newVNode as any)._endNode ?? document.createTextNode("");

    if (newVNode.key != null) {
      (start as any).key = `${newVNode.key}:start`;
      (end as any).key = `${newVNode.key}:end`;
    }

    (newVNode as any)._startNode = start;
    (newVNode as any)._endNode = end;

    const frag = document.createDocumentFragment();
    frag.appendChild(start);
    for (const child of children) {
      frag.appendChild(createElement(child, context));
    }
    frag.appendChild(end);
    dom.parentNode?.replaceChild(frag, dom);
    return start;
  }

  if (
    typeof oldVNode !== "string" &&
    typeof newVNode !== "string" &&
    oldVNode.tag === newVNode.tag &&
    oldVNode.key === newVNode.key
  ) {
    const el = dom as HTMLElement;
    patchProps(el, oldVNode.props || {}, newVNode.props || {}, context);
    patchChildren(el, oldVNode.children, newVNode.children, context);
    return el;
  }

  const newEl = createElement(newVNode, context);
  dom.parentNode?.replaceChild(newEl, dom);
  return newEl;
}

/**
 * Main renderer: uses patching and keys for node reuse.
 * Never uses innerHTML. Only updates what has changed.
 */
export function vdomRenderer(
  root: ShadowRoot,
  vnodeOrArray: VNode | VNode[],
  context?: any,
) {
  const wrap = (v: VNode): VNode =>
    v.key == null ? { ...v, key: "__root__" } : v;
  let newVNode = Array.isArray(vnodeOrArray)
    ? { tag: "div", key: "__root__", children: vnodeOrArray }
    : wrap(vnodeOrArray);

  newVNode = assignKeysDeep(newVNode, String(newVNode.key ?? "root")) as VNode;

  // Track previous VNode and DOM node
  const prevVNode: VNode | null = (root as any)._prevVNode ?? null;
  const prevDom: Node | null =
    (root as any)._prevDom ?? root.firstChild ?? null;

  let newDom: Node;

  if (prevVNode && prevDom) {
    // Only replace if tag or key changed
    if (
      typeof prevVNode !== "string" &&
      typeof newVNode !== "string" &&
      prevVNode.tag === newVNode.tag &&
      prevVNode.key === newVNode.key
    ) {
      newDom = patch(prevDom, prevVNode, newVNode, context);
    } else {
      newDom = createElement(newVNode, context);
      root.replaceChild(newDom, prevDom);
    }
  } else {
    newDom = createElement(newVNode, context);
    if (root.firstChild) root.replaceChild(newDom, root.firstChild);
    else root.appendChild(newDom);
  }

  // Remove any extra nodes, but preserve style elements
  const nodesToRemove: Node[] = [];
  for (let i = 0; i < root.childNodes.length; i++) {
    const node = root.childNodes[i];
    if (node !== newDom && node.nodeName !== "STYLE") {
      nodesToRemove.push(node);
    }
  }
  nodesToRemove.forEach((node) => root.removeChild(node));

  // Update tracked VNode and DOM node
  (root as any)._prevVNode = newVNode;
  (root as any)._prevDom = newDom;
}

/**
 * SSR-friendly: serialize VNode to HTML string.
 */
function escapeHTML(str: string): string {
  return str.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c]!,
  );
}

export function renderToString(vnode: VNode): string {
  if (typeof vnode === "string") return escapeHTML(vnode);

  if (vnode.tag === "#text") {
    return typeof vnode.children === "string" ? escapeHTML(vnode.children) : "";
  }

  if (vnode.tag === "#anchor") {
    const children = Array.isArray(vnode.children) ? vnode.children : [];
    return children.map(renderToString).join("");
  }

  const props = vnode.props
    ? Object.entries(vnode.props)
        .map(([k, v]) => ` ${k}="${escapeHTML(String(v))}"`)
        .join("")
    : "";
  const children = Array.isArray(vnode.children)
    ? vnode.children.map(renderToString).join("")
    : escapeHTML(vnode.children || "");
  return `<${vnode.tag}${props}>${children}</${vnode.tag}>`;
}
