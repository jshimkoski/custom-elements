# 🦄 Svelte Integration Guide

Use Custom Elements Runtime components in Svelte apps:

## Usage

1. **Register your custom element:**
   ```ts
   import { component, html } from '@jasonshimmy/custom-elements-runtime';
   component('my-counter', ctx => html`<button @click="${() => ctx.count++}">Count: ${ctx.count}</button>`, { state: { count: 0 } });
   ```

2. **Use in Svelte markup:**
   ```svelte
   <my-counter />
   ```

3. **Props and events:**
   - Pass props as attributes.
   - Listen for events with `on:eventname`.

## Notes
- Svelte recognizes custom elements automatically.
- For two-way binding, use `bind:this` and custom events.
- Works with Svelte 3.x and above.

---
Mix and match with Svelte power! 🌈
