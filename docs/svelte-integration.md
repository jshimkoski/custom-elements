# 🦄 Svelte Integration Guide

Quick guide for using Custom Elements Runtime components inside Svelte.

## Quickstart

1. Register a component:

```ts
import {
  component,
  ref,
  html,
  useProps,
  useEmit,
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

2. Use in markup:

```svelte
<my-counter initialCount={5} on:count-changed={handleCountChange} />
```

## Props & events

- For simple values you can use attributes; prefer using property bindings when you need reactive values or non-string types. Svelte's `bind:prop` behavior is for Svelte components and may not automatically wire to arbitrary custom elements — use `on:update:<prop>` or `bind:this` + set the property if you need deterministic behavior.
- When using our compiler the `:model` and `:model:prop` shorthands will be compiled to explicit prop + `update:<prop>` wiring. The runtime promotes bound attributes into JS properties for custom elements (mapping kebab-case attributes to camelCase properties) so property bindings and compiler-emitted wiring are the recommended pattern for non-string values and reactive flows.
- Listen to CustomEvents declaratively with `on:event` (preferred). If you need closure capture, use `bind:this` and `addEventListener`.

Compatibility note: `useEmit()` and the internal `emit()` helper dispatch standard DOM CustomEvents and will also dispatch alternate event-name variants in some cases (for example `update:model-value` and `update:modelValue`). If Svelte's template parser or tooling complains about colon-containing event names, prefer `bind:this` + `addEventListener` on the element reference and read `event.detail` for the payload.

## Two-way binding

- Emit `update:<prop>` events from your element to support host-side updates. In Svelte you can handle them declaratively:

```svelte
<my-custom bind:value on:update:value={(e) => value = e.detail} />
```

- When using our compiler, `:model:prop` is compiled into explicit prop + onUpdate:<prop> wiring. Emitted events are kebab-cased (for example `update:model-value`) and should carry the new value in `event.detail` (use `bubbles: true, composed: true`).

Parser caveat: if your host tooling or linter complains about `on:update:...` or colon-containing event names, use `bind:this` + `addEventListener` as an alternative.

Runtime note: the renderer optimizes updates and will only notify custom elements when a prop or attribute actually changes; parent renders that don't change a child's props/attrs won't re-trigger the child's apply/update lifecycle.

### Examples

- Compiler shorthand (source):

- Svelte component consuming a runtime custom element (declarative on:update):

```svelte
<script>
	import { onMount } from 'svelte';
	let value = 'hello';
	let el;
	onMount(() => {
		// optional: imperative wiring or props
		if (el) el.value = value;
	});
</script>

<my-custom bind:this={el} on:update:value={(e) => value = e.detail} />
<p>{value}</p>
```

See [Events Deep Dive](./events-deep-dive.md). Works with Svelte 3.x+.

Mix and match with Svelte power! 🌈
