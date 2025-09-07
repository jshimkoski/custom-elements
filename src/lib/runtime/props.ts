import { toKebab, escapeHTML } from "./helpers";
import type { ComponentConfig, ComponentContext } from "./types";

/**
 * Applies props to the component context.
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

  function parseProp(val: string, type: any) {
    if (type === Boolean) return val === "true";
    if (type === Number) return Number(val);
    return val;
  }

  Object.entries(cfg.props).forEach(([key, def]) => {
    // Prefer function prop on the element instance
    if (def.type === Function && typeof (element as any)[key] === "function") {
      (context as any)[key] = (element as any)[key];
    } else {
      const kebab = toKebab(key);
      const attr = element.getAttribute(kebab);
      // Prefer JS property value when present on the instance (important
      // for runtime updates where the renderer assigns element properties
      // instead of HTML attributes). Check property first, then attribute.
      if (typeof (element as any)[key] !== 'undefined') {
        try {
          (context as any)[key] = escapeHTML(parseProp((element as any)[key], def.type));
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
