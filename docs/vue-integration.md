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
  - Listen for custom events with `@eventname` (kebab-case).
  - For function props (event handlers), set them as properties on the element instance using a ref:
    ```vue
    <template>
        <my-counter ref="counter" />
    </template>
    <script setup>
    import { onMounted } from 'vue';
    const counter = ref();
    onMounted(() => {
        counter.value.onCustomEvent = (detail, ctx) => {
          // handle event
        };
    });
    </script>
    ```


## Notes

- Vue treats custom elements as native tags. No extra config needed.
- For two-way binding with `v-model`, your custom element must emit the expected events (e.g., `input` or `update:modelValue`). The runtime does not emit these by default; you may need to wire them manually using `context.emit` in your component.
- Works with Vue 2.x and 3.x.
Enjoy seamless interoperability! 🚀
