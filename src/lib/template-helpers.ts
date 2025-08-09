// Template helpers for enhanced DX
import type { CompiledTemplate } from './template-compiler.js';

export type TemplateResult = string | CompiledTemplate | ((state?: any) => string);

/**
 * Template literal tag for HTML strings
 * Enables syntax highlighting in IDEs that support tagged template literals
 * Note: Use the component's events configuration for event handling, not inline functions
 */
export const html = (
  strings: TemplateStringsArray,
  ...values: unknown[]
): ((state?: any, api?: any) => string) => {
  /**
   * Returns a function that takes state and api, and evaluates all dynamic slots at render time.
   * Dynamic values (functions) receive both state and api.
   */
  return (state?: any, api?: any) => {
    return strings.reduce((result, string, i) => {
      let value = values[i];
      // If value is a function, call it with state and api
      if (typeof value === 'function') {
        value = value(state, api);
      }
      // If value is a string referencing state, access state property
      if (typeof value === 'string' && state && value.startsWith('state.')) {
        const prop = value.slice(6);
        value = state[prop];
      }
      return result + string + (value ?? '');
    }, '');
  };
};

/**
 * Template literal tag for CSS strings  
 * Enables syntax highlighting in IDEs that support tagged template literals
 */
export const css = (strings: TemplateStringsArray, ...values: unknown[]): string => {
  return strings.reduce((result, string, i) => {
    return result + string + (values[i] ?? '');
  }, '');
};

/**
 * Create a ref function that's easier to use
 */
export function ref<T extends Element = Element>(
  callback: (el: T) => void
): (el: Element) => void {
  return callback as any;
}

/**
 * Create event handlers with better typing
 */
export function on<K extends keyof HTMLElementEventMap>(
  eventType: K,
  handler: (event: HTMLElementEventMap[K], state: any, api: any) => void
): { [key in K]: (event: HTMLElementEventMap[K], state: any, api: any) => void } {
  /**
   * Returns an event handler object for use in templates.
   * Handler receives event, state, and api.
   */
  return { [eventType]: handler } as { [key in K]: (event: HTMLElementEventMap[K], state: any, api: any) => void };
}

/**
 * Helper for conditional classes
 */
export function classes(obj: Record<string, boolean>): string {
  return Object.entries(obj)
    .filter(([, condition]) => condition)
    .map(([className]) => className)
    .join(' ');
}

/**
 * Helper for inline styles
 */
export function styles(obj: Record<string, string | number>): string {
  return Object.entries(obj)
    .map(([prop, value]) => `${prop}: ${value}`)
    .join('; ');
}
