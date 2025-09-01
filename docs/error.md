# ❗ Error Handling Functionality Deep Dive

## 🛡️ Overview

Components can gracefully handle and present errors that occur during rendering, computed properties, prop application, and lifecycle hooks. The runtime exposes three related APIs with distinct intent and runtime paths:

- onError — hook for logging and side-effects when the runtime catches an error.
- errorTemplate — render-time error UI that flows through the VDOM renderer and styling pipeline.
- errorFallback — immediate, synchronous fallback HTML used by the component-level error boundary (written directly into the shadow root).

## ⚙️ Signatures & Intent

### onError
- Signature: (error: Error | null, ctx: ComponentContext) => void
- Purpose: Called whenever the runtime catches an error. Use for logging, telemetry, or cleanup. The library provides a lightweight default `onError` if you don't provide one.

### errorTemplate
- Signature: (error: Error, ctx: ComponentContext) => VNode | VNode[]
- Purpose: Used by the render pipeline for render-time errors (for example, Promise rejections from `render`). The result is passed to the VDOM renderer and then the styling/JIT-CSS pipeline runs. This preserves VDOM diffing, refs, and styling.

### errorFallback
- Signature: (error: Error | null, ctx: ComponentContext) => string
- Purpose: Used by the component-level error boundary for synchronous or critical failures that occur while running guarded logic (props application, lifecycle hooks, computed init, or other synchronous code). The returned HTML string is written directly into `shadowRoot.innerHTML`, bypassing the VDOM renderer and the styling/JIT pipeline.

## 🚦 When each is used (actual runtime behavior)

- Synchronous exceptions caught by the component error boundary (`createElementClass` → `_runLogicWithinErrorBoundary`, and `_applyProps` catch sites):
  1. The runtime sets an internal `_hasError` flag on the element instance.
  2. `cfg.onError(error, ctx)` is invoked (if provided).
  3. If `cfg.errorFallback` exists the runtime calls it with `(error, context)` and writes the returned HTML string directly to `this.shadowRoot.innerHTML`.
  4. This path intentionally bypasses the VDOM renderer and the `applyStyle`/JIT CSS pipeline because the runtime may not be in a safe state to run the normal render flow.

- Render-time errors handled in `renderComponent` (`src/lib/runtime/render.ts`):
  - If `cfg.render(context)` returns a Promise that rejects, `renderComponent`:
    1. Calls the `setError` callback provided by the component instance; that callback sets the instance internal `_templateError`.
    2. The promise catch block will then call `cfg.errorTemplate(error, context)` if provided and pass its result into `renderOutput`, which runs through the VDOM renderer and then `applyStyle`.
  - `renderComponent` also checks `context.isLoading`, `context.hasError` and `context.error` at the start of a render. Important: the runtime does NOT populate `context.isLoading`, `context.hasError` or `context.error` automatically. Those are optional fields you may choose to include on your component state/context if you want `renderComponent` to respect them during render.
    - In practice the reliable async error path is the Promise-rejection branch (it triggers `setError` → `_templateError` → the catch path that may call `errorTemplate`).

## 🔧 Clarifications

- `errorTemplate` and `errorFallback` are not interchangeable:
  - `errorTemplate` → render-time path that goes through the VDOM renderer and styling (preferred for user-facing error UI).
  - `errorFallback` → synchronous boundary path that writes raw HTML directly into the shadow root (use when the runtime cannot safely run the VDOM renderer).

- The runtime stores error/loading state on the element instance as internal fields (`_templateError`, `_templateLoading`, `_hasError`). These are exposed on the element instance via getters (`element.isLoading`, `element.lastError`) but are not injected into the `context` object by default. If you want `renderComponent` to consider loading/error state via `context.isLoading` / `context.hasError` / `context.error`, include those fields explicitly in your component `state` or context.

- Return types:
  - `errorTemplate` should return renderable VNode(s) (the VDOM renderer's inputs).
  - `errorFallback` must return a plain HTML string (it is assigned to `shadowRoot.innerHTML`).

## 🧩 Examples

- errorTemplate (render-time, returns VNode(s)):
```ts
component('async-error', {
  render: (ctx) => { /* ... */ },
  errorTemplate: (err, ctx) => html`
    <div class="error">Async error: ${err.message}</div>
  `,
  onError: (err, ctx) => console.error('caught', err),
});
```

- errorFallback (synchronous fallback — returns string):
```ts
component('critical-error', {
  render: (ctx) => { /* ... */ },
  errorFallback: (err, ctx) => `<div class=\"critical\">Critical: ${err?.message || 'unknown'}</div>`,
  onError: (err, ctx) => sendTelemetry(err),
});
```

## 📝 Recommendations / Best Practices

- Prefer `errorTemplate` for user-facing error UI so VDOM diffing, refs, and styling are preserved.
- Use `errorFallback` for emergency/synchronous fallbacks where the renderer cannot be trusted.
- Always provide an `onError` handler for logging/telemetry if you need custom behavior (the runtime provides a sensible default).
- Do not rely on `context.hasError`, `context.error`, or `context.isLoading` unless you explicitly include those fields in your component state/context — the runtime doesn't populate them automatically.
- Make `errorTemplate` return VNode(s). Keep `errorFallback` as a simple HTML string.

## 📚 References

- Component implementation: `src/lib/runtime/component.ts`
- Render pipeline: `src/lib/runtime/render.ts`

## ✅ Summary

- `errorTemplate`: render-time error UI; rendered via VDOM and then styled.
- `errorFallback`: synchronous fallback; raw HTML injected directly into the shadow root.
- `onError`: invoked for caught errors (default provided).
