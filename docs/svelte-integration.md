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
      - Idiomatic (DOM) event listeners — use `on:eventname` in Svelte markup to listen for CustomEvents emitted by the component:
         ```svelte
         <my-counter on:custom-event={handle} />
         <script>
            function handle(e) {
               // e.detail
            }
         </script>
         ```

      - Host-level callback (property) — use `bind:this` and assign a function to `el.onHost<Event>` when you need to pass a closure or rely on direct host-callback semantics:
         ```svelte
         <my-counter bind:this={counterEl} />
         <script>
            let counterEl;
            onMount(() => {
               counterEl.onHostCustomEvent = (detail, ctx) => {
                  // handle event
               };
            });
         </script>
         ```

## Notes

- Svelte recognizes custom elements automatically.
- For two-way binding, use `bind:this` and custom events. Use `context.emit` in your component to emit events.
- See [Events Deep Dive](./events-deep-dive.md) for details on host-level handler naming (`onHost<Event>`), precedence, and recommended event emission options (`bubbles: true, composed: true`).
- Works with Svelte 3.x and above.

Mix and match with Svelte power! 🌈

