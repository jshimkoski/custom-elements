# Glossary

Definitions for library-specific and web-components-specific terms used throughout the documentation.

---

## A

### Anchor Block

A stable boundary marker VNode returned by `anchorBlock()`. Anchor blocks give the virtual DOM reconciler a fixed reference point so that conditional or list-rendered content can be inserted and removed without disturbing adjacent sibling nodes. Used internally by `when()`, `each()`, and `match()`.

### Attribute

A string key-value pair on an HTML element (e.g., `<my-card title="Hello">`). Attributes are always strings. The runtime coerces attribute values to the declared default type when reading via `useProps()` (e.g., `count: 0` causes `"5"` to be read as the number `5`).

---

## C

### Composable

A reusable piece of stateful logic created with `createComposable()`. Composables encapsulate reactive state, watchers, and lifecycle hooks that can be shared across multiple components — similar to Vue composables or React custom hooks.

```ts
const useMousePosition = createComposable(() => {
  const x = ref(0);
  const y = ref(0);
  useOnConnected(() => { /* add mousemove listener */ });
  return { x, y };
});
```

### Computed

A derived reactive value created with `computed(() => expr)`. The result is memoized and only recomputed when one of its reactive dependencies changes. The return value has a read-only `.value` property.

### constructable Stylesheet

A `CSSStyleSheet` object created via `new CSSStyleSheet()` and adopted by a shadow root via `shadowRoot.adoptedStyleSheets`. The runtime uses constructable stylesheets for efficient style injection when the browser supports them, falling back to `<style>` elements otherwise.

### Container Query

A CSS query that responds to the size of a containing element rather than the viewport. The JIT CSS engine supports container query variants via `containerVariants` (e.g., `@sm:`, `@md:`, `@lg:`).

---

## D

### Design Token

A named CSS custom property (CSS variable) that represents a reusable design decision (color, spacing, typography). Use `useDesignTokens()` to apply typed design token overrides to the `:host` element.

### Discovery Render

A lightweight internal render pass that runs once when a component is first registered (via `component()`). During the discovery render, the `html` tagged template and all side-effectful hooks (`watchEffect`, `useOnConnected`, etc.) are no-ops. Only `useProps()` runs, so the runtime can extract prop names and default values to populate `observedAttributes` before the custom element is defined. Discovery renders never produce real DOM output.

---

## E

### Event Bus

A global publish/subscribe system (`GlobalEventBus`) for sending events across components without tight coupling. Accessed via the `eventBus` proxy or the shorthand functions `emit`, `on`, `off`, `once`, and `listen`.

---

## H

### Host Element

The custom element DOM node itself (e.g., `<my-counter>`). Components render into the host's shadow root, not into the host element directly. The host is accessible inside hooks via the internal `_host` reference on the component context.

### HMR (Hot Module Replacement)

A development feature where the browser applies code changes without a full page reload. The runtime supports HMR via Vite's `import.meta.hot` API — see [hmr.md](./hmr.md).

---

## J

### JIT CSS (Just-In-Time CSS)

An on-demand CSS generation engine that parses utility class names (e.g., `px-4`, `bg-primary-500`, `hover:opacity-75`) at runtime and injects the corresponding CSS rules into the component's shadow root. Eliminates the need for a full utility-class stylesheet. Opt in per-component with `useJITCSS()` or globally with `enableJITCSS()`. See [jit-css.md](./jit-css.md).

---

## K

### Keep-Alive

The `<cer-keep-alive>` built-in component. Wraps a component to preserve its DOM and reactive state across removal and re-insertion into the document. Useful for tabs, wizards, and other scenarios where preserving state is important. See [keep-alive.md](./keep-alive.md).

---

## M

### Model Ref

The object returned by `defineModel()`. It has a `.value` accessor — reading returns the current prop value, writing dispatches an `update:<propName>` custom event from the host element. The vdom `:model` directive recognises `ModelRef` objects directly.

---

## P

### Prop

A named input value for a component, declared via `useProps({ name: defaultValue })`. Props are read from host element attributes (as strings, coerced to the declared default type) or from JS properties set on the element. They are reactive: the component re-renders when a prop changes.

### Property Binding

Setting a JavaScript property on a DOM element (as opposed to an HTML attribute). The `:bind` directive forces property-based assignment for complex values like arrays and objects that cannot be serialised to strings.

### Provide / Inject

A mechanism for passing data from an ancestor component to a descendant without prop-drilling. The ancestor calls `provide(key, value)` and any descendant calls `inject(key)` to retrieve it. See [provide-inject.md](./provide-inject.md).

---

## R

### Reactive State

A `ReactiveState<T>` instance created by `ref()`. Reading `.value` inside a component render registers a dependency; writing `.value` schedules a re-render of all dependent components.

### Ref

Short for reactive reference. Created by `ref(initialValue)`. Provides a `.value` property that is tracked as a reactive dependency during render.

---

## S

### Shadow DOM

A browser-native encapsulation mechanism that attaches a separate DOM tree (the shadow root) to a custom element. Styles inside a shadow root do not bleed out, and global styles do not bleed in. All components rendered by this runtime use shadow DOM unless explicitly disabled.

### Shadow Root

The root node of a component's Shadow DOM. Queried via `element.shadowRoot`. Component templates are rendered into the shadow root.

### SSR (Server-Side Rendering)

Rendering component output to an HTML string on the server, before the browser loads the page. Use `renderToString(vnode)` or `renderToStringWithJITCSS(vnode)` from the `/ssr` entry point. See [ssr.md](./ssr.md).

### Suspense

The `<cer-suspense>` built-in component. Displays a loading fallback while an async child component's render promise is pending, and shows the child once it resolves. See [builtin-components.md](./builtin-components.md).

---

## T

### Teleport

A feature (via `useTeleport()`) that renders virtual DOM content into an arbitrary DOM node outside the component's shadow root. Useful for modals, tooltips, and other overlays. See [teleport.md](./teleport.md).

### Template Literal

A JavaScript string literal delimited by backticks (`` ` ``). The runtime's `html` and `css` functions are tagged template literals — they receive the static string parts and interpolated values as separate arguments for precise processing.

### Transition

An animation applied when an element enters or leaves the DOM. The runtime's transition system wraps content with `Transition()` or `TransitionGroup()` and applies CSS classes at enter/leave time. See [transitions.md](./transitions.md).

---

## U

### Utility Class

A single-purpose CSS class that applies one specific style rule (e.g., `p-4` for `padding: 1rem`, `text-white` for `color: white`). The JIT CSS engine generates the CSS for utility classes on demand from the class names found in the component's rendered HTML.

---

## V

### VNode (Virtual Node)

An in-memory description of a DOM element or text node. The runtime builds a tree of VNodes from `html` template output, then diffs the new tree against the previous one to calculate the minimal set of real DOM mutations needed (virtual DOM reconciliation).

### VDOM (Virtual DOM)

The in-memory representation of the UI as a tree of VNodes, maintained by the runtime. On each render, the new VDOM tree is diffed against the previous tree and only the changed parts of the real DOM are updated.
