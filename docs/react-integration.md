# ⚛️ React Integration Guide

Use Custom Elements Runtime components in React projects:

## Usage

1. **Register your custom element:**
  ```ts
  import { component, html } from '@jasonshimmy/custom-elements-runtime';
  component('my-counter', ctx => html`<button @click="${() => ctx.count++}">Count: ${ctx.count}</button>`, { state: { count: 0 } });
  ```

2. **Use in React JSX:**
  ```jsx
  function App() {
    return <my-counter />;
  }
  ```

3. **Props and events:**
  - Pass props as attributes: `<my-counter count={5} />` (kebab-case will be mapped automatically).
  - Idiomatic (DOM) event listeners — use `addEventListener` on a ref to listen for CustomEvents emitted by the component:
    ```jsx
    const elRef = useRef();
    useEffect(() => {
      function handler(e) {
        // e.detail
      }
      elRef.current.addEventListener('customEvent', handler);
      return () => elRef.current.removeEventListener('customEvent', handler);
    }, []);
    <my-counter ref={elRef} />
    ```

  - If you need closure capture in React, assign a programmatic listener via ref and
    `addEventListener`. Prefer the `addEventListener` + ref approach since React
    doesn't map custom events to props:
    ```jsx
    useEffect(() => {
      function handler(e) { /* e.detail */ }
      elRef.current.addEventListener('customEvent', handler);
      return () => elRef.current.removeEventListener('customEvent', handler);
    }, []);
    ```


## Notes

- React supports custom elements natively.
- For custom events, use refs and `addEventListener` as React does not natively map custom events to props.
- For function props, always set them as properties on the element instance via ref.
- For two-way binding, use refs and event handlers. Use `context.emit` in your component to emit events.
- See [Events Deep Dive](./events-deep-dive.md) for recommended event emission options (`bubbles: true, composed: true`) and integration tips.
- Works with React 16.8+.

Build modern UIs with zero config! ✨
