import type { ComponentConfig, ComponentContext } from "./types";

/**
 * Handles the connected lifecycle hook.
 */
export function handleConnected<S extends object, C extends object, P extends object, T extends object>(
  cfg: ComponentConfig<S, C, P, T>,
  context: ComponentContext<S, C, P, T>,
  isMounted: boolean,
  setMounted: (val: boolean) => void
): void {
  if (cfg.onConnected && !isMounted) {
    cfg.onConnected(context);
    setMounted(true);
  }
}

/**
 * Handles the disconnected lifecycle hook.
 */
export function handleDisconnected<S extends object, C extends object, P extends object, T extends object>(
  cfg: ComponentConfig<S, C, P, T>,
  context: ComponentContext<S, C, P, T>,
  listeners: Array<() => void>,
  clearListeners: () => void,
  clearWatchers: () => void,
  setTemplateLoading: (val: boolean) => void,
  setTemplateError: (err: Error | null) => void,
  setMounted: (val: boolean) => void
): void {
  if (cfg.onDisconnected) cfg.onDisconnected(context);
  listeners.forEach(unsub => unsub());
  clearListeners();
  clearWatchers();
  setTemplateLoading(false);
  setTemplateError(null);
  setMounted(false);
}

/**
 * Handles the attribute changed lifecycle hook.
 */
export function handleAttributeChanged<S extends object, C extends object, P extends object, T extends object>(
  cfg: ComponentConfig<S, C, P, T>,
  name: string,
  oldValue: string | null,
  newValue: string | null,
  context: ComponentContext<S, C, P, T>
): void {
  if (cfg.onAttributeChanged) {
    cfg.onAttributeChanged(name, oldValue, newValue, context);
  }
}
