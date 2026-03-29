describe('Computed invalidation E2E', () => {
  it('recomputes immediately when dependency changes', () => {
    // Requires dev server (vite) running at baseUrl from cypress.config.ts
    cy.visit('/computed-e2e.html');

    // Synchronously update the ref and assert the computed value returned
    cy.window().then((win: unknown) => {
      const val = win.updateAndRead(3);
      expect(val).to.equal(6);

      // Also verify helper that updates the DOM shows the expected value
      win.updateAndUpdateDom(7);
      cy.get('#value').should('have.text', '14');
    });
  });
});
