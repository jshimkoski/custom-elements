import type { ComponentContext, WatchCallback, WatchOptions, WatcherState } from "./types";
import { getNestedValue } from "./helpers";
import { devError } from "./logger";

/**
 * Initializes watchers for a component.
 */
export function initWatchers(
  context: ComponentContext<any, any, any, any>,
  watchers: Map<string, WatcherState>,
  watchConfig: Record<string, WatchCallback | [WatchCallback, WatchOptions]>
): void {
  if (!watchConfig) return;

  for (const [key, config] of Object.entries(watchConfig)) {
    let callback: WatchCallback;
    let options: WatchOptions = {};

    if (Array.isArray(config)) {
      callback = config[0];
      options = config[1] || {};
    } else {
      callback = config;
    }

    watchers.set(key, {
      callback,
      options,
      oldValue: getNestedValue(context, key),
    });

    if (options.immediate) {
      try {
        const currentValue = getNestedValue(context, key);
        callback(currentValue, undefined, context);
      } catch (error) {
        devError(`Error in immediate watcher for "${key}":`, error);
      }
    }
  }
}

/**
 * Triggers watchers when state changes.
 */
export function triggerWatchers(
  context: ComponentContext<any, any, any, any>,
  watchers: Map<string, WatcherState>,
  path: string,
  newValue: any
): void {
  const isEqual = (a: any, b: any): boolean => {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (typeof a !== "object" || a === null || b === null) return false;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((val, i) => isEqual(val, b[i]));
    }
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(key => isEqual(a[key], b[key]));
  };

  const watcher = watchers.get(path);
  if (watcher && !isEqual(newValue, watcher.oldValue)) {
    try {
      watcher.callback(newValue, watcher.oldValue, context);
      watcher.oldValue = newValue;
    } catch (error) {
      devError(`Error in watcher for "${path}":`, error);
    }
  }

  for (const [watchPath, watcherConfig] of watchers.entries()) {
    if (watcherConfig.options.deep && path.startsWith(watchPath + ".")) {
      try {
        const currentValue = getNestedValue(context, watchPath);
        if (!isEqual(currentValue, watcherConfig.oldValue)) {
          watcherConfig.callback(currentValue, watcherConfig.oldValue, context);
          watcherConfig.oldValue = currentValue;
        }
      } catch (error) {
        devError(`Error in deep watcher for "${watchPath}":`, error);
      }
    }
  }
}
