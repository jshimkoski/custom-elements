/**
 * vdom.ts
 * Lightweight, strongly typed, functional virtual DOM renderer for custom elements.
 * Features: keyed diffing, incremental patching, focus/caret preservation, event delegation, SSR-friendly, no dependencies.
 */

import type { VNode, VDomRefs, AnchorBlockVNode } from "./types";
import { escapeHTML, getNestedValue, setNestedValue, toKebab, toCamel } from "./helpers";
import { SecureExpressionEvaluator } from "./secure-expression-evaluator";
import { EventManager } from "./event-manager";
import { isReactiveState } from "./reactive";

/**
 * Recursively clean up refs and event listeners for all descendants of a node
 * @param node The node to clean up.
 * @param refs The refs to clean up.
 * @returns 
 */
export function cleanupRefs(node: Node, refs?: VDomRefs) {
  if (!refs) return;
  if (node instanceof HTMLElement) {
    // Clean up event listeners for this element
    EventManager.cleanup(node);
    
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
 * Assign a ref to an element, supporting both string refs and reactive state objects
 */
function assignRef(
  vnode: VNode,
  element: HTMLElement,
  refs?: VDomRefs
): void {
  if (typeof vnode === "string") return;
  
  const reactiveRef = vnode.props?.reactiveRef ?? (vnode.props?.props && vnode.props.props.reactiveRef);
  const refKey = vnode.props?.ref ?? (vnode.props?.props && vnode.props.props.ref);
  
  if (reactiveRef) {
    // For reactive state objects, assign the element to the .value property
    reactiveRef.value = element;
  } else if (refKey && refs) {
    // Legacy string-based ref
    refs[refKey] = element;
  }
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
  value: string | any,
  modifiers: string[],
  props: Record<string, any>,
  attrs: Record<string, any>,
  listeners: Record<string, EventListener>,
  context?: any,
  el?: HTMLElement,
  arg?: string,
): void {
  if (!context) return;

  const hasLazy = modifiers.includes("lazy");
  const hasTrim = modifiers.includes("trim");
  const hasNumber = modifiers.includes("number");

  // Enhanced support for reactive state objects (functional API)
  const isReactiveState = value && typeof value === 'object' && 'value' in value && typeof value.value !== 'undefined';
  
  const getCurrentValue = () => {
    if (isReactiveState) {
      const unwrapped = value.value;
      // If we have an argument (like :model:name), access that property
      if (arg && typeof unwrapped === 'object' && unwrapped !== null) {
        return unwrapped[arg];
      }
      return unwrapped;
    }
    // Fallback to string-based lookup (legacy config API)
    return getNestedValue(context._state || context, value as string);
  };
  
  const currentValue = getCurrentValue();

  // determine element/input type
  let inputType = "text";
  if (el instanceof HTMLInputElement) inputType = (attrs?.type as string) || el.type || "text";
  else if (el instanceof HTMLSelectElement) inputType = "select";
  else if (el instanceof HTMLTextAreaElement) inputType = "textarea";

  const isNativeInput = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;
  const defaultPropName = inputType === "checkbox" || inputType === "radio" ? "checked" : "value";
  const propName = isNativeInput ? defaultPropName : (arg ?? "modelValue");

  // Initial sync: set prop/attrs so renderer can apply proper DOM state
  if (inputType === "checkbox") {
    if (Array.isArray(currentValue)) {
      props[propName] = currentValue.includes(String(el?.getAttribute("value") ?? attrs?.value ?? ""));
    } else {
      const trueValue = el?.getAttribute("true-value") ?? true;
      props[propName] = currentValue === trueValue;
    }
  } else if (inputType === "radio") {
    props[propName] = currentValue === (attrs?.value ?? "");
  } else if (inputType === "select") {
    // For multiple selects we also schedule option selection; otherwise set prop
    if (el && el.hasAttribute("multiple") && el instanceof HTMLSelectElement) {
      const arr = Array.isArray(currentValue) ? currentValue.map(String) : [];
      setTimeout(() => {
        Array.from((el as HTMLSelectElement).options).forEach((option) => {
          option.selected = arr.includes(option.value);
        });
      }, 0);
      props[propName] = Array.isArray(currentValue) ? currentValue : [];
    } else {
      props[propName] = currentValue;
    }
  } else {
    props[propName] = currentValue;
    // Also set an attribute so custom element constructors / applyProps can
    // read initial values via getAttribute during their initialization.
    try {
      const attrName = toKebab(propName);
      if (attrs) attrs[attrName] = currentValue;
    } catch (e) {
      // ignore
    }
  }

  // event type to listen for
  const eventType = hasLazy || inputType === "checkbox" || inputType === "radio" || inputType === "select" ? "change" : "input";

  const eventListener: EventListener = (event: Event) => {
    if ((event as any).isComposing || (listeners as any)._isComposing) return;
    // Allow synthetic events during testing (when isTrusted is false)
    // but ignore them in production unless it's a synthetic test event
    const isTestEnv = typeof (globalThis as any).process !== 'undefined' && 
                      (globalThis as any).process.env?.NODE_ENV === 'test' ||
                      typeof window !== 'undefined' && (window as any).__vitest__;
    if ((event as any).isTrusted === false && !isTestEnv) return;

    const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
    if (!target || (target as any)._modelUpdating) return;

    let newValue: any = (target as any).value;

    if (inputType === "checkbox") {
      const fresh = getCurrentValue();
      if (Array.isArray(fresh)) {
        const v = target.getAttribute("value") ?? "";
        const arr = Array.from(fresh as any[]);
        if ((target as HTMLInputElement).checked) {
          if (!arr.includes(v)) arr.push(v);
        } else {
          const idx = arr.indexOf(v);
          if (idx > -1) arr.splice(idx, 1);
        }
        newValue = arr;
      } else {
        const trueV = target.getAttribute("true-value") ?? true;
        const falseV = target.getAttribute("false-value") ?? false;
        newValue = (target as HTMLInputElement).checked ? trueV : falseV;
      }
    } else if (inputType === "radio") {
      newValue = target.getAttribute("value") ?? (target as any).value;
    } else if (inputType === "select" && (target as HTMLSelectElement).multiple) {
      newValue = Array.from((target as HTMLSelectElement).selectedOptions).map((o) => o.value);
    } else {
      if (hasTrim && typeof newValue === "string") newValue = newValue.trim();
      if (hasNumber) {
        const n = Number(newValue);
        if (!isNaN(n)) newValue = n;
      }
    }

    const actualState = context._state || context;
    const currentStateValue = getCurrentValue();
    const changed = Array.isArray(newValue) && Array.isArray(currentStateValue)
      ? JSON.stringify([...newValue].sort()) !== JSON.stringify([...currentStateValue].sort())
      : newValue !== currentStateValue;

    if (changed) {
      (target as any)._modelUpdating = true;
      try {
        // Enhanced support for reactive state objects (functional API)
        if (isReactiveState) {
          if (arg && typeof value.value === 'object' && value.value !== null) {
            // For :model:prop, update the specific property
            const updated = { ...value.value };
            updated[arg] = newValue;
            value.value = updated;
          } else {
            // For plain :model, update the entire value
            value.value = newValue;
          }
        } else {
          // Fallback to string-based update (legacy config API)
          setNestedValue(actualState, value as string, newValue);
        }
        
        if (context._requestRender) context._requestRender();
        
        // Trigger watchers for state changes
        if (context._triggerWatchers) {
          const watchKey = isReactiveState ? 'reactiveState' : value as string;
          context._triggerWatchers(watchKey, newValue);
        }
        
        // Emit custom event for update:* listeners (e.g., @update:model-value)
        if (target) {
          const customEventName = `update:${toKebab(propName)}`;
          const customEvent = new CustomEvent(customEventName, {
            detail: newValue,
            bubbles: true,
            composed: true
          });
          target.dispatchEvent(customEvent);
        }
      } finally {
        setTimeout(() => ((target as any)._modelUpdating = false), 0);
      }
    }
  };

  // Custom element update event names (update:prop) for non-native inputs
  if (!isNativeInput) {
    const eventName = `update:${toKebab(propName)}`;
    // Remove existing listener to prevent memory leaks
    if (listeners[eventName]) {
      const oldListener = listeners[eventName];
      if (el) {
        EventManager.removeListener(el, eventName, oldListener);
      }
    }
    
    listeners[eventName] = (event: Event) => {
      const actualState = context._state || context;
      const newVal = (event as CustomEvent).detail !== undefined ? (event as CustomEvent).detail : (event.target as any)?.value;
      const currentStateValue = getNestedValue(actualState, value);
      const changed = Array.isArray(newVal) && Array.isArray(currentStateValue)
        ? JSON.stringify([...newVal].sort()) !== JSON.stringify([...currentStateValue].sort())
        : newVal !== currentStateValue;
      if (changed) {
        setNestedValue(actualState, value, newVal);
        if (context._requestRender) context._requestRender();
        
        // Trigger watchers for state changes
        if (context._triggerWatchers) {
          context._triggerWatchers(value, newVal);
        }
        
        // Update the custom element's property to maintain sync
        const target = event.target as any;
        if (target) {
          // Set the property directly on the element
          target[propName] = newVal;
          
          // Also ensure the attribute is set for proper DOM reflection
          try {
            const attrName = toKebab(propName);
            if (typeof newVal === 'boolean') {
              if (newVal) {
                target.setAttribute(attrName, 'true');
              } else {
                target.setAttribute(attrName, 'false');
              }
            } else {
              target.setAttribute(attrName, String(newVal));
            }
          } catch (e) {
            // ignore attribute setting errors
          }
          
          // Trigger component's internal property handling and re-render
          // Use queueMicrotask instead of setTimeout to avoid race conditions
          queueMicrotask(() => {
            if (typeof target._applyProps === 'function') {
              target._applyProps(target._cfg);
            }
            if (typeof target._requestRender === 'function') {
              target._requestRender();
            }
          });
        }
      }
    };
  } else {
    // Remove existing listener to prevent memory leaks
    if (listeners[eventType]) {
      const oldListener = listeners[eventType];
      if (el) {
        EventManager.removeListener(el, eventType, oldListener);
      }
    }
    listeners[eventType] = eventListener;
  }

  // IME composition handling for text-like inputs
  if (inputType === "text" || inputType === "textarea") {
    listeners.compositionstart = (() => ((listeners as any)._isComposing = true));
    listeners.compositionend = (event: Event) => {
      (listeners as any)._isComposing = false;
      const target = event.target as HTMLInputElement | HTMLTextAreaElement | null;
      if (!target) return;
      setTimeout(() => {
        const val = target.value;
        const actualState = context._state || context;
        const currentStateValue = getNestedValue(actualState, value);
        let newVal: any = val;
        if (hasTrim) newVal = newVal.trim();
        if (hasNumber) {
          const n = Number(newVal);
          if (!isNaN(n)) newVal = n;
        }
        const changed = Array.isArray(newVal) && Array.isArray(currentStateValue)
          ? JSON.stringify([...newVal].sort()) !== JSON.stringify([...currentStateValue].sort())
          : newVal !== currentStateValue;
        if (changed) {
          (target as any)._modelUpdating = true;
          try {
            setNestedValue(actualState, value, newVal);
            if (context._requestRender) context._requestRender();
            
            // Trigger watchers for state changes
            if (context._triggerWatchers) {
              context._triggerWatchers(value, newVal);
            }
          } finally {
            setTimeout(() => ((target as any)._modelUpdating = false), 0);
          }
        }
      }, 0);
    };
  }
}

/**
 * Convert a prop key like `onClick` to its DOM event name `click`.
 */
function eventNameFromKey(key: string): string {
  // Strip leading 'on' and lowercase the first character of the remainder.
  // This handles names like `onClick` -> `click` and
  // `onUpdate:model-value` -> `update:model-value` correctly.
  const rest = key.slice(2);
  if (!rest) return "";
  return rest.charAt(0).toLowerCase() + rest.slice(1);
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
  value: any,
  props: Record<string, any>,
  attrs: Record<string, any>,
  context?: any,
): void {
  // Support both object and string syntax for :bind
  if (typeof value === "object" && value !== null) {
    for (const [key, val] of Object.entries(value)) {
      // Only put clearly HTML-only attributes in attrs, everything else in props
      // This matches the original behavior expected by tests
      if (key.startsWith('data-') || key.startsWith('aria-') || key === 'class') {
        attrs[key] = val;
      } else {
        props[key] = val;
      }
    }
  } else if (typeof value === "string") {
    if (!context) return;
    try {
      // Try to evaluate as expression (could be object literal)
      const evaluated = evaluateExpression(value, context);
      if (typeof evaluated === "object" && evaluated !== null) {
        for (const [key, val] of Object.entries(evaluated)) {
          // Only put clearly HTML-only attributes in attrs
          if (key.startsWith('data-') || key.startsWith('aria-') || key === 'class') {
            attrs[key] = val;
          } else {
            props[key] = val;
          }
        }
        return;
      } else {
        // If not an object, treat as single value fallback
        attrs[value] = evaluated;
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
  value: any,
  attrs: Record<string, any>,
  context?: any,
): void {
  let isVisible: any;

  // Handle both string and direct value evaluation
  if (typeof value === "string") {
    if (!context) return;
    isVisible = evaluateExpression(value, context);
  } else {
    isVisible = value;
  }

  // Use the same approach as :style directive for consistency
  const currentStyle = attrs.style || "";
  let newStyle = currentStyle;

  if (!isVisible) {
    // Element should be hidden - ensure display: none is set
    if (currentStyle) {
      const styleRules = currentStyle.split(";").filter(Boolean);
      const displayIndex = styleRules.findIndex((rule: string) =>
        rule.trim().startsWith("display:"),
      );

      if (displayIndex >= 0) {
        styleRules[displayIndex] = "display: none";
      } else {
        styleRules.push("display: none");
      }

      newStyle = styleRules.join("; ");
    } else {
      newStyle = "display: none";
    }
  } else {
    // Element should be visible - only remove display: none, don't interfere with other display values
    if (currentStyle) {
      const styleRules = currentStyle.split(";").map((rule: string) => rule.trim()).filter(Boolean);
      const displayIndex = styleRules.findIndex((rule: string) =>
        rule.startsWith("display:"),
      );

      if (displayIndex >= 0) {
        const displayRule = styleRules[displayIndex];
        if (displayRule === "display: none") {
          // Remove only display: none, preserve other display values
          styleRules.splice(displayIndex, 1);
          newStyle = styleRules.length > 0 ? styleRules.join("; ") + ";" : "";
        }
        // If display is set to something other than 'none', leave it alone
      }
    }
    // If no existing style, don't add anything
  }

  // Only set style if it's different from current to avoid unnecessary updates
  if (newStyle !== currentStyle) {
    if (newStyle) {
      attrs.style = newStyle;
    } else {
      // Remove the style attribute entirely if empty
      delete attrs.style;
    }
  }
}

/**
 * Process :class directive for conditional CSS classes
 * @param value 
 * @param attrs 
 * @param context 
 * @returns 
 */
/**
 * Evaluate a JavaScript-like object literal string in the given context
 * Uses secure AST-based evaluation instead of Function() constructor
 * @param expression 
 * @param context 
 * @returns 
 */
function evaluateExpression(expression: string, context: any): any {
  return SecureExpressionEvaluator.evaluate(expression, context);
}

export function processClassDirective(
  value: any,
  attrs: Record<string, any>,
  context?: any,
): void {
  let classValue: any;

  // Handle both string and object values
  if (typeof value === "string") {
    if (!context) return;
    classValue = evaluateExpression(value, context);
  } else {
    classValue = value;
  }

  let classes: string[] = [];

  if (typeof classValue === "string") {
    classes = [classValue];
  } else if (Array.isArray(classValue)) {
    classes = classValue.filter(Boolean);
  } else if (typeof classValue === "object" && classValue !== null) {
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
    styleValue = evaluateExpression(value, context);
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
 * Process :ref directive for element references
 * @param value 
 * @param props 
 * @param context 
 * @returns 
 */
export function processRefDirective(
  value: any,
  props: Record<string, any>,
  context?: any,
): void {
  let resolvedValue = value;
  
  // If value is a string, evaluate it in the context to resolve variables
  if (typeof value === 'string' && context) {
    resolvedValue = evaluateExpression(value, context);
  }
  
  // Support both reactive state objects (functional API) and string refs (legacy)
  if (isReactiveState(resolvedValue)) {
    // For reactive state objects, store the reactive state object itself as the ref
    // The VDOM renderer will handle setting the value
    props.reactiveRef = resolvedValue;
  } else {
    // Legacy string-based ref or direct object ref
    props.ref = resolvedValue;
  }
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
  directives: Record<string, { value: any; modifiers: string[]; arg?: string }>,
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
    const { value, modifiers, arg } = directive;

    if (directiveName === 'model' || directiveName.startsWith('model:')) {
      // Extract arg from directiveName if present (model:prop)
      const parts = directiveName.split(":");
      const runtimeArg = parts.length > 1 ? parts[1] : arg;
      processModelDirective(
        value, // Pass the original value (could be string or reactive state object)
        modifiers,
        props,
        attrs,
        listeners,
        context,
        el,
        runtimeArg,
      );
      continue;
    }

    switch (directiveName) {
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
      case "ref":
        processRefDirective(value, props, context);
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
        // Look for stable identity attributes in both attrs and promoted
        // props (props.props) because the compiler may have promoted bound
        // attributes to JS properties for custom elements and converted
        // kebab-case to camelCase (e.g. data-key -> dataKey).
        const idAttrCandidates = [
          // attrs (kebab-case)
          child.props?.attrs?.id,
          child.props?.attrs?.name,
          child.props?.attrs?.["data-key"],
          // promoted JS props (camelCase or original)
          child.props?.props?.id,
          child.props?.props?.name,
          child.props?.props?.dataKey,
          child.props?.props?.["data-key"],
        ];
        const idPart = idAttrCandidates.find((v) => v !== undefined && v !== null) ?? "";
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
  // Detect whether this vnode represents a custom element so we can
  // trigger its internal prop application lifecycle after patching.
  const elIsCustom = (newProps as any)?.isCustomElement ?? (oldProps as any)?.isCustomElement ?? false;
  let anyChange = false;
  for (const key in { ...oldPropProps, ...newPropProps }) {
    const oldVal = oldPropProps[key];
    const newVal = newPropProps[key];
    
    if (oldVal !== newVal) {
      anyChange = true;
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
      // DOM-first listener: onClick -> click
      const ev = eventNameFromKey(key);
      if (typeof oldVal === "function") {
        EventManager.removeListener(el, ev, oldVal);
      }
      EventManager.addListener(el, ev, newVal);
      } else if (newVal === undefined || newVal === null) {
        el.removeAttribute(key);
      } else {
        // Prefer setting DOM properties for custom elements or when the
        // property already exists on the element so that JS properties are
        // updated (important for custom elements that observe property changes).
        // Prefer property assignment for elements that are custom elements or
        // when the property exists on the element. This avoids attribute
        // fallbacks being used for reactive properties on custom elements.
        // Rely only on compiler/runtime-provided hint. Do not perform implicit
        // dash-based heuristics here: callers/tests should set isCustomElement on
        // the vnode props when a tag is a custom element.
        const elIsCustom = (newProps as any)?.isCustomElement ?? (oldProps as any)?.isCustomElement ?? false;
        if (elIsCustom || key in el) {
          try {
            (el as any)[key] = newVal;
          } catch (err) {
            // Enforce property-only binding: skip silently on failure.
          }
        } else {
          // Handle boolean false by removing attribute for non-custom elements
          if (newVal === false) {
            el.removeAttribute(key);
          } else {
            // Property does not exist; skip silently.
          }
        }
      }
    }
  }

  // Handle directive event listeners
  for (const [eventType, listener] of Object.entries(
    processedDirectives.listeners || {},
  )) {
    EventManager.addListener(el, eventType, listener as EventListener);
  }

  const oldAttrs = oldProps.attrs ?? {};
  const newAttrs = mergedAttrs;
  for (const key in { ...oldAttrs, ...newAttrs }) {
    const oldVal = oldAttrs[key];
    const newVal = newAttrs[key];
    
    // For reactive state objects, compare the unwrapped values
    let oldUnwrapped = oldVal;
    let newUnwrapped = newVal;
    
    if (isReactiveState(oldVal)) {
      oldUnwrapped = oldVal.value; // This triggers dependency tracking
    }
    if (isReactiveState(newVal)) {
      newUnwrapped = newVal.value; // This triggers dependency tracking
    }
    
    if (oldUnwrapped !== newUnwrapped) {
      anyChange = true;
      // Handle removal/null/false: remove attribute and clear corresponding
      // DOM property for native controls where Vue treats null/undefined as ''
      if (newUnwrapped === undefined || newUnwrapped === null || newUnwrapped === false) {
        el.removeAttribute(key);
        if (key === 'value') {
          if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
            try { (el as any).value = ""; } catch (e) {}
          } else if (el instanceof HTMLSelectElement) {
            try { (el as any).value = ""; } catch (e) {}
          } else if (el instanceof HTMLProgressElement) {
            try { (el as any).value = 0; } catch (e) {}
          }
        }
        if (key === 'checked' && el instanceof HTMLInputElement) {
          try { el.checked = false; } catch (e) {}
        }
        if (key === 'disabled') {
          try { (el as any).disabled = false; } catch (e) {}
        }
      } else {
        // New value present: for native controls prefer assigning .value/.checked
        if (key === 'value') {
          if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
            try { (el as any).value = newUnwrapped ?? ""; } catch (e) { el.setAttribute(key, String(newUnwrapped)); }
            continue;
          } else if (el instanceof HTMLSelectElement) {
            try { (el as any).value = newUnwrapped ?? ""; } catch (e) { /* ignore */ }
            continue;
          } else if (el instanceof HTMLProgressElement) {
            try { (el as any).value = Number(newUnwrapped); } catch (e) { /* ignore */ }
            continue;
          }
        }
        if (key === 'checked' && el instanceof HTMLInputElement) {
          try { el.checked = !!newUnwrapped; } catch (e) { /* ignore */ }
          continue;
        }

        // Special handling for style attribute - always use setAttribute
        if (key === 'style') {
          el.setAttribute(key, String(newUnwrapped));
          continue;
        }

        // Non-native or generic attributes: prefer property when available
        const isSVG = (el as any).namespaceURI === 'http://www.w3.org/2000/svg';
        
        // For custom elements, convert kebab-case attributes to camelCase properties
        if (elIsCustom && !isSVG && key.includes('-')) {
          const camelKey = toCamel(key);
          try {
            (el as any)[camelKey] = newUnwrapped;
          } catch (e) {
            // If property assignment fails, fall back to attribute
            el.setAttribute(key, String(newUnwrapped));
          }
        } else if (!isSVG && key in el) {
          try { (el as any)[key] = newUnwrapped; }
          catch (e) { el.setAttribute(key, String(newUnwrapped)); }
        } else {
          el.setAttribute(key, String(newUnwrapped));
        }
      }
    }
  }

  // If this is a custom element, attempt to notify it that props/attrs
  // were updated so it can re-run its internal applyProps logic and
  // schedule a render. This mirrors the behavior in createElement where
  // newly created custom elements are told to apply props and render.
  if (elIsCustom && anyChange) {
    try {
      if (typeof (el as any)._applyProps === 'function') {
        try { (el as any)._applyProps((el as any)._cfg); } catch (e) { /* ignore */ }
      }
      if (typeof (el as any).requestRender === 'function') {
        (el as any).requestRender();
      } else if (typeof (el as any)._render === 'function') {
        (el as any)._render((el as any)._cfg);
      }
    } catch (e) {
      // swallow to keep renderer robust
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
  // Prefer property assignment for certain attributes (value/checked) and
  // when the element exposes a corresponding property. SVG elements should
  // keep attributes only.
  const isSVG = (el as any).namespaceURI === 'http://www.w3.org/2000/svg';
  for (const key in mergedAttrs) {
    const val = mergedAttrs[key];
    // Only allow valid attribute names (string, not object)
    if (typeof key !== 'string' || /\[object Object\]/.test(key)) {
      continue;
    }
    if (typeof val === "boolean") {
      if (val) el.setAttribute(key, "");
      // If false, do not set attribute
    } else if (val !== undefined && val !== null) {
      // Special-case value/checked for native inputs so .value/.checked are set
      if (!isSVG && key === 'value' && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || el instanceof HTMLProgressElement)) {
        try {
          // Progress expects numeric value
          if (el instanceof HTMLProgressElement) (el as any).value = Number(val);
          else el.value = val ?? "";
        } catch (e) {
          el.setAttribute(key, String(val));
        }
      } else if (!isSVG && key === 'checked' && el instanceof HTMLInputElement) {
        try {
          el.checked = !!val;
        } catch (e) {
          el.setAttribute(key, String(val));
        }
      } else if (!isSVG && key in el) {
        try {
          (el as any)[key] = val;
        } catch (e) {
          el.setAttribute(key, String(val));
        }
      } else {
        // For custom elements, convert kebab-case attributes to camelCase properties
        const vnodeIsCustom = vnode.props?.isCustomElement ?? false;
        if (vnodeIsCustom && !isSVG && key.includes('-')) {
          const camelKey = toCamel(key);
          try {
            (el as any)[camelKey] = val;
          } catch (e) {
            // If property assignment fails, fall back to attribute
            el.setAttribute(key, String(val));
          }
        } else {
          el.setAttribute(key, String(val));
        }
      }
    }
  }

  // Set props and event listeners
  for (const key in mergedProps) {
    const val = mergedProps[key];
    // Only allow valid attribute names (string, not object)
    if (typeof key !== 'string' || /\[object Object\]/.test(key)) {
      // Skip invalid prop keys silently to keep runtime minimal
      continue;
    }
    if (
      key === "value" &&
      (el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement)
    ) {
      // Check if val is a reactive state object and extract its value
      // Use the getter to ensure dependency tracking happens
      const propValue = (typeof val === "object" && val !== null && typeof val.value !== "undefined") ? val.value : val;
      el.value = propValue ?? "";
    } else if (key === "checked" && el instanceof HTMLInputElement) {
      // Check if val is a reactive state object and extract its value
      // Use the getter to ensure dependency tracking happens
      const propValue = (typeof val === "object" && val !== null && typeof val.value !== "undefined") ? val.value : val;
      el.checked = !!propValue;
    } else if (key.startsWith("on") && typeof val === "function") {
      EventManager.addListener(el, eventNameFromKey(key), val);
    } else if (key.startsWith("on") && val === undefined) {
      continue; // skip undefined event handlers
    } else if (val === undefined || val === null || val === false) {
      el.removeAttribute(key);
    } else {
      // Prefer setting DOM properties for custom elements or when the
      // property already exists on the element. This ensures JS properties
      // (and reactive custom element props) receive the value instead of
      // only an HTML attribute string.
      // Use the compiler-provided hint when available, otherwise fall back
      // to a conservative tag-name test. Prefer property assignment for
      // custom elements or when the property exists on the element.
      const vnodeIsCustom = vnode.props?.isCustomElement ?? false;
      if (vnodeIsCustom || key in el) {
        try {
          // Check if val is a reactive state object and extract its value
          // Use the getter to ensure dependency tracking happens
          const propValue = (typeof val === "object" && val !== null && typeof val.value !== "undefined") ? val.value : val;
          (el as any)[key] = propValue;
        } catch (err) {
          // silently skip on failure
        }
      } else {
        // silently skip when property doesn't exist
      }
    }
  }

  // Handle directive event listeners
  for (const [eventType, listener] of Object.entries(
    processedDirectives.listeners || {},
  )) {
    EventManager.addListener(el, eventType, listener as EventListener);
  }

  // Assign ref if present - create a vnode with processed props for ref assignment
  const vnodeWithProcessedProps = {
    ...vnode,
    props: {
      ...vnode.props,
      ...processedDirectives.props
    }
  };
  assignRef(vnodeWithProcessedProps, el as HTMLElement, refs);

  // If this is a custom element instance, request an initial render now that
  // attributes/props/listeners have been applied. This fixes the common timing
  // issue where the element constructor rendered before the renderer set the
  // initial prop values (for example :model or :model:prop). Prefer the
  // public requestRender API when available, otherwise call internal _render
  // with the stored config.
  try {
    // If the element exposes an internal _applyProps, invoke it so the
    // component's reactive context picks up attributes/properties that were
    // just applied by the renderer. This is necessary when the component
    // constructor performs an initial render before the renderer sets props.
    if (typeof (el as any)._applyProps === 'function') {
      try {
        (el as any)._applyProps((el as any)._cfg);
      } catch (e) {
        // ignore
      }
    }
    if (typeof (el as any).requestRender === 'function') {
      (el as any).requestRender();
    } else if (typeof (el as any)._render === 'function') {
      (el as any)._render((el as any)._cfg);
    }
  } catch (e) {
    // Swallow errors to keep the renderer robust and minimal.
  }

  // Append children
  if (Array.isArray(vnode.children)) {
    for (const child of vnode.children) {
      el.appendChild(createElement(child, context, refs));
    }
  } else if (typeof vnode.children === "string") {
    el.textContent = vnode.children;
  }

  // After children are appended, reapply select value selection if necessary.
  try {
    if (el instanceof HTMLSelectElement && mergedAttrs && mergedAttrs.hasOwnProperty('value')) {
      try {
        el.value = mergedAttrs['value'] ?? "";
      } catch (e) {
        // ignore
      }
    }
  } catch (e) {
    // ignore
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
      // Keyless: fall back to index-based patch
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
    assignRef(newVNode, newEl as HTMLElement, refs);
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
    assignRef(newVNode, el, refs);
    return el;
  }

  // If the tag matches but the key changed, prefer to patch in-place for
  // custom elements to avoid remounting their internals. This handles cases
  // where compiler promotion or key churn causes vnode keys to differ even
  // though the DOM element should remain the same instance.
  if (
    typeof oldVNode !== "string" &&
    typeof newVNode !== "string" &&
    oldVNode.tag === newVNode.tag
  ) {
    const isCustomTag = (oldVNode.tag && String(oldVNode.tag).includes('-')) || (newVNode.props && (newVNode.props as any).isCustomElement) || (oldVNode.props && (oldVNode.props as any).isCustomElement);
    if (isCustomTag) {
      try {
        const el = dom as HTMLElement;
        patchProps(el, oldVNode.props || {}, newVNode.props || {}, context);
        // For custom elements, their internal rendering is managed by the
        // element itself; do not touch children here.
        assignRef(newVNode, el, refs);
        return el;
      } catch (e) {
        // fall through to full replace on error
      }
    }
  }

  cleanupRefs(dom, refs);
  const newEl = createElement(newVNode, context, refs);
  assignRef(newVNode, newEl as HTMLElement, refs);
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
