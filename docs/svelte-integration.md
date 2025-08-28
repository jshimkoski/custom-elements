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
    - Pass props as attributes (kebab-case).
    - Listen for custom events with `on:eventname` (kebab-case).
    - For function props (event handlers), set them as properties on the element instance using `bind:this`:
      ```svelte
      <my-counter bind:this={counterEl} />
      <script>
         let counterEl;
         counterEl.onCustomEvent = (detail, ctx) => {
            // handle event
         };
      </script>
      ```

## Notes

- Svelte recognizes custom elements automatically.
- For two-way binding, use `bind:this` and custom events. Use `context.emit` in your component to emit events.
- Works with Svelte 3.x and above.
Mix and match with Svelte power! 🌈
