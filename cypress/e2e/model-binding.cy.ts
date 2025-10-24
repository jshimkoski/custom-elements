/// <reference types="cypress" />

describe('Complete Model Binding Test - Vue.js Compatible', () => {
  beforeEach(() => {
    cy.visit('/');

    // Reset state to ensure clean test environment
    cy.get('switch-test').then(($el) => {
      const switchTestEl = $el[0];
      if (switchTestEl.context) {
        switchTestEl.context.featureEnabled = false;
        if (switchTestEl._requestRender) {
          switchTestEl._requestRender();
        }
      }
    });
  });

  it('should work exactly like Vue.js :model directive', () => {
    // Initial state: everything should be false
    cy.get('switch-test')
      .shadow()
      .find('p')
      .should('contain', 'Current value: false');
    cy.get('switch-test')
      .shadow()
      .find('cer-switch')
      .shadow()
      .find('input[type="checkbox"]')
      .should('not.be.checked');
    cy.get('switch-test')
      .shadow()
      .find('simple-switch')
      .shadow()
      .find('input[type="checkbox"]')
      .should('not.be.checked');

    // Test 1: Click cer-switch once to set to true
    cy.get('switch-test')
      .shadow()
      .find('cer-switch')
      .shadow()
      .find('label')
      .click();

    // All components should immediately reflect true state
    cy.get('switch-test')
      .shadow()
      .find('p')
      .should('contain', 'Current value: true');
    cy.get('switch-test')
      .shadow()
      .find('cer-switch')
      .shadow()
      .find('input[type="checkbox"]')
      .should('be.checked');
    cy.get('switch-test')
      .shadow()
      .find('simple-switch')
      .shadow()
      .find('input[type="checkbox"]')
      .should('be.checked');

    // Test 2: Click cer-switch again to set to false (this was the bug)
    cy.get('switch-test')
      .shadow()
      .find('cer-switch')
      .shadow()
      .find('label')
      .click();

    // All components should immediately reflect false state
    cy.get('switch-test')
      .shadow()
      .find('p')
      .should('contain', 'Current value: false');
    cy.get('switch-test')
      .shadow()
      .find('cer-switch')
      .shadow()
      .find('input[type="checkbox"]')
      .should('not.be.checked');
    cy.get('switch-test')
      .shadow()
      .find('simple-switch')
      .shadow()
      .find('input[type="checkbox"]')
      .should('not.be.checked');

    // Test 3: Use simple-switch to set to true
    cy.get('switch-test')
      .shadow()
      .find('simple-switch')
      .shadow()
      .find('input[type="checkbox"]')
      .click({ force: true });

    // Both switches should update
    cy.get('switch-test')
      .shadow()
      .find('p')
      .should('contain', 'Current value: true');
    cy.get('switch-test')
      .shadow()
      .find('cer-switch')
      .shadow()
      .find('input[type="checkbox"]')
      .should('be.checked');
    cy.get('switch-test')
      .shadow()
      .find('simple-switch')
      .shadow()
      .find('input[type="checkbox"]')
      .should('be.checked');

    // Test 4: Use simple-switch to set to false (this was also buggy)
    cy.get('switch-test')
      .shadow()
      .find('simple-switch')
      .shadow()
      .find('input[type="checkbox"]')
      .click({ force: true });

    // cer-switch should properly update its template (this was the main issue)
    cy.get('switch-test')
      .shadow()
      .find('p')
      .should('contain', 'Current value: false');
    cy.get('switch-test')
      .shadow()
      .find('cer-switch')
      .shadow()
      .find('input[type="checkbox"]')
      .should('not.be.checked');
    cy.get('switch-test')
      .shadow()
      .find('simple-switch')
      .shadow()
      .find('input[type="checkbox"]')
      .should('not.be.checked');

    // Test 5: Programmatic changes
    cy.get('switch-test').shadow().find('button').click();

    // Both switches should reflect programmatic change
    cy.get('switch-test')
      .shadow()
      .find('p')
      .should('contain', 'Current value: true');
    cy.get('switch-test')
      .shadow()
      .find('cer-switch')
      .shadow()
      .find('input[type="checkbox"]')
      .should('be.checked');
    cy.get('switch-test')
      .shadow()
      .find('simple-switch')
      .shadow()
      .find('input[type="checkbox"]')
      .should('be.checked');

    // Test 6: Programmatic change back to false
    cy.get('switch-test').shadow().find('button').click();

    // Both switches should reflect programmatic change to false
    cy.get('switch-test')
      .shadow()
      .find('p')
      .should('contain', 'Current value: false');
    cy.get('switch-test')
      .shadow()
      .find('cer-switch')
      .shadow()
      .find('input[type="checkbox"]')
      .should('not.be.checked');
    cy.get('switch-test')
      .shadow()
      .find('simple-switch')
      .shadow()
      .find('input[type="checkbox"]')
      .should('not.be.checked');
  });

  it('should handle rapid state changes correctly', () => {
    // Rapid toggling should work without issues
    for (let i = 0; i < 3; i++) {
      cy.get('switch-test')
        .shadow()
        .find('cer-switch')
        .shadow()
        .find('label')
        .click();
      cy.get('switch-test')
        .shadow()
        .find('p')
        .should('contain', 'Current value: true');

      cy.get('switch-test')
        .shadow()
        .find('cer-switch')
        .shadow()
        .find('label')
        .click();
      cy.get('switch-test')
        .shadow()
        .find('p')
        .should('contain', 'Current value: false');
    }
  });
});
