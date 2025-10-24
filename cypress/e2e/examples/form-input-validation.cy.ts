/// <reference types="cypress" />

describe.skip('FormInputValidation Component', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.get('form-input-validation').should('exist');
  });

  it('renders all fields and labels in shadow DOM', () => {
    cy.get('form-input-validation').shadow().find('form').should('exist');
    cy.get('form-input-validation')
      .shadow()
      .find('label')
      .should('have.length.greaterThan', 0);
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="email"]')
      .should('exist');
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="text"]')
      .should('exist');
    cy.get('form-input-validation').shadow().find('textarea').should('exist');
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="radio"]')
      .should('have.length', 3);
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="checkbox"]')
      .should('have.length.greaterThan', 0);
    cy.get('form-input-validation').shadow().find('select').should('exist');
    cy.get('form-input-validation')
      .shadow()
      .find('button[type="submit"]')
      .should('exist');
  });

  it('shows error for empty required fields', () => {
    cy.get('form-input-validation')
      .shadow()
      .find('button[type="submit"]')
      .click();
    cy.wait(100);
    cy.get('form-input-validation')
      .shadow()
      .find('.error')
      .should('contain', 'Please enter a valid email address.');
  });

  it('shows error for invalid email format', () => {
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="email"]')
      .type('invalid-email');
    cy.get('form-input-validation')
      .shadow()
      .find('button[type="submit"]')
      .click();
    cy.wait(100);
    cy.get('form-input-validation')
      .shadow()
      .find('.error')
      .should('contain', 'Please enter a valid email address.');
  });

  it('shows error for short username', () => {
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="email"]')
      .type('test@example.com');
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="text"]')
      .type('ab');
    cy.get('form-input-validation')
      .shadow()
      .find('button[type="submit"]')
      .click();
    cy.wait(100);
    cy.get('form-input-validation')
      .shadow()
      .find('.error')
      .should('contain', 'Username must be at least 3 characters.');
  });

  it('shows error for short bio', () => {
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="email"]')
      .type('test@example.com');
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="text"]')
      .type('abc');
    cy.get('form-input-validation').shadow().find('textarea').type('short');
    cy.get('form-input-validation')
      .shadow()
      .find('button[type="submit"]')
      .click();
    cy.wait(100);
    cy.get('form-input-validation')
      .shadow()
      .find('.error')
      .should('contain', 'Bio must be at least 10 characters.');
  });

  it('shows error for missing gender', () => {
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="email"]')
      .type('test@example.com');
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="text"]')
      .type('abc');
    cy.get('form-input-validation')
      .shadow()
      .find('textarea')
      .type('This is a valid bio.');
    cy.get('form-input-validation').shadow().find('select').select('us');
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="checkbox"][value="apple"]')
      .check();
    cy.get('form-input-validation')
      .shadow()
      .find('button[type="submit"]')
      .click();
    cy.wait(100);
    cy.get('form-input-validation')
      .shadow()
      .find('.error')
      .should('contain', 'Please select a gender.');
  });

  it('shows error for missing country', () => {
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="email"]')
      .type('test@example.com');
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="text"]')
      .type('abc');
    cy.get('form-input-validation')
      .shadow()
      .find('textarea')
      .type('This is a valid bio.');
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="radio"]')
      .first()
      .check();
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="checkbox"][value="apple"]')
      .check();
    cy.get('form-input-validation')
      .shadow()
      .find('button[type="submit"]')
      .click();
    cy.wait(100);
    cy.get('form-input-validation')
      .shadow()
      .find('.error')
      .should('contain', 'Please select a country.');
  });

  it('shows error for missing fruits', () => {
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="email"]')
      .type('test@example.com');
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="text"]')
      .type('abc');
    cy.get('form-input-validation')
      .shadow()
      .find('textarea')
      .type('This is a valid bio.');
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="radio"]')
      .first()
      .check();
    cy.get('form-input-validation').shadow().find('select').select('us');
    cy.get('form-input-validation')
      .shadow()
      .find('button[type="submit"]')
      .click();
    cy.wait(100);
    cy.get('form-input-validation')
      .shadow()
      .find('.error')
      .should('contain', 'Please select at least one favorite fruit.');
  });

  it('accepts valid input and submits', () => {
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="email"]')
      .type('test@example.com');
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="text"]')
      .type('abc');
    cy.get('form-input-validation')
      .shadow()
      .find('textarea')
      .type('This is a valid bio.');
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="radio"]')
      .first()
      .check();
    cy.get('form-input-validation').shadow().find('select').select('us');
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="checkbox"][value="apple"]')
      .check();
    cy.get('form-input-validation')
      .shadow()
      .find('button[type="submit"]')
      .click();
    cy.wait(100);
    cy.get('form-input-validation')
      .shadow()
      .find('.success')
      .should('contain', 'Form submitted successfully!');
  });

  it('trims input and resets after submit', () => {
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="email"]')
      .type('  test@example.com  ');
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="text"]')
      .type('  abc  ');
    cy.get('form-input-validation')
      .shadow()
      .find('textarea')
      .type('  This is a valid bio.  ');
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="radio"]')
      .first()
      .check();
    cy.get('form-input-validation').shadow().find('select').select('us');
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="checkbox"][value="apple"]')
      .check();
    cy.get('form-input-validation')
      .shadow()
      .find('button[type="submit"]')
      .click();
    cy.wait(100);
    cy.get('form-input-validation')
      .shadow()
      .find('.success')
      .should('contain', 'Form submitted successfully!');
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="email"]')
      .should('have.value', '');
  });

  it('is accessible by keyboard', () => {
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="email"]')
      .focus()
      .type('test@example.com');
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="text"]')
      .focus()
      .type('abc');
    cy.get('form-input-validation')
      .shadow()
      .find('textarea')
      .focus()
      .type('This is a valid bio.');
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="radio"]')
      .first()
      .focus()
      .type('{downarrow}')
      .check();
    cy.get('form-input-validation')
      .shadow()
      .find('select')
      .focus()
      .select('us');
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="checkbox"][value="apple"]')
      .focus()
      .check();
    cy.get('form-input-validation')
      .shadow()
      .find('button[type="submit"]')
      .focus()
      .type('{enter}');
    cy.wait(100);
    cy.get('form-input-validation')
      .shadow()
      .find('.success')
      .should('contain', 'Form submitted successfully!');
  });

  it('handles edge case: rapid submit clicks', () => {
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="email"]')
      .type('test@example.com');
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="text"]')
      .type('abc');
    cy.get('form-input-validation')
      .shadow()
      .find('textarea')
      .type('This is a valid bio.');
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="radio"]')
      .first()
      .check();
    cy.get('form-input-validation').shadow().find('select').select('us');
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="checkbox"][value="apple"]')
      .check();
    cy.get('form-input-validation')
      .shadow()
      .find('button[type="submit"]')
      .click()
      .click()
      .click();
    cy.wait(100);
    cy.get('form-input-validation')
      .shadow()
      .find('.success')
      .should('contain', 'Form submitted successfully!');
  });
});
