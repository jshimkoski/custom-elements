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
  - Pass props using standard HTML attributes (kebab-case).
  - Listen for custom events with `@eventname` (kebab-case). This is the idiomatic, declarative way in Vue and listens for DOM CustomEvents dispatched by the component.
  - Alternatively, if you need to pass a closure or attach a programmatic handler,
    use a `ref` and add a DOM listener on the element instance. Prefer the
    declarative `@event` template binding when possible.

    Recommended (idiomatic Vue) — listen to DOM CustomEvents:
    ```vue
    <template>
      <my-counter @custom-event="handle" />
    </template>
    <script setup>
    function handle(e) {
      // e is the DOM CustomEvent; payload is e.detail
    }
    </script>
    ```

    Programmatic handler via ref (preferred only when you need closure capture):
    ```vue
    <template>
      <my-counter ref="counter" />
    </template>
    <script setup>
    import { onMounted, ref } from 'vue';
    const counter = ref(null);
    onMounted(() => {
      counter.value.addEventListener('custom-event', (e) => {
        // handle e.detail
      });
    });
    </script>
    ```


## Notes

- Vue treats custom elements as native tags. No extra config needed.
- For two-way binding with `v-model`, your custom element must emit the expected events (e.g., `input` or `update:modelValue`). The runtime does not emit these by default; you may need to wire them manually using `context.emit` in your component.
- See [Events Deep Dive](./events-deep-dive.md) for recommended event emission options (`bubbles: true, composed: true`) and interoperability guidance.
- Works with Vue 2.x and 3.x.

Enjoy seamless interoperability! 🚀
