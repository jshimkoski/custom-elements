/**
 * VDOM types
 */

export interface VNode {
  tag: string;
  key?: string;
  props?: {
    key?: string;
    props?: any;
    attrs?: Record<string, any>;
    directives?: Record<string, { value: string; modifiers: string[] }>;
    ref?: string;
  };
  children?: VNode[] | string;
}

export type VDomRefs = Record<string, HTMLElement | undefined>;

export interface AnchorBlockVNode extends VNode {
  tag: "#anchor";
  key: string;
  children: VNode[];
  _startNode?: Comment;
  _endNode?: Comment;
}

/**
 * Runtime types
 */

export type LifecycleKeys =
  | "onConnected"
  | "onDisconnected"
  | "onAttributeChanged"
  | "onError"
  | "errorFallback";


export interface WatchOptions {
  immediate?: boolean;
  deep?: boolean;
}

export type WatchCallback<T = any, S = any> = (
  newValue: T,
  oldValue: T,
  context?: S,
) => void;

export interface WatcherState {
  callback: WatchCallback;
  options: WatchOptions;
  oldValue: any;
}

export type WatchConfig<S> =
  | {
      [K in keyof S]?:
        | WatchCallback<S[K]>
        | [WatchCallback<S[K]>, WatchOptions?];
    }
  | Record<string, WatchCallback | [WatchCallback, WatchOptions?]>;

// Drop the last element from a tuple type
type DropLast<T extends any[]> = T extends [...infer Rest, any] ? Rest : T;

// Wrap a function type by removing its last parameter (the injected ctx)
type WrapMethod<F> = F extends (...args: infer A) => infer R
  ? (...args: DropLast<A>) => R
  : never;

export type InferMethods<T> = {
  [K in keyof T as K extends LifecycleKeys ? never : K]: T[K] extends (...args: any[]) => any
    ? WrapMethod<T[K]>
    : never;
};

export interface Refs {
  refs: Record<string, HTMLElement | undefined>;
}

export type ComponentContext<
  S extends object,
  C extends object,
  P extends object,
  T extends object = {},
> = S & C & P & InferMethods<T> & Refs & {
  requestRender?: () => void;
  error?: Error | null;
  hasError?: boolean;
  isLoading?: boolean;
  /**
   * Dispatch a DOM CustomEvent from the host element.
   * Returns true when the event was not defaultPrevented.
   */
  emit: <D = any>(eventName: string, detail?: D, options?: CustomEventInit) => boolean;
};

export type ComponentConfig<
  S extends object,
  C extends object = {},
  P extends object = {},
  T extends object = {},
> = {
  state?: S;
  computed?: { [K in keyof C]: (context: ComponentContext<S, C, P, T>) => C[K] };
  props?: Record<
    string,
    {
      type: StringConstructor | NumberConstructor | BooleanConstructor | FunctionConstructor;
      default?: string | number | boolean;
    }
  >;
  watch?: WatchConfig<ComponentContext<S, C, P, T>>;
  style?: string | ((context: ComponentContext<S, C, P, T>) => string);
  render: (context: ComponentContext<S, C, P, T>) => VNode | VNode[] | Promise<VNode | VNode[]>;
  loadingTemplate?: (context: ComponentContext<S, C, P, T>) => VNode | VNode[];
  errorTemplate?: (
    error: Error,
    context: ComponentContext<S, C, P, T>,
  ) => VNode | VNode[];
  onConnected?: (
    context: ComponentContext<S, C, P, T>,
  ) => void;
  onDisconnected?: (
    context: ComponentContext<S, C, P, T>,
  ) => void;
  onAttributeChanged?: (
    name: string,
    oldValue: string | null,
    newValue: string | null,
    context: ComponentContext<S, C, P, T>,
  ) => void;
  onError?: (
    error: Error | null,
    context: ComponentContext<S, C, P, T>,
  ) => void;
  errorFallback?: (
    error: Error | null,
    context: ComponentContext<S, C, P, T>,
  ) => string;
} & {
  // Map injected methods from the T generic onto the config object so
  // function properties keep their parameter types when a caller supplies
  // the fourth generic. Lifecycle keys are excluded because they're
  // declared above with explicit signatures.
  [K in keyof T as K extends LifecycleKeys ? never : K]: T[K] extends Function ? T[K] : never;
};
