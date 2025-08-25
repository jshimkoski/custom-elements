/// <reference types="cypress" />

describe('ShoppingCart Component', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.get('shopping-cart').should('exist');
  });

  it('renders all items and controls in shadow DOM', () => {
    cy.get('shopping-cart').shadow().find('.cart-container').should('exist');
    cy.get('shopping-cart').shadow().find('h2').should('contain', 'Shopping Cart');
    cy.get('shopping-cart').shadow().find('ul li').should('have.length', 3);
    cy.get('shopping-cart').shadow().find('button.qty-btn').should('exist');
    cy.get('shopping-cart').shadow().find('button.remove-btn').should('exist');
    cy.get('shopping-cart').shadow().find('.cart-total').should('exist');
    cy.get('shopping-cart').shadow().find('button.reset-btn').should('exist');
  });

  it('increases and decreases item quantity', () => {
    cy.get('shopping-cart').shadow().find('button.qty-btn').eq(1).click();
    cy.get('shopping-cart').shadow().find('.item-qty').eq(0).should('contain', '2');
    cy.get('shopping-cart').shadow().find('button.qty-btn').eq(0).click();
    cy.get('shopping-cart').shadow().find('.item-qty').eq(0).should('contain', '1');
  });

  it('removes an item from the cart', () => {
    cy.get('shopping-cart').shadow().find('button.remove-btn').first().click();
    cy.get('shopping-cart').shadow().find('ul li').should('have.length', 2);
  });

  it('shows correct total price', () => {
    cy.get('shopping-cart').shadow().find('.cart-total').invoke('text').then((text) => {
      expect(text).to.match(/Total: \$[0-9]+\.[0-9]{2}/);
    });
  });

  it('resets the cart', () => {
    cy.get('shopping-cart').shadow().find('button.remove-btn').first().click();
    cy.get('shopping-cart').shadow().find('button.reset-btn').click();
    cy.get('shopping-cart').shadow().find('ul li').should('have.length', 3);
  });

  it('is accessible by keyboard', () => {
    cy.get('shopping-cart').shadow().find('button.qty-btn:not([disabled])').first().focus().type('{enter}');
    cy.get('shopping-cart').shadow().find('.item-qty').first().should('contain', '2');
  });

  it('handles edge case: remove all items', () => {
    cy.get('shopping-cart').shadow().find('button.remove-btn').each(($btn) => {
      cy.wrap($btn).click();
    });
    cy.get('shopping-cart').shadow().find('ul li').should('have.length', 0);
    cy.get('shopping-cart').shadow().find('.cart-total').should('contain', 'Total: $0.00');
  });
});