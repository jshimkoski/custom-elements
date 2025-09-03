# 🔔 Events Deep Dive

This page explains how host-level handlers (the runtime convention `onHost<Event>`) work, how injected methods are wired, why the runtime uses this pattern, and simple best practices for framework interoperability.

## What is `onHost<Event>`?

- `onHost<Event>` (for example `onHostClick`) is an internal, explicit convention used by the runtime to represent a handler attached to the host element (the custom element instance) rather than an inner DOM node.
- It is *not* the API consumers typically write in framework templates. Consumers keep using normal DOM events (for example `@click` in Vue / `on:click` in Svelte) — the runtime emits standard CustomEvent instances that bubble and cross the shadow boundary.

## How it works (high level)

- Template compiler / VDOM
  - When a VNode prop named `onHostX` is present, the VDOM attaches a listener/property on the element instance mapped to the DOM event `x` (lowercased). For example `onHostClick` → `click`.
  - Directive `@click` in templates should still produce normal DOM event listeners on children; the runtime's compiler may also emit `onHostX` when binding to the host explicitly.

- Component runtime
  - When a component config contains keys like `onHostClick`, the runtime wires a single host listener that resolves the handler using the precedence rules below and calls it with `(detail, ctx)`.
  - The runtime also injects handlers and helper methods into the component `context` (for example `context.emit`) so injected methods can be invoked from templates and other code inside the component.

## Precedence rules (deterministic order)

When a host event happens the runtime resolves a single handler in the following order:

1. Element property: `el.onHostClick` — a developer set function on the element instance.
2. Context method: `context.onHostClick` — usually set from props or the component instance at runtime.
3. Config method: `config.onHostClick` — the handler defined on the component configuration object when the component was registered.

Only the first found handler is invoked. This avoids duplicate calls and keeps lifecycle predictable.

## Emitting events from components

Always dispatch events that are usable by framework parents and host-level listeners:

```ts
this.dispatchEvent(new CustomEvent('save', {
  detail: { id: 123 },
  bubbles: true,
  composed: true,
}));
// or
ctx.emit('save', { id: 123 });
```

- Use `bubbles: true` and `composed: true` so the event crosses Shadow DOM boundaries and can be captured by the host (and by framework templates).
- For host-level config handlers, the runtime will map the event name to `onHostSave` and call the resolved handler with `(detail, ctx)`.

## Injected methods and `context.emit`

- `context.emit(name, detail)` dispatches the event and also checks for any `onHost<Name>` handler (element prop / context / config) and calls it with `(detail, ctx)`.
- This allows internal logic to both notify DOM listeners and call host-level callbacks in one place.

### Implementation detail: host-handled marker

- The runtime uses a small internal tracker to avoid calling the same logical handler twice when an event is both dispatched and handled by the runtime-wired host listener.
- Implementation: the runtime keeps a module-level WeakSet called `HOST_HANDLED`. When the runtime's single host listener runs it adds the Event to `HOST_HANDLED` (HOST_HANDLED.add(event)). After dispatching, `context.emit` checks `HOST_HANDLED.has(event)` and skips direct handler invocation when the host listener already ran.
- Why WeakSet: it avoids mutating the Event object, prevents accidental property collisions, and doesn't create memory leaks (events are held weakly). This is an internal detail — consumers should not need to interact with `HOST_HANDLED`.

## Why this pattern?

- Clear semantics: host vs inner-element handlers are distinct.
- Performance: the runtime maintains a single host listener rather than per-render closures on the host.
- Predictability: fixed handler precedence prevents double-invocation and makes HMR/config swaps deterministic.

## Best practices

- For framework authors (Vue/Svelte): keep using normal template event syntax (`@click`, `on:click`) — the runtime emits standard CustomEvents that your framework attaches to. No change required.
- For React users: prefer callback props or attach listeners via refs:
  - Callback prop: accept an `onSave` prop and call it from `context.emit` or from your component API if you expose it.
  - Ref + addEventListener: use `ref` and `el.addEventListener('save', handler)` if you want native DOM style listeners.
- Prefer events for cross-framework communication. Use `context.emit(...)` internally, and avoid relying on `onHostX` in templates unless you are intentionally wiring host-level callbacks.
- If you want to pass a function prop from parent to child (React-style), the runtime will pick up function props and inject them into `context` (depending on your component config). Prefer explicit prop names and document them.

## Quick checklist

- When writing components:
  - Use `this.dispatchEvent(new CustomEvent(..., { bubbles: true, composed: true }))`.
  - Prefer `context.emit(name, detail)` to notify both DOM listeners and host handlers.
- When writing parent templates:
  - Use framework idiomatic listeners: `@save` (Vue), `on:save` (Svelte), or ref/listener (React).

## See also
- `component.md`, `component-config.md`, `cross-component-communication.md`, and framework integration guides for concrete examples.
