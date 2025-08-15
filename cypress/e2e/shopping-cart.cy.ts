/// <reference types="cypress" />
// Cypress E2E test for ShoppingCart.ts component

describe('ShoppingCart.ts component', () => {
  beforeEach(() => {
    cy.visit('/e2e-test.html');
  });

  it('should render initial cart state', () => {
    cy.get('shopping-cart-demo').should('exist');
    cy.get('shopping-cart-demo').shadow().find('h2').should('contain.text', 'Shopping Cart');
    cy.get('shopping-cart-demo').shadow().find('.cart-item').should('have.length.gte', 1);
    cy.get('shopping-cart-demo').shadow().find('.summary-line.total span').last().invoke('text').then(text => {
      expect(Number(text.replace(/[^\d.]/g, ''))).to.be.greaterThan(0);
    });
  });

  it('should increase and decrease item quantity', () => {
    cy.get('shopping-cart-demo').shadow().find('.cart-item').first().within(() => {
      cy.get('button[data-action="increase"]').click();
      cy.get('.quantity').should('contain.text', '2');
      cy.get('button[data-action="decrease"]').click();
      cy.get('.quantity').should('contain.text', '1');
    });
  });

  // No direct input for quantity, only buttons

  it('should remove an item from the cart', () => {
    cy.get('shopping-cart-demo').shadow().find('.cart-item').first().within(() => {
      cy.get('button[data-action="remove"]').click();
    });
    cy.get('shopping-cart-demo').shadow().find('.cart-item').should('have.length.lt', 3);
  });

  it('should apply coupon and update total', () => {
    cy.get('shopping-cart-demo').shadow().find('.coupon-field').type('SAVE10');
    cy.get('shopping-cart-demo').shadow().find('.apply-btn').click();
    cy.get('shopping-cart-demo').shadow().find('.coupon-success').should('contain.text', 'You saved');
    cy.get('shopping-cart-demo').shadow().find('.summary-line.discount').should('exist');
  });

  it('should clear the cart', () => {
    cy.get('shopping-cart-demo').shadow().find('.clear-btn').click();
    cy.get('shopping-cart-demo').shadow().find('.empty-cart').should('exist');
    cy.get('shopping-cart-demo').shadow().find('.cart-item').should('have.length', 0);
    cy.get('shopping-cart-demo').shadow().find('.summary-line.total').should('not.exist');
  });

  it('should add sample items when cart is empty', () => {
    cy.get('shopping-cart-demo').shadow().find('.clear-btn').click();
    cy.get('shopping-cart-demo').shadow().find('.add-sample-btn').click();
    cy.get('shopping-cart-demo').shadow().find('.cart-item').should('have.length.gte', 1);
  });
});
