/// <reference types="cypress" />
// Cypress E2E test for TemplateCompilationDemo.ts component

describe('Compiled and Traditional Template Example components', () => {
  beforeEach(() => {
    cy.visit('/e2e-test.html');
  });

  it('should render initial count for compiled-template-example', () => {
    cy.get('compiled-template-example').should('exist');
    cy.get('compiled-template-example').shadow().find('p').should('contain.text', 'Count: 0');
  });

  it('should increment count for compiled-template-example', () => {
    cy.get('compiled-template-example').shadow().find('button').click();
    cy.get('compiled-template-example').shadow().find('p').should('contain.text', 'Count: 1');
  });

  it('should render initial count for traditional-template-example', () => {
    cy.get('traditional-template-example').should('exist');
    cy.get('traditional-template-example').shadow().find('p').should('contain.text', 'Count: 0');
  });

  it('should increment count for traditional-template-example', () => {
    cy.get('traditional-template-example').shadow().find('button').click();
    cy.get('traditional-template-example').shadow().find('p').should('contain.text', 'Count: 1');
  });
});
