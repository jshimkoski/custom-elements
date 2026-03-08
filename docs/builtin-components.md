# 🧱 Built-in Components

The runtime ships three opt-in utility components — `<cer-suspense>`, `<cer-error-boundary>`, and `<cer-keep-alive>` — that cover the most common async UI patterns: loading states, graceful error recovery, and state preservation. All three are zero-dependency, Shadow DOM native, and tree-shakeable.

## 📦 Import

```ts
import {
  registerSuspense,
  registerErrorBoundary,
  registerKeepAlive,
  registerBuiltinComponents,
} from '@jasonshimmy/custom-elements-runtime';
```

Registration is **idempotent** — calling any register function multiple times does nothing after the first call.

## 🔁 `registerBuiltinComponents()`

Registers all three built-in components in one call. Call this once at your application entry point:

```ts
import { registerBuiltinComponents } from '@jasonshimmy/custom-elements-runtime';

registerBuiltinComponents();
```

---

## ⏳ `<cer-suspense>`

Shows a **fallback** slot while async work is pending, then swaps to the **default** slot when work completes. Controlled by the `pending` attribute/property.

### Registration

```ts
import { registerSuspense } from '@jasonshimmy/custom-elements-runtime';
registerSuspense();
```

### Props / Attributes

| Name      | Type      | Default | Description                                  |
| --------- | --------- | ------- | -------------------------------------------- |
| `pending` | `boolean` | `false` | When truthy, shows `slot="fallback"` content |

### Slots

| Slot Name   | Description                                                                                |
| ----------- | ------------------------------------------------------------------------------------------ |
| _(default)_ | Rendered when `pending` is `false`                                                         |
| `fallback`  | Rendered when `pending` is `true`. Defaults to a built-in `Loading…` text if not provided. |

### Basic HTML Usage

```html
<cer-suspense pending>
  <!-- Shown when pending is false (resolved state) -->
  <my-async-content></my-async-content>

  <!-- Shown while pending is true -->
  <div slot="fallback">Loading…</div>
</cer-suspense>
```

### Programmatic Usage inside a Component

```ts
import {
  component,
  html,
  ref,
  useOnConnected,
} from '@jasonshimmy/custom-elements-runtime';
import { registerSuspense } from '@jasonshimmy/custom-elements-runtime';

registerSuspense();

component('user-profile', () => {
  const pending = ref(true);
  const user = ref<{ name: string } | null>(null);

  useOnConnected(async () => {
    user.value = await fetchUser();
    pending.value = false;
  });

  return html`
    <cer-suspense pending="${pending.value}">
      <div class="profile">
        <h2>${user.value?.name ?? ''}</h2>
      </div>

      <div slot="fallback" class="skeleton">
        <div class="skeleton-avatar"></div>
        <div class="skeleton-text"></div>
      </div>
    </cer-suspense>
  `;
});
```

### Nested Suspense

Multiple `<cer-suspense>` boundaries can be nested independently — each one manages its own `pending` state:

```html
<cer-suspense pending="${headerPending.value}">
  <page-header></page-header>
  <div slot="fallback">Loading header…</div>
</cer-suspense>

<cer-suspense pending="${contentPending.value}">
  <page-content></page-content>
  <div slot="fallback">Loading content…</div>
</cer-suspense>
```

---

## 🛡️ `<cer-error-boundary>`

Catches errors thrown inside child component renders and displays a **fallback** UI instead of crashing the rest of the page. Provides a `reset()` method to clear the error and retry.

### Registration

```ts
import { registerErrorBoundary } from '@jasonshimmy/custom-elements-runtime';
registerErrorBoundary();
```

### Slots

| Slot Name   | Description                                                                                               |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| _(default)_ | Normal content — rendered when no error has been caught                                                   |
| `fallback`  | Rendered when an error is caught. Defaults to a built-in "Something went wrong." message if not provided. |

### Methods

| Method    | Description                                             |
| --------- | ------------------------------------------------------- |
| `reset()` | Clears the caught error and re-renders the default slot |

### Basic HTML Usage

```html
<cer-error-boundary>
  <my-risky-component></my-risky-component>

  <div slot="fallback">
    <p>Something went wrong.</p>
    <button onclick="this.closest('cer-error-boundary').reset()">Retry</button>
  </div>
</cer-error-boundary>
```

### Programmatic Usage inside a Component

```ts
import { component, html } from '@jasonshimmy/custom-elements-runtime';
import { registerErrorBoundary } from '@jasonshimmy/custom-elements-runtime';

registerErrorBoundary();

component('app-root', () => {
  return html`
    <cer-error-boundary>
      <feature-module></feature-module>
      <analytics-tracker></analytics-tracker>

      <div slot="fallback" class="error-state">
        <h2>Oops! Something went wrong.</h2>
        <p>We've been notified and are working on it.</p>
        <button
          @click="${(e: Event) => {
            (e.target as HTMLElement).closest('cer-error-boundary')?.reset();
          }}"
        >
          Try again
        </button>
      </div>
    </cer-error-boundary>
  `;
});
```

### Combine Suspense + Error Boundary

Wrap async loading content in both boundaries for full async UI coverage:

```html
<cer-error-boundary>
  <cer-suspense pending="${pending.value}">
    <async-data-view></async-data-view>
    <div slot="fallback">Loading…</div>
  </cer-suspense>

  <div slot="fallback">
    <p>
      Failed to load.
      <button onclick="this.closest('cer-error-boundary').reset()">
        Retry
      </button>
    </p>
  </div>
</cer-error-boundary>
```

---

## 🌲 Tree-Shaking

All three components are opt-in and only bundled when you import them. Use individual register functions when you only need a subset:

```ts
// Only pulls in cer-suspense — the other two are not bundled
import { registerSuspense } from '@jasonshimmy/custom-elements-runtime';
registerSuspense();
```

## 🔗 Related

- [Keep-Alive](./keep-alive.md) — preserve component state across DOM removal/re-insertion
- [Functional API](./functional-api.md) — component lifecycle hooks
- [useExpose()](./use-expose.md) — expose imperative methods from a component (e.g., `reset()`)
- [Provide / Inject](./provide-inject.md) — cross-component state sharing
- [SSR](./ssr.md) — server-side rendering support
