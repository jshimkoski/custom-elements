/// <reference types="cypress" />
// Cypress E2E test for docs-site/docs-app.ts component

describe('docs-app.ts component', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should render docs-app, docs-nav, and docs-content', () => {
    cy.get('docs-app').should('exist');
    cy.get('docs-app').shadow().find('docs-nav').should('exist');
    cy.get('docs-app').shadow().find('docs-content').should('exist');
    cy.get('docs-app').shadow().find('docs-content').should('have.attr', 'section', 'overview');
  });

  it('should display initial docs-content (overview)', () => {
    cy.get('docs-app').shadow().find('docs-content').shadow().should('contain.text', 'Custom Elements Runtime');
    cy.get('docs-app').shadow().find('docs-content').shadow().should('contain.text', 'Ultra-lightweight');
  });

  it('should navigate to Features section and back to Overview', () => {
    cy.get('docs-app').shadow().find('docs-nav').shadow().find('button[data-id="features"]').click();
    cy.get('docs-app').shadow().find('docs-content').shadow().should('contain.text', 'Features');
    cy.get('docs-app').shadow().find('docs-nav').shadow().find('button[data-id="overview"]').click();
    cy.get('docs-app').shadow().find('docs-content').shadow().should('contain.text', 'Custom Elements Runtime');
  });

  it('should update docs-content for all sections', () => {
    const sections = [
      { id: 'overview', text: 'Custom Elements Runtime' },
      { id: 'features', text: 'Features' },
      { id: 'getting-started', text: 'Getting Started' },
      { id: 'api-reference', text: 'API Reference' },
      { id: 'core-concepts', text: 'Core Concepts' },
      { id: 'advanced-use-cases', text: 'Advanced Use Cases' },
      { id: 'examples', text: 'Examples' },
      { id: 'ssr-guide', text: 'SSR Guide' },
      { id: 'framework-comparison', text: 'Framework Comparison' }
    ];
    sections.forEach(({ id, text }) => {
      cy.get('docs-app').shadow().find('docs-nav').shadow().find(`button[data-id="${id}"]`).click();
      cy.get('docs-app').shadow().find('docs-content').shadow().should('contain.text', text);
    });
  });
});
