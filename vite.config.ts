import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/lib/index.ts'),
      name: 'CustomElementsRuntime',
      fileName: (format) => `custom-elements-runtime.${format}.js`,
      formats: ['es', 'cjs', 'umd'],
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
