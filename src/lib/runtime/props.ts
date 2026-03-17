import { toKebab } from './helpers';
import { isReactiveState } from './reactive';
import type { ComponentConfig, ComponentContext } from './types';

export type PropDefinition = {
  type:
    | StringConstructor
    | NumberConstructor
    | BooleanConstructor
    | FunctionConstructor;
  default?: string | number | boolean;
};

function parseProp(val: string, type: unknown) {
  if (type === Boolean) {
    // Standalone boolean attributes (e.g., <div disabled>) have empty string value
    // and should be treated as true. Explicit false is "false" string.
    return val === '' || val === 'true';
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
  context: Record<string, unknown>,
): void {
  if (!propDefinitions) return;

  for (const key in propDefinitions) {
    const def = propDefinitions[key];
    const kebab = toKebab(key);
    const attr = element.getAttribute(kebab);

    // Prefer function prop on the element instance
    if (
      def.type === Function &&
      typeof (element as unknown as Record<string, unknown>)[key] === 'function'
    ) {
      context[key] = (element as unknown as Record<string, unknown>)[key];
    } else {
      // Prefer attribute value (kebab-case)
      if (attr !== null) {
        context[key] = parseProp(attr, def.type);
      } else if (
        typeof (element as unknown as Record<string, unknown>)[key] !==
        'undefined'
      ) {
        // Fall back to JS property value when present on the instance
        try {
          const propValue = (element as unknown as Record<string, unknown>)[
            key
          ];
          // If the property value is already the correct type, use it directly
          // For string props, attempt to convert object-like host properties to string.
          // If conversion throws, preserve the original object value on the context
          if (
            def.type === String &&
            propValue &&
            typeof propValue === 'object'
          ) {
            try {
              context[key] = parseProp(String(propValue), def.type);
            } catch {
              // If conversion fails, fallback to assigning the original object value
              context[key] = propValue;
            }
          } else if (def.type === Boolean && typeof propValue === 'boolean') {
            context[key] = propValue;
          } else if (def.type === Number && typeof propValue === 'number') {
            context[key] = propValue;
          } else if (def.type === Function && typeof propValue === 'function') {
            context[key] = propValue;
          } else {
            // Convert to string first, then parse
            context[key] = parseProp(String(propValue), def.type);
          }
        } catch {
          context[key] = (element as unknown as Record<string, unknown>)[key];
        }
      } else if ('default' in def && def.default !== undefined) {
        context[key] = def.default;
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
      const declared =
        (context as { _hookCallbacks?: { props?: Record<string, unknown> } })
          ?._hookCallbacks?.props || {};
      const keys = Array.from(
        new Set([
          ...Object.keys((element as unknown as Record<string, unknown>) || {}),
          ...Object.keys(declared || {}),
        ]),
      );
      for (const key of keys) {
        // Skip internal/private fields and functions
        if (typeof key !== 'string' || key.startsWith('_')) continue;
        // Avoid overwriting existing descriptors on context
        const existing = Object.getOwnPropertyDescriptor(context, key);
        const isDeclaredProp = Object.prototype.hasOwnProperty.call(
          declared,
          key,
        );
        // If it's a declared prop via useProps, allow overriding the context
        // property with a dynamic getter so the component sees live host
        // prop values. Otherwise, avoid replacing existing accessors.
        if (
          !isDeclaredProp &&
          existing &&
          (existing.get || existing.set || !existing.configurable)
        )
          continue;
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
                const hostVal = (element as unknown as Record<string, unknown>)[
                  key
                ];
                let ret;
                if (isReactiveState(hostVal))
                  ret = (hostVal as { value: unknown }).value;
                else if (
                  hostVal &&
                  typeof hostVal === 'object' &&
                  'value' in hostVal &&
                  !(typeof Node !== 'undefined' && hostVal instanceof Node)
                )
                  ret = (hostVal as { value: unknown }).value;
                else ret = hostVal;
                // intentionally silent in production/test runs
                return ret;
              } catch {
                return (element as unknown as Record<string, unknown>)[key];
              }
            },
          });
        } catch {
          // ignore assignment errors
        }
      }
    } catch {
      // ignore
    }
    return;
  }
  applyPropsFromDefinitions(element, cfg.props, context);
}
