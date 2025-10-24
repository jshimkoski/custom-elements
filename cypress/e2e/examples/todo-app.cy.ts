/// <reference types="cypress" />

describe.skip('TodoApp Component', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.get('todo-app').should('exist');
  });

  it('renders the todo app with input and add button', () => {
    cy.get('todo-app')
      .shadow()
      .within(() => {
        cy.get('h2').should('contain', 'Todo List');
        cy.get('form').should('exist');
        cy.get('input[type="text"]').should('exist');
        cy.get('button[type="submit"]').should('exist');
        cy.get('ul').should('exist');
      });
  });

  it('adds multiple todo items', () => {
    cy.get('todo-app')
      .shadow()
      .within(() => {
        cy.get('form').should('exist');
        cy.get('input[type="text"]').should('exist');
        cy.get('button[type="submit"]').should('exist');
        cy.get('input[type="text"]')
          .type('Buy milk')
          .should('have.value', 'Buy milk');
        cy.get('button[type="submit"]').click();
        cy.get('input[type="text"]').should('not.have.text');
        cy.get('input[type="text"]')
          .type('Walk dog')
          .should('have.value', 'Walk dog');
        cy.get('button[type="submit"]').click();
        cy.get('input[type="text"]').should('not.have.text');
        cy.get('ul li').should('have.length', 2);
        cy.get('ul li')
          .eq(0)
          .find('span.todo-text')
          .should('contain', 'Buy milk');
        cy.get('ul li')
          .eq(1)
          .find('span.todo-text')
          .should('contain', 'Walk dog');
      });
  });

  it('marks a todo item as completed and toggles back', () => {
    cy.get('todo-app')
      .shadow()
      .within(() => {
        cy.get('form').should('exist');
        cy.get('input[type="text"]').type('Feed cat');
        cy.get('button[type="submit"]').click();
        cy.get('input[type="text"]').should('not.have.text');
        cy.get('ul li').eq(0).find('input[type="checkbox"]').check();
        cy.get('ul li')
          .eq(0)
          .find('span.todo-text')
          .should('have.attr', 'data-done', 'true');
        cy.get('ul li').eq(0).find('input[type="checkbox"]').uncheck();
        cy.get('ul li')
          .eq(0)
          .find('span.todo-text')
          .should('have.attr', 'data-done', 'false');
      });
  });

  it('removes a todo item', () => {
    cy.get('todo-app')
      .shadow()
      .within(() => {
        cy.get('form').should('exist');
        cy.get('input[type="text"]').type('Read book');
        cy.get('button[type="submit"]').click();
        cy.get('ul li').eq(0).find('button.remove-btn').click();
        cy.get('ul li').should('have.length', 0);
      });
  });

  it('does not add empty todo items', () => {
    cy.get('todo-app')
      .shadow()
      .within(() => {
        cy.get('form').should('exist');
        cy.get('button[type="submit"]').click();
        cy.get('ul li').should('have.length', 0);
      });
  });

  it('is accessible by keyboard', () => {
    cy.get('todo-app')
      .shadow()
      .within(() => {
        cy.get('form').should('exist');
        cy.get('input[type="text"]').focus().type('Do homework{enter}');
        cy.get('ul li')
          .eq(0)
          .find('span.todo-text')
          .should('contain', 'Do homework');
      });
  });

  it('handles edge case: add and remove same item repeatedly', () => {
    cy.get('todo-app')
      .shadow()
      .within(() => {
        cy.get('form').should('exist');
        for (let i = 0; i < 3; i++) {
          cy.get('input[type="text"]').type('Repeat');
          cy.get('button[type="submit"]').click();
          cy.get('ul li').eq(0).find('button.remove-btn').click();
        }
        cy.get('ul li').should('have.length', 0);
      });
  });
});
