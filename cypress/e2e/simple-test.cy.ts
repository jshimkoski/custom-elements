/// <reference types="cypress" />
// Cypress E2E test for SimpleTest.ts component

describe('SimpleTestComponent', () => {
  beforeEach(() => {
    cy.visit('/e2e-test.html');
  });

  it('should render the component and initial message', () => {
    cy.get('simple-test-component').should('exist');
    cy.get('simple-test-component').shadow().find('p').should('contain.text', 'Hello from Simple Test Component!');
  });

  it('should update message on input change', () => {
    cy.get('simple-test-component').shadow().find('input[type="text"]').clear().type('Hello!');
    cy.get('simple-test-component').shadow().find('p').should('contain.text', 'Hello!');
  });

  it('should update message and show clicked state on button click', () => {
    cy.get('simple-test-component').shadow().find('button').click();
    cy.get('simple-test-component').shadow().find('p').should('contain.text', 'Updated Message');
    cy.get('simple-test-component').shadow().find('p').should('contain.text', 'Clicked!');
    cy.get('simple-test-component').shadow().find('button').click();
    cy.get('simple-test-component').shadow().find('p').should('contain.text', 'Updated Message');
    cy.get('simple-test-component').shadow().find('p').should('contain.text', 'Updated Message');
  });
});
