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
   - Pass props as attributes: `<my-counter count={5} />`
   - Listen for events using `onEventName` (camelCase): `<my-counter onClick={handler} />`


## Notes
- React supports custom elements natively.
- For custom events, use refs and `addEventListener` as React does not natively map custom events to props.
- For two-way binding, use refs and event handlers.
- Works with React 16.8+.

---
Build modern UIs with zero config! ✨
