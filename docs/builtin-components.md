# 🧱 Built-in Components

The runtime ships two opt-in utility components — `<ce-suspense>` and `<ce-error-boundary>` — that cover the two most common async UI patterns: loading states and graceful error recovery. Both are zero-dependency, Shadow DOM native, and tree-shakeable.

## 📦 Import

```ts
import {
  registerCeSuspense,
  registerCeErrorBoundary,
  registerBuiltinComponents,
} from '@jasonshimmy/custom-elements-runtime';
```

Registration is **idempotent** — calling any register function multiple times does nothing after the first call.

## 🔁 `registerBuiltinComponents()`

Registers both built-in components in one call. Call this once at your application entry point:

```ts
import { registerBuiltinComponents } from '@jasonshimmy/custom-elements-runtime';

registerBuiltinComponents();
```

---

## ⏳ `<ce-suspense>`

Shows a **fallback** slot while async work is pending, then swaps to the **default** slot when work completes. Controlled by the `pending` attribute/property.

### Registration

```ts
import { registerCeSuspense } from '@jasonshimmy/custom-elements-runtime';
registerCeSuspense();
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
<ce-suspense pending>
  <!-- Shown when pending is false (resolved state) -->
  <my-async-content></my-async-content>

  <!-- Shown while pending is true -->
  <div slot="fallback">Loading…</div>
</ce-suspense>
```

### Programmatic Usage inside a Component

```ts
import {
  component,
  html,
  ref,
  useOnConnected,
} from '@jasonshimmy/custom-elements-runtime';
import { registerCeSuspense } from '@jasonshimmy/custom-elements-runtime';

registerCeSuspense();

component('user-profile', () => {
  const pending = ref(true);
  const user = ref<{ name: string } | null>(null);

  useOnConnected(async () => {
    user.value = await fetchUser();
    pending.value = false;
  });

  return html`
    <ce-suspense pending="${pending.value}">
      <div class="profile">
        <h2>${user.value?.name ?? ''}</h2>
      </div>

      <div slot="fallback" class="skeleton">
        <div class="skeleton-avatar"></div>
        <div class="skeleton-text"></div>
      </div>
    </ce-suspense>
  `;
});
```

### Nested Suspense

Multiple `<ce-suspense>` boundaries can be nested independently — each one manages its own `pending` state:

```html
<ce-suspense pending="${headerPending.value}">
  <page-header></page-header>
  <div slot="fallback">Loading header…</div>
</ce-suspense>

<ce-suspense pending="${contentPending.value}">
  <page-content></page-content>
  <div slot="fallback">Loading content…</div>
</ce-suspense>
```

---

## 🛡️ `<ce-error-boundary>`

Catches errors thrown inside child component renders and displays a **fallback** UI instead of crashing the rest of the page. Provides a `reset()` method to clear the error and retry.

### Registration

```ts
import { registerCeErrorBoundary } from '@jasonshimmy/custom-elements-runtime';
registerCeErrorBoundary();
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
<ce-error-boundary>
  <my-risky-component></my-risky-component>

  <div slot="fallback">
    <p>Something went wrong.</p>
    <button onclick="this.closest('ce-error-boundary').reset()">Retry</button>
  </div>
</ce-error-boundary>
```

### Programmatic Usage inside a Component

```ts
import { component, html } from '@jasonshimmy/custom-elements-runtime';
import { registerCeErrorBoundary } from '@jasonshimmy/custom-elements-runtime';

registerCeErrorBoundary();

component('app-root', () => {
  return html`
    <ce-error-boundary>
      <feature-module></feature-module>
      <analytics-tracker></analytics-tracker>

      <div slot="fallback" class="error-state">
        <h2>Oops! Something went wrong.</h2>
        <p>We've been notified and are working on it.</p>
        <button
          @click="${(e: Event) => {
            (e.target as HTMLElement).closest('ce-error-boundary')?.reset();
          }}"
        >
          Try again
        </button>
      </div>
    </ce-error-boundary>
  `;
});
```

### Combine Suspense + Error Boundary

Wrap async loading content in both boundaries for full async UI coverage:

```html
<ce-error-boundary>
  <ce-suspense pending="${pending.value}">
    <async-data-view></async-data-view>
    <div slot="fallback">Loading…</div>
  </ce-suspense>

  <div slot="fallback">
    <p>
      Failed to load.
      <button onclick="this.closest('ce-error-boundary').reset()">Retry</button>
    </p>
  </div>
</ce-error-boundary>
```

---

## 🌲 Tree-Shaking

Both components are opt-in and only bundled when you import them. If your application does not use `<ce-error-boundary>`, do not call `registerCeErrorBoundary()` and it will be removed from your bundle at build time.

Use individual register functions when you only need one component:

```ts
// Only pulls in ce-suspense — ce-error-boundary is not bundled
import { registerCeSuspense } from '@jasonshimmy/custom-elements-runtime';
registerCeSuspense();
```

## 🔗 Related

- [Functional API](./functional-api.md) — component lifecycle hooks
- [useExpose()](./use-expose.md) — expose imperative methods from a component (e.g., `reset()`)
- [Provide / Inject](./provide-inject.md) — cross-component state sharing
- [SSR](./ssr.md) — server-side rendering support
