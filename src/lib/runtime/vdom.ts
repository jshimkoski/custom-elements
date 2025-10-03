/**
 * vdom.ts
 * Lightweight, strongly typed, functional virtual DOM renderer for custom elements.
 * Features: keyed diffing, incremental patching, focus/caret preservation, event delegation, SSR-friendly, no dependencies.
 */

import type { VNode, VDomRefs, AnchorBlockVNode } from "./types";
import { escapeHTML, getNestedValue, setNestedValue, toKebab, toCamel, safe } from "./helpers";
import { SecureExpressionEvaluator } from "./secure-expression-evaluator";
import { EventManager } from "./event-manager";
import { isReactiveState } from "./reactive";
import {
  hasValueChanged,
  updateStateValue,
  triggerStateUpdate,
  emitUpdateEvents,
  syncElementWithState,
  getCurrentStateValue
} from "./vdom-model-helpers";
import { performEnterTransition, performLeaveTransition } from "./transition-utils";
import { devError } from "./logger";

/**
 * Helper: determine whether an element is a native form control we treat
 * specially for boolean-like attributes (disabled, checked, value).
 */
function isNativeControl(el?: any): el is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement {
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLSelectElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLButtonElement
  );
}

/**
 * Coerce a value to a boolean for native DOM controls.
 * Treat empty string and literal 'true' as true, 'false' as false,
 * unwrap reactive-like wrappers and fall back to Boolean(value).
 */
function coerceBooleanForNative(val: any): boolean {
  // Explicit empty-string => presence boolean true (attribute presence)
  if (val === '') return true;

  // Strings: treat 'true'/'false' specially, otherwise non-empty string is presence
  if (typeof val === 'string') {
    if (val === 'false') return false;
    if (val === 'true') return true;
    return val !== '';
  }

  // Objects: only treat known reactive wrappers as booleans by unwrapping
  if (val && typeof val === 'object') {
    if (isReactiveState(val)) return !!(val as any).value;
    if ('value' in val) return !!(val as any).value;
    // Defensive: do not coerce arbitrary objects (including proxies) to true
    // as they may represent rich prop wrappers (useProps proxy, etc.).
    return false;
  }

  // Fallback for primitives (number, boolean, etc.)
  return !!val;
}

/**
 * Recursively clean up refs and event listeners for all descendants of a node
 * @param node The node to clean up.
 * @param refs The refs to clean up.
 * @returns 
 */
export function cleanupRefs(node: Node, refs?: VDomRefs) {
  if (!refs || !(node instanceof HTMLElement)) return;
  
  // Clean up event listeners for this element
  EventManager.cleanup(node);
  
  // Clean up refs
  for (const refKey in refs) {
    if (refs[refKey] === node) {
      delete refs[refKey];
    }
  }
  
  // Clean up child nodes
  const children = node.childNodes;
  for (let i = 0; i < children.length; i++) {
    cleanupRefs(children[i], refs);
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
      // If this is a native input and an arg was provided (e.g. :model:name),
      // we should bind the nested property to the input's value.
      if (arg && el && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) {
        if (typeof unwrapped === 'object' && unwrapped !== null) {
          return unwrapped[arg];
        }
      }
      // Otherwise return the full unwrapped value for custom element props
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
    // For custom elements (non-native inputs) prefer assigning the
    // ReactiveState instance itself to the prop so child components that
    // call useProps can detect and unwrap the live ref. For native
    // inputs we must set the unwrapped current value.
    if (!isNativeInput && isReactiveState) {
      props[propName] = value; // pass the ReactiveState instance
    } else {
      props[propName] = currentValue;
    }
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

    const currentStateValue = getCurrentValue();
    const changed = hasValueChanged(newValue, currentStateValue);

    if (changed) {
      (target as any)._modelUpdating = true;
      try {
        updateStateValue(isReactiveState, value, newValue, context, arg);
        triggerStateUpdate(context, isReactiveState, value, newValue);
        
        // Emit custom event for update:* listeners (emit both kebab and camel forms)
        if (target) {
          emitUpdateEvents(target, propName, newValue);
        }
      } finally {
        setTimeout(() => ((target as any)._modelUpdating = false), 0);
      }
    }
  };

  // Custom element update event names (update:prop) for non-native inputs
  if (!isNativeInput) {
    const eventNameKebab = `update:${toKebab(propName)}`;
    const eventNameCamel = `update:${propName}`;
    // Remove existing listeners to prevent memory leaks
    if (listeners[eventNameKebab]) {
      const oldListener = listeners[eventNameKebab];
      if (el) EventManager.removeListener(el, eventNameKebab, oldListener);
    }
    if (listeners[eventNameCamel]) {
      const oldListener = listeners[eventNameCamel];
      if (el) EventManager.removeListener(el, eventNameCamel, oldListener);
    }

    listeners[eventNameKebab] = (event: Event) => {
      const newVal = (event as CustomEvent).detail !== undefined ? (event as CustomEvent).detail : (event.target as any)?.value;
      // Determine current state value depending on reactive-state vs string path
      const currentStateValue = getCurrentStateValue(isReactiveState, value, context, arg);
      const changed = hasValueChanged(newVal, currentStateValue);
      
      if (changed) {
        try { /* nested handler invoked */ } catch(e) {}
        
        updateStateValue(isReactiveState, value, newVal, context, arg);
        triggerStateUpdate(context, isReactiveState, value, newVal);

        // Update the custom element's property to maintain sync
        const target = event.target as any;
        if (target) {
          syncElementWithState(target, propName, isReactiveState ? value : newVal, isReactiveState);
        }
      }
    };
  // primary listener registered
  // If the bound reactive value is an object, also listen for nested
  // update events emitted by the child like `update:name` so the parent
  // can apply the change to the corresponding nested property on the
  // reactive state. This allows children to emit `update:<field>` when
  // they want to update a nested field of a bound object.
  if (isReactiveState && typeof value.value === 'object' && value.value !== null) {
    // Use Reflect.ownKeys to be robust across proxies; filter out internal keys
    let keys: Array<string | symbol> = [];
    try { keys = Reflect.ownKeys(value.value); } catch (e) { keys = Object.keys(value.value); }
    const userKeys = (keys as Array<any>).filter(k => typeof k === 'string' && !String(k).startsWith('_') && k !== 'constructor');
    // preparing nested listeners
    for (const nestedKey of userKeys) {
      const nestedKebab = `update:${toKebab(nestedKey as string)}`;
      const nestedCamel = `update:${nestedKey as string}`;
      // Avoid overwriting the primary handler for the main prop
      // and avoid registering internal keys
      if (listeners[nestedKebab]) continue;
      listeners[nestedKebab] = (event: Event) => {
        const newVal = (event as CustomEvent).detail !== undefined ? (event as CustomEvent).detail : (event.target as any)?.value;
        const currentStateValue = isReactiveState ? (value.value as any)[nestedKey] : getNestedValue(context._state || context, value as string);
        const changed = hasValueChanged(newVal, currentStateValue);
        if (!changed) return;

        // Update the ReactiveState with a shallow copy so reactivity triggers
        if (isReactiveState) {
          const updated = { ...(value.value as any) };
          updated[nestedKey] = newVal;
          value.value = updated;
        } else {
          setNestedValue(context._state || context, value as string, newVal);
        }

        triggerStateUpdate(context, isReactiveState, value, newVal);

        const host = (event.currentTarget as any) || el || (event.target as any);
        if (host) {
          syncElementWithState(host, propName, isReactiveState ? value : newVal, isReactiveState);
        }
      };
        listeners[nestedCamel] = listeners[nestedKebab];
      }
    }
    // Mirror handler under camel name for compatibility
    listeners[eventNameCamel] = listeners[eventNameKebab];
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
        const changed = hasValueChanged(newVal, currentStateValue);
        if (changed) {
          (target as any)._modelUpdating = true;
          try {
            setNestedValue(actualState, value, newVal);
            triggerStateUpdate(context, isReactiveState, value, newVal);
          } finally {
            setTimeout(() => ((target as any)._modelUpdating = false), 0);
          }
        }
      }, 0);
    };
  }
  // processModelDirective listeners prepared
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
  el?: HTMLElement,
): void {
  // Support both object and string syntax for :bind
    if (typeof value === "object" && value !== null) {
    for (const [key, val] of Object.entries(value)) {
      // Only put clearly HTML-only attributes in attrs, everything else in props
      // For native input/select/textarea elements, boolean-like attributes
      // such as `disabled` should be applied as attributes rather than
      // props to avoid placing wrapper/complex values into props which
      // can later be misinterpreted as truthy and disable the control.
      if (key.startsWith('data-') || key.startsWith('aria-') || key === 'class') {
        attrs[key] = val;
  } else if (key === 'disabled' && el && isNativeControl(el)) {
        // For native controls, prefer promoting reactive/wrapper values to props
        // so property assignment keeps a live reference and updates via reactivity.
        // For primitive booleans/strings prefer attrs to avoid placing arbitrary
        // objects into props which can be misinterpreted.
        const isWrapper = val && typeof val === 'object' && 'value' in val;
        const isReactiveVal = (() => {
          try { return isReactiveState(val); } catch (e) { return false; }
        })();
        if (isReactiveVal || isWrapper) {
          props[key] = val;
        } else {
          attrs[key] = val;
        }
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
          // Mirror the object branch handling but we don't have access to
          // the element here; prefer attrs for booleanish disabled when
          // the expression produced primitive booleans or strings.
          if (key.startsWith('data-') || key.startsWith('aria-') || key === 'class') {
            attrs[key] = val;
          } else if (key === 'disabled' && el && isNativeControl(el)) {
            const isWrapper = val && typeof val === 'object' && 'value' in val;
            const isReactiveVal = (() => { try { return isReactiveState(val); } catch(e) { return false; } })();
            if (isReactiveVal || isWrapper) {
              props[key] = val;
            } else {
              attrs[key] = val;
            }
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
    // Object syntax: { className: condition } - optimized without flatMap
    for (const [className, condition] of Object.entries(classValue)) {
      if (condition) {
        classes.push(className);
      }
    }
  }

  const existingClasses = attrs.class || "";
  const classString = classes.join(" ");
  attrs.class = existingClasses
    ? `${existingClasses} ${classString}`.trim()
    : classString;
}

/**
 * Determine whether a value coming from vnode.props should be treated as
 * an explicit boolean-like value for property assignment. This avoids
 * treating empty-string or arbitrary objects as a truthy disabled prop
 * for native controls (we prefer attribute presence in those cases).
 */
function isBooleanishForProps(v: any): boolean {
  // Only treat clear boolean-like values as booleanish for prop preference.
  // Accept explicit booleans, explicit empty-string (attribute presence),
  // and explicit 'true'/'false' strings. Do NOT treat numbers or arbitrary
  // objects as booleanish to avoid accidental truthiness for `disabled`.
  if (v === true || v === false) return true;
  if (v === undefined || v === null) return false;
  const t = typeof v;
  if (t === 'string') return v === '' || v === 'true' || v === 'false';
  try {
    if (v && typeof v === 'object' && 'value' in v) {
      const inner = (v as any).value;
      const it = typeof inner;
      if (it === 'boolean') return true;
      if (it === 'string') return inner === '' || inner === 'true' || inner === 'false';
      return false;
    }
  } catch (e) {}
  return false;
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
        processBindDirective(value, props, attrs, context, el);
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
      case "when":
        // The :when directive is handled during template compilation
        // by wrapping the element in an anchor block
        // This case should not normally be reached, but we handle it gracefully
        break;
      // Add other directive cases here as needed
    }
  }

  // Defensive post-processing: avoid leaving primitive non-wrapper
  // `disabled` values in processed props for native form controls.
  // Some code paths may incorrectly place a primitive boolean/string into
  // props which later becomes authoritative and disables native inputs.
  // To be safe, if `disabled` was placed into props by directives but is
  // a plain primitive (not a ReactiveState or wrapper with `.value`) and
  // the target element is a native input/select/textarea, move it to attrs
  // so the final disabled decision uses attribute/coercion rules instead.
  try {
    const had = Object.prototype.hasOwnProperty.call(props, 'disabled');
  if (had && el && isNativeControl(el)) {
      const candidate = props['disabled'];
      const isWrapper = candidate && typeof candidate === 'object' && 'value' in candidate;
      let isReactiveVal = false;
      try { isReactiveVal = isReactiveState(candidate); } catch (e) { isReactiveVal = false; }
      // If it's NOT reactive/wrapper, prefer attrs to avoid accidental truthiness
  if (!isWrapper && !isReactiveVal) {
        try {
          attrs['disabled'] = candidate;
          delete props['disabled'];
          const w = (globalThis as any) as any;
          if (!w.__VDOM_DISABLED_PROMOTIONS) w.__VDOM_DISABLED_PROMOTIONS = [];
          w.__VDOM_DISABLED_PROMOTIONS.push({ phase: 'bind-directive:postfix-move', location: 'attrs', key: 'disabled', value: candidate, time: Date.now(), stack: (new Error()).stack });
        } catch (e) {
          // ignore
        }
      }
    }
  } catch (e) {}

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

    // For reactive wrapper objects (ReactiveState or { value }), compare
    // their unwrapped inner values so updates trigger even when the
    // wrapper identity stays the same across renders.
    let oldUnwrapped: any = oldVal;
    let newUnwrapped: any = newVal;
    safe(() => {
      if (isReactiveState(oldVal)) oldUnwrapped = (oldVal as any).value;
      else if (oldVal && typeof oldVal === 'object' && 'value' in oldVal) oldUnwrapped = (oldVal as any).value;
    });
    safe(() => {
      if (isReactiveState(newVal)) newUnwrapped = (newVal as any).value;
      else if (newVal && typeof newVal === 'object' && 'value' in newVal) newUnwrapped = (newVal as any).value;
    });

    // Consider changed when either the wrapper identity changed or the
    // inner unwrapped value changed.
    if (oldVal !== newVal && oldUnwrapped === newUnwrapped) {
      // wrapper identity changed but inner value same -> still treat as change
    }

    if (!(oldVal === newVal && oldUnwrapped === newUnwrapped)) {
      anyChange = true;
      if (
        key === "value" &&
        (el instanceof HTMLInputElement ||
          el instanceof HTMLTextAreaElement ||
          el instanceof HTMLSelectElement)
      ) {
        // Unwrap reactive-like wrappers before assigning to .value
        const unwrapped = (typeof newVal === 'object' && newVal !== null && isReactiveState(newVal))
          ? (newVal as any).value
          : (newVal && typeof newVal === 'object' && 'value' in newVal ? (newVal as any).value : newVal);
        if (el.value !== unwrapped) el.value = unwrapped ?? "";
      } else if (key === "checked" && el instanceof HTMLInputElement) {
        const unwrapped = (typeof newVal === 'object' && newVal !== null && isReactiveState(newVal))
          ? (newVal as any).value
          : (newVal && typeof newVal === 'object' && 'value' in newVal ? (newVal as any).value : newVal);
        el.checked = !!unwrapped;
    } else if (key.startsWith("on") && typeof newVal === "function") {
      // DOM-first listener: onClick -> click
      const ev = eventNameFromKey(key);
      if (typeof oldVal === "function") {
        EventManager.removeListener(el, ev, oldVal);
      }
      EventManager.addListener(el, ev, newVal);
      // If this is an update:* handler for a bound object prop, also
      // register nested update:<field> listeners that call the same
      // handler with a shallow-copied object so compiled handlers that
      // expect the full object will work with child-emitted nested events.
      try {
        if (ev && ev.startsWith('update:')) {
          const propName = ev.split(':', 2)[1];
          const propVal = newPropProps[propName];
          // Determine nested keys robustly: if propVal is a ReactiveState,
          // inspect its .value, otherwise inspect the object itself.
          let candidateKeys: string[] = [];
          try {
              if (isReactiveState(propVal)) {
                  const v = (propVal as any).value;
                  candidateKeys = v && typeof v === 'object' ? Object.keys(v) : [];
                } else if (propVal && typeof propVal === 'object') {
                  candidateKeys = Object.keys(propVal);
                }
          } catch (ee) {
            candidateKeys = [];
          }
          // Filter out internal keys
          const userKeys = candidateKeys.filter(k => typeof k === 'string' && !k.startsWith('_') && k !== 'constructor');
          for (const nestedKey of userKeys) {
            const nestedEvent = `update:${nestedKey}`;
            const nestedHandler = (e: Event) => {
              const nestedNew = (e as CustomEvent).detail !== undefined ? (e as CustomEvent).detail : (e.target as any)?.value;
              const current = isReactiveState(propVal) ? ((propVal as any).value || {}) : ((newPropProps[propName] as any) || {});
              const updated = { ...current, [nestedKey]: nestedNew };
              safe(() => { (newVal as any)({ detail: updated } as any); });
            };
            safe(() => { EventManager.addListener(el, nestedEvent, nestedHandler); });
          }
        }
      } catch (e) { /* ignore */ }
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
            // For native form controls, also remove the disabled attribute when setting disabled=false
            // The browser doesn't automatically sync the attribute when the property changes
            if (key === 'disabled' && newVal === false && !elIsCustom && isNativeControl(el)) {
              el.removeAttribute('disabled');
            }
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
    try {
      const parentEl = el && (el.parentElement as HTMLElement | null);
      if (parentEl && parentEl !== el) {
        EventManager.addListener(parentEl, eventType, listener as EventListener);
      }
    } catch (e) {}
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
        safe(() => { el.removeAttribute(key); });

        // Clear value for native controls when value is removed
        if (key === 'value') {
          if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
            safe(() => { (el as any).value = ""; });
          } else if (el instanceof HTMLSelectElement) {
            safe(() => { (el as any).value = ""; });
          } else if (el instanceof HTMLProgressElement) {
            safe(() => { (el as any).value = 0; });
          }
        }

        // Clear checked for checkbox/radio
        if (key === 'checked' && el instanceof HTMLInputElement) {
          safe(() => { el.checked = false; });
        }

        // Ensure disabled property is unset for native controls
        if (key === 'disabled' && isNativeControl(el)) {
          safe(() => { (el as any).disabled = false; });
        }
      } else {
        // New value present: for native controls prefer assigning .value/.checked
        if (key === 'value') {
          if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
            safe(() => { (el as any).value = newUnwrapped ?? ""; });
            continue;
          } else if (el instanceof HTMLSelectElement) {
            safe(() => { (el as any).value = newUnwrapped ?? ""; });
            continue;
          } else if (el instanceof HTMLProgressElement) {
            safe(() => { (el as any).value = Number(newUnwrapped); });
            continue;
          }
        }
        if (key === 'checked' && el instanceof HTMLInputElement) {
          safe(() => { el.checked = !!newUnwrapped; });
          continue;
        }

        // Special handling for style attribute - always use setAttribute
        if (key === 'style') {
          el.setAttribute(key, String(newUnwrapped));
          continue;
        }

        // Defensive handling for disabled when a new value is present
        if (key === 'disabled' && isNativeControl(el)) {
          safe(() => { (el as any).disabled = coerceBooleanForNative(newUnwrapped); });
          if (!coerceBooleanForNative(newUnwrapped)) safe(() => { el.removeAttribute(key); });
          else safe(() => { el.setAttribute(key, ''); });
          continue;
        }

        // Non-native or generic attributes: prefer property when available
        const isSVG = (el as any).namespaceURI === 'http://www.w3.org/2000/svg';
        
        // For custom elements, convert kebab-case attributes to camelCase properties
        // and prefer assigning ReactiveState instances directly to element
        // properties so child components that call useProps receive the
        // live ReactiveState (with .value) instead of a stale plain object.
        if (elIsCustom && !isSVG && key.includes('-')) {
          const camelKey = toCamel(key);
          try {
            if (isReactiveState(newVal)) (el as any)[camelKey] = newVal;
            else (el as any)[camelKey] = newUnwrapped;
          } catch (e) {
            // If property assignment fails, fall back to attribute
            el.setAttribute(key, String(newUnwrapped));
          }
        } else if (!isSVG && key in el) {
          try {
            if (isReactiveState(newVal)) (el as any)[key] = newVal;
            else (el as any)[key] = newUnwrapped;
          } catch (e) { el.setAttribute(key, String(newUnwrapped)); }
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
  // Defensive: ensure native disabled property matches the intended source
  try {
  if (isNativeControl(el)) {
      const propCandidate = (mergedProps as any).disabled;
      // Only treat the propCandidate as the authoritative source when it's
      // a clear boolean-ish primitive or a reactive/wrapper we can unwrap.
      // Otherwise fallback to mergedAttrs to avoid arbitrary objects (proxies,
      // wrapper containers) from being treated as truthy and disabling native
      // controls.
      let sourceVal: any;
      try {
        // If the disabled was provided via a directive (processedDirectives)
        // or is a reactive/wrapper value we can safely prefer the prop.
        // Also accept clear boolean-ish primitive prop values as authoritative
        // so native inputs receive intended boolean state. Otherwise prefer
        // the attribute source to avoid arbitrary objects (proxies, wrapper
        // containers) from being treated as truthy and disabling native
        // controls.
        const hasDisabledInProcessed = Object.prototype.hasOwnProperty.call(processedDirectives.props || {}, 'disabled');
        const isWrapper = propCandidate && typeof propCandidate === 'object' && 'value' in propCandidate;
        let isReactive = false;
        safe(() => { isReactive = !!isReactiveState(propCandidate); });
        const isBooleanish = isBooleanishForProps(propCandidate);
        if (isReactive || isWrapper || hasDisabledInProcessed || isBooleanish) {
          sourceVal = propCandidate;
        } else {
          sourceVal = (mergedAttrs as any).disabled;
        }
      } catch (e) {
        sourceVal = (mergedAttrs as any).disabled;
      }
      const finalDisabled = coerceBooleanForNative(sourceVal);
      safe(() => { (el as any).disabled = finalDisabled; });
      finalDisabled ? safe(() => { el.setAttribute('disabled', ''); }) : safe(() => { el.removeAttribute('disabled'); });
    }
  } catch (e) {}

  if (elIsCustom && anyChange) {
    safe(() => { (el as any)._applyProps?.((el as any)._cfg); });
    safe(() => {
      if (typeof (el as any).requestRender === 'function') (el as any).requestRender();
      else if (typeof (el as any)._render === 'function') (el as any)._render((el as any)._cfg);
    });
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
      // Propagate anchor block's key to child elements ONLY if child doesn't have its own key
      // This allows keyed lists (each()) to preserve their own keys
      if (anchorVNode.key != null && childNode instanceof Element && !childNode.hasAttribute('data-anchor-key')) {
        const childVNode = child as VNode;
        const childHasOwnKey = childVNode && typeof childVNode === 'object' && childVNode.key != null;
        
        if (!childHasOwnKey) {
          (childNode as any).key = anchorVNode.key;
          childNode.setAttribute('data-anchor-key', String(anchorVNode.key));
        }
      }
      frag.appendChild(childNode);
    }
    frag.appendChild(end);
    return frag;
  }

  // Standard element VNode
  const el = document.createElement(vnode.tag);
  if (vnode.key != null) (el as any).key = vnode.key; // attach key

  // Store TransitionGroup metadata on the DOM element for patchChildren to use
  if (vnode.props && (vnode.props as any)._transitionGroup) {
    (el as any)._transitionGroup = (vnode.props as any)._transitionGroup;
  }

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

  // Defensive: if the compiler (vnode.props) or earlier processing placed
  // a primitive `disabled` into props for a native input, move it to attrs
  // to avoid accidental truthiness causing native controls to be disabled.
  try {
    if ((mergedProps as any).disabled !== undefined && el && isNativeControl(el)) {
      const candidate = (mergedProps as any).disabled;
      const isWrapper = candidate && typeof candidate === 'object' && 'value' in candidate;
      let isReactiveVal = false;
      try { isReactiveVal = isReactiveState(candidate); } catch (e) { isReactiveVal = false; }
      if (!isWrapper && !isReactiveVal) {
        safe(() => {
          (mergedAttrs as any).disabled = candidate;
          delete (mergedProps as any).disabled;
          const w = (globalThis as any) as any;
          if (!w.__VDOM_DISABLED_PROMOTIONS) w.__VDOM_DISABLED_PROMOTIONS = [];
          w.__VDOM_DISABLED_PROMOTIONS.push({ phase: 'createElement:move-prop-to-attr', location: 'attrs', key: 'disabled', value: candidate, time: Date.now(), stack: (new Error()).stack });
        });
      }
    }
  } catch (e) {}

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
    // Unwrap reactive-like wrappers (ReactiveState or { value }) to primitives
    const unwrappedVal = (typeof val === 'object' && val !== null && isReactiveState(val))
      ? (val as any).value
      : (val && typeof val === 'object' && 'value' in val ? (val as any).value : val);

      if (typeof unwrappedVal === "boolean") {
      // Use the unwrapped boolean to decide presence of boolean attributes
      if (unwrappedVal) {
  el.setAttribute(key, "");
      } else {
        safe(() => { el.removeAttribute(key); });
      }
    } else if (unwrappedVal !== undefined && unwrappedVal !== null) {
      // For disabled attr on native inputs, coerce to boolean and set property
  if (key === 'disabled' && isNativeControl(el)) {
  // Prefer props over attrs when deciding disabled state, but only when
  // the prop value is explicitly booleanish (boolean, numeric, or wrapper).
  // This avoids treating empty-string or arbitrary objects on props as
  // truthy which would incorrectly disable native controls.
  const propCandidate = (mergedProps as any).disabled;
  const sourceVal = isBooleanishForProps(propCandidate) ? propCandidate : unwrappedVal;
        const final = coerceBooleanForNative(sourceVal);
        safe(() => { (el as any).disabled = final; });
        final ? safe(() => { el.setAttribute(key, ''); }) : safe(() => { el.removeAttribute(key); });
        // keep going (do not fallthrough to attribute string path)
        continue;
      }
      // Special-case value/checked for native inputs so .value/.checked are set
      if (!isSVG && key === 'value' && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || el instanceof HTMLProgressElement)) {
        try {
          // Progress expects numeric value
          if (el instanceof HTMLProgressElement) (el as any).value = Number(unwrappedVal);
          else el.value = unwrappedVal ?? "";
        } catch (e) {
          el.setAttribute(key, String(unwrappedVal));
        }
      } else if (!isSVG && key === 'checked' && el instanceof HTMLInputElement) {
        try {
          el.checked = !!unwrappedVal;
        } catch (e) {
          el.setAttribute(key, String(unwrappedVal));
        }
      } else if (!isSVG && key in el) {
        try {
          (el as any)[key] = unwrappedVal;
          // For native form controls, also remove the disabled attribute when setting disabled=false
          // The browser doesn't automatically sync the attribute when the property changes
          if (key === 'disabled' && unwrappedVal === false && isNativeControl(el)) {
            el.removeAttribute('disabled');
          }
        } catch (e) {
          el.setAttribute(key, String(unwrappedVal));
        }
      } else {
        // For custom elements, convert kebab-case attributes to camelCase properties
        const vnodeIsCustom = vnode.props?.isCustomElement ?? false;
          if (vnodeIsCustom && !isSVG && key.includes('-')) {
          const camelKey = toCamel(key);
          try {
            (el as any)[camelKey] = unwrappedVal;
          } catch (e) {
            // If property assignment fails, fall back to attribute
            el.setAttribute(key, String(unwrappedVal));
          }
        } else {
          el.setAttribute(key, String(unwrappedVal));
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
      safe(() => { (el as any).value = propValue ?? ""; });
    } else if (key.startsWith("on") && typeof val === "function") {
      // If a directive already provided a listener for this event (for
      // example :model produced update:prop handlers), prefer the directive
      // listener and skip the prop-based handler. This avoids attaching
      // compiler-generated handlers that close over transient render-local
      // variables and later do nothing when events fire.
      const eventType = eventNameFromKey(key);
      // Also consider alternate camel/kebab variant when checking directive provided listeners
      const altEventType = eventType.includes(':') ? (() => {
        const parts = eventType.split(':');
        const prop = parts[1];
        if (prop.includes('-')) {
          const camel = prop.split('-').map((p,i)=> i===0? p : p.charAt(0).toUpperCase()+p.slice(1)).join('');
          return `${parts[0]}:${camel}`;
        } else {
          const kebab = prop.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
          return `${parts[0]}:${kebab}`;
        }
      })() : eventType;
      if (processedDirectives.listeners && (processedDirectives.listeners[eventType] || processedDirectives.listeners[altEventType])) {
        // skip prop handler in favor of directive-provided listener
      } else {
        EventManager.addListener(el, eventType, val);
      }
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
              // If this is a ReactiveState instance, assign the instance itself
              // to custom element properties so child components can call
              // useProps and receive the live ReactiveState (with .value).
              const propValue = (typeof val === 'object' && val !== null && isReactiveState(val))
                ? val
                : (typeof val === "object" && val !== null && typeof val.value !== "undefined")
                  ? val.value
                  : val;
              // For native elements and the disabled prop, coerce to a boolean
                    if (key === 'disabled' && isNativeControl(el)) {
                      const sourceVal = (mergedProps as any).disabled !== undefined ? (mergedProps as any).disabled : propValue;
                      const final = coerceBooleanForNative(sourceVal);
                      safe(() => { (el as any).disabled = final; });
                      final ? safe(() => { el.setAttribute(key, ''); }) : safe(() => { el.removeAttribute(key); });
                      continue;
                    }
              // Coerce boolean DOM properties to real booleans. This prevents
              // empty-string or 'false' string values from incorrectly enabling
              // properties like `disabled` during SSR/attribute promotions.
              try {
                const existingProp = (el as any)[key];
                if (typeof existingProp === 'boolean') {
                  let assignValue: any = propValue;
                  if (typeof propValue === 'string') {
                    if (propValue === 'false') assignValue = false;
                    else if (propValue === 'true') assignValue = true;
                    else assignValue = !!propValue && propValue !== '';
                  } else {
                    assignValue = !!propValue;
                  }
                  (el as any)[key] = assignValue;
                } else {
                  (el as any)[key] = propValue;
                }
              } catch (e) {
                (el as any)[key] = propValue;
              }
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

  // Final defensive enforcement: ensure native controls are only disabled
  // when the authoritative source is a clear boolean-ish primitive or a
  // reactive/wrapper that unwraps to a boolean. This prevents transient
  // propagation of miscellaneous objects or compiler-promoted primitives
  // from leaving native inputs disabled on initial mount.
  try {
    if (isNativeControl(el)) {
      const propCandidate = (mergedProps as any).disabled;
      const attrCandidate = (mergedAttrs as any).disabled;
      const isWrapper = propCandidate && typeof propCandidate === 'object' && 'value' in propCandidate;
      let isReactive = false;
      try { isReactive = !!isReactiveState(propCandidate); } catch (e) { isReactive = false; }
      // choose authoritative source: prefer reactive/wrapper/booleanish propCandidate
      const useProp = isReactive || isWrapper || isBooleanishForProps(propCandidate);
      const sourceVal = useProp ? propCandidate : attrCandidate;
      const final = coerceBooleanForNative(sourceVal);
      safe(() => { (el as any).disabled = final; });
      if (!final) safe(() => { el.removeAttribute('disabled'); });
      else safe(() => { el.setAttribute('disabled', ''); });
    }
  } catch (e) {}

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

  // Cache childNodes to avoid issues with live NodeList during mutations
  const oldNodeList = parent.childNodes;
  const oldNodesCache: Node[] = [];
  for (let i = 0; i < oldNodeList.length; i++) {
    oldNodesCache.push(oldNodeList[i]);
  }
  const oldVNodes: VNode[] = Array.isArray(oldChildren) ? oldChildren : [];

  // Check if parent has TransitionGroup metadata
  const transitionGroup = (parent as any)._transitionGroup;

  // If TransitionGroup, flatten anchor blocks and handle as batch keyed diff
  if (transitionGroup) {
    // Helper to strip 'each-' prefix from keys for proper keyed diffing
    const stripKeyPrefix = (key: any): any => {
      return typeof key === 'string' && key.startsWith('each-') ? key.substring(5) : key;
    };
    
    const flattenedNew: VNode[] = [];
    const flattenedOldVNodes: VNode[] = [];
    
    // Flatten new children (extract from anchor blocks)
    for (const child of newChildren) {
      if (child && child.tag === '#anchor') {
        const anchorChildren = Array.isArray(child.children) ? child.children : [];
        for (const anchorChild of anchorChildren) {
          // Extract the actual item key from the anchor key
          const actualKey = stripKeyPrefix(anchorChild.key || child.key || 'unknown');
          flattenedNew.push({ ...anchorChild, key: actualKey });
        }
      } else if (child) {
        // Handle already-flattened children (from previous renders)
        flattenedNew.push({ ...child, key: stripKeyPrefix(child.key) });
      }
    }
    
    // Flatten old VNodes (extract from anchor blocks)
    for (const oldVNode of oldVNodes) {
      if (oldVNode && oldVNode.tag === '#anchor') {
        const anchorChildren = Array.isArray(oldVNode.children) ? oldVNode.children : [];
        for (const anchorChild of anchorChildren) {
          // Extract the actual item key from the anchor key
          const actualKey = stripKeyPrefix(anchorChild.key || oldVNode.key || 'unknown');
          flattenedOldVNodes.push({ ...anchorChild, key: actualKey });
        }
      } else if (oldVNode) {
        // Handle already-flattened children (from previous renders)
        flattenedOldVNodes.push({ ...oldVNode, key: stripKeyPrefix(oldVNode.key) });
      }
    }

    // Now perform keyed diffing on flattened lists
    const hasKeys = flattenedNew.some(c => c && c.key != null) || flattenedOldVNodes.some(c => c && c.key != null);

    if (hasKeys) {
      // Build maps for keyed diffing
      const oldVNodeByKeyFlat = new Map<string | number, VNode>();
      const oldNodeByKeyFlat = new Map<string | number, Node>();
      
      for (const v of flattenedOldVNodes) {
        if (v && v.key != null) {
          // Ensure key is a string for consistent comparison
          const key = String(v.key);
          oldVNodeByKeyFlat.set(key, v);
        }
      }
      
      // Map old DOM nodes by their keys with dual mapping for numeric/string keys
      for (let i = 0; i < oldNodesCache.length; i++) {
        const node = oldNodesCache[i];
        
        // Try multiple ways to find the key
        let nodeKey = (node as any).key;

        // If node has data-anchor-key, use that
        if (!nodeKey && node instanceof Element) {
          const anchorKey = node.getAttribute('data-anchor-key');
          if (anchorKey) nodeKey = anchorKey;
        }

        // Strip "each-" prefix from node keys to match flattened VNode keys
        nodeKey = stripKeyPrefix(nodeKey);
        
        // Skip text nodes and comment nodes without keys
        if (nodeKey != null && node instanceof Element && node.nodeType === Node.ELEMENT_NODE) {
          // Extract the base key (remove :tagname suffix if present)
          let baseKey = typeof nodeKey === 'string' && nodeKey.includes(':') 
            ? nodeKey.substring(0, nodeKey.lastIndexOf(':'))
            : nodeKey;
          
          // Ensure key is a string for consistent comparison with VNode keys
          baseKey = String(baseKey);
          
          // Store with the base key (stripped of "each-" prefix to match VNode keys)
          oldNodeByKeyFlat.set(baseKey, node);
        }
      }

      const usedFlat = new Set<Node>();
      
      // PHASE 0: Record positions BEFORE any DOM modifications for FLIP animation
      // Only record if we have existing nodes to animate from
      const positionsBefore = new Map<Node, DOMRect>();
      const hadPreviousContent = oldNodesCache.length > 0;
      
      if (transitionGroup.moveClass && hadPreviousContent) {
        for (let i = 0; i < oldNodesCache.length; i++) {
          const node = oldNodesCache[i];
          if (node instanceof HTMLElement && node.parentElement) {
            const rect = node.getBoundingClientRect();
            // Record position even if dimensions are zero (test environments)
            positionsBefore.set(node, rect);
          }
        }
      }
      
      // PHASE 1: Identify which nodes to keep, create new nodes, but DON'T move anything yet
      const nodesToProcess: Array<{ node: Node; key: string; newVNode: VNode; oldVNode?: VNode; isNew: boolean }> = [];
      
      for (const newVNode of flattenedNew) {
        let key = newVNode.key;
        if (key == null) continue;
        
        // Ensure key is a string for consistent comparison
        key = String(key);
        
        const oldVNode = oldVNodeByKeyFlat.get(key);
        let node = oldNodeByKeyFlat.get(key);
        
        if (node && oldVNode) {
          // Existing node - patch it but don't move yet
          const patched = patch(node, oldVNode, newVNode, context);
          usedFlat.add(node);
          
          // Ensure the node has the correct key and attribute
          const keyStr = String(key);
          (patched as any).key = keyStr;
          if (patched instanceof Element) {
            patched.setAttribute('data-anchor-key', keyStr);
          }
          
          nodesToProcess.push({ node: patched, key, newVNode, oldVNode, isNew: false });
        } else {
          // Create new node and insert it immediately (but invisible via enterFrom classes)
          node = createElement(newVNode, context);
          (node as any).key = key;
          if (node instanceof Element) {
            node.setAttribute('data-anchor-key', String(key));
          }
          
          // For new nodes, immediately insert them into DOM (at the end) and start enter transition
          // This ensures the transition can capture the correct FROM state
          parent.appendChild(node);
          
          // Only animate if: we had previous content to transition from OR appear is true
          // This prevents initial render items from animating (unless appear: true explicitly set)
          // but allows subsequent additions to animate
          const shouldAnimate = hadPreviousContent || transitionGroup.appear === true;

          if (node instanceof HTMLElement && shouldAnimate) {
            performEnterTransition(node, transitionGroup).catch(err => {
              devError('Enter transition error:', err);
            });
          }

          nodesToProcess.push({ node, key, newVNode, isNew: true });
        }
      }

      const leaveTransitions: Promise<void>[] = [];
      
      for (let i = 0; i < oldNodesCache.length; i++) {
        const node = oldNodesCache[i];
        const nodeKey = (node as any).key;
        const isUsed = usedFlat.has(node);

        if (!isUsed && nodeKey != null && node instanceof HTMLElement) {
          const leavePromise = performLeaveTransition(node, transitionGroup)
            .then(() => {
              if (parent.contains(node)) {
                parent.removeChild(node);
              }
            })
            .catch(err => {
              devError('Leave transition error:', err);
              if (parent.contains(node)) {
                parent.removeChild(node);
              }
            });
          leaveTransitions.push(leavePromise);
        }
      }
      
      // PHASE 3: Move nodes to correct positions and apply FLIP animations
      // SKIP if there are active leave transitions to prevent visual jumps
      if (leaveTransitions.length === 0) {
        // FLIP Animation for move transitions
        // Positions were already recorded in PHASE 0, now we just move and animate
        let currentPosition: Node | null = parent.firstChild;

        for (const { node } of nodesToProcess) {
          // Move node to correct position if needed
          if (node !== currentPosition) {
            parent.insertBefore(node, currentPosition);
          }
          currentPosition = node.nextSibling;
        }

        // Apply FLIP animation for moved items
        if (transitionGroup.moveClass && positionsBefore.size > 0) {
          // Collect elements that need to be animated
          const elementsToAnimate: Array<{ node: HTMLElement; deltaX: number; deltaY: number; moveClasses: string[] }> = [];
          
          for (const { node, isNew } of nodesToProcess) {
            if (!isNew && node instanceof HTMLElement) {
              const oldPos = positionsBefore.get(node);
              if (oldPos) {
                const newPos = node.getBoundingClientRect();
                const deltaX = oldPos.left - newPos.left;
                const deltaY = oldPos.top - newPos.top;

                // If position changed, prepare for animation
                if (deltaX !== 0 || deltaY !== 0) {
                  const moveClasses = transitionGroup.moveClass.split(/\s+/).filter((c: string) => c);
                  elementsToAnimate.push({ node, deltaX, deltaY, moveClasses });
                }
              }
            }
          }

          if (elementsToAnimate.length > 0) {
            // FLIP Animation technique:
            // We need to ensure the browser paints the inverted state before animating
            // Step 1: Apply inverted transforms (without transition)
            for (const { node, deltaX, deltaY } of elementsToAnimate) {
              node.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
              node.style.transitionProperty = 'none';
            }

            // Step 2: Force reflow to ensure transforms are applied
            void parent.offsetHeight;

            // Step 3: Use triple RAF to ensure browser has:
            // 1. Painted the inverted state
            // 2. Applied the transition classes
            // 3. Ready to animate when transform is removed
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                // Add moveClass for transition properties
                for (const { node, moveClasses } of elementsToAnimate) {
                  for (const cls of moveClasses) {
                    node.classList.add(cls);
                  }
                }
                
                // One more RAF to ensure transition classes are processed
                requestAnimationFrame(() => {
                  // Set transition directly on each element
                  // Parse moveClass to extract duration and timing
                  const moveClassStr = transitionGroup.moveClass || '';
                  const durationMatch = moveClassStr.match(/duration-(\d+)/);
                  const duration = durationMatch ? `${durationMatch[1]}ms` : '300ms';
                  const easingMatch = moveClassStr.match(/ease-(out|in|in-out|linear)/);
                  const easing = easingMatch ? `ease-${easingMatch[1]}` : 'ease-out';
                  
                  for (const { node } of elementsToAnimate) {
                    // Set transition inline to override everything
                    // This sets transition-property, transition-duration, and transition-timing-function
                    node.style.transition = `transform ${duration} ${easing}`;
                  }
                  
                  // One final RAF before removing transform
                  requestAnimationFrame(() => {
                    // Now remove transforms to trigger animation
                    for (const { node, moveClasses } of elementsToAnimate) {
                      node.style.removeProperty('transform');
                      // Clean up moveClass after transition completes
                      const cleanup = () => {
                        for (const cls of moveClasses) {
                          node.classList.remove(cls);
                        }
                        // Also remove the inline transition we set for move animation
                        // This allows leave transitions to work properly
                        node.style.removeProperty('transition');
                        node.removeEventListener('transitionend', cleanup);
                        node.removeEventListener('transitioncancel', cleanup);
                      };
                      node.addEventListener('transitionend', cleanup, { once: true });
                      node.addEventListener('transitioncancel', cleanup, { once: true });
                    }
                  });
                });
              });
            });
          }
        }
      }
      
      return; // Done with TransitionGroup keyed diffing
    }
  }

  // Map old VNodes by key
  const oldVNodeByKey = new Map<string | number, VNode>();
  for (const v of oldVNodes) {
    if (v && v.key != null) oldVNodeByKey.set(v.key, v);
  }

  // Map DOM nodes by key (elements, text, anchors)
  const oldNodeByKey = new Map<string | number, Node>();

  // Scan DOM for keyed nodes including anchor boundaries
  for (let i = 0; i < oldNodesCache.length; i++) {
    const node = oldNodesCache[i];
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
    transition?: any,
    shouldAnimate = true,
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

      // Calculate if this is initial visible render (for appear transitions)
      const isInitialVisible = transition && transition.state === 'visible' && 
                                oldVNodesInRange.length === 0 && newChildren.length > 0;

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
          
          // Apply enter transition to patched nodes if this is initial visible render with appear: true
          if (transition && node instanceof HTMLElement && isInitialVisible && transition.appear) {
            performEnterTransition(node, transition).catch(err => {
              devError('Transition enter error (appear):', err);
            });
          }
          
          if (node !== next && parent.contains(node)) {
            parent.insertBefore(node, next);
          }
        } else {
          node = createElement(newVNode, context);
          parent.insertBefore(node, next);
          usedInRange.add(node);
          
          // Apply enter transition to new nodes ONLY if shouldAnimate is true
          if (transition && node instanceof HTMLElement && shouldAnimate) {
            performEnterTransition(node, transition).catch(err => {
              devError('Transition enter error:', err);
            });
          }
        }
        next = node.nextSibling;
      }

      for (const node of oldNodesInRange) {
        if (!usedInRange.has(node) && parent.contains(node)) {
          if (transition && node instanceof HTMLElement && shouldAnimate) {
            // Apply leave transition before removing
            performLeaveTransition(node, transition).then(() => {
              if (parent.contains(node)) {
                parent.removeChild(node);
              }
            }).catch(err => {
              devError('Transition leave error:', err);
              if (parent.contains(node)) {
                parent.removeChild(node);
              }
            });
          } else {
            parent.removeChild(node);
          }
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
        const node = createElement(newChildren[i], context);
        parent.insertBefore(node, end);
        
        // Apply enter transition to new nodes ONLY if shouldAnimate is true
        if (transition && node instanceof HTMLElement && shouldAnimate) {
          performEnterTransition(node, transition).catch(err => {
            devError('Transition enter error:', err);
          });
        }
      }

      // Remove extra old
      for (let i = commonLength; i < oldNodesInRange.length; i++) {
        const node = oldNodesInRange[i];
        if (transition && node instanceof HTMLElement && shouldAnimate) {
          // Apply leave transition before removing
          performLeaveTransition(node, transition).then(() => {
            if (parent.contains(node)) {
              parent.removeChild(node);
            }
          }).catch(err => {
            devError('Transition leave error:', err);
            if (parent.contains(node)) {
              parent.removeChild(node);
            }
          });
        } else {
          parent.removeChild(node);
        }
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
        const transition = (newVNode as any)._transition;

        // Determine if we should animate:
        // - If transition.state === 'visible' and children.length > 0, this is initial visible state
        //   → only animate if appear: true
        // - If transition.state === 'hidden' and children.length === 0, this is initial hidden state  
        //   → don't animate (nothing to animate)
        // - Otherwise, this is a state change → always animate
        const isInitialVisible = transition && transition.state === 'visible' && children.length > 0;
        const shouldAnimate = !isInitialVisible || transition.appear;

        for (const child of children) {
          const childNode = createElement(child, context);
          parent.insertBefore(childNode, nextSibling);
          
          // Apply enter transitions to new nodes ONLY if shouldAnimate is true
          if (transition && childNode instanceof HTMLElement) {
            if (shouldAnimate) {
              performEnterTransition(childNode, transition).catch(err => {
                devError('Transition enter error:', err);
              });
            }
          }
        }
        parent.insertBefore(end, nextSibling);
      } else {
        // Patch children between existing boundaries
        const transition = (newVNode as any)._transition;
        const oldVNode = oldVNodeByKey.get(aKey) as VNode;
        const oldTransition = (oldVNode as any)?._transition;
        
        // Determine if we should animate:
        // - If this is a state change (hidden → visible or visible → hidden), always animate
        // - If this is initial render with state='visible', only animate if appear: true
        const isStateChange = oldTransition && oldTransition.state !== transition?.state;
        const isInitialVisible = transition && transition.state === 'visible' && children.length > 0 && !isStateChange;
        const shouldAnimate = isStateChange || !isInitialVisible || (transition?.appear === true);

        patchChildrenBetween(
          start as Comment,
          end as Comment,
          (oldVNodeByKey.get(aKey) as VNode)?.children as VNode[] | undefined,
          children,
          transition,
          shouldAnimate,
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

  // Remove unused nodes (use cached array to avoid live NodeList issues)
  for (let i = 0; i < oldNodesCache.length; i++) {
    const node = oldNodesCache[i];
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
