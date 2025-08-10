import type { CompiledTemplate } from './template-compiler.js';

/**
 * TemplateResult type for template helpers
 */
export type TemplateResult = string | CompiledTemplate | ((state?: any) => string);

/**
 * Escape HTML entities for safe rendering of user-generated content.
 */
function escapeHTML(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Escapes any string value that matches a property in state or computed properties
function escapeIfUserInput(value: unknown, state: any): string {
  if (typeof value !== 'string' || !state) return String(value);
  // Check direct state properties
  for (const key in state) {
    if (typeof state[key] === 'string' && value === state[key]) {
      return escapeHTML(value);
    }
    // For arrays of objects (e.g., todos), check each object's string properties
    if (Array.isArray(state[key])) {
      for (const item of state[key]) {
        if (item && typeof item === 'object') {
          for (const prop in item) {
            if (typeof item[prop] === 'string' && value === item[prop]) {
              return escapeHTML(value);
            }
          }
        }
      }
    }
  }
  return String(value);
}

/**
 * Tagged template literal for HTML strings.
 * Returns a pure function for rendering with state and api.
 * @param strings - Template strings
 * @param values - Dynamic values (functions or primitives)
 */
export function html(
  strings: TemplateStringsArray,
  ...values: unknown[]
): (state?: any, api?: any) => string | Promise<string> {
  function flatten(val: any, state?: any, api?: any): string {
    if (Array.isArray(val)) return val.map(v => flatten(v, state, api)).join('');
    if (typeof val === 'function') return flatten(val(state, api), state, api);
    // Only skip null and undefined, not empty string
    if (val === null || val === undefined) return '';
    return String(val);
  }
  return (state?: any, api?: any) => {
    let result = '';
    let hasAsync = false;
    const valuePromises: Promise<any>[] = [];
    for (let i = 0; i < strings.length; i++) {
      result += strings[i];
      if (i < values.length) {
        let value = values[i];
        const prevStatic = strings[i];
        const isEventHandlerAttr = /data-on-[a-z]+="?$/.test(prevStatic);
        value = flatten(value, state, api);
        if (value instanceof Promise) {
          hasAsync = true;
          valuePromises.push(value);
        } else {
          if (/=\s*"?$/.test(prevStatic) && typeof value === 'string' && !isEventHandlerAttr) {
            // Attribute value: escape both double and single quotes
            value = value.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            result += value;
          } else if (!isEventHandlerAttr && !/=\s*"?$/.test(prevStatic)) {
            // Text node: always escape user input
            result += escapeIfUserInput(value, state);
          } else {
            result += value;
          }
        }
      }
    }
    if (!hasAsync) return result;
    // If any value is a Promise, resolve all and reconstruct
    return Promise.all(valuePromises).then(resolvedValues => {
      let asyncResult = '';
      let asyncIndex = 0;
      for (let i = 0; i < strings.length; i++) {
        asyncResult += strings[i];
        if (i < values.length) {
          let value = values[i];
          const prevStatic = strings[i];
          const isEventHandlerAttr = /data-on-[a-z]+="?$/.test(prevStatic);
          value = flatten(value, state, api);
          if (value instanceof Promise) {
            asyncResult += resolvedValues[asyncIndex++];
          } else {
            if (/=\s*"?$/.test(prevStatic) && typeof value === 'string' && !isEventHandlerAttr) {
              value = value.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
              asyncResult += value;
            } else if (!isEventHandlerAttr && !/=\s*"?$/.test(prevStatic)) {
              asyncResult += escapeIfUserInput(value, state);
            } else {
              asyncResult += value;
            }
          }
        }
      }
      return asyncResult;
    });
  };
}
/**
 * CompiledTemplateFn type for compiled templates
 */
export interface CompiledTemplateFn {
  (state: any, api?: any): string;
  id: string;
}

/**
 * compile helper: returns a compiled template function with a unique id property.
 * Accepts tagged template literals and dynamic values (functions or primitives).
 * @param strings - Template strings
 * @param values - Dynamic values
 */
export function compile(strings: TemplateStringsArray, ...values: any[]): CompiledTemplateFn {
  const id = 'compiled-' + Math.random().toString(36).slice(2);
  function flatten(val: any, state?: any, api?: any): string {
    if (Array.isArray(val)) return val.map(v => flatten(v, state, api)).join('');
    if (typeof val === 'function') return flatten(val(state, api), state, api);
    if (val == null) return '';
    return String(val);
  }
  const fn = (state: any, api?: any) => {
    let result = '';
    for (let i = 0; i < strings.length; i++) {
      result += strings[i];
      if (i < values.length) {
        let value = values[i];
        const prevStatic = strings[i];
        const isEventHandlerAttr = /data-on-[a-z]+="?$/.test(prevStatic);
        value = flatten(value, state, api);
        if (/=\s*"?$/.test(prevStatic) && typeof value === 'string' && !isEventHandlerAttr) {
          value = value.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
          result += value;
        } else if (!isEventHandlerAttr && !/=\s*"?$/.test(prevStatic)) {
          result += escapeIfUserInput(value, state);
        } else {
          result += value ?? '';
        }
      }
    }
    return result;
  };
  (fn as CompiledTemplateFn).id = id;
  return fn as CompiledTemplateFn;
}

/**
 * Tagged template literal for CSS strings.
 * Returns a pure string for use in style blocks.
 * @param strings - Template strings
 * @param values - Dynamic values
 */
export function css(strings: TemplateStringsArray, ...values: unknown[]): string {
  let result = '';
  for (let i = 0; i < strings.length; i++) {
    result += strings[i];
    if (i < values.length) result += values[i] ?? '';
  }
  return result;
}

/**
 * Create a ref function for element references.
 * @param callback - Callback to run with the element
 */
export function ref<T extends Element = Element>(callback: (el: T) => void): (el: Element) => void {
  return callback as (el: Element) => void;
}

/**
 * Create event handlers with strong typing for use in templates.
 * @param eventType - Event type
 * @param handler - Handler function
 */
export function on<K extends keyof HTMLElementEventMap>(
  eventType: K,
  handler: (event: HTMLElementEventMap[K], state: any, api: any) => void
): { [key in K]: (event: HTMLElementEventMap[K], state: any, api: any) => void } {
  return { [eventType]: handler } as { [key in K]: (event: HTMLElementEventMap[K], state: any, api: any) => void };
}

/**
 * Helper for conditional classes. Returns a space-separated string of class names.
 * @param obj - Object with class names as keys and boolean conditions as values
 */
export function classes(obj: Record<string, boolean>): string {
  return Object.keys(obj).filter(className => obj[className]).join(' ');
}

/**
 * Helper for inline styles. Returns a CSS string for use in style attributes.
 * @param obj - Object with style properties and values
 */
export function styles(obj: Record<string, string | number>): string {
  return Object.entries(obj)
    .map(([prop, value]) => `${prop}: ${value}`)
    .join('; ');
}
