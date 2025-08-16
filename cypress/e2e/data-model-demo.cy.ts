/// <reference types="cypress" />
// Cypress E2E test for DataModelDemo.ts component

describe('DataModelDemo.ts component', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should bind text input and trim value', () => {
    cy.get('data-model-demo').should('exist');
    cy.get('data-model-demo').shadow().find('input[type="text"]').type('  hello world  ');
    cy.wait(500);
    cy.get('data-model-demo').shadow().find('pre').should('contain', '"text": "hello world"');
  });

  it('should bind multi-checkbox group and reflect state', () => {
    cy.get('data-model-demo').should('exist');
    cy.get('data-model-demo').shadow().find('input[type="checkbox"][value="checked2"]').check({ force: true });
    cy.get('data-model-demo').shadow().find('span').contains('checked1, checked2');
    cy.get('data-model-demo').shadow().find('pre').should('contain', '"checked": [\n    "checked1",\n    "checked2"');
    cy.get('data-model-demo').shadow().find('input[type="checkbox"][value="checked1"]').uncheck({ force: true });
    cy.get('data-model-demo').shadow().find('span').contains('checked2');
  });

  it('should bind single checkbox and reflect boolean state', () => {
    cy.get('data-model-demo').should('exist');
    cy.get('data-model-demo').shadow().find('input[data-model="checkedSingle"]').uncheck({ force: true });
    cy.get('data-model-demo').shadow().find('pre').should('contain', '"checkedSingle": false');
    cy.get('data-model-demo').shadow().find('input[data-model="checkedSingle"]').check({ force: true });
    cy.get('data-model-demo').shadow().find('pre').should('contain', '"checkedSingle": true');
  });

  it('should bind single custom checkbox and reflect custom value', () => {
    cy.get('data-model-demo').should('exist');
    cy.get('data-model-demo').shadow().find('input[data-model="checkedSingleCustom"]').uncheck({ force: true });
    cy.get('data-model-demo').shadow().find('pre').should('contain', '"checkedSingleCustom": "not awesome"');
    cy.get('data-model-demo').shadow().find('input[data-model="checkedSingleCustom"]').check({ force: true });
    cy.get('data-model-demo').shadow().find('pre').should('contain', '"checkedSingleCustom": "awesome"');
  });

  it('should bind radio group and reflect selected value', () => {
    cy.get('data-model-demo').should('exist');
    cy.get('data-model-demo').shadow().find('input[type="radio"][value="option2"]').check({ force: true });
    cy.get('data-model-demo').shadow().find('span').contains('Selected: option2');
    cy.get('data-model-demo').shadow().find('pre').should('contain', '"radio": "option2"');
  });

  it('should bind textarea and reflect value', () => {
    cy.get('data-model-demo').should('exist');
    cy.get('data-model-demo').shadow().find('textarea[data-model="textarea"]').type('multiline\ntext');
    cy.get('data-model-demo').shadow().find('pre').should('contain', '"textarea": "multiline\\ntext"');
  });

  it('should bind select and reflect selected value', () => {
    cy.get('data-model-demo').should('exist');
    cy.get('data-model-demo').shadow().find('select[data-model="select"]').select('c');
    cy.get('data-model-demo').shadow().find('span').contains('Selected: c');
    cy.get('data-model-demo').shadow().find('pre').should('contain', '"select": "c"');
  });

  it('should bind number input and reflect value', () => {
    cy.get('data-model-demo').should('exist');
    cy.get('data-model-demo').shadow().find('input[type="number"][data-model="number|number"]').clear().type('42');
    cy.get('data-model-demo').shadow().find('pre').should('contain', '"number": 42');
  });
});
