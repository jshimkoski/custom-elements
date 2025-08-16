# 🛠 API Reference

All APIs are strictly typed and match the implementation in `src/lib`. Only documented features are supported.

---

## ✅ Component Config

Define components with the following options:

```ts
interface ComponentConfig<S, C = {}> {
  template: (state: S & C, api: ComponentAPI<S & C>) => string | Promise<string> | CompiledTemplate<S & C>;
  state?: S;
  computed?: { [K in keyof C]: (state: S) => C[K] };
  style?: string | ((state: S & C) => string);
  refs?: Record<string, RefHandler<S & C>>;
  onMounted?: LifecycleHandler<S & C>;
  onUnmounted?: LifecycleHandler<S & C>;
  onError?: (error: Error, state: S & C, api: ComponentAPI<S & C>) => void;
  debug?: boolean;
  reflect?: string[];
  hydrate?: (el: Element | ShadowRoot, state: S & C, api: ComponentAPI<S & C>) => void;
  [handler: string]: any;
}
```

### Notes

- **`state`**: Omit for stateless components.
- **`computed`**: Define derived, reactive properties.
- **`style`**: Static string or function based on state.
- **`refs`**: DOM access and custom logic via `data-ref`.
- **`onMounted`, `onUnmounted`**: Setup and cleanup.
- **`onError`**: Catch and handle errors locally.
- **`debug`**: Enable detailed logs for this component only.
- **`reflect`**: Sync primitive state keys with attributes.
- **Event Handlers**: Use `data-on-*` and define handlers on config.

---

## ⚠️ Attribute Reflection Tips

- Only `string`, `number`, and `boolean` keys are reflected.
- `__proto__`, `constructor`, and `prototype` are ignored.
- Reflected attributes update state on connect.
- If using `attributeChangedCallback`, call `super.attributeChangedCallback`.

---

## 🔁 Binding Behavior

- **`data-model` / `data-bind`** keep state and inputs in sync.
- User input always takes priority.
- Avoid simultaneous state+DOM updates to prevent flicker.

---

## 🐞 Debug Mode

Enable detailed logs for a single component:

```ts
component('my-debug-demo', {
  debug: true,
  state: { count: 0 },
  template: ({ count }) => html`<button data-on-click="increment">Count: ${count}</button>`({ count }),
  increment(_, state) { state.count++; }
});
```

---

## 📦 Component API

```ts
interface ComponentAPI<T> {
  readonly state: T;
  emit(event: string, detail?: unknown): void;
  onGlobal<U>(event: string, handler: (data: U) => void): () => void;
  offGlobal<U>(event: string, handler: (data: U) => void): void;
  emitGlobal<U>(event: string, data?: U): void;
}
```

---

## 🔌 Plugin System

Extend global behavior:

```ts
function useRuntimePlugin<S, C>(plugin: {
  onInit?: (config: ComponentConfig<S, C>) => void;
  onRender?: (state: S & C, api: ComponentAPI<S & C>) => void;
  onError?: (error: Error, state: S & C, api: ComponentAPI<S & C>) => void;
}): void;
```

**Example:**

```ts
useRuntimePlugin({
  onInit: (config) => { /* setup */ },
  onRender: (state, api) => { /* render logic */ },
  onError: (err, state, api) => { /* error handling */ }
});
```

---

## 🌐 Router

Minimal SSR-compatible router:

```ts
import { initRouter, useRouter, matchRouteSSR } from '@jasonshimmy/custom-elements-runtime';

const routes = [
  { path: '/', component: 'home-page' },
  { path: '/about', component: 'about-page' },
  { path: '/user/:id', component: 'user-page' }
];

const router = initRouter({ routes });
router.push('/about');
```

- Use `<router-view>` for rendering.
- For SSR, use `matchRouteSSR(routes, path)`.

---

## 📦 Global Store & Event Bus

```ts
import { Store, eventBus } from '@jasonshimmy/custom-elements-runtime';

const store = Store({ count: 0 });
store.subscribe((state) => {
  console.log('State updated:', state.count);
});

eventBus.on('my-event', (data) => {
  console.log('Received:', data);
});
eventBus.emit('my-event', { foo: 123 });
```

---

## 🖥️ SSR & Hydration

Server-side rendering and hydration tools:

```ts
import {
  renderToString,
  renderComponentsToString,
  generateHydrationScript
} from '@jasonshimmy/custom-elements-runtime';
```

- SSR excludes refs, events, and lifecycle.
- Hydration is opt-in via `data-hydrate`.
- Templates must match for proper hydration.

---

## 🔧 Template Helpers

```ts
html(strings, ...values): string | Promise<string>
css(strings, ...values): string
compile(strings, ...expressions): CompiledTemplate
classes(obj): string
styles(obj): string
```

---

## 🧱 Types

```ts
interface ComponentState extends Record<string, unknown> {}

type RefHandler<T> = (el: Element, state: T, api: ComponentAPI<T>) => void;

type LifecycleHandler<T> = (state: T, api: ComponentAPI<T>) => void;

type CompiledTemplate<S = ComponentState> = {
  id: string;
  render: (state: S, api: ComponentAPI<S>) => DocumentFragment;
};
```

---

## 🔗 Input & Event Binding

- `data-model`: One-way binding for form inputs (supports modifiers like `|number`, `|trim`).
- `data-bind`: Two-way binding for nested state (dot paths supported).
- `data-on-*`: Declarative event listeners. One handler per event per element.

---

## ⚙️ Build Tools

- Compatible with Vite, Webpack, Rollup.
- Supports build-time template compilation and optimization.
