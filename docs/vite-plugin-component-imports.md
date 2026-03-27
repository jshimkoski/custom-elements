# 🔌 cerComponentImports — Vite Plugin

`cerComponentImports` is a Vite transform plugin that automatically injects per-file static `import` statements for custom elements found in `html\`` template literals. It gives Rollup the module graph edges required to code-split components per page — only components a page actually uses are bundled into that page's chunk.

## 🎯 Overview

Without this plugin, all components must be imported eagerly (e.g. from a single virtual module), which loads every component on every page. With `cerComponentImports`, Rollup sees explicit imports and can split each page chunk to include only the components it needs.

## 🚀 Quick Start

```ts
import { cerComponentImports } from '@jasonshimmy/custom-elements-runtime/vite-plugin';

export default {
  plugins: [
    cerComponentImports({
      componentsDir: '/absolute/path/to/app/components',
      appRoot: '/absolute/path/to/app',
    }),
  ],
};
```

## ⚙️ Options

```ts
interface CerComponentImportsOptions {
  /** Absolute path to the directory containing component source files. */
  componentsDir: string;
  /** Absolute path to the app root. Only files inside this directory are transformed. */
  appRoot: string;
}
```

### `componentsDir`

**Type:** `string` — absolute path

The directory scanned at build start to build the tag-name → source-file manifest. All `**/*.ts` files inside this directory are read; any file that contains a `component('tag-name', …)` call is added to the manifest.

### `appRoot`

**Type:** `string` — absolute path

Only files whose resolved path starts with `appRoot` are transformed. Files outside this boundary (e.g. `node_modules`, other packages) are left untouched.

---

## 🔄 How It Works

1. **`buildStart`** — scans `componentsDir` with a glob, reads each file, extracts `component()` tag-name calls, and builds a `Map<tagName, absPath>` manifest.
2. **`transform`** — for each file inside `appRoot` that contains an `html\`` template literal:
   - Extracts all hyphenated custom-element tag names (ignoring comments, closing tags, and native HTML tags).
   - Looks up each tag in the manifest.
   - Prepends a relative `import` statement for every match not already imported.
   - Returns the transformed code with a VLQ source map so debugger line numbers stay correct.
3. **`watchChange`** — keeps the manifest in sync during dev:
   - `create` / `update`: reads the new file and upserts its tag mappings.
   - `delete`: removes the file's tag entries from the manifest.
4. **`handleHotUpdate`** — when a component file changes, compares the old and new tag-name sets. If the set changed, sends a `full-reload` to the browser and invalidates all app modules so the updated import graph takes effect.

---

## 📦 Exported Utilities

The following utilities are also exported from `@jasonshimmy/custom-elements-runtime/vite-plugin` for use in custom build tooling.

### `resolveTagName(name: string): string`

Converts any component name to its final HTML custom-element tag name.

- Converts camelCase / PascalCase to kebab-case.
- If the result contains no hyphen, prefixes it with `cer-`.

```ts
resolveTagName('app')       // → 'cer-app'
resolveTagName('myButton')  // → 'my-button'
resolveTagName('MyCard')    // → 'my-card'
resolveTagName('ks-badge')  // → 'ks-badge'
```

This function is the single source of truth used by both the runtime (`component()` factory) and the build-time transform plugin so tag normalization is always consistent.

---

### `extractTemplateTagNames(source: string): Set<string>`

Scans a TypeScript/JavaScript source string for opening custom-element tags inside `html\`` template literals. Returns a deduplicated `Set` of hyphenated tag names.

**Excludes:**
- Tags inside line comments (`// …`)
- Tags inside block comments (`/* … */`)
- Closing tags (`</tag-name>`)
- Native HTML tags without a hyphen (e.g. `<div>`, `<span>`)

```ts
const tags = extractTemplateTagNames('return html`<ks-badge>v1</ks-badge>`');
tags.has('ks-badge'); // true

extractTemplateTagNames('// <ks-badge>').size; // 0  — line comment
extractTemplateTagNames('</ks-badge>').size;   // 0  — closing tag
extractTemplateTagNames('<div>').size;          // 0  — native tag
```

---

### `extractComponentRegistrations(source: string): string[]`

Finds all `component('tag-name', …)` calls in a source string and returns the resolved tag names in order of appearance. Commented-out calls and calls on identifiers that end with `component` (e.g. `importComponent`) are excluded.

```ts
extractComponentRegistrations("component('ks-badge', () => {})");
// → ['ks-badge']

extractComponentRegistrations("component('myBtn', () => {})");
// → ['my-btn']  (camelCase normalized via resolveTagName)

extractComponentRegistrations("// component('old', () => {})");
// → []  — commented out

extractComponentRegistrations("importComponent('ks-badge', () => {})");
// → []  — not a standalone component() call
```

---

## 🗺️ Source Maps

When `enforce: 'pre'` is set, Vite guarantees that no prior source map exists before the transform runs. The plugin generates a minimal VLQ source map for each transformed file:

- One leading semicolon per injected import line (mapping each injected line to "no original location").
- Followed by `AAAA` for the first original line and `;AACA` for each subsequent line.

This keeps browser DevTools and Vite's error overlay pointing to the correct original source lines.

---

## 🔥 HMR Behavior

| Change | Result |
|---|---|
| Component body updated (same tag name) | Standard Vite HMR — no full reload |
| Component tag name changed | Full browser reload + all app modules invalidated |
| New component file added | Manifest updated; full reload so new tag becomes available |
| Component file deleted | Manifest updated; pages that referenced the tag will fail to import on next reload |
