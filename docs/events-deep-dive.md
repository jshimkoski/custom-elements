# 🔔 Events Deep Dive

This page explains the runtime's DOM-first events model and practical guidance for
emitting and handling events across framework boundaries.

## Core idea

- Components should emit standard DOM CustomEvents. Use `context.emit(name, detail)`
  or dispatch a `CustomEvent` directly from the component. Events should generally
  set `bubbles: true` and `composed: true` so they cross shadow boundaries and are
  discoverable by host frameworks.
- Hosts and framework integrations should listen using normal DOM or framework
  bindings (e.g., `@event` in Vue, `on:event` in Svelte, `(event)` in Angular, or
  `addEventListener` on refs for React).

## Emitting events from components

Use `context.emit` inside your component to dispatch events:

```ts
// preferred
ctx.emit('save', { id: 123 });

// equivalent low-level form
this.dispatchEvent(new CustomEvent('save', {
  detail: { id: 123 },
  bubbles: true,
  composed: true,
}));
```

API note: `ctx.emit(name, detail?, options?)` forwards `options` to the underlying CustomEvent constructor (for example `{ cancelable: true, bubbles: true, composed: true }`) and returns a boolean indicating whether the event was not prevented (i.e., `true` == not defaultPrevented).

Recommendation: always use `bubbles: true` and `composed: true` for events that
need to reach host pages or framework templates.

## Cancelable events

Some events represent requests ("please close", "please delete") where the host
may want to veto the action (for example, unsaved changes). In those cases emit a
cancelable CustomEvent and check whether the host called `preventDefault()`.

How to emit a cancelable event from a component:

```ts
// inside component logic
// emit a cancelable event and get a boolean result indicating whether the
// event was *not* defaultPrevented (true == allowed)
const allowed = ctx.emit('close', { reason: 'user' }, { cancelable: true });
if (!allowed) {
  // the host prevented the close by calling event.preventDefault()
  return; // abort closing
}
// proceed to close the component
```

How a host can prevent the action:

```js
const modal = document.querySelector('my-modal');
modal.addEventListener('close', (ev) => {
  if (hasUnsavedChanges()) {
    ev.preventDefault(); // veto the close
  }
});
```

Notes and best practices:
- Call `ctx.emit(name, detail, { cancelable: true })` only when the action is
  logically a request that the host might legitimately block. Most events are
  simple notifications and shouldn't be cancelable by default.
- The runtime helper `ctx.emit` returns `true` when the event was not prevented
  (convenient for immediate checks). Always check this return value before
  continuing with an action that the host can veto.
- Parser caveat: some host framework template parsers (or strict linters) may
  have difficulty with event attribute names that include `:` characters (for
  example `(update:model-value)` or `@update:model-value`) in certain syntaxes.
- If you encounter parse/compile errors in a host framework, prefer using plain
  `addEventListener` on a ref or use hyphenated event names and listen
  imperatively.
- Avoid making every event cancelable — prefer explicit cancelable events for
  clear intent and fewer accidental interactions.

## Handling events in hosts and frameworks

- Vue: `<my-comp @save="onSave" />` — handler receives a DOM CustomEvent; payload is `e.detail`.
- Svelte: `<my-comp on:save={onSave} />` — handler receives a DOM CustomEvent.
- Angular: `<my-comp (save)="onSave($event)"></my-comp>` — handler receives the event object.
- React: use a ref and `addEventListener` on the element instance to listen for CustomEvents.

If you need to attach programmatic handlers to capture closure state on the host,
get a reference to the element and add/remove listeners using `addEventListener`.

### Example: prefer semantic event names (recommended)

```html
<!-- child component (emit a semantic event) -->
<!-- inside the child: -->
<!-- ctx.emit('open', { id: 42 }) -->

<!-- parent (runtime template) -->
<cer-button @open="${ctx.handleOpen}" />
```

```ts
// parent handler
function handleOpen(ev: Event) {
  // CustomEvent payload is in ev.detail
  if ('detail' in ev) console.log('opened', (ev as CustomEvent).detail);
}
```

Recommendation: avoid reusing native event names (like `click`) for semantic payload events; use descriptive names such as `open`, `save`, or `activate`.

## Interoperability guidance

- Prefer DOM CustomEvents for cross-framework communication.
- Framework adapters should translate framework listener syntaxes to native DOM listeners
  for CustomEvents dispatched by components.
- Avoid coupling component internals to host implementation details; expose a clear,
  event-driven interface instead.

### :model / update:<prop> events

- For two-way binding compatibility (:model and our compiler transforms), components should emit kebab-cased `update:<prop-name>` CustomEvents (for example `update:model-value` or `update:some-prop`).
- The runtime and framework adapters expect the new value to be the event payload (the raw value) available on `event.detail`.
- Emit events with `bubbles: true` and `composed: true` so they traverse Shadow DOM boundaries and are discoverable by host templates and framework bindings.

## Best practices checklist

- When writing components:
  - Use `context.emit(name, detail)` to notify outside consumers.
  - Set `bubbles: true` and `composed: true` when events need to cross shadow boundaries.

- When writing host code or framework adapters:
  - Use the framework's event binding where available.
  - When you need closure capture or imperative wiring, use refs and `addEventListener`.

## See also
- `component.md`, `component-config.md`, `cross-component-communication.md`, and
  framework integration guides for concrete examples.
