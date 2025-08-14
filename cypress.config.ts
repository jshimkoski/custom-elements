import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    // Must run Dev Server: npm run dev -- --host
    baseUrl: 'http://localhost:5173',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
