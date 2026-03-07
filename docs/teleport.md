# 🚀 Teleport: `useTeleport`

`useTeleport()` lets you render virtual DOM content into any DOM node **outside** the current component's shadow root. This is essential for UI that must visually escape component boundaries — modals, tooltips, popovers, and notification toasts.

---

## API

```typescript
function useTeleport(target: string | Element): TeleportHandle;
```

| Parameter | Type                | Description                                           |
| --------- | ------------------- | ----------------------------------------------------- |
| `target`  | `string \| Element` | A CSS selector string or a direct `Element` reference |

### `TeleportHandle`

```typescript
interface TeleportHandle {
  portal(content: VNode | VNode[] | null | undefined): void;
  destroy(): void;
}
```

- **`portal(content)`** — Renders (or updates) the given virtual DOM tree at the target. Pass `null` or `undefined` to clear previously rendered content.
- **`destroy()`** — Removes the teleport container and cleans up all rendered content. Call this in `useOnDisconnected` to prevent memory leaks.

---

## Basic Example

```typescript
import {
  component,
  html,
  ref,
  useOnDisconnected,
  useTeleport,
} from '@jasonshimmy/custom-elements-runtime';

component('modal-trigger', () => {
  const isOpen = ref(false);

  const { portal, destroy } = useTeleport('#modal-root');
  useOnDisconnected(destroy);

  if (isOpen.value) {
    portal(html`
      <div class="modal-overlay">
        <div class="modal">
          <h2>Hello!</h2>
          <button @click="${() => (isOpen.value = false)}">Close</button>
        </div>
      </div>
    `);
  } else {
    portal(null); // Clear the portal when closed
  }

  return html`
    <button @click="${() => (isOpen.value = true)}">Open Modal</button>
  `;
});
```

---

## Tooltip Example

```typescript
component('info-tooltip', () => {
  const visible = ref(false);
  const { portal, destroy } = useTeleport('body');
  useOnDisconnected(destroy);

  portal(
    visible.value
      ? html`<div class="tooltip" role="tooltip">This is a tooltip</div>`
      : null,
  );

  return html`
    <span
      @mouseenter="${() => (visible.value = true)}"
      @mouseleave="${() => (visible.value = false)}"
      >ℹ️</span
    >
  `;
});
```

---

## How It Works

1. `useTeleport(target)` finds the target element and appends a `<cer-teleport>` container to it.
2. Each call to `portal()` runs the virtual DOM renderer against that container — diffing and patching efficiently.
3. `destroy()` renders an empty node set (cleaning up event listeners and refs) then removes the container from the DOM.

---

## SSR Safety

`useTeleport()` is a no-op in server-side rendering environments (where `document` is undefined). It returns a stub handle with empty `portal()` and `destroy()` functions.

---

## Error Handling

If the target selector does not match any element, `useTeleport()` logs a warning and returns a no-op handle:

```
[useTeleport] Target "#modal-root" not found in the document.
Teleported content will not be rendered.
```

Ensure the target element is present in the DOM before calling `useTeleport()`.

---

## HTML Structure

Content rendered to a teleport target appears like this:

```html
<div id="modal-root">
  <cer-teleport data-cer-teleport>
    <!-- Your portal content renders here -->
    <div class="modal-overlay">…</div>
  </cer-teleport>
</div>
```

---

## Tips

- Always call `useOnDisconnected(destroy)` to avoid orphaned DOM nodes.
- You can call `portal(null)` to clear content without destroying the container (avoids re-creating the container on next open).
- Multiple separate `useTeleport()` calls to the same target each create their own `<cer-teleport>` container — they do not interfere with each other.
- The `<cer-teleport>` container is an ordinary `HTMLElement`. You can style it with CSS `display: contents` if you want it to be invisible to layout.
