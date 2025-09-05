# 🦄 Svelte Integration Guide

Quick guide for using Custom Elements Runtime components inside Svelte.

## Quickstart

1. Register a component:

```ts
import { component, html } from '@jasonshimmy/custom-elements-runtime';
component('my-counter', (ctx) => html`<button @click="${() => ctx.count++}">Count: ${ctx.count}</button>`, { state: { count: 0 } });
```

2. Use in markup:

```svelte
<my-counter />
```

## Props & events

- For simple values you can use attributes; prefer using property bindings when you need reactive values or non-string types. Svelte's `bind:prop` behavior is for Svelte components and may not automatically wire to arbitrary custom elements — use `on:update:<prop>` or `bind:this` + set the property if you need deterministic behavior.
- Listen to CustomEvents declaratively with `on:event` (preferred). If you need closure capture, use `bind:this` and `addEventListener`.

## Two-way binding

- Emit `update:<prop>` events from your element to support host-side updates. In Svelte you can handle them declaratively:

```svelte
<my-custom bind:value on:update:value={(e) => value = e.detail} />
```

- When using our compiler, `:model:prop` is compiled into explicit prop + onUpdate:<prop> wiring.

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
