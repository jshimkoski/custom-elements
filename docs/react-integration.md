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
  - Pass props as attributes: `<my-counter count={5} />` (kebab-case will be mapped automatically)
  - Listen for custom events using `addEventListener` on a ref:
    ```jsx
    const elRef = useRef();
    useEffect(() => {
        elRef.current.addEventListener('customEvent', e => {
          // e.detail, e.target
        });
        return () => elRef.current.removeEventListener('customEvent', handler);
    }, []);
    <my-counter ref={elRef} />
    ```
  - For function props (event handlers), set them as properties on the element instance via ref:
    ```jsx
    useEffect(() => {
        elRef.current.onCustomEvent = (detail, ctx) => {
          // handle event
        };
    }, []);
    ```


## Notes

- React supports custom elements natively.
- For custom events, use refs and `addEventListener` as React does not natively map custom events to props.
- For function props, always set them as properties on the element instance via ref.
- For two-way binding, use refs and event handlers. Use `context.emit` in your component to emit events.
- Works with React 16.8+.
Build modern UIs with zero config! ✨
