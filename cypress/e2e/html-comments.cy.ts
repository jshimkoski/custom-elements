/// <reference types="cypress" />

/**
 * Test to verify HTML comments are handled correctly
 */

describe('🔧 HTML Comment Handling Tests', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should not render HTML comments as text content', () => {
    // Check that the design-system-test component renders without comment text
    cy.get('design-system-test')
      .shadow()
      .within(() => {
        // Check that comment text like "Text Inputs Section" is NOT visible in the DOM
        cy.contains('Text Inputs Section').should('not.exist');
        cy.contains('Boolean Inputs Section').should('not.exist');
        cy.contains('Selection Inputs Section').should('not.exist');
        cy.contains('Numeric Inputs Section').should('not.exist');
        cy.contains('Action Buttons Section').should('not.exist');
        cy.contains('State Dump Section').should('not.exist');

        // But the actual section headers should still be visible
        cy.contains('📝 Text Inputs').should('exist');
        cy.contains('✅ Boolean Inputs').should('exist');
        cy.contains('🎯 Selection Inputs').should('exist');
        cy.contains('🔢 Numeric Inputs').should('exist');
      });
  });

  it('should still render actual content correctly despite having comments', () => {
    cy.get('design-system-test')
      .shadow()
      .within(() => {
        // Verify that all the actual form components are still present
        cy.get('ds-input').should('have.length.at.least', 1);
        cy.get('ds-textarea').should('have.length.at.least', 1);
        cy.get('ds-checkbox').should('have.length.at.least', 1);
        cy.get('ds-select').should('have.length.at.least', 1);
        cy.get('ds-number').should('have.length.at.least', 1);
        cy.get('ds-range').should('have.length.at.least', 1);
        cy.get('ds-progress').should('have.length.at.least', 1);
        cy.get('ds-button').should('have.length.at.least', 1);
      });
  });
});
