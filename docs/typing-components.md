# 🧩 Typing Components

This guide explains how to strongly type components with the runtime. It's focused on practical patterns for state, computed, props, methods, and `ComponentContext` usage.

## Quick overview

- Generics: `component<S, C, P, T>(tag, renderOrConfig)`
	- S — State
	- C — Computed
	- P — Props
	- T — Methods (non-lifecycle functions declared on config)
- The runtime exposes `ComponentContext<S,C,P,T>` (usually `ctx`) to render/computed/watch/lifecycle functions.
- Methods declared on the config are injected onto `ctx` as wrapper functions; runtime passes the real `ctx` into your implementation as the last parameter.

## ComponentContext (what `ctx` contains)

`ComponentContext<S,C,P,T>` is the union of:
- Your `S`, `C`, and `P` keys (state, computed, props)
- Injected wrapper methods derived from `T`
- `refs: Record<string, HTMLElement | undefined>` (populated with `ref="name"`)
- Runtime helpers:
	- `requestRender?: () => void`
	- `error?: Error | null`
	- `hasError?: boolean`
	- `isLoading?: boolean`
	- `emit: <D = any>(eventName: string, detail?: D, options?: CustomEventInit) => boolean`

Notes:
- `ctx` is reactive: assignments to `ctx` update state and trigger re-renders/watchers.
- `emit` is present on the browser runtime `ctx` (the type marks it non-optional). In SSR or minimal fallback modes a full `ctx` object may not be available — treat `emit` as a runtime helper that exists for client-side components.
- Avoid naming collisions with reserved keys (`refs`, `error`, `emit`, ...). The runtime logs a developer warning when collisions are detected.

## State (S)

- Provide an initial `state` object. It's cloned into `ctx` and made reactive.
- Example:
	```ts
	type State = { todos: Todo[]; input: string };
	component<State>('todo-app', { state: { todos: [], input: '' }, render(ctx) { /* ... */ } });
	```

## Computed (C)

- `computed` is a map of functions: `(ctx) => derivedValue`. Exposed as read-only getters on `ctx`.
- Example:
	```ts
	type C = { count: number };
	component<State, C>('comp', {
		computed: { count: (ctx) => ctx.todos.length },
		render: (ctx) => /* ctx.count available */
	});
	```

## Props (P)

- Declared as `{ key: { type, default? } }`. Props are applied to `ctx` before render.
- Example:
	```ts
	type Props = { label?: string; checked?: boolean };
	component<{}, {}, Props>('my-switch', {
		props: { label: { type: String, default: '' }, checked: { type: Boolean, default: false } },
		render: (ctx) => /* use ctx.label / ctx.checked */
	});
	```

## Methods (T) — implementation vs exposed wrapper

Rule: Implementation receives `ctx` as the last parameter. Callers use the wrapper on `ctx` and must not pass `ctx`.

Why: runtime calls `fn(...args, context)`; types model this by dropping the last parameter when exposing the method.

Recommended pattern:
```ts
type MyComponentContext = ComponentContext<State, {}, Props, Methods>;
type Methods = {
	onChange: (e: Event, ctx: MyComponentContext) => void;
	toggle: (id: number, ctx: MyComponentContext) => void;
};

component<State, {}, Props, Methods>('my-comp', {
	onChange(e, ctx) { ctx.checked = (e.target as HTMLInputElement).checked; },
	toggle(id, ctx) { /* update ctx */ },
	render(ctx) { /* use ctx.toggle and ctx.onChange in template */ }
});
```

Template usage: `@change="${ctx.onChange}"` or `@click="${() => ctx.toggle(id)}"`.

Alternatives:
- Make `ctx` optional in the implementation: `toggle(id: number, ctx?: ComponentContext<...>)` if you sometimes don't need it.
- Omit `ctx` completely: you lose typed access to `ctx` inside the implementation (not recommended).

## Lifecycle hooks

Declared explicitly and not wrapped:
- `onConnected(ctx)`, `onDisconnected(ctx)`, `onAttributeChanged(name, oldV, newV, ctx)`, `onError(error, ctx)`, `errorFallback(error, ctx)`.

## Reserved keys & collisions

Runtime reserves a small set of keys on `ctx` (e.g. `refs`, `requestRender`, `error`, `hasError`, `isLoading`, `emit`). Collisions cause TypeScript type conflicts. Recommendations:
- Rename your state/prop key (e.g. `error` -> `errorMessage`) or namespace it (e.g. `form.error`).
- The runtime logs a developer warning at registration when collisions are detected.

## Examples

1) Typed switch:
```ts
interface Props { checked?: boolean }
type Methods = { onChange: (e: Event, ctx: ComponentContext<{}, {}, Props, Methods>) => void };

component<{}, {}, Props, Methods>('my-switch', {
	props: { checked: { type: Boolean, default: false } },
	onChange(e, ctx) { ctx.checked = !!(e.target as HTMLInputElement).checked; },
	render(ctx) { return html`<input type="checkbox" :checked="${!!ctx.checked}" @change="${ctx.onChange}" />`; }
});
```

2) Todo snippet (uses ctx in methods):
```ts
type State = { todos: {id:number; text:string; done:boolean}[]; input: string };
type Methods = { addTodo: (ctx: ComponentContext<State, {}, {}, Methods>) => void };

component<State, {}, {}, Methods>('todo-app', {
	state: { todos: [], input: '' },
	addTodo(ctx) { if (!ctx.input.trim()) return; ctx.todos.push({ id: Date.now(), text: ctx.input, done: false }); ctx.input = ''; },
	render(ctx) { /* use ctx.addTodo() in template */ }
});
```

## Testing tips

- Runtime tests (Vitest + JSDOM): create elements with `document.createElement('tag')`, append to DOM, interact with `shadowRoot`, assert `el.context` and emitted events.
- Compile-time tests: small `.ts` files in test/ which declare typed `ComponentConfig` objects — `tsc` will fail on type regressions.

## Common pitfalls

- Placing `ctx` anywhere but the last parameter in your implementation — the wrapper drops the last parameter and call sites will mismatch.
- Using reserved keys in state/props/computed — causes type collisions.
- Forgetting the props generic when reading `ctx.someProp` — leads to implicit `any`.

---

If you'd like, I can add small examples in `docs/` or a lint rule to catch reserved-key usage automatically.

