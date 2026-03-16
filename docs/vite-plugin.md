# 🔧 Vite Plugin (Build-time JIT CSS + SSR Config)

Two plugins are exported from `@jasonshimmy/custom-elements-runtime/vite-plugin`:

- **`cerJITCSS`** — Build-time static analysis: scans source files and emits pre-generated CSS, eliminating all runtime JIT parsing cost (light DOM, not Shadow DOM).
- **`cerPlugin`** — All-in-one: combines `cerJITCSS` with SSR configuration. Registers a `virtual:cer-ssr-config` module so server entry files can import the resolved render options.

## 📦 Import

```ts
// vite.config.ts
import {
  cerJITCSS,
  cerPlugin,
} from '@jasonshimmy/custom-elements-runtime/vite-plugin';
```

---

## `cerPlugin` — Recommended for SSR Apps

Use `cerPlugin` when your app uses both build-time JIT CSS and server-side rendering. It combines both capabilities and exposes render options via a virtual module.

### Quick Start

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { cerPlugin } from '@jasonshimmy/custom-elements-runtime/vite-plugin';

export default defineConfig({
  plugins: [
    cerPlugin({
      // JIT CSS options (optional)
      content: ['./src/**/*.{ts,html}'],
      output: 'src/generated-jit.css',

      // SSR config (optional)
      ssr: {
        dsd: true, // Enable Declarative Shadow DOM
        dsdPolyfill: true, // Append DSD polyfill for Firefox < 123
        jit: { extendedColors: true }, // JIT CSS options for SSR
      },
    }),
  ],
});
```

### Using the SSR config virtual module

When `ssr` is provided, the plugin registers `virtual:cer-ssr-config`, which exports the resolved SSR render options:

```ts
// server.ts
import ssrConfig from 'virtual:cer-ssr-config';
import { renderToStringWithJITCSS } from '@jasonshimmy/custom-elements-runtime/ssr';

// ssrConfig = { dsd: true, dsdPolyfill: true, jit: { extendedColors: true } }
const { htmlWithStyles } = renderToStringWithJITCSS(appVNode, ssrConfig);
```

Add the TypeScript declaration if your IDE reports an import error:

```ts
// vite-env.d.ts
declare module 'virtual:cer-ssr-config' {
  const config: import('@jasonshimmy/custom-elements-runtime/ssr').DSDRenderOptions & {
    jit?: import('@jasonshimmy/custom-elements-runtime/jit-css').JITCSSOptions;
  };
  export default config;
}
```

### `CerPluginOptions`

```ts
interface CerPluginOptions {
  // JIT CSS options — same as CerJITCSSPluginOptions, all optional
  content?: string[];
  output?: string;
  virtualModule?: boolean;
  extendedColors?: boolean;
  customColors?: Record<string, Record<string, string>>;
  disableVariants?: Array<
    'responsive' | 'dark' | 'motion' | 'print' | 'container'
  >;

  // SSR config
  ssr?: {
    dsd?: boolean; // default: true
    dsdPolyfill?: boolean; // default: true
    jit?: JITCSSOptions;
  };
}
```

### `cerPlugin` returns an array of Vite plugins

`cerPlugin()` returns a `Plugin[]` array so it composes naturally:

```ts
// Two plugins in one call — spread syntax not needed
plugins: [cerPlugin({ content: ['./src/**/*.ts'], ssr: { dsd: true } })];
```

---

## `cerJITCSS` — JIT CSS Only

Use `cerJITCSS` when you need build-time JIT CSS without SSR configuration.

This is the optimal approach for frameworks like React, Svelte, Vue, or Lit where templates live in `.tsx`, `.svelte`, or `.vue` files rather than Web Component shadow roots.

## 🚀 Quick Start

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { cerJITCSS } from '@jasonshimmy/custom-elements-runtime/vite-plugin';

export default defineConfig({
  plugins: [
    cerJITCSS({
      // Glob patterns to scan for class names
      content: ['./src/**/*.{ts,tsx,html,svelte,vue}', './index.html'],
      // Optional: write generated CSS to a file
      output: 'src/generated-jit.css',
    }),
  ],
});
```

Then import the generated file in your app entry:

```ts
// main.ts
import './generated-jit.css';
```

## 🎛️ Options

```ts
interface CerJITCSSPluginOptions {
  /**
   * Glob patterns (relative to project root) identifying files to scan
   * for utility class names.
   */
  content: string[];

  /**
   * File path where the generated CSS is written.
   * When omitted, only the virtual module is emitted.
   */
  output?: string;

  /**
   * Whether to emit a `virtual:cer-jit-css` module that resolves to the
   * generated CSS text. Defaults to true.
   */
  virtualModule?: boolean;

  // JIT CSS options — same as JITCSSOptions:
  extendedColors?: boolean;
  customColors?: Record<string, Record<string, string>>;
  disableVariants?: Array<
    'responsive' | 'dark' | 'motion' | 'print' | 'container'
  >;
}
```

## 🔮 Virtual Module

When `virtualModule: true` (the default), the plugin emits `virtual:cer-jit-css` that resolves to the generated CSS string at build time:

```ts
// main.ts — inject the CSS directly without a file
import generatedCSS from 'virtual:cer-jit-css';

// Inject into document at runtime
const sheet = new CSSStyleSheet();
sheet.replaceSync(generatedCSS);
document.adoptedStyleSheets.push(sheet);
```

Or, use both: write the file for static serving **and** consume the virtual module in your bundle:

```ts
// vite.config.ts
cerJITCSS({
  content: ['./src/**/*.{ts,tsx,html}'],
  output: 'public/jit.css',
  virtualModule: true,
});
```

The TypeScript type for the virtual module is automatically available. Add the following to your `vite-env.d.ts` (or any `.d.ts` in your project) if your IDE shows import errors:

```ts
declare module 'virtual:cer-jit-css' {
  const css: string;
  export default css;
}
```

## ♻️ Hot Module Replacement (HMR)

In development mode (`vite dev`), the plugin's `handleHotUpdate` hook re-generates CSS whenever a watched source file changes. The virtual module is invalidated, causing a hot reload. This gives you instant style feedback without a full page reload.

## 🔬 Extended Examples

### With extended color palette

```ts
cerJITCSS({
  content: ['./src/**/*.{ts,tsx}'],
  output: 'src/jit.css',
  extendedColors: true, // Enable bg-blue-500, text-violet-700, etc.
});
```

### With custom brand colors

```ts
cerJITCSS({
  content: ['./src/**/*.{ts,tsx}'],
  customColors: {
    brand: { '500': '#e63946', '600': '#c1121f' },
    accent: { '300': '#a8dadc', '500': '#457b9d' },
  },
});
// bg-brand-500, text-accent-300, etc. are now generated
```

### Disable dark and print variants for a smaller bundle

```ts
cerJITCSS({
  content: ['./src/**/*.{ts,tsx}'],
  disableVariants: ['dark', 'print'],
});
```

### React + Vite full example

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cerJITCSS } from '@jasonshimmy/custom-elements-runtime/vite-plugin';

export default defineConfig({
  plugins: [
    react(),
    cerJITCSS({
      content: ['./src/**/*.{ts,tsx}', './index.html'],
      output: 'src/jit.css',
      extendedColors: true,
    }),
  ],
});
```

```ts
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './jit.css'; // Generated at build time
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
```

### Svelte + Vite full example

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { cerJITCSS } from '@jasonshimmy/custom-elements-runtime/vite-plugin';

export default defineConfig({
  plugins: [
    svelte(),
    cerJITCSS({
      content: ['./src/**/*.{svelte,ts}', './index.html'],
      output: 'src/jit.css',
    }),
  ],
});
```

## ⚙️ How It Works

1. **`buildStart`** — the plugin reads all files matching `content` globs and runs the same `extractClassesFromHTML()` regex as the runtime engine over their text content.
2. All discovered class names are passed to `jitCSS()` in a single pass to generate the full CSS string.
3. If `output` is specified, the CSS is written to that file path.
4. If `virtualModule` is true, the generated CSS is served as `virtual:cer-jit-css`.
5. **`handleHotUpdate`** — in dev mode, whenever a watched file changes, the plugin re-generates CSS, writes the output file, and invalidates the virtual module.

## 🔗 Related

- [JIT CSS deep dive](./jit-css.md) — full utility reference
- [DOM JIT CSS](./dom-jit-css.md) — runtime DOM scanner for non-build scenarios
- [SSR](./ssr.md) — server-side rendering with DSD output and JIT CSS pre-generation
- [SSR Middleware](./ssr-middleware.md) — Express/Fastify/Hono handler factories
