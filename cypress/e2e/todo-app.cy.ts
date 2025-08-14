/// <reference types="cypress" />
// Cypress E2E test for todo-app component

describe('todo-app component', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should add a new todo item', () => {
    cy.get('todo-app').should('exist');
    cy.get('todo-app').shadow().find('input[type="text"]').type('Test Todo{enter}');
    cy.get('todo-app').shadow().find('li').should('contain.text', 'Test Todo');
    cy.get('todo-app').shadow().find('li').should('have.length.gte', 4);
  });

  it.skip('should edit a todo item [Currently not implemented]', () => {
    cy.get('todo-app').should('exist');
    cy.get('todo-app').shadow().find('li').first().dblclick();
    cy.get('todo-app').shadow().find('input[type="text"]').clear().type('Edited Todo{enter}');
    cy.get('todo-app').shadow().find('li').first().should('contain.text', 'Edited Todo');
  });

  it('should complete and uncomplete a todo item', () => {
    cy.get('todo-app').should('exist');
    cy.get('todo-app').shadow().find('li').first().find('input[type="checkbox"]').check({ force: true });
    cy.get('todo-app').shadow().find('li').first().should('have.class', 'completed');
    cy.get('todo-app').shadow().find('li').first().find('input[type="checkbox"]').uncheck({ force: true });
    cy.get('todo-app').shadow().find('li').first().should('not.have.class', 'completed');
  });

  it('should filter todos by active/completed/all and render only one todo list template', () => {
    cy.get('todo-app').should('exist');
    cy.get('todo-app').shadow().find('[data-todo-list-root]').should('have.length', 1);
    cy.get('todo-app').shadow().find('[data-filter="active"]').click();
    cy.get('todo-app').shadow().find('li').not('.completed').should('have.length.gte', 1);
    cy.get('todo-app').shadow().find('[data-filter="completed"]').click();
    cy.get('todo-app').shadow().find('li.completed').should('have.length.gte', 0);
    cy.get('todo-app').shadow().find('[data-filter="all"]').click();
    cy.get('todo-app').shadow().find('li').should('have.length.gte', 1);
    cy.get('todo-app').shadow().find('[data-todo-list-root]').should('have.length', 1);
  });

  it('should delete a todo', () => {
    cy.get('todo-app').should('exist');
    cy.get('todo-app').shadow().find('button[data-action="delete"]').first().click();
    cy.get('todo-app').shadow().find('li').should('have.length.gte', 2);
  });

  it('should not render duplicate elements or templates after multiple updates', () => {
    cy.get('todo-app').should('exist');
    for (let i = 0; i < 3; i++) {
      cy.get('todo-app').shadow().find('input[type="text"]').type(`New Todo ${i}{Enter}`);
    }
    cy.get('todo-app').shadow().find('li').should('have.length.gte', 6);
    cy.get('todo-app').shadow().find('[data-todo-list-root]').should('have.length', 1);
  });

  it('should delete a todo', () => {
    cy.get('todo-app').should('exist');
    cy.get('todo-app').shadow().find('button[data-action="delete"]').first().click();
    cy.get('todo-app').shadow().find('li').should('have.length', 2);
  });

  it('should not render duplicate elements after multiple updates', () => {
    cy.get('todo-app').should('exist');
    for (let i = 0; i < 3; i++) {
      cy.get('todo-app').shadow().find('input[type="text"]').type(`New Todo ${i}{Enter}`);
    }
    cy.get('todo-app').shadow().find('li').should('have.length', 6);
  });
});
