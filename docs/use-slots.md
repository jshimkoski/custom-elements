# 🧩 useSlots() — Slot Inspection

`useSlots()` lets you inspect which named slots have been filled by the component consumer, and retrieve the actual child elements assigned to each slot. This enables conditional slot rendering — only wrapping a header in a `<header>` tag when the consumer has actually provided header content.

## 📦 Import

```ts
import { useSlots } from '@jasonshimmy/custom-elements-runtime';
```

## 🔤 Signature

```ts
function useSlots(): {
  has(name?: string): boolean;
  getNodes(name?: string): Element[];
  names(): string[];
};
```

| Method            | Returns     | Description                                                                   |
| ----------------- | ----------- | ----------------------------------------------------------------------------- |
| `has(name?)`      | `boolean`   | `true` if the named slot (or default slot when `name` is omitted) has content |
| `getNodes(name?)` | `Element[]` | All child elements assigned to the named slot (or the default slot)           |
| `names()`         | `string[]`  | Names of all slots that have at least one child, including `'default'`        |

- Must be called during component render.
- During SSR and discovery renders, all methods return empty/false no-ops — safe to call unconditionally.

## ✏️ Basic Example

```ts
import {
  component,
  html,
  useSlots,
} from '@jasonshimmy/custom-elements-runtime';

component('my-card', () => {
  const slots = useSlots();

  return html`
    <div class="card">
      ${slots.has('header')
        ? html`<header class="card-header"><slot name="header"></slot></header>`
        : html``}

      <div class="card-body">
        <slot></slot>
      </div>

      ${slots.has('footer')
        ? html`<footer class="card-footer"><slot name="footer"></slot></footer>`
        : html``}
    </div>
  `;
});
```

Consumer usage:

```html
<!-- With header and footer -->
<my-card>
  <h2 slot="header">Card Title</h2>
  <p>Card body content goes here.</p>
  <button slot="footer">Confirm</button>
</my-card>

<!-- Without footer — footer wrapper element is not rendered at all -->
<my-card>
  <h2 slot="header">Simple Card</h2>
  <p>No footer needed.</p>
</my-card>
```

## 🔍 `has(name?)` — Check Slot Presence

```ts
const slots = useSlots();

slots.has(); // true if default slot has at least one child
slots.has('default'); // same as calling has() with no argument
slots.has('header'); // true if at least one child has slot="header"
slots.has('footer'); // true if at least one child has slot="footer"
```

Useful for avoiding empty wrapper elements:

```ts
component('section-wrapper', () => {
  const slots = useSlots();

  return html`
    <section>
      ${slots.has('title')
        ? html`<h2 class="section-title"><slot name="title"></slot></h2>`
        : html``}
      <div class="section-content"><slot></slot></div>
    </section>
  `;
});
```

## 📋 `getNodes(name?)` — Access Slotted Elements

```ts
const slots = useSlots();

const defaultNodes = slots.getNodes(); // default slot children
const headerNodes = slots.getNodes('header'); // children with slot="header"
```

Use case — derive component behaviour from slotted content count:

```ts
component('tab-list', () => {
  const slots = useSlots();
  const tabCount = slots.getNodes('tab').length;

  return html`
    <div class="tabs" style="--tab-count:${tabCount}">
      <slot name="tab"></slot>
      <slot></slot>
    </div>
  `;
});
```

## 📌 `names()` — List All Filled Slots

```ts
const slots = useSlots();
const filled = slots.names(); // e.g. ['default', 'header', 'footer']
```

Useful for debugging or for dynamic slot rendering patterns:

```ts
component('debug-slots', () => {
  const slots = useSlots();

  return html`
    <div>
      <p>Filled slots: ${slots.names().join(', ')}</p>
      <slot></slot>
    </div>
  `;
});
```

## 🌗 Combining with `when` Directive

```ts
import {
  component,
  html,
  useSlots,
} from '@jasonshimmy/custom-elements-runtime';
import { when } from '@jasonshimmy/custom-elements-runtime/directives';

component('my-dialog', () => {
  const slots = useSlots();

  return html`
    <dialog>
      ${when(
        slots.has('title'),
        () =>
          html` <div class="dialog-title">
            <slot name="title"></slot>
          </div>`,
      )}

      <div class="dialog-body">
        <slot></slot>
      </div>

      ${when(
        slots.has('actions'),
        () =>
          html` <div class="dialog-actions">
            <slot name="actions"></slot>
          </div>`,
      )}
    </dialog>
  `;
});
```

## ⚠️ Rules & Gotchas

- **Must be called during render.** Calling `useSlots()` outside of a component render function throws an error.
- **Checks light DOM children.** Slot detection queries the host element's `children` for elements with a matching `slot` attribute — not the shadow DOM. This is the correct approach for standard Web Components slot semantics.
- **No reactivity on slot changes.** `useSlots()` reflects the state of slotted children at the time of render. If children are added or removed after the initial render, use a `slotchange` event listener (via `useOnConnected`) to trigger a re-render.
- **Default slot.** Passing `'default'` or `undefined` to `has()` / `getNodes()` both check for children without a `slot` attribute — they are equivalent.

## 🔗 Related

- [Functional API](./functional-api.md) — full hooks reference
- [useExpose()](./use-expose.md) — expose an imperative API from a component
- [Directives](./directives.md) — `when`, `each`, `match` for conditional and list rendering
