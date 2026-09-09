/// <reference types="cypress" />

describe('FormInputValidation Component', () => {
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

  it('preserves native HTML constraint validation for pointer and keyboard submission', () => {
    cy.get('form-input-validation')
      .shadow()
      .find('form')
      .should(($form) => {
        expect(($form[0] as HTMLFormElement).noValidate).to.equal(false);
        expect(($form[0] as HTMLFormElement).checkValidity()).to.equal(false);
      });

    cy.get('form-input-validation')
      .shadow()
      .find('button[type="submit"]')
      .click();
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="email"]')
      .should('match', ':invalid')
      .then(($input) => {
        expect(($input[0] as HTMLInputElement).validationMessage).not.to.equal('');
      });
    cy.get('form-input-validation').shadow().find('.error').should('not.exist');

    cy.get('form-input-validation')
      .shadow()
      .find('button[type="submit"]')
      .focus();
    cy.press(Cypress.Keyboard.Keys.ENTER);
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="email"]')
      .should('match', ':invalid');
    cy.get('form-input-validation').shadow().find('.error').should('not.exist');
  });

  it('uses native validation for empty required fields', () => {
    cy.get('form-input-validation')
      .shadow()
      .find('button[type="submit"]')
      .click();
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="email"]')
      .should('match', ':invalid')
      .then(($input) => {
        expect(($input[0] as HTMLInputElement).validity.valueMissing).to.equal(true);
      });
  });

  it('uses native validation for invalid email format', () => {
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="email"]')
      .type('invalid-email');
    cy.get('form-input-validation')
      .shadow()
      .find('button[type="submit"]')
      .click();
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="email"]')
      .should('match', ':invalid')
      .then(($input) => {
        expect(($input[0] as HTMLInputElement).validity.typeMismatch).to.equal(true);
      });
  });

  it('exposes native minlength and a defensive username fallback', () => {
    let originalInput: HTMLInputElement;
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="email"]')
      .type('test@example.com');
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="text"]')
      .then(($input) => {
        originalInput = $input[0] as HTMLInputElement;
      })
      .type('ab');
    cy.get('form-input-validation')
      .shadow()
      .find('button[type="submit"]')
      .click();
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="text"]')
      .then(($input) => {
        const input = $input[0] as HTMLInputElement;
        expect(input).to.equal(originalInput);
        expect(input.getAttribute('minlength')).to.equal('3');
        expect(input.minLength).to.equal(3);
        expect(input.value).to.equal('ab');
      });
    cy.get('form-input-validation')
      .shadow()
      .find('form')
      .then(($form) => {
        $form[0].dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });
    cy.get('form-input-validation')
      .shadow()
      .find('.error')
      .should('contain', 'Username must be at least 3 characters.');
  });

  it('exposes native minlength and a defensive bio fallback', () => {
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
    cy.get('form-input-validation')
      .shadow()
      .find('textarea')
      .then(($input) => {
        const input = $input[0] as HTMLTextAreaElement;
        expect(input.getAttribute('minlength')).to.equal('10');
        expect(input.minLength).to.equal(10);
        expect(input.value).to.equal('short');
      });
    cy.get('form-input-validation')
      .shadow()
      .find('form')
      .then(($form) => {
        $form[0].dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });
    cy.get('form-input-validation')
      .shadow()
      .find('.error')
      .should('contain', 'Bio must be at least 10 characters.');
  });

  it('uses native required validation for the gender group', () => {
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
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="radio"]')
      .first()
      .should('match', ':invalid')
      .then(($input) => {
        expect(($input[0] as HTMLInputElement).validity.valueMissing).to.equal(true);
      });
  });

  it('uses native required validation for the country', () => {
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
    cy.get('form-input-validation')
      .shadow()
      .find('select')
      .should('match', ':invalid')
      .then(($select) => {
        expect(($select[0] as HTMLSelectElement).validity.valueMissing).to.equal(true);
      });
  });

  it('uses native required validation for at least one favorite fruit', () => {
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
    cy.get('form-input-validation')
      .shadow()
      .find('input[type="checkbox"][value="apple"]')
      .should('match', ':invalid')
      .then(($input) => {
        expect(($input[0] as HTMLInputElement).validity.valueMissing).to.equal(true);
      });
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
