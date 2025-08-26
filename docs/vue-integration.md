# 🦊 Vue Integration Guide

Integrate Custom Elements Runtime components with Vue easily:

## Usage

1. **Register your custom element as usual:**
   ```ts
   import { component, html } from '@jasonshimmy/custom-elements-runtime';
   component('my-counter', ctx => html`<button @click="${() => ctx.count++}">Count: ${ctx.count}</button>`, { state: { count: 0 } });
   ```

2. **Use in Vue templates:**
   ```vue
   <template>
     <my-counter></my-counter>
   </template>
   ```

3. **Props and events:**
   - Pass props using standard HTML attributes.
   - Listen for custom events with `@eventname`.


## Notes

- Vue treats custom elements as native tags. No extra config needed.
- For two-way binding with `v-model`, your custom element must emit the expected events (e.g., `input` or `update:modelValue`). The runtime does not emit these by default; you may need to wire them manually.
- Works with Vue 2.x and 3.x.
Enjoy seamless interoperability! 🚀
