
# Runtime API Reference

All APIs are strictly typed and match the implementation in `runtime.ts`. Only documented features are supported.

---

## Component Configuration

```typescript
export interface ComponentConfig<S extends ComponentState, C extends Record<string, any> = {}> {
  template: (state: S & C, api: ComponentAPI<S & C>) => string | Promise<string> | CompiledTemplate<S & C>;
  state: S;
  computed?: { [K in keyof C]: (state: S) => C[K] };
  style?: string | ((state: S & C) => string);
  refs?: Record<string, RefHandler<S & C>>;
  onMounted?: LifecycleHandler<S & C>;
  onUnmounted?: LifecycleHandler<S & C>;
  onError?: (error: Error, state: S & C, api: ComponentAPI<S & C>) => void;
  [handler: string]: any; // Event handlers for data-on-*
}
```

**Notes:**
- Event handlers for `data-on-*` and `refs` must be defined on the config object.
- Only one event handler per event type per element is attached; previous handlers are removed on rerender.
- `computed` is for derived, reactive values.

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
renderComponentsToString(components: SSRComponentConfig<any>[], options?: SSRRenderOptions): {
  html: string;
  styles: string;
  context: SSRContext;
};
generateHydrationScript(context: SSRContext): string;
```

---

## Template Helpers

```typescript
html(strings: TemplateStringsArray, ...values: any[]): string;
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