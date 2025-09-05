# ⚛️ React Integration Guide

Quick guide for using Custom Elements Runtime components inside React.

## Quickstart

1. Register a component:

```ts
import { component, html } from '@jasonshimmy/custom-elements-runtime';
component('my-counter', (ctx) => html`<button @click="${() => ctx.count++}">Count: ${ctx.count}</button>`, { state: { count: 0 } });
```

2. Use in JSX:

```jsx
function App() {
  return <my-counter />;
}
```

## Props & events

- JSX attributes may render as HTML attributes; for primitives (strings/numbers) this often works, but React does not automatically set complex objects or function props on custom element instances. For objects/functions, set the property explicitly on the element via a `ref`.
- React does not map CustomEvents to JSX props; attach listeners to the element instance via `ref` + `addEventListener`:

```jsx
const elRef = useRef();
useEffect(() => {
  function onCustom(e) { /* e.detail */ }
  const el = elRef.current;
  el.addEventListener('custom-event', onCustom);
  // example: set a function prop imperatively
  el.someCallback = () => console.log('called from element');
  return () => el.removeEventListener('custom-event', onCustom);
}, []);
return <my-counter ref={elRef} />;
```

## Two-way binding

- For `v-model`-style behavior, emit `update:<prop>` events from your element and have the host update the property/state. In React, consume the update via `addEventListener` on a ref.
- When using our compiler, `:model:prop` is compiled into prop + update-handler wiring. For uncompiled hosts (React), use the manual pattern:

```jsx
// host:
<my-custom modelValue={value} ref={elRef} />
// listen for 'update:model-value' to set value
```

### Examples

- Compiler output (when you author with the runtime compiler):

```html
<!-- source template -->
<my-custom :model:value="value" />
```

Compiles to runtime wiring; in React you would consume it manually:

```jsx
// host (React)
const elRef = useRef();
useEffect(() => {
  const el = elRef.current;
  function onUpdate(e) { setValue(e.detail); }
  el.addEventListener('update:value', onUpdate);
  return () => el.removeEventListener('update:value', onUpdate);
}, []);
return <my-custom ref={elRef} value={value} />;
```

- Manual (no compiler):

// React functional component that consumes a runtime-registered custom element
function MyWrapper() {
  const ref = React.useRef();
  const [value, setValue] = React.useState('hello');

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // listen for updates emitted by the custom element
    function onUpdate(e) { setValue(e.detail); }
    el.addEventListener('update:value', onUpdate);
    // set initial prop for non-string/complex values imperatively
    el.value = value;
    return () => el.removeEventListener('update:value', onUpdate);
  }, []);

  return (
    <div>
      <my-custom ref={ref}></my-custom>
      <div>Value: {value}</div>
    </div>
  );
}

See [Events Deep Dive](./events-deep-dive.md) for best practices. Works with React 16.8+.

Build modern UIs with zero config! ✨
