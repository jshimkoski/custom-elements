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
  - Listen for custom events with `(eventname)="handler($event)"` (kebab-case).
  - For function props (event handlers), set them as properties on the element instance using `ViewChild`:
    ```ts
    @ViewChild('counterEl') counterEl: ElementRef;
    ngAfterViewInit() {
      this.counterEl.nativeElement.onCustomEvent = (detail, ctx) => {
          // handle event
      };
    }
    ```


## Notes

- Angular requires `CUSTOM_ELEMENTS_SCHEMA` for custom elements.
- For two-way binding with `[(ngModel)]`, your custom element must emit the expected events (e.g., `input`). The runtime does not emit these by default; you may need to wire them manually using `context.emit` in your component.
- Works with Angular 9+.

Angular + Custom Elements = 🚀
