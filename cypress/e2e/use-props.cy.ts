/// <reference types="cypress" />

describe('ce-test-props E2E', () => {
  // Requires dev server running (npm run dev)
  const base = 'http://localhost:5173';

  it('loads the page and mounts the component', () => {
    cy.visit(base);

    // The app already includes a single <ce-test-props> (imported in main.ts).
    // Wait a short moment for the component to render into shadow DOM
    // cy.wait(50);

    // Ensure value/count exist and assert their content (use first to be robust)
    cy.get('ce-test-props').should('exist');
    cy.get('ce-test-props').shadow().find('.value').first().should('have.text', 'default');
    cy.get('ce-test-props').shadow().find('.count').first().should('have.text', '0');

    // Click the first increment button and ensure it doesn't error when multiple hosts exist
    cy.get('ce-test-props').shadow().find('button.inc').first().click();

    // We can listen for the custom event on the host element
    cy.get('ce-test-props').then(($el) => {
      const el = $el[0] as HTMLElement;
      // Attach a listener and assert later (just ensure it exists)
      expect(el).to.exist;
    });
  });
});
