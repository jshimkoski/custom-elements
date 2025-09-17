import { toKebab, escapeHTML } from "./helpers";
import type { ComponentConfig, ComponentContext } from "./types";

export type PropDefinition = {
  type: StringConstructor | NumberConstructor | BooleanConstructor | FunctionConstructor;
  default?: string | number | boolean;
};

function parseProp(val: string, type: any) {
  if (type === Boolean) return val === "true";
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
  context: any
): void {
  if (!propDefinitions) return;

  Object.entries(propDefinitions).forEach(([key, def]) => {
    const kebab = toKebab(key);
    const attr = element.getAttribute(kebab);
    
    // Prefer function prop on the element instance
    if (def.type === Function && typeof (element as any)[key] === "function") {
      (context as any)[key] = (element as any)[key];
    } else {
      // Prefer JS property value when present on the instance (important
      // for runtime updates where the renderer assigns element properties
      // instead of HTML attributes). Check property first, then attribute.
      if (typeof (element as any)[key] !== 'undefined') {
        try {
          const propValue = (element as any)[key];
          // If the property value is already the correct type, use it directly
          if (def.type === Boolean && typeof propValue === 'boolean') {
            (context as any)[key] = propValue;
          } else if (def.type === Number && typeof propValue === 'number') {
            (context as any)[key] = propValue;
          } else if (def.type === Function && typeof propValue === 'function') {
            (context as any)[key] = propValue;
          } else {
            // Convert to string first, then parse
            (context as any)[key] = escapeHTML(parseProp(String(propValue), def.type));
          }
        } catch (e) {
          (context as any)[key] = (element as any)[key];
        }
      } else if (attr !== null) {
        (context as any)[key] = escapeHTML(parseProp(attr, def.type));
      } else if ("default" in def && def.default !== undefined) {
        (context as any)[key] = escapeHTML(def.default);
      }
      // else: leave undefined if no default
    }
  });
}

/**
 * Legacy function for ComponentConfig compatibility.
 * Applies props to the component context using a ComponentConfig.
 * @param element - The custom element instance.
 * @param cfg - The component config.
 * @param context - The component context.
 */
export function applyProps<S extends object, C extends object, P extends object, T extends object>(
  element: HTMLElement,
  cfg: ComponentConfig<S, C, P, T>,
  context: ComponentContext<S, C, P, T>
): void {
  if (!cfg.props) return;
  applyPropsFromDefinitions(element, cfg.props, context);
}
