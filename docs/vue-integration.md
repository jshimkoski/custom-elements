# 🦊 Vue Integration Guide (concise)

Quick guide for using Custom Elements Runtime components inside Vue.

## Quickstart

1. Register a component as usual:

```ts
import { component, html } from '@jasonshimmy/custom-elements-runtime';
component('my-counter', (ctx) => html`<button @click="${() => ctx.count++}">Count: ${ctx.count}</button>`, { state: { count: 0 } });
```

2. Use it in Vue templates directly:

```vue
<template>
  <my-counter />
</template>
```

## Props & events

- Bind props with Vue syntax (e.g. `:prop="value"`). For simple string literals you may use attributes, but prefer property binding for numbers, objects, and functions. Use kebab-cased attribute names when necessary for HTML compatibility.
- Listen to DOM CustomEvents declaratively with `@event` (preferred). Handlers receive a DOM CustomEvent; the payload is `event.detail`.
- If you need closure capture or must attach a function/object prop, get a `ref` to the element and set the property on the instance (rare).

## Vue two-way binding (v-model)

- To support `v-model`, your element should emit the expected update event (for example `update:model-value` or `input`) with the new value.

- Note: `:model:prop` is a compiler shorthand provided by the runtime's `html` compiler. The compiler transforms it into prop + `update:<prop>` event wiring at build time. If you're authoring raw Vue templates (not using our compiler), Vue will not understand `:model:prop` and you must manually bind prop + listen for the update event.

- When using our compiler, `:model:prop` on custom elements is compiled into an explicit prop set plus an update handler (`onUpdate:<prop>`), producing direct prop + handler wiring. For uncompiled templates (raw Vue templates), manually wire prop + update event:

```vue
<my-custom :modelValue="value" @update:model-value="v => value = v" />
```

Inside your element, emit updates via `ctx.emit('update:propName', newValue)` or dispatch a CustomEvent with `detail = newValue` (use `bubbles: true, composed: true`).

### Examples (framework component consuming runtime component)

- Vue SFC (Vue 3) — component consumes a runtime-registered custom element and uses `v-model` at the component level. The runtime compiler can also emit the compiled prop+update wiring shown in comments:

```vue
<script setup>
import { ref } from 'vue';
const value = ref('hello');
</script>

<template>
  <!-- Vue component-level v-model (Vue compiles this into prop + update event) -->
  <my-custom v-model:value="value" />
  <p>Value: {{ value }}</p>
</template>
```

Notes: if you author the host template with the runtime compiler, `:model:value="value"` will compile to the equivalent `<my-custom :value="value" @update:value="v => value = v" />` wiring that plain templates can consume.

See [Events Deep Dive](./events-deep-dive.md). Works with Vue 2.x and 3.x.

Enjoy seamless interoperability! 🚀
