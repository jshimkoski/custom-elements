/**
 * vdom.ts
 * Lightweight, strongly typed, functional virtual DOM renderer for custom elements.
 * Features: keyed diffing, incremental patching, focus/caret preservation, event delegation, SSR-friendly, no dependencies.
 */

import type { VNode, VDomRefs, AnchorBlockVNode } from "./types";
import { escapeHTML } from "./helpers";

/**
 * Recursively clean up refs for all descendants of a node
 * @param node The node to clean up.
 * @param refs The refs to clean up.
 * @returns 
 */
export function cleanupRefs(node: Node, refs?: VDomRefs) {
  if (!refs) return;
  if (node instanceof HTMLElement) {
    for (const refKey in refs) {
      if (refs[refKey] === node) {
        delete refs[refKey];
      }
    }
    // Clean up child nodes
    for (const child of Array.from(node.childNodes)) {
      cleanupRefs(child, refs);
    }
  }
}

/**
 * Get nested property value from object using dot notation
 * @param obj The object to search.
 * @param path The dot-separated path to the property.
 * @returns The value of the nested property, or undefined if not found.
 */
export function getNestedValue(obj: any, path: string): any {
  if (typeof path === 'string') {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }
  // If path is an object, handle accordingly or return a default value
  return path;
}

/**
 * Set nested property value in object using dot notation
 * @param obj 
 * @param path 
 * @param value 
 * @returns 
 */
export function setNestedValue(obj: any, path: string, value: any): void {
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
 * Process :model directive for two-way data binding
 * @param value 
 * @param modifiers 
 * @param props 
 * @param attrs 
 * @param listeners 
 * @param context 
 * @param el 
 * @returns 
 */
export function processModelDirective(
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
 * Convert a prop key like `onClick` to its DOM event name `click`.
 */
function eventNameFromKey(key: string): string {
  // strip leading 'on' and lowercase remainder
  return key.slice(2).charAt(0).toLowerCase() + key.slice(3);
}

/**
 * Normalize a listener entry which may be a function or an object { handler, options }.
 * Returns tuple [handlerFunction, options]
 */
function normalizeListenerEntry(
  maybe: any,
): [EventListener | undefined, AddEventListenerOptions | undefined] {
  if (!maybe) return [undefined, undefined];
  if (typeof maybe === "function") return [maybe as EventListener, undefined];
  if (typeof maybe === "object") {
    if (typeof maybe.handler === "function") return [maybe.handler as EventListener, maybe.options as AddEventListenerOptions];
    // If object is already like { handler, options } renamed keys
    if (typeof maybe.fn === "function") return [maybe.fn as EventListener, maybe.options as AddEventListenerOptions];
  }
  return [undefined, undefined];
}

/**
 * Process :bind directive for attribute/property binding
 * @param value 
 * @param props 
 * @param attrs 
 * @param context 
 * @returns 
 */
export function processBindDirective(
  value: string,
  props: Record<string, any>,
  attrs: Record<string, any>,
  context?: any,
): void {
  if (!context) return;

  // Support both object and string syntax for :bind
  if (typeof value === "object" && value !== null) {
    for (const [key, val] of Object.entries(value)) {
      props[key] = val;
    }
  } else if (typeof value === "string") {
    try {
      // Try to parse as JSON object
      const bindings = JSON.parse(value);
      if (typeof bindings === "object" && bindings !== null) {
        for (const [key, val] of Object.entries(bindings)) {
          props[key] = val;
        }
        return;
      }
    } catch {
      // Fallback: treat as single property binding
      const currentValue = getNestedValue(context, value);
      attrs[value] = currentValue;
    }
  }
}

/**
 * Process :show directive for conditional display
 * @param value 
 * @param attrs 
 * @param context 
 * @returns 
 */
export function processShowDirective(
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
 * Process :class directive for conditional CSS classes
 * @param value 
 * @param attrs 
 * @param context 
 * @returns 
 */
export function processClassDirective(
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
      .flatMap(([className]) => className.split(/\s+/).filter(Boolean));
  }

  const existingClasses = attrs.class || "";
  const allClasses = existingClasses
    ? `${existingClasses} ${classes.join(" ")}`.trim()
    : classes.join(" ");

  if (allClasses) {
    attrs.class = allClasses;
  }
}

/**
 * Process :style directive for dynamic inline styles
 * @param value 
 * @param attrs 
 * @param context 
 * @returns 
 */
export function processStyleDirective(
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
 * Process directives and return merged props, attrs, and event listeners
 * @param directives 
 * @param context 
 * @param el 
 * @param vnodeAttrs 
 * @returns 
 */
export function processDirectives(
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

/**
 * Assign unique keys to VNodes for efficient rendering
 * @param nodeOrNodes 
 * @param baseKey 
 * @returns 
 */
export function assignKeysDeep(
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
 * @param el 
 * @param oldProps 
 * @param newProps 
 * @param context 
 */
export function patchProps(
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
    } else if (key.startsWith("on")) {
      // DOM-first listener: onClick -> click
      const ev = eventNameFromKey(key);
      const [newHandler, newOptions] = normalizeListenerEntry(newVal);
      const [oldHandler, oldOptions] = normalizeListenerEntry(oldVal);

      if (oldHandler) el.removeEventListener(ev, oldHandler, oldOptions);
      if (newHandler) el.addEventListener(ev, newHandler, newOptions);
      } else if (newVal === undefined || newVal === null || newVal === false) {
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
  const [handler, options] = normalizeListenerEntry(listener);
  if (handler) el.addEventListener(eventType, handler, options);
  }

  const oldAttrs = oldProps.attrs ?? {};
  const newAttrs = mergedAttrs;
  for (const key in { ...oldAttrs, ...newAttrs }) {
    const oldVal = oldAttrs[key];
    const newVal = newAttrs[key];
    if (oldVal !== newVal) {
      if (
        newVal === undefined ||
        newVal === null ||
        newVal === false
      ) el.removeAttribute(key);
      else el.setAttribute(key, String(newVal));
    }
  }
}

/**
 * Create a DOM element from a VNode.
 * @param vnode 
 * @param context 
 * @param refs 
 * @returns 
 */
export function createElement(
  vnode: VNode | string,
  context?: any,
  refs?: VDomRefs
): Node {
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
      const childNode = createElement(child, context);
      frag.appendChild(childNode);
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
    const val = mergedAttrs[key];
    // Only allow valid attribute names (string, not object)
    if (typeof key !== 'string' || /\[object Object\]/.test(key)) {
      if (typeof window !== 'undefined' && window.console) {
        console.warn('Skipping invalid attribute key:', key, val);
      }
      continue;
    }
    if (typeof val === "boolean") {
      if (val) el.setAttribute(key, "");
      // If false, do not set attribute
    } else if (val !== undefined && val !== null) {
      el.setAttribute(key, val);
    }
  }

  // Set props and event listeners
  for (const key in mergedProps) {
    const val = mergedProps[key];
    // Only allow valid attribute names (string, not object)
    if (typeof key !== 'string' || /\[object Object\]/.test(key)) {
      if (typeof window !== 'undefined' && window.console) {
        console.warn('Skipping invalid prop key:', key, val);
      }
      continue;
    }
    if (
      key === "value" &&
      (el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement)
    ) {
      el.value = val ?? "";
    } else if (key === "checked" && el instanceof HTMLInputElement) {
      el.checked = !!val;
    } else if (key.startsWith("on")) {
      const [handler, options] = normalizeListenerEntry(val);
      if (handler) el.addEventListener(eventNameFromKey(key), handler, options);
    } else if (key.startsWith("on") && val === undefined) {
      continue; // skip undefined event handlers
    } else if (val === undefined || val === null || val === false) {
      el.removeAttribute(key);
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

  // Assign ref if present (support both props.ref and props.props.ref)
  const refKey = vnode.props?.ref ?? (vnode.props?.props && vnode.props.props.ref);
  if (typeof vnode !== "string" && refKey && refs) {
    refs[refKey] = el as HTMLElement;
  }

  // Append children
  if (Array.isArray(vnode.children)) {
    for (const child of vnode.children) {
      el.appendChild(createElement(child, context, refs));
    }
  } else if (typeof vnode.children === "string") {
    el.textContent = vnode.children;
  }

  return el;
}

/**
 * Patch children using keys for node matching.
 * @param parent 
 * @param oldChildren 
 * @param newChildren 
 * @param context 
 * @param refs 
 * @returns 
 */
export function patchChildren(
  parent: HTMLElement,
  oldChildren: VNode[] | string | undefined,
  newChildren: VNode[] | string | undefined,
  context?: any,
  refs?: VDomRefs
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
        refs
      );
      usedNodes.add(node);
      if (node !== nextSibling && parent.contains(node)) {
        if (nextSibling && !parent.contains(nextSibling)) nextSibling = null;
        parent.insertBefore(node, nextSibling);
      }
    } else {
      node = createElement(newVNode, context, refs);
      if (nextSibling && !parent.contains(nextSibling)) nextSibling = null;
      parent.insertBefore(node, nextSibling);
      usedNodes.add(node);
    }

    nextSibling = node.nextSibling;
  }

  // Remove unused nodes
  for (const node of oldNodes) {
    if (!usedNodes.has(node) && parent.contains(node)) {
      cleanupRefs(node, refs);
      parent.removeChild(node);
    }
  }
}

/**
 * Patch a node using keys for node matching.
 * @param dom 
 * @param oldVNode 
 * @param newVNode 
 * @param context 
 * @param refs 
 * @returns 
 */
export function patch(
  dom: Node,
  oldVNode: VNode | string | null,
  newVNode: VNode | string | null,
  context?: any,
  refs?: VDomRefs
): Node {
  if (oldVNode && typeof oldVNode !== "string" && oldVNode.props?.ref && refs) {
    cleanupRefs(dom, refs); // Clean up old ref and descendants
  }

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
      const childNode = createElement(child, context);
      frag.appendChild(childNode);
    }
    frag.appendChild(end);
    dom.parentNode?.replaceChild(frag, dom);
    return start;
  }

  if (!newVNode) {
    cleanupRefs(dom, refs);
    const placeholder = document.createComment("removed");
    dom.parentNode?.replaceChild(placeholder, dom);
    return placeholder;
  }

  if (!oldVNode || typeof oldVNode === "string") {
    cleanupRefs(dom, refs);
    const newEl = createElement(newVNode, context, refs);
    if (typeof newVNode !== "string" && newVNode.props?.ref && refs) {
      refs[newVNode.props.ref] = newEl as HTMLElement; // Assign new ref
    }
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
    patchChildren(el, oldVNode.children, newVNode.children, context, refs); // <-- Pass refs
    if (typeof newVNode !== "string" && newVNode.props?.ref && refs) {
      refs[newVNode.props.ref] = el; // Assign ref
    }
    return el;
  }

  cleanupRefs(dom, refs);
  const newEl = createElement(newVNode, context, refs);
  if (typeof newVNode !== "string" && newVNode.props?.ref && refs) {
    refs[newVNode.props.ref] = newEl as HTMLElement;
  }
  dom.parentNode?.replaceChild(newEl, dom);
  return newEl;
}

/**
 * Virtual DOM renderer.
 * @param root The root element to render into.
 * @param vnodeOrArray The virtual node or array of virtual nodes to render.
 * @param context The context to use for rendering.
 * @param refs The refs to use for rendering.
 */
export function vdomRenderer(
  root: ShadowRoot,
  vnodeOrArray: VNode | VNode[],
  context?: any,
  refs?: VDomRefs
) {
  let newVNode: VNode;
  if (Array.isArray(vnodeOrArray)) {
    if (vnodeOrArray.length === 1) {
      newVNode = vnodeOrArray[0];
      if (newVNode && typeof newVNode === "object" && newVNode.key == null) {
        newVNode = { ...newVNode, key: "__root__" };
      }
    } else {
      newVNode = { tag: "div", key: "__root__", children: vnodeOrArray };
    }
  } else {
    newVNode = vnodeOrArray;
    if (newVNode && typeof newVNode === "object" && newVNode.key == null) {
      newVNode = { ...newVNode, key: "__root__" };
    }
  }

  // If the root is an AnchorBlock, wrap it in a real element for DOM insertion
  if (newVNode && typeof newVNode === "object" && newVNode.tag === "#anchor") {
    newVNode = {
      tag: "div",
      key: "__anchor_root__",
      props: { attrs: { 'data-anchor-block-root': '', key: "__anchor_root__" } },
      children: [newVNode]
    };
  }

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
      newDom = patch(prevDom, prevVNode, newVNode, context, refs);
    } else {
      newDom = createElement(newVNode, context, refs);
      root.replaceChild(newDom, prevDom);
    }
  } else {
    newDom = createElement(newVNode, context, refs);
    if (root.firstChild) root.replaceChild(newDom, root.firstChild);
    else root.appendChild(newDom);
  }

  // Remove any extra nodes, but preserve style elements
  const nodesToRemove: Node[] = [];
  for (let i = 0; i < root.childNodes.length; i++) {
    const node = root.childNodes[i];
    if (node !== newDom && node.nodeName !== "STYLE") {
      cleanupRefs(node, refs);
      nodesToRemove.push(node);
    }
  }
  nodesToRemove.forEach((node) => root.removeChild(node));

  // Update tracked VNode and DOM node
  (root as any)._prevVNode = newVNode;
  (root as any)._prevDom = newDom;
}

/**
 * Render a VNode to a string.
 * @param vnode The virtual node to render.
 * @returns The rendered HTML string.
 */
export function renderToString(vnode: VNode): string {
  if (typeof vnode === "string") return escapeHTML(vnode) as string;

  if (vnode.tag === "#text") {
    return typeof vnode.children === "string" ? escapeHTML(vnode.children) as string : "";
  }

  if (vnode.tag === "#anchor") {
    const children = Array.isArray(vnode.children) ? vnode.children.filter(Boolean) : [];
    return children.map(renderToString).join("");
  }

  // Collect attributes from props.attrs
  let attrsString = "";
  if (vnode.props && vnode.props.attrs) {
    attrsString = Object.entries(vnode.props.attrs)
      .map(([k, v]) => ` ${k}="${escapeHTML(String(v))}"`)
      .join("");
  }

  // Collect other props (excluding attrs, directives, ref, key)
  let propsString = "";
  if (vnode.props) {
    propsString = Object.entries(vnode.props)
      .filter(([k]) => k !== "attrs" && k !== "directives" && k !== "ref" && k !== "key")
      .map(([k, v]) => ` ${k}="${escapeHTML(String(v))}"`)
      .join("");
  }

  const children = Array.isArray(vnode.children)
    ? vnode.children.filter(Boolean).map(renderToString).join("")
    : (typeof vnode.children === "string" ? escapeHTML(vnode.children) : vnode.children ? renderToString(vnode.children) : "");

  return `<${vnode.tag}${attrsString}${propsString}>${children}</${vnode.tag}>`;
}
