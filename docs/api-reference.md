# Runtime API Reference

All APIs are strictly typed and match the implementation in `src/lib`. Only documented features are supported. This reference covers all exports, configuration options, event handlers, input binding, global store, event bus, refs, computed, SSR, error boundaries, plugin system, VDOM, template helpers, and build tools.

---

## Component Configuration

```typescript
export interface ComponentConfig<S extends ComponentState, C extends Record<string, any> = {}> {
  template: (state: S & C, api: ComponentAPI<S & C>) => string | Promise<string> | CompiledTemplate<S & C>;
  state: S;
  computed?: { [K in keyof C]: (state: S) => C[K] };
  style?: string | ((state: S & C) => string); // Static string or dynamic function
  refs?: Record<string, RefHandler<S & C>>;
  onMounted?: LifecycleHandler<S & C>;
  onUnmounted?: LifecycleHandler<S & C>;
  onError?: (error: Error, state: S & C, api: ComponentAPI<S & C>) => void;
  debug?: boolean; // Enable detailed runtime logs for this component
  reflect?: string[]; // Whitelist of state keys to reflect as attributes
  hydrate?: (el: Element | ShadowRoot, state: S & C, api: ComponentAPI<S & C>) => void; // SSR hydration
  [handler: string]: ((...args: unknown[]) => unknown) | unknown; // Event handlers for data-on-*
}
```

**Attribute Reflection Caveats & Best Practices:**
- Only primitive state keys (`string`, `number`, `boolean`) are supported for attribute reflection. Objects and arrays are ignored.
- Dangerous keys (`__proto__`, `constructor`, `prototype`) are never reflected.
- Initial attributes are merged into state on connection for seamless sync.
- If you override `attributeChangedCallback`, you must call `super.attributeChangedCallback` to preserve reactivity.
- Reflected attributes are automatically kept in sync with state changes.

**Interaction with `data-model`/`data-bind`:**
- If a state key is both reflected and bound to an input via `data-model` or `data-bind`, the runtime will keep them in sync. User input always wins for controlled inputs, preventing sync errors. Rapid external updates to the attribute may be overwritten by user typing.
- Avoid updating the attribute and input at the exact same time to prevent unexpected UI flicker.

**Notes:**
- `debug` (optional): If true, enables detailed runtime logs (warnings, errors, mutation diagnostics) for this component only. Default is false.
- Event handlers for `data-on-*` and `refs` must be defined on the config object.
- Only one event handler per event type per element is attached; previous handlers are removed on rerender.
- `computed` is for derived, reactive values.
---

## Debug Mode Example

Enable runtime logs for a component:

```typescript
component('my-debug-demo', {
  debug: true,
  state: { count: 0 },
  template: ({ count }) => `<button data-on-click="increment">Count: ${count}</button>`,
  increment(_e, state) { state.count++; }
});
```

All internal warnings and errors will only appear if `debug` is set to true.

---

## Component API

```typescript
export interface ComponentAPI<T extends ComponentState = ComponentState> {
  readonly state: T;
  emit(eventName: string, detail?: unknown): void;
  onGlobal<U = any>(eventName: string, handler: (data: U) => void): () => void;
  offGlobal<U = any>(eventName: string, handler: (data: U) => void): void;
  emitGlobal<U = any>(eventName: string, data?: U): void;
}
```

---

## Plugin System

```typescript
export function useRuntimePlugin<S extends ComponentState, C extends Record<string, any>>(
  plugin: {
    onInit?: (config: ComponentConfig<S, C>) => void;
    onRender?: (state: S & C, api: ComponentAPI<S & C>) => void;
    onError?: (error: Error, state: S & C, api: ComponentAPI<S & C>) => void;
  }
): void;
```

---

## SSR Functions

```typescript
renderToString<T>(config: SSRComponentConfig<T>, options?: SSRRenderOptions): string;
renderComponentsToString<T>(configs: SSRComponentConfig<T>[]): string;
generateHydrationScript(): string;
```

**Notes:**
- SSR rendering excludes refs, event listeners, and lifecycle hooks.
- Hydration is opt-in via the `hydrate` property; templates must match for correct hydration.

---

## Template Helpers

```typescript
html(strings: TemplateStringsArray, ...values: any[]): string | Promise<string>;
css(strings: TemplateStringsArray, ...values: any[]): string;
compile<T = any>(strings: TemplateStringsArray, ...expressions: Array<(state: T, api: any) => unknown>): CompiledTemplate<T>;
classes(obj: Record<string, boolean>): string;
styles(obj: Record<string, string | number>): string;
```

---

## Event Bus & Store

```typescript
emit<T = any>(eventName: string, data?: T): void;
on<T = any>(eventName: string, handler: (data: T) => void): () => void;
off<T = any>(eventName: string, handler: (data: T) => void): void;
once<T = any>(eventName: string, handler: (data: T) => void): Promise<T>;

class Store<T extends object> {
  constructor(initial: T);
  subscribe(listener: (state: T) => void): void;
  getState(): T;
}
```

---

## Types

```typescript
export interface ComponentState extends Record<string, unknown> {}
export type RefHandler<T extends ComponentState> = (
  element: Element,
  state: T,
  api: ComponentAPI<T>
) => void;
export type LifecycleHandler<T extends ComponentState> = (
  state: T,
  api: ComponentAPI<T>
) => void;
export type CompiledTemplate<S extends ComponentState = ComponentState> = {
  id: string;
  render: (state: S, api: ComponentAPI<S>) => DocumentFragment;
};
```

## Input Binding

- `data-model`: Controlled, one-way binding between a state property and a form input. Supports modifiers (`|number`, `|trim`).
- `data-bind`: Deep, two-way binding to nested state objects or arrays. Supports dot notation and array indices.

## Event Binding

- `data-on-*`: Declarative event binding for any event type. Handlers must be defined on the config object. Only one handler per event type per element is attached; previous handlers are removed on rerender.

## Global Store

```typescript
import { Store } from '@jasonshimmy/custom-elements-runtime';
const globalState = new Store({ theme: 'light', count: 0 });
globalState.subscribe((state) => { console.log('Global changed:', state.count); });
```

## Global Event Bus

```typescript
import { eventBus } from '@jasonshimmy/custom-elements-runtime';
eventBus.emit('my-event', { foo: 123 });
eventBus.on('my-event', (data) => { console.log(data); });
eventBus.off('my-event', handler);
```

## VDOM Utilities

- Fine-grained DOM diffing and patching for controlled inputs, event listeners, and efficient updates.

## Build Tools

- Integrate with Vite, Webpack, or Rollup for build-time template compilation and optimization.