import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    cssCodeSplit: true,
    lib: {
      entry: {
        // Use the client-specific entry which omits optional heavy features
        main: resolve(__dirname, 'src/lib/index.ts'),
        ssr: resolve(__dirname, 'src/lib/ssr.ts'),
        transitions: resolve(__dirname, 'src/lib/transitions.ts'),
        directives: resolve(__dirname, 'src/lib/directives.ts'),
        'directive-enhancements': resolve(
          __dirname,
          'src/lib/directive-enhancements.ts',
        ),
        'event-bus': resolve(__dirname, 'src/lib/event-bus.ts'),
        store: resolve(__dirname, 'src/lib/store.ts'),
        router: resolve(__dirname, 'src/lib/router.ts'),
        // CSS entries
        style: 'src/lib/css/style.css',
        reset: 'src/lib/css/reset.css',
        variables: 'src/lib/css/variables.css',
      },
      name: 'CustomElementsRuntime',
      fileName: (format, entryName) =>
        entryName === 'main'
          ? `custom-elements-runtime.${format}.js`
          : `custom-elements-runtime.${entryName}.${format}.js`,
      // Produce ES and CJS for all entries; UMD is omitted to allow multi-entry
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: [], // Add external dependencies here if needed
      output: {
        globals: {
          // Add global mappings for UMD if needed
        },
      },
    },
    minify: 'esbuild',
    sourcemap: true,
  },
});
