# Production primitives

`component(tag, render, { formAssociated: true })` declares a form-associated custom element. Call `useFormInternals({ reset, disabled, restore })` during render to obtain its cached `ElementInternals`; SSR and component discovery return `null`. Use `setFormValue(value, state)` and `setValidity(flags, message, anchor)` to implement the native contract. CER forwards the browser's form callbacks and removes listeners on disconnection.

Form association requires JavaScript registration. For no-JavaScript forms put native inputs and the submit button in the owning form's DOM scope. Association alone does not turn a button inside a separate shadow root into a native submitter. Test `FormData`, validation, reset, disabled fieldsets, labels and restoration in a real browser.

`useLazyContent(open, factory, retain = true)` avoids calling the content factory before first open and keeps the rendered subtree mounted after closing. The factory still runs on subsequent renders, allowing normal reactive updates. Call it unconditionally at a stable position on every parent render. Pass `false` as the third argument to unmount closed content. The caller controls visibility; retained content is not automatically hidden.

```ts
const panel = useLazyContent(open.value, () => html`<panel-content></panel-content>`)
return html`<section :hidden="${!open.value}">${panel}</section>`
```

For applications with build-generated styles:

```ts
import { enableStaticCSS } from '@jasonshimmy/custom-elements-runtime/static-css'
import styles from 'virtual:cer-jit-css'
enableStaticCSS(styles)
```

This entry installs the stylesheet through the render bridge without importing the JIT engine. Choose static or dynamic JIT initialization for a given app. Scan every class that client navigation can use and safelist data-generated classes through `cerPlugin({ safelist: [...] })`; static mode cannot generate new classes at runtime. CER App configures this automatically with `jitCss.mode: 'static'`.

SSR preserves reflected native image and control properties, including bound `src`, `alt`, values and required/disabled states. Bound textarea values become text content; bound select values select matching options, including optgroups and multiple selection. Native property aliases such as `readonly` map to the DOM's `readOnly` property during client updates.

DSD style sharing preserves the original order of reset, component and utility styles, including unique component styles. Roots containing attributed styles (for example `media` or `nonce`) or `@import` retain style elements rather than losing their semantics in a constructable stylesheet conversion. Deferred router startup preserves the existing scroll position; subsequent navigation retains scroll-to-top and fragment behavior.
