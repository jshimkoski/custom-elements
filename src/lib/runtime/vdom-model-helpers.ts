/**
 * Helper functions for model binding updates in vdom.ts
 * Extracted to reduce code duplication and improve maintainability
 */

import {
  getNestedValue,
  setNestedValue,
  toKebab,
  safe,
  safeSerializeAttr,
} from "./helpers";

/**
 * Check if two values have changed, handling arrays specially
 */
export function hasValueChanged(newValue: any, currentValue: any): boolean {
  if (Array.isArray(newValue) && Array.isArray(currentValue)) {
    return (
      JSON.stringify([...newValue].sort()) !==
      JSON.stringify([...currentValue].sort())
    );
  }
  return newValue !== currentValue;
}

/**
 * Update state value (reactive or path-based)
 */
export function updateStateValue(
  isReactive: boolean,
  value: any,
  newValue: any,
  context: any,
  arg?: string
): void {
  if (isReactive) {
    if (arg && typeof value.value === "object" && value.value !== null) {
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
    const actualState = context._state || context;
    setNestedValue(actualState, value as string, newValue);
  }
}

/**
 * Trigger render and watchers after state update
 */
export function triggerStateUpdate(
  context: any,
  isReactive: boolean,
  value: any,
  newValue: any
): void {
  if (context._requestRender) {
    context._requestRender();
  }

  if (context._triggerWatchers) {
    const watchKey = isReactive ? "reactiveState" : (value as string);
    context._triggerWatchers(watchKey, newValue);
  }
}

/**
 * Emit custom update events (both kebab-case and camelCase)
 */
export function emitUpdateEvents(
  target: HTMLElement,
  propName: string,
  newValue: any
): void {
  const customEventNameKebab = `update:${toKebab(propName)}`;
  const customEventNameCamel = `update:${propName}`;

  const customEventKebab = new CustomEvent(customEventNameKebab, {
    detail: newValue,
    bubbles: true,
    composed: true,
  });

  const customEventCamel = new CustomEvent(customEventNameCamel, {
    detail: newValue,
    bubbles: true,
    composed: true,
  });

  target.dispatchEvent(customEventKebab);
  target.dispatchEvent(customEventCamel);
}

/**
 * Update element properties and attributes to sync with state
 */
export function syncElementWithState(
  target: any,
  propName: string,
  propValue: any,
  isReactive: boolean
): void {
  const propToSet = isReactive ? propValue : propValue;

  // Set property
  safe(() => {
    target[propName] = propToSet;
  });

  // Sync attributes for primitive/boolean values
  safe(() => {
    const attrName = toKebab(propName);
    if (typeof propToSet === "boolean") {
      const serialized = safeSerializeAttr(propToSet);
      if (serialized !== null) target.setAttribute(attrName, serialized);
      else target.removeAttribute?.(attrName);
    } else if (
      propToSet != null &&
      (typeof propToSet === "string" || typeof propToSet === "number")
    ) {
      target.setAttribute(attrName, String(propToSet));
    } else {
      // For anything else, attempt safe serialization and only set when safe
      const serialized = safeSerializeAttr(propToSet);
      if (serialized !== null) target.setAttribute(attrName, serialized);
      else target.removeAttribute?.(attrName);
    }
  });

  // Trigger component's internal handling
  safe(() => {
    target._applyProps?.(target._cfg);
  });
  safe(() => {
    target._requestRender?.();
  });
}

/**
 * Get current state value (reactive or path-based)
 */
export function getCurrentStateValue(
  isReactive: boolean,
  value: any,
  context: any,
  arg?: string
): any {
  if (isReactive) {
    const unwrapped = value.value;
    if (arg && typeof unwrapped === "object" && unwrapped !== null) {
      return unwrapped[arg];
    }
    return unwrapped;
  }
  const actualState = context._state || context;
  return getNestedValue(actualState, value as string);
}
