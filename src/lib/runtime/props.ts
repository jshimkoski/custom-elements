import { toKebab } from "./helpers";
import { isReactiveState } from './reactive';
import type { ComponentConfig, ComponentContext } from "./types";

export type PropDefinition = {
  type:
    | StringConstructor
    | NumberConstructor
    | BooleanConstructor
    | FunctionConstructor;
  default?: string | number | boolean;
};

function parseProp(val: string, type: any) {
  if (type === Boolean) {
    // Standalone boolean attributes (e.g., <div disabled>) have empty string value
    // and should be treated as true. Explicit false is "false" string.
    return val === "" || val === "true";
  }
  if (type === Number) return Number(val);
  return val;
}

/**
 * Applies props to the component context using a direct prop definitions object.
 * @param element - The custom element instance.
 * @param propDefinitions - Object mapping prop names to their definitions.
 * @param context - The component context.
 */
export function applyPropsFromDefinitions(
  element: HTMLElement,
  propDefinitions: Record<string, PropDefinition>,
  context: any,
): void {
  if (!propDefinitions) return;

  for (const key in propDefinitions) {
    const def = propDefinitions[key];
    const kebab = toKebab(key);
    const attr = element.getAttribute(kebab);

    // Prefer function prop on the element instance
    if (def.type === Function && typeof (element as any)[key] === "function") {
      (context as any)[key] = (element as any)[key];
    } else {
      // Prefer HTML attribute when present (attributes should take precedence over default property values)
      if (attr !== null) {
        (context as any)[key] = parseProp(attr, def.type);
      } else if (typeof (element as any)[key] !== "undefined") {
        // Fall back to JS property value when present on the instance
        try {
          const propValue = (element as any)[key];
          // If the property value is already the correct type, use it directly
          if (def.type === Boolean && typeof propValue === "boolean") {
            (context as any)[key] = propValue;
          } else if (def.type === Number && typeof propValue === "number") {
            (context as any)[key] = propValue;
          } else if (def.type === Function && typeof propValue === "function") {
            (context as any)[key] = propValue;
          } else {
            // Convert to string first, then parse
            (context as any)[key] = parseProp(String(propValue), def.type);
          }
        } catch (e) {
          (context as any)[key] = (element as any)[key];
        }
      } else if ("default" in def && def.default !== undefined) {
        (context as any)[key] = def.default;
      }
      // else: leave undefined if no default
    }
  }
}

/**
 * Legacy function for ComponentConfig compatibility.
 * Applies props to the component context using a ComponentConfig.
 * @param element - The custom element instance.
 * @param cfg - The component config.
 * @param context - The component context.
 */
export function applyProps<
  S extends object,
  C extends object,
  P extends object,
  T extends object,
>(
  element: HTMLElement,
  cfg: ComponentConfig<S, C, P, T>,
  context: ComponentContext<S, C, P, T>,
): void {
  if (!cfg.props) {
    // When there are no explicit prop definitions, define dynamic getters
    // on the component context for element properties. Also ensure getters
    // exist for props declared via useProps (context._hookCallbacks.props)
    // so components that call useProps see live host properties even if the
    // host hasn't created an own enumerable property yet.
    try {
      const declared = (context && (context as any)._hookCallbacks && (context as any)._hookCallbacks.props) || {};
      const keys = Array.from(new Set([...Object.keys(element as any), ...Object.keys(declared)]));
      for (const key of keys) {
        // Skip internal/private fields and functions
        if (typeof key !== 'string' || key.startsWith('_')) continue;
        // Avoid overwriting existing descriptors on context
        const existing = Object.getOwnPropertyDescriptor(context, key);
        const isDeclaredProp = Object.prototype.hasOwnProperty.call(declared, key);
        // If it's a declared prop via useProps, allow overriding the context
        // property with a dynamic getter so the component sees live host
        // prop values. Otherwise, avoid replacing existing accessors.
        if (!isDeclaredProp && existing && (existing.get || existing.set || !existing.configurable)) continue;
        try {
          Object.defineProperty(context, key, {
            enumerable: true,
            configurable: true,
            get() {
              try {
                // Check for attribute value first (attributes should take precedence)
                const kebab = toKebab(key);
                const attr = element.getAttribute(kebab);
                if (attr !== null) {
                  // Return attribute value if present
                  return attr;
                }
                
                // Fall back to property value
                const hostVal = (element as any)[key];
                let ret;
                if (isReactiveState(hostVal)) ret = (hostVal as any).value;
                else if (hostVal && typeof hostVal === 'object' && 'value' in hostVal && !(hostVal instanceof Node)) ret = (hostVal as any).value;
                else ret = hostVal;
                // intentionally silent in production/test runs
                return ret;
              } catch (e) {
                return (element as any)[key];
              }
            }
          });
        } catch (e) {
          // ignore assignment errors
        }
      }
    } catch (e) {
      // ignore
    }
    return;
  }
  applyPropsFromDefinitions(element, cfg.props, context);
}
