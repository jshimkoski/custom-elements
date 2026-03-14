# Migration & Upgrade Guide

> Migrating from **v2.x → v3.x**

---

## v3.0 — JIT CSS: Remove the Bloat!

### What changed

In v2.x, JIT CSS was automatically injected into every component. While convenient for using utility classes, it added unnecessary bloat and reduced developer control.

In v3.0, the JIT CSS engine is decoupled from the main runtime and made opt-in. You can enable it only for the components that need it and customize color palettes and variants per component if desired.

If you prefer the old behavior, JIT CSS can also be enabled globally with a single call.

Additionally, the JIT CSS engine is now available as a standalone package entry point (/jit-css), making it usable in any JavaScript environment — Custom Elements, React, Svelte, Vue, or plain HTML. The Vite plugin continues to support build-time CSS generation for light-DOM use cases.

### What you need to do

If your v2.x components used utility classes via the previous global mechanism, choose one of the two adoption strategies below:

---

#### Strategy A — Per-component opt-in (recommended)

Add `useJITCSS()` to each component that uses utility classes. This is the most precise option and gives each component independent control over color palette and variants.

```ts
import { component, html } from '@jasonshimmy/custom-elements-runtime';
import { useJITCSS } from '@jasonshimmy/custom-elements-runtime/jit-css';

component('my-card', () => {
  useJITCSS(); // enable JIT CSS for this shadow root only
  return html`<div class="p-4 bg-primary-500 rounded text-white">
    <slot></slot>
  </div>`;
});
```

---

#### Strategy B — Global opt-in

Call `enableJITCSS()` once at app startup to enable JIT CSS for all components that render utility classes. No per-component calls needed.

```ts
import { enableJITCSS } from '@jasonshimmy/custom-elements-runtime/jit-css';

// Call before any component() registrations
enableJITCSS();
```

This is the fastest path to restore broadly-applied JIT CSS behaviour.

---

### Shadow DOM and the Vite plugin

The `cerJITCSS` Vite plugin generates a flat CSS file / virtual module that is injected into the **document** (light DOM). Because each Custom Element has its own isolated **Shadow DOM**, global CSS files do not penetrate shadow roots.

**The Vite plugin does not replace `useJITCSS()` for Custom Elements.** It is the right tool for light-DOM contexts (React, Svelte, Vue, plain HTML) where `createDOMJITCSS()` from `/dom-jit-css` covers the runtime equivalent.

For Custom Elements: use `useJITCSS()` or `enableJITCSS()`. The runtime JIT engine is already optimized for shadow roots — it uses `CSSStyleSheet` with `replaceSync()`, shares a parse cache across renders, and only regenerates rules for new class names.

See [vite-plugin.md](./vite-plugin.md) for the full light-DOM / non-shadow use case.

---

## v3.0 — New Subpath Entries

v3.0 ships the following new package entry points:

| Entry                                              | What it provides                                                                                  |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `@jasonshimmy/custom-elements-runtime/jit-css`     | JIT CSS engine: `useJITCSS`, `enableJITCSS`, `cls`, `jitCSS`, color/spacing parsers, utility maps |
| `@jasonshimmy/custom-elements-runtime/dom-jit-css` | Runtime DOM scanner for light-DOM contexts (React, Svelte, Vue, plain HTML)                       |
| `@jasonshimmy/custom-elements-runtime/vite-plugin` | Build-time CSS generation for light-DOM contexts                                                  |

All three are **opt-in** and tree-shaken from the main bundle. Importing from the root entry (`@jasonshimmy/custom-elements-runtime`) never pulls in any of them.

---

## v3.0 — `typesVersions` Added to `package.json`

TypeScript subpath import resolution now works out of the box. If you were previously using `tsconfig.json` path aliases to resolve runtime subpaths, those workarounds can be removed:

```jsonc
// tsconfig.json — these are no longer needed
{
  "compilerOptions": {
    "paths": {
      "@jasonshimmy/custom-elements-runtime/jit-css": ["..."],
      "@jasonshimmy/custom-elements-runtime/router": ["..."],
    },
  },
}
```

---

## General Upgrade Checklist

1. Run `npm install @jasonshimmy/custom-elements-runtime@3` to install v3.0.
2. Add `useJITCSS()` to components that use utility classes, or call `enableJITCSS()` once at app startup.
3. If you use the JIT CSS engine in a React/Svelte/Vue/plain-HTML light-DOM context, switch from manual style injection to `createDOMJITCSS()` from `/dom-jit-css`.
4. Remove any `tsconfig.json` path alias workarounds for subpath imports.
5. Review the [Changelog](https://github.com/jasonshimmy/custom-elements-runtime/releases) for any additional release-specific notes.
