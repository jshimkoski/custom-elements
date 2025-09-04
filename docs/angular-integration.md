# 🅰️ Angular Integration Guide

Integrate Custom Elements Runtime components in Angular projects:

## Usage

1. **Register your custom element:**
  ```ts
  import { component, html } from '@jasonshimmy/custom-elements-runtime';
  component('my-counter', ctx => html`<button @click="${() => ctx.count++}">Count: ${ctx.count}</button>`, { state: { count: 0 } });
  ```

2. **Add schemas to your module:**
  ```ts
  import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
  @NgModule({
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    // ...
  })
  export class AppModule {}
  ```

3. **Use in Angular templates:**
  ```html
  <my-counter></my-counter>
  ```

4. **Props and events:**
  - Pass props as attributes (kebab-case).
  - Idiomatic (DOM) event listeners — use Angular's template binding to listen for CustomEvents emitted by the component:
    ```html
    <my-counter (custom-event)="handle($event)"></my-counter>
    ```

    ```ts
    handle(e: CustomEvent) {
      // e.detail
    }
    ```

  - If you need to attach a handler programmatically (for example to capture
    closures from the host framework), use `@ViewChild` and add a DOM listener
    directly on the element instance. Prefer framework template bindings when
    possible:
    ```ts
    @ViewChild('counterEl', { read: ElementRef }) counterEl!: ElementRef;
    ngAfterViewInit() {
      this.counterEl.nativeElement.addEventListener('custom-event', (e: CustomEvent) => {
        // handle e.detail
      });
    }
    ```


## Notes

- Angular requires `CUSTOM_ELEMENTS_SCHEMA` for custom elements.
- For two-way binding with `[(ngModel)]`, your custom element must emit the expected events (e.g., `input`). The runtime does not emit these by default; you may need to wire them manually using `context.emit` in your component.
- See [Events Deep Dive](./events-deep-dive.md) for recommended event emission options (`bubbles: true, composed: true`) and framework integration tips.
- Works with Angular 9+.

Angular + Custom Elements = 🚀
