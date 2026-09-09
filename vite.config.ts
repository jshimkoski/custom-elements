import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    cssCodeSplit: true,
    lib: {
      entry: {
        // Use the client-specific entry which omits optional heavy features
        main: resolve(import.meta.dirname, 'src/lib/index.ts'),
        ssr: resolve(import.meta.dirname, 'src/lib/ssr.ts'),
        transitions: resolve(import.meta.dirname, 'src/lib/transitions.ts'),
        directives: resolve(import.meta.dirname, 'src/lib/directives.ts'),
        'directive-enhancements': resolve(
          import.meta.dirname,
          'src/lib/directive-enhancements.ts',
        ),
        'event-bus': resolve(import.meta.dirname, 'src/lib/event-bus.ts'),
        store: resolve(import.meta.dirname, 'src/lib/store.ts'),
        router: resolve(import.meta.dirname, 'src/lib/router.ts'),
        // CSS entries
        style: 'src/lib/css/style.css',
        reset: 'src/lib/css/reset.css',
        variables: 'src/lib/css/variables.css',
        // Extended color palette (opt-in)
        colors: resolve(import.meta.dirname, 'src/lib/css/colors.ts'),
        // JIT CSS engine (opt-in separate entry)
        'jit-css': resolve(import.meta.dirname, 'src/lib/jit-css.ts'),
        // Non-Shadow DOM runtime scanner
        'dom-jit-css': resolve(import.meta.dirname, 'src/lib/dom-jit-css.ts'),
        // Vite build-time plugin
        'vite-plugin': resolve(import.meta.dirname, 'src/lib/vite-plugin.ts'),
        // SSR middleware helpers for Express / Fastify / Hono
        'ssr-middleware': resolve(import.meta.dirname, 'src/lib/ssr-middleware.ts'),
      },
      name: 'CustomElementsRuntime',
      fileName: (format, entryName) => {
        const suffix = format === 'cjs' ? 'cjs' : 'es.js';
        return entryName === 'main'
          ? `custom-elements-runtime.${suffix}`
          : `custom-elements-runtime.${entryName}.${suffix}`;
      },
      // Produce ES and CJS for all entries; UMD is omitted to allow multi-entry
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      // Externalize Node.js built-ins and Vite (used only by the vite-plugin entry)
      external: (id: string) => id.startsWith('node:') || id === 'vite',
      output: {
        globals: {
          // Add global mappings for UMD if needed
        },
        // Force css-utils into its own shared chunk so that consumers who never
        // import JIT CSS symbols (enableJITCSS, useJITCSS, …) do NOT transitively
        // pull in the style chunk.  Without this hint Rollup merges css-utils into
        // the style chunk and then hooks has to import from there.
        manualChunks(id) {
          if (id.includes('/runtime/css-utils')) return 'css-utils';
          if (id.includes('/runtime/render-bridge')) return 'css-utils';
        },
      },
    },
    minify: 'oxc',
    sourcemap: true,
  },
});
