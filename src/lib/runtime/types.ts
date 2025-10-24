/**
 * VDOM types
 */

export interface VNode {
  tag: string;
  key?: string;
  props?: {
    key?: string;
    props?: Record<string, unknown>;
    attrs?: Record<string, string | number | boolean | null | undefined>;
    directives?: Record<
      string,
      { value: string; modifiers: string[]; arg?: string }
    >;
    ref?: string;
    reactiveRef?: { value: unknown; [key: string]: unknown }; // For reactive state objects
    /** Compiler-provided hint: whether this VNode represents a custom element (contains a dash) */
    isCustomElement?: boolean;
    /** Transition group metadata */
    _transitionGroup?: {
      name?: string;
      appear?: boolean;
      mode?: 'out-in' | 'in-out' | 'default';
      [key: string]: unknown;
    };
  };
  children?: VNode[] | string;
}

export type VDomRefs = Record<string, HTMLElement | undefined>;

export interface AnchorBlockVNode extends VNode {
  tag: '#anchor';
  key: string;
  children: VNode[];
  _startNode?: Comment;
  _endNode?: Comment;
}

/**
 * Runtime types
 */

export type LifecycleKeys =
  | 'onConnected'
  | 'onDisconnected'
  | 'onAttributeChanged'
  | 'onError';

export interface WatchOptions {
  immediate?: boolean;
  deep?: boolean;
}

export type WatchCallback<T = unknown, S = unknown> = (
  newValue: T,
  oldValue: T,
  context: S,
) => void;

export interface WatcherState<T = unknown, S = unknown> {
  callback: WatchCallback<T, S>;
  options: WatchOptions;
  oldValue: T;
}

export type WatchConfig<S> =
  | {
      [K in keyof S]?:
        | WatchCallback<S[K], S>
        | [WatchCallback<S[K], S>, WatchOptions?];
    }
  | Record<
      string,
      WatchCallback<unknown, S> | [WatchCallback<unknown, S>, WatchOptions?]
    >;

// Drop the last element from a tuple type
type DropLast<T extends unknown[]> = T extends [...infer Rest, unknown]
  ? Rest
  : T;

// Wrap a function type by removing its last parameter (the injected ctx)
type WrapMethod<F> = F extends (...args: infer A) => infer R
  ? (...args: DropLast<A>) => R
  : never;

export type InferMethods<T> = {
  [K in keyof T as K extends LifecycleKeys ? never : K]: T[K] extends (
    ...args: unknown[]
  ) => unknown
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
  T extends object = object,
> = S &
  C &
  P &
  InferMethods<T> &
  Refs & {
    requestRender?: () => void;
    error?: Error | null;
    hasError?: boolean;
    isLoading?: boolean;
    /**
     * Dispatch a DOM CustomEvent from the host element.
     * Returns true when the event was not defaultPrevented.
     */
    emit: <D = unknown>(
      eventName: string,
      detail?: D,
      options?: CustomEventInit,
    ) => boolean;
  } & {
    // Allow indexing into the component context for runtime helpers where
    // the context shape is dynamic (props, refs, methods, etc.). This keeps
    // the runtime flexible while preserving strong typing for known fields.
    [key: string]: unknown;
  };

export type ComponentConfig<
  S extends object,
  C extends object = object,
  P extends object = object,
  T extends object = object,
> = {
  props?: Record<
    string,
    {
      type:
        | StringConstructor
        | NumberConstructor
        | BooleanConstructor
        | FunctionConstructor;
      default?: string | number | boolean;
    }
  >;
  render: (
    context: ComponentContext<S, C, P, T>,
  ) => VNode | VNode[] | Promise<VNode | VNode[]>;
  onConnected?: (context: ComponentContext<S, C, P, T>) => void;
  onDisconnected?: (context: ComponentContext<S, C, P, T>) => void;
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
} & {
  // Map injected methods from the T generic onto the config object so
  // function properties keep their parameter types when a caller supplies
  // the fourth generic. Lifecycle keys are excluded because they're
  // declared above with explicit signatures.
  [K in keyof T as K extends LifecycleKeys ? never : K]: T[K] extends (
    ...args: unknown[]
  ) => unknown
    ? T[K]
    : never;
};
