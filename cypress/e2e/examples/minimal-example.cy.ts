/// <reference types="cypress" />

describe('MinimalExample Component', () => {
  beforeEach(() => {
    cy.visit('/src/components/examples/minimal-example.html');
    cy.get('minimal-example').should('exist');
  });

  it('renders the minimal example with correct content', () => {
    cy.get('minimal-example').should('exist').shadow().within(() => {
      cy.get('div').should('have.class', 'flex flex-col items-center justify-center min-h-[120px]');
      cy.get('button').should('exist').should('contain', 'Count: 0');
    });
  });

  it('responds to user interaction and updates state', () => {
    cy.get('minimal-example').shadow().within(() => {
      cy.get('button').click();
      cy.get('button').should('contain', 'Count: 1');
    });
  });
});