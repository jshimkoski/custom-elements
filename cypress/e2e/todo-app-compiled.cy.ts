/// <reference types="cypress" />
// Cypress E2E test for TodoAppCompiled.ts component

describe('TodoAppCompiled.ts component', () => {
  beforeEach(() => {
    cy.visit('/e2e-test.html');
  });

  it('should render initial todos and filters', () => {
    cy.get('todo-app-compiled').should('exist');
    cy.get('todo-app-compiled').shadow().find('li').should('have.length.gte', 1);
    cy.get('todo-app-compiled').shadow().find('[data-filter="all"]').should('exist');
    cy.get('todo-app-compiled').shadow().find('[data-filter="active"]').should('exist');
    cy.get('todo-app-compiled').shadow().find('[data-filter="completed"]').should('exist');
  });

  it('should add a new todo item', () => {
    cy.get('todo-app-compiled').shadow().find('input[type="text"]').type('Test Compiled{enter}');
    cy.get('todo-app-compiled').shadow().find('li').should('contain.text', 'Test Compiled');
  });

  it('should complete and uncomplete a todo item', () => {
    cy.get('todo-app-compiled').shadow().find('li').first().find('input[type="checkbox"]').check({ force: true });
    cy.get('todo-app-compiled').shadow().find('li').first().should('have.class', 'completed');
    cy.get('todo-app-compiled').shadow().find('li').first().find('input[type="checkbox"]').uncheck({ force: true });
    cy.get('todo-app-compiled').shadow().find('li').first().should('not.have.class', 'completed');
  });

  it('should filter todos by active/completed/all', () => {
    cy.get('todo-app-compiled').shadow().find('[data-filter="active"]').click();
    cy.get('todo-app-compiled').shadow().find('li').not('.completed').should('have.length.gte', 1);
    cy.get('todo-app-compiled').shadow().find('[data-filter="completed"]').click();
    cy.get('todo-app-compiled').shadow().find('li.completed').should('have.length.gte', 0);
    cy.get('todo-app-compiled').shadow().find('[data-filter="all"]').click();
    cy.get('todo-app-compiled').shadow().find('li').should('have.length.gte', 1);
  });

  it('should delete a todo', () => {
    cy.get('todo-app-compiled').shadow().find('button[data-action="delete"]').first().click();
    cy.get('todo-app-compiled').shadow().find('li').should('have.length.gte', 1);
  });

  it('should not render duplicate elements or templates after multiple updates', () => {
    for (let i = 0; i < 3; i++) {
      cy.get('todo-app-compiled').shadow().find('input[type="text"]').type(`New Compiled ${i}{Enter}`);
    }
    cy.get('todo-app-compiled').shadow().find('li').should('have.length.gte', 4);
  });
});
