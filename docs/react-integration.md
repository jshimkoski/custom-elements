# ⚛️ React Integration Guide

Quick guide for using Custom Elements Runtime components inside React.

## Quickstart

1. Register a component:

```ts
import {
  component,
  ref,
  html,
  useEmit,
  useProps,
} from '@jasonshimmy/custom-elements-runtime';

component('my-counter', () => {
  const props = useProps({ initialCount: 0 });
  const count = ref(props.initialCount);
  const emit = useEmit();

  const handleClick = () => {
    count.value++;
    emit('count-changed', { count: count.value });
  };

  return html` <button @click="${handleClick}">Count: ${count.value}</button> `;
});
```

2. Use in JSX:

```jsx
function App() {
  return <my-counter initialCount={5} />;
}
```

## Props & events

- JSX attributes may render as HTML attributes; for primitives (strings/numbers) this often works, but React does not automatically set complex objects or function props on custom element instances. For objects/functions, set the property explicitly on the element via a `ref`.
- React's synthetic event system does not capture DOM CustomEvents' `detail` payload in JSX props. Use `addEventListener` on the element instance to receive CustomEvents and read `event.detail`.

Compatibility note: the runtime's `emit()` (and `context.emit`) dispatches standard DOM CustomEvents and — for compatibility — will also dispatch alternate event-name variants when applicable (for example, emitting `update:model-value` may also dispatch `update:modelValue`). Because framework event binding and template parsers differ in how they reference event names, prefer listening via `addEventListener` on a `ref` for full compatibility with React hosts, and read the payload from `event.detail`.

```jsx
const elRef = useRef();
useEffect(() => {
  function onCustom(e) {
    /* e.detail */
  }
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
  function onUpdate(e) {
    setValue(e.detail);
  }
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

Runtime note: the renderer will only notify custom elements when a prop or attribute actually changes; parent updates that don't change a child's props/attrs won't retrigger the child's apply/update lifecycle.

See [Events Deep Dive](./events-deep-dive.md) for best practices. Works with React 16.8+.

Build modern UIs with zero config! ✨
