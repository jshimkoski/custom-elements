/// <reference types="cypress" />
// Cypress E2E test for MinimalExample.ts component

describe('MinimalExample.ts component', () => {
  beforeEach(() => {
    cy.visit('/e2e-test.html');
  });

  it('should render initial state and content', () => {
    cy.get('minimal-example').should('exist');
    cy.get('minimal-example').shadow().find('span').should('contain.text', '0');
    cy.get('minimal-example').shadow().find('button').should('contain.text', 'Count: 0');
  });

  it('should increment value on button click', () => {
    cy.get('minimal-example').shadow().find('button').click();
    cy.get('minimal-example').shadow().find('span').should('contain.text', '1');
    cy.get('minimal-example').shadow().find('button').should('contain.text', 'Count: 1');
  });
});
