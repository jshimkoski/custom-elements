import { defineConfig } from 'cypress';

export default defineConfig({
  // Prevent browser code from reading process-level Cypress environment data.
  // Public test configuration should use Cypress.expose() when needed.
  allowCypressEnv: false,
  e2e: {
    // Must run Dev Server: npm run dev -- --host
    baseUrl: 'http://localhost:5173',
    setupNodeEvents() {
      // implement node event listeners here
    },
  },
});
