/// <reference types="cypress" />

describe('💠 md-app-bar component e2e tests', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  afterEach(() => {
    cy.document().then((doc) => {
      const fixture = doc.querySelector('#md-app-bar-test-fixture');
      if (fixture) fixture.remove();
      const smallFixture = doc.querySelector('#md-app-bar-small-test-fixture');
      if (smallFixture) smallFixture.remove();
    });

    cy.scrollTo(0, 0);
  });

  it('collapses and recovers from top quickly when scroll hits 0 during animation', () => {
    cy.window().then((win) => {
      const fixture = win.document.createElement('div');
      fixture.id = 'md-app-bar-test-fixture';
      win.document.body.appendChild(fixture);

      const appBar = win.document.createElement('md-app-bar');
      appBar.setAttribute('title', 'Test App Bar');
      appBar.setAttribute('variant', 'large');
      appBar.setAttribute('leading-icon', 'menu');
      fixture.appendChild(appBar);
      cy.wrap(appBar).as('appBar');
    });

    cy.get('@appBar').shadow().find('header.app-bar').should('exist');

    cy.scrollTo(0, 250);
    cy.get('@appBar').shadow().find('header.app-bar.collapsed').should('exist');

    // Immediately scroll to top while animation is still active.
    cy.scrollTo(0, 0);

    // Confirm state eventually becomes uncollapsed after deferred update is applied.
    cy.wait(260);
    cy.get('@appBar')
      .shadow()
      .find('header.app-bar:not(.collapsed)')
      .should('exist');
  });

  it('emits nav and action events and handles trailing icon arrays safely', () => {
    cy.window().then((win) => {
      const fixture = win.document.createElement('div');
      fixture.id = 'md-app-bar-test-fixture';
      win.document.body.appendChild(fixture);

      const appBar = win.document.createElement('md-app-bar');
      appBar.setAttribute('title', 'Test App Bar');
      appBar.setAttribute('variant', 'large');
      appBar.setAttribute('leading-icon', 'menu');

      (appBar as unknown as { trailingIcons: unknown }).trailingIcons = [
        'search',
        'settings',
      ];

      const status = win.document.createElement('div');
      status.id = 'md-app-bar-event-status';
      fixture.appendChild(status);

      appBar.addEventListener('nav', () => {
        status.textContent = 'nav-fired';
      });

      appBar.addEventListener('action', (event) => {
        status.textContent = `action-${(event as CustomEvent).detail}`;
      });

      fixture.appendChild(appBar);
      cy.wrap(appBar).as('appBar');
    });

    cy.get('@appBar')
      .shadow()
      .find('.title')
      .should('contain.text', 'Test App Bar');

    cy.get('@appBar')
      .shadow()
      .find('button.icon-btn')
      .first()
      .click({ force: true });
    cy.get('#md-app-bar-event-status').should('have.text', 'nav-fired');

    cy.get('@appBar')
      .shadow()
      .find('.trailing-actions button.icon-btn')
      .first()
      .click({ force: true });
    cy.get('#md-app-bar-event-status').should('have.text', 'action-search');

    cy.get('@appBar')
      .shadow()
      .find('.trailing-actions button.icon-btn')
      .should('have.length', 2);
  });

  it('does not collapse in small variant and ignores invalid trailingIcons', () => {
    cy.window().then((win) => {
      const fixture = win.document.createElement('div');
      fixture.id = 'md-app-bar-small-test-fixture';
      win.document.body.appendChild(fixture);

      const appBar = win.document.createElement('md-app-bar');
      appBar.setAttribute('title', 'Small Bar');
      appBar.setAttribute('variant', 'small');
      (appBar as unknown as { trailingIcons: unknown }).trailingIcons =
        'invalid';

      fixture.appendChild(appBar);
      cy.wrap(appBar).as('smallAppBar');
    });

    cy.get('@smallAppBar').shadow().find('header.app-bar').should('exist');

    cy.scrollTo(0, 250);
    cy.get('@smallAppBar')
      .shadow()
      .find('header.app-bar.collapsed')
      .should('not.exist');
    cy.get('@smallAppBar')
      .shadow()
      .find('.trailing-actions button.icon-btn')
      .should('have.length', 0);
  });
});
