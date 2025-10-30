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
} from './helpers';
import { setAttributeSmart, removeAttributeSmart } from './namespace-helpers';

/**
 * Check if two values have changed, handling arrays specially
 */
export function hasValueChanged(
  newValue: unknown,
  currentValue: unknown,
): boolean {
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
  value: unknown,
  newValue: unknown,
  context: Record<string, unknown>,
  arg?: string,
): void {
  if (isReactive) {
    const unwrapped = (value as { value?: unknown }).value;
    if (arg && typeof unwrapped === 'object' && unwrapped !== null) {
      // For :model:prop, update the specific property
      const updated = { ...(unwrapped as Record<string, unknown>) };
      (updated as Record<string, unknown>)[arg] = newValue;
      (value as { value?: unknown }).value = updated as unknown;
    } else {
      // For plain :model, update the entire value
      (value as { value?: unknown }).value = newValue;
    }
  } else {
    // Fallback to string-based update (legacy config API)
    const actualState = (context._state || context) as Record<string, unknown>;
    setNestedValue(actualState, value as string, newValue);
  }
}

/**
 * Trigger render and watchers after state update
 */
export function triggerStateUpdate(
  context: Record<string, unknown>,
  isReactive: boolean,
  value: unknown,
  newValue: unknown,
): void {
  if (typeof context._requestRender === 'function') {
    context._requestRender();
  }

  if (typeof context._triggerWatchers === 'function') {
    const watchKey = isReactive ? 'reactiveState' : (value as string);
    context._triggerWatchers(watchKey, newValue);
  }
}

/**
 * Emit custom update events for model binding
 */
export function emitUpdateEvents(
  target: Element,
  propName: string,
  newValue: unknown,
): void {
  const customEventNameKebab = `update:${toKebab(propName)}`;
  const customEventNameCamel = `update:${propName}`;

  const customEventKebab = new CustomEvent(customEventNameKebab, {
    detail: newValue,
    bubbles: true,
    cancelable: true,
  });

  const customEventCamel = new CustomEvent(customEventNameCamel, {
    detail: newValue,
    bubbles: true,
    cancelable: true,
  });

  target.dispatchEvent(customEventKebab);
  target.dispatchEvent(customEventCamel);
}

/**
 * Update element properties and attributes to sync with state
 */
export function syncElementWithState(
  target: Element | Record<string, unknown>,
  propName: string,
  propValue: unknown,
  isReactive: boolean,
): void {
  const propToSet = isReactive ? propValue : propValue;

  // Set property
  safe(() => {
    if (typeof (target as HTMLElement).setAttribute === 'function') {
      // HTMLElement-like
      try {
        (target as unknown as Record<string, unknown>)[propName] = propToSet;
      } catch {
        // ignore property set failures
      }
    } else {
      // Plain record
      (target as Record<string, unknown>)[propName] = propToSet;
    }
  });

  // Sync attributes for primitive/boolean values
  if (
    propToSet === null ||
    propToSet === undefined ||
    typeof propToSet === 'string' ||
    typeof propToSet === 'number' ||
    typeof propToSet === 'boolean'
  ) {
    const serialized = safeSerializeAttr(propToSet);
    if (serialized !== null) {
      safe(() => {
        if (typeof (target as Element).setAttribute === 'function') {
          setAttributeSmart(
            target as Element,
            toKebab(propName),
            String(serialized),
          );
        }
      });
    } else {
      safe(() => {
        if (typeof (target as Element).removeAttribute === 'function') {
          removeAttributeSmart(target as Element, toKebab(propName));
        }
      });
    }
  }
}

/**
 * Get current state value (reactive or path-based)
 */
export function getCurrentStateValue(
  isReactive: boolean,
  value: unknown,
  context: Record<string, unknown>,
  arg?: string,
): unknown {
  if (isReactive) {
    const unwrapped = (value as { value?: unknown }).value;
    if (arg && typeof unwrapped === 'object' && unwrapped !== null) {
      return (unwrapped as Record<string, unknown>)[arg];
    }
    return unwrapped;
  } else {
    const actualState = (context._state || context) as Record<string, unknown>;
    return getNestedValue(actualState, value as string);
  }
}
