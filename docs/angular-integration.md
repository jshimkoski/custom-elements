# 🅰️ Angular Integration Guide (concise)

Quick guide for using Custom Elements Runtime components inside Angular.

## Usage

1. Register a component (same runtime API):

```ts
import {
  component,
  ref,
  html,
  useEmit,
} from '@jasonshimmy/custom-elements-runtime';

component('my-counter', ({ initialCount = 0 }: { initialCount?: number }) => {
  const count = ref(initialCount);
  const emit = useEmit();

  const handleClick = () => {
    count.value++;
    emit('count-changed', { count: count.value });
  };

  return html` <button @click="${handleClick}">Count: ${count.value}</button> `;
});
```

2. Add the schema to your module so Angular accepts unknown elements:

```ts
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
@NgModule({ schemas: [CUSTOM_ELEMENTS_SCHEMA] })
export class AppModule {}
```

3. Use in templates (property binding preferred):

```html
<!-- prefer property binding for non-string values -->
<my-counter
  [initialCount]="count"
  (count-changed)="onCountChange($event)"
></my-counter>
<!-- plain usage for simple/standalone elements -->
<my-counter></my-counter>
```

## Props & events

- Pass data via Angular property bindings: [propName]="value". This sets the element property directly and is the recommended pattern for objects, numbers, and functions.
- Static string values may be supplied as attributes (e.g. prop="text").
- Listen for CustomEvents in templates with `(event)="handler($event)"`. CustomEvent payloads are available on `$event.detail`.
- For programmatic access or attaching listeners, use `@ViewChild` to get the element reference and call `addEventListener`.

Compatibility note: the runtime's `emit()` helper dispatches standard CustomEvents and will, in some cases, also dispatch alternate event-name variants (for example, emitting `update:model-value` may also dispatch `update:modelValue` to improve framework compatibility). Angular template parsers usually work with kebab-cased event names; if you encounter template parsing issues with colon-containing event names, attach listeners programmatically via `@ViewChild` + `addEventListener` and read the payload from `$event.detail` or the event object's `detail` property.

Note: the runtime's compiler and renderer prefer JS property assignment for bound values in many cases. For native elements a curated list of promotable attributes (for example `value`, `checked`, `disabled`) will be set as properties when bound; for custom elements any bound attribute is promoted to a JS property on the instance and kebab-case attribute names are converted to camelCase property names. This ensures non-string values (objects, functions) and reactivity reach the element immediately.

Example:

```html
<my-custom [value]="value" (update:value)="value = $event.detail"></my-custom>
```

## Two-way binding

- Recommended pattern: emit `update:<prop>` events from inside your component and pair them with a property binding on the host:

```html
<my-custom [value]="value" (update:value)="value = $event.detail"></my-custom>
```

- Compiler note: if you author templates with our `html` compiler, `:model:prop` is compiled to an explicit prop + `update:<prop>` wiring so compiled output works in frameworks like Angular.
- If you want Angular's `[(ngModel)]` compatibility, implement ControlValueAccessor on the host wrapper or emit the standard `input` event from your custom element (the runtime doesn't add ngModel hooks automatically).

Compiler behavior: when using the runtime's `html` compiler, `:model` (argument-less) on a custom element compiles to a `modelValue` prop plus `update:model-value` wiring. `:model:prop` compiles to an explicit prop plus `update:<prop>` event wiring. The emitted events are kebab-cased (for example `update:model-value`) and the runtime expects the new value in `event.detail`.

- Note: the compiler produces kebab-cased `update:<prop-name>` events (for example `update:model-value` or `update:some-prop`). When handling updates in Angular templates use `$event.detail` to read the payload: `(update:some-prop)="value = $event.detail"`.
- Reminder: `:model:prop` is a compiler feature — in raw Angular templates you must bind the property and listen for the `update:<prop>` CustomEvent manually.

### Examples

- Compiler shorthand (source):

- Angular component that consumes a runtime custom element:

```ts
// my-wrapper.component.ts
import { Component } from '@angular/core';

@Component({
  selector: 'my-wrapper',
  template: `
    <my-custom
      [value]="value"
      (update:value)="value = $event.detail"
    ></my-custom>
    <p>{{ value }}</p>
  `,
})
export class MyWrapperComponent {
  value = 'hello';
}
```

Notes: ensure `CUSTOM_ELEMENTS_SCHEMA` is added to your module so Angular accepts the unknown element.

Parser caveat: some template parsers or linters may have trouble with event names that include `:` characters (for example `(update:model-value)`). If you encounter parse errors, attach listeners imperatively via `@ViewChild` + `addEventListener` or use hyphenated event names and listen programmatically.

Runtime note: the renderer optimizes updates and will only notify custom elements when a prop or attribute actually changes; parent re-renders without prop/attr changes won't re-trigger the child's apply/update lifecycle.

## Notes & links

- Angular requires `CUSTOM_ELEMENTS_SCHEMA` to accept unknown/custom elements in templates.
- See [Events Deep Dive](./events-deep-dive.md) for recommended event options (bubbles: true, composed: true) and integration tips.
- Works with Angular 9+.

Angular + Custom Elements = 🚀
