# Async Components

`defineAsyncComponent` registers a custom element whose render function is loaded
asynchronously. This is the Web Components equivalent of Vue's `defineAsyncComponent`
or React's `React.lazy` — use it for heavy components that should not block the
initial render.

---

## Basic usage

```typescript
import { defineAsyncComponent, html } from '@jasonshimmy/custom-elements-runtime';

defineAsyncComponent(
  'heavy-chart',
  () => import('./chart-impl').then(m => m.renderFn),
  {
    loading: () => html`<p class="skeleton">Loading chart…</p>`,
    error:   () => html`<p class="error">Chart unavailable.</p>`,
    timeout: 5000,
  },
)
```

Use the element anywhere after calling `defineAsyncComponent`:

```html
<heavy-chart data-id="revenue-2025"></heavy-chart>
```

---

## Loader return value

The loader must return a `Promise` that resolves with a **render function**:

```typescript
type RenderFn = () => VNode | VNode[]
```

The render function is called inside the component's normal reactive context.
`useProps`, `ref`, `computed`, `watch`, and all other hooks are available:

```typescript
defineAsyncComponent(
  'lazy-counter',
  async () => {
    // Simulate a dynamic import
    await new Promise(r => setTimeout(r, 500))
    return () => {
      const props = useProps({ initial: 0 })
      const count = ref(props.initial)
      return html`
        <button @click="${() => count.value++}">Count: ${count}</button>
      `
    }
  },
  { loading: () => html`<span>…</span>` },
)
```

---

## State machine

Each `defineAsyncComponent` call manages an independent state machine:

| State | Trigger | Output |
|---|---|---|
| `idle` | Before the element first connects | `loading` template (or empty) |
| `loading` | Loader promise is pending | `loading` template (or empty) |
| `resolved` | Loader promise fulfilled | Result of the resolved render function |
| `error` | Loader promise rejected | `error` template (or empty) |
| `timeout` | `options.timeout` ms elapsed without resolution | `error` template (or empty) |

The loader is started once, the first time the element's render function runs.
Subsequent renders while loading show the `loading` placeholder without restarting
the loader.

---

## `AsyncComponentOptions`

```typescript
interface AsyncComponentOptions {
  /** Rendered while the loader promise is pending. Defaults to empty. */
  loading?: () => VNode | VNode[]

  /** Rendered when the loader rejects or times out. Defaults to empty. */
  error?: () => VNode | VNode[]

  /**
   * Maximum milliseconds to wait. If the loader has not resolved by this
   * deadline the element transitions to the `error` state.
   * Defaults to no timeout (waits indefinitely).
   */
  timeout?: number
}
```

---

## Timeout

```typescript
defineAsyncComponent(
  'heavy-map',
  () => import('./map-renderer').then(m => m.render),
  {
    loading: () => html`<div class="spinner"></div>`,
    error:   () => html`<p>Map failed to load — <a href="#">retry</a></p>`,
    timeout: 8000,   // show error after 8 s
  },
)
```

If `timeout` is set and the loader resolves before the deadline, the timeout is
cleared automatically.

---

## Signature

```typescript
function defineAsyncComponent(
  tag: string,
  loader: () => Promise<() => VNode | VNode[]>,
  options?: AsyncComponentOptions,
): void
```

| Parameter | Type | Description |
|---|---|---|
| `tag` | `string` | Custom element tag name — must contain a hyphen |
| `loader` | `() => Promise<RenderFn>` | Called once on first connect |
| `options` | `AsyncComponentOptions` | Optional placeholders and timeout |

---

## Comparison with `component()`

| | `component()` | `defineAsyncComponent()` |
|---|---|---|
| Code splitting | Manual (static import) | Automatic (dynamic import in loader) |
| Loading state | Roll your own with `ref` | Built-in `loading` template |
| Error state | Roll your own | Built-in `error` template |
| Timeout | Not built-in | `options.timeout` |

---

## Testing

In unit tests, pass a synchronously resolving loader so you don't need to
advance timers:

```typescript
import { defineAsyncComponent, html, nextTick } from '@jasonshimmy/custom-elements-runtime'

const tag = 'test-async'
defineAsyncComponent(
  tag,
  () => Promise.resolve(() => html`<p class="content">Loaded</p>`),
)

container.innerHTML = `<${tag}></${tag}>`
// Wait for the microtask that settles the Promise.resolve()
await new Promise(r => setTimeout(r, 50))

const el = container.querySelector(tag)!
const shadow = el.shadowRoot!
expect(shadow.querySelector('.content')).toBeTruthy()
```

For testing the `loading` state, use a never-settling promise and inspect the
shadow root immediately after `await nextTick()`.

For testing the `error` and `timeout` states, use `vi.useFakeTimers()` and call
`vi.advanceTimersByTime(n)` to trigger the timeout, then `await nextTick()` to
flush the re-render.
