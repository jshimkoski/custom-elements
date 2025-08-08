// Template helpers for enhanced DX
export type TemplateResult = string;

/**
 * Template literal tag for HTML strings
 * Enables syntax highlighting in IDEs that support tagged template literals
 * Note: Use the component's events configuration for event handling, not inline functions
 */
export const html = (strings: TemplateStringsArray, ...values: unknown[]): string => {
  return strings.reduce((result, string, i) => {
    return result + string + (values[i] ?? '');
  }, '');
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
) {
  return { [eventType]: handler };
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
