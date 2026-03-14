# ⚡ DOM JIT CSS

The `dom-jit-css` module brings the JIT CSS engine to **non-Shadow DOM** contexts — regular HTML pages, React / Vue / Svelte app shells, or any element outside a Web Component's shadow root.

It watches the real DOM for class changes and injects CSS rules into a shared stylesheet, providing the same utility-first experience as the Shadow DOM JIT CSS engine but scoped to the document or a specific container.

## 📦 Import

```ts
import { createDOMJITCSS } from '@jasonshimmy/custom-elements-runtime/dom-jit-css';
```

## 🚀 Quick Start

```ts
import { createDOMJITCSS } from '@jasonshimmy/custom-elements-runtime/dom-jit-css';

// Watch the full document body
const jit = createDOMJITCSS();
jit.mount();

// Later — tear down when no longer needed
jit.destroy();
```

## 🧭 Scoping with `data-jitcss`

The simplest way to scope the observer is to add `data-jitcss` to any element:

```html
<!-- 1. Auto-detect: createDOMJITCSS() with no root auto-discovers all [data-jitcss] elements -->
<div id="app" data-jitcss>
  <div class="flex gap-4 bg-primary-500 text-white p-4">...</div>
</div>

<script type="module">
  import { createDOMJITCSS } from '@jasonshimmy/custom-elements-runtime/dom-jit-css';
  createDOMJITCSS().mount();
</script>
```

### `data-jitcss` Attribute Values

| Attribute value                                       | Behaviour                                                              |
| ----------------------------------------------------- | ---------------------------------------------------------------------- |
| `data-jitcss` (no value) or `data-jitcss="container"` | Scopes the observer to that element and all its descendants            |
| `data-jitcss="self"`                                  | Only processes classes on that exact element, not descendants          |
| `data-jitcss="global"`                                | Observer covers `document.body` regardless of where the attribute sits |

## 🎛️ API

### `createDOMJITCSS(options?)` → `DOMJITCSSHandle`

```ts
const jit = createDOMJITCSS({
  // Specific element to observe (defaults to auto-detecting [data-jitcss] or document.body)
  root?: Element | ShadowRoot | null;
  // ID of the injected <style> element (defaults to 'cer-dom-jit-css')
  styleId?: string;
  // JIT CSS options (same as JITCSSOptions)
  extendedColors?: boolean;
  customColors?: Record<string, Record<string, string>>;
  disableVariants?: Array<'responsive' | 'dark' | 'motion' | 'print' | 'container'>;
});
```

### `DOMJITCSSHandle`

| Method / Property | Description                                                       |
| ----------------- | ----------------------------------------------------------------- |
| `mount()`         | Start observing and inject CSS for all current and future classes |
| `destroy()`       | Disconnect the observer and remove the injected stylesheet        |
| `processedCount`  | Number of unique class names processed so far (read-only)         |

## 🔬 Usage Examples

### Watch a specific container

```ts
const jit = createDOMJITCSS({
  root: document.getElementById('app')!,
});
jit.mount();
```

### Extended color palette

```ts
const jit = createDOMJITCSS({ extendedColors: true });
jit.mount();
// Now bg-violet-500, text-rose-300, etc. generate CSS
```

### Custom project colors

```ts
const jit = createDOMJITCSS({
  customColors: {
    brand: { '500': '#e63946', '600': '#c1121f' },
  },
});
jit.mount();
// bg-brand-500 and text-brand-600 now generate CSS
```

### React app shell

```tsx
// main.tsx
import { createDOMJITCSS } from '@jasonshimmy/custom-elements-runtime/dom-jit-css';

const jit = createDOMJITCSS({ root: document.getElementById('root')! });
jit.mount();

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
```

```tsx
// Button.tsx
export function Button({ children }: { children: React.ReactNode }) {
  return (
    <button className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors">
      {children}
    </button>
  );
}
```

### Svelte app

```ts
// main.ts
import { createDOMJITCSS } from '@jasonshimmy/custom-elements-runtime/dom-jit-css';
import App from './App.svelte';

createDOMJITCSS().mount();
new App({ target: document.body });
```

### Destroying on teardown

```ts
const jit = createDOMJITCSS();
jit.mount();

// In an SPA, you might destroy it when leaving a route:
window.addEventListener('beforeunload', () => jit.destroy());
```

## ⚡ Performance Architecture

The DOM JIT CSS scanner is designed to be extremely lightweight:

1. **Incremental class delta processing** — a monotonically growing `Set<string>` tracks processed classes. Each MutationObserver callback only processes new class names, never the full DOM.

2. **`queueMicrotask` batching** — multiple class mutations in the same tick (e.g., a framework rendering a list) are batched into a single CSS generation pass, executed before the browser paints.

3. **`CSSStyleSheet.insertRule()`** — new rules are appended one at a time rather than replacing the full stylesheet, so only new rules trigger a style recalculation.

4. **`TreeWalker` initial scan** — the first full-tree class extraction uses `NodeFilter.SHOW_ELEMENT` for maximum performance.

5. **Minimum viable observation** — the `MutationObserver` only watches `class` attribute changes and `childList` (new nodes). `characterData` observation is never enabled.

6. **`@layer cer-utilities`** — all injected rules are wrapped in a cascade layer so library utility classes never overpower user styles without `!important`.

## 🗂️ CSS Cascade Layers

All DOM JIT CSS rules are injected inside `@layer cer-utilities`:

```css
@layer cer-utilities {
  .flex {
    display: flex;
  }
  .bg-primary-500 {
    background-color: var(--cer-color-primary-500, #3b82f6);
  }
  /* … */
}
```

This means your own stylesheet rules always win over utility classes, regardless of specificity — no `!important` needed.

## 🔗 Related

- [JIT CSS deep dive](./jit-css.md) — full utility reference for Shadow DOM contexts
- [Vite Plugin](./vite-plugin.md) — build-time static analysis alternative to the runtime scanner
- [SSR](./ssr.md) — server-side rendering with JIT CSS pre-generation
