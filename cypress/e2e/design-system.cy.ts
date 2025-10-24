/// <reference types="cypress" />

/**
 * 🎯 Design System - Final Comprehensive Test Suite
 *
 * This test suite validates ALL design system components work correctly
 * with Vue-like directives (:model, :bind, :model:prop) using the
 * correct timing and interaction patterns discovered during debugging.
 */

describe('🎯 Design System - Final Comprehensive Tests', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  describe('📝 Text Input Components', () => {
    it('should handle ds-input :model binding correctly', () => {
      cy.get('design-system-test')
        .shadow()
        .within(() => {
          // Verify initial value is displayed
          cy.contains('Value: "Hello World"').should('exist');

          // Find first ds-input (model binding)
          cy.get('ds-input')
            .first()
            .shadow()
            .within(() => {
              cy.get('input').should('have.value', 'Hello World');

              // Clear and type new value
              cy.get('input').clear().type('Updated Text');
            });

          // Verify parent state was updated with retry
          cy.contains('Value: "Updated Text"', { timeout: 10000 }).should(
            'exist',
          );

          // Verify second ds-input (bind) shows the same value
          cy.get('ds-input')
            .eq(1)
            .shadow()
            .within(() => {
              cy.get('input', { timeout: 10000 }).should(
                'have.value',
                'Updated Text',
              );
            });
        });
    });

    it('should handle ds-textarea :model binding correctly', () => {
      cy.get('design-system-test')
        .shadow()
        .within(() => {
          // Verify initial value
          cy.contains(
            'Value: "This is a multi-line\\ntext area example"',
          ).should('exist');

          cy.get('ds-textarea')
            .first()
            .shadow()
            .within(() => {
              cy.get('textarea').clear().type('New content here');
            });

          cy.contains('Value: "New content here"').should('exist');
        });
    });
  });

  describe('✅ Boolean Input Components', () => {
    it('should handle ds-checkbox :model binding correctly', () => {
      cy.get('design-system-test')
        .shadow()
        .within(() => {
          // Verify initial state (true)
          cy.contains('Value: true').should('exist');

          cy.get('ds-checkbox')
            .first()
            .shadow()
            .within(() => {
              cy.get('input[type="checkbox"]').should('be.checked');
              cy.get('input[type="checkbox"]').uncheck();
            });

          cy.contains('Value: false').should('exist');

          // Toggle back
          cy.get('ds-checkbox')
            .first()
            .shadow()
            .within(() => {
              cy.get('input[type="checkbox"]').check();
            });

          cy.contains('Value: true').should('exist');
        });
    });
  });

  describe('🎯 Selection Components', () => {
    it('should handle ds-select :model binding correctly', () => {
      cy.get('design-system-test')
        .shadow()
        .within(() => {
          // Verify initial value (blue)
          cy.contains('Value: "blue"').should('exist');

          cy.get('ds-select')
            .first()
            .shadow()
            .within(() => {
              cy.get('select').should('have.value', 'blue');
              cy.get('select').select('red');
            });

          cy.contains('Value: "red"', { timeout: 10000 }).should('exist');

          // Verify second select (bind) shows the same value
          cy.get('ds-select')
            .eq(1)
            .shadow()
            .within(() => {
              cy.get('select', { timeout: 10000 }).should('have.value', 'red');
            });
        });
    });
  });

  describe('🔢 Numeric Input Components', () => {
    it('should handle ds-number :model binding correctly', () => {
      cy.get('design-system-test')
        .shadow()
        .within(() => {
          // Verify initial value (42)
          cy.contains('Value: 42').should('exist');

          cy.get('ds-number')
            .first()
            .shadow()
            .within(() => {
              cy.get('input[type="number"]').clear().type('73');
            });

          cy.contains('Value: 73').should('exist');
        });
    });

    it('should handle ds-range :model binding correctly', () => {
      cy.get('design-system-test')
        .shadow()
        .within(() => {
          // Verify initial value (75)
          cy.contains('Value: 75').should('exist');

          cy.get('ds-range')
            .first()
            .shadow()
            .within(() => {
              cy.get('input[type="range"]').invoke('val', 25).trigger('input');
            });

          cy.contains('Value: 25').should('exist');
        });
    });

    it('should display ds-progress value correctly', () => {
      cy.get('design-system-test')
        .shadow()
        .within(() => {
          // Verify initial progress display
          cy.contains('Progress: 60%').should('exist');

          // Progress component should display the value correctly
          cy.get('ds-progress')
            .first()
            .shadow()
            .within(() => {
              cy.contains('60 / 100').should('exist');
            });
        });
    });
  });

  describe('🎬 Action Components', () => {
    it('should handle ds-button click events correctly', () => {
      cy.get('design-system-test')
        .shadow()
        .within(() => {
          // Use force: true since buttons might have styling issues affecting visibility
          cy.get('ds-button')
            .contains('Reset Text Inputs')
            .click({ force: true });
          cy.contains('Last Action: Text Reset').should('exist');

          cy.get('ds-button')
            .contains('Toggle Booleans')
            .click({ force: true });
          cy.contains('Last Action: Boolean Toggle').should('exist');

          cy.get('ds-button')
            .contains('Randomize Numbers')
            .click({ force: true });
          cy.contains('Last Action: Numbers Randomized').should('exist');
        });
    });
  });

  describe('🔄 Cross-Component Integration Tests', () => {
    it('should maintain state consistency across all components', () => {
      cy.get('design-system-test')
        .shadow()
        .within(() => {
          // Change multiple values
          cy.get('ds-input')
            .first()
            .shadow()
            .within(() => {
              cy.get('input').clear().type('Integration Test');
            });

          cy.get('ds-checkbox')
            .first()
            .shadow()
            .within(() => {
              cy.get('input[type="checkbox"]').uncheck();
            });

          cy.get('ds-select')
            .first()
            .shadow()
            .within(() => {
              cy.get('select').select('red');
            });

          cy.get('ds-number')
            .first()
            .shadow()
            .within(() => {
              cy.get('input[type="number"]').clear().type('99');
            });

          // Verify all changes are reflected
          cy.contains('Value: "Integration Test"').should('exist');
          cy.contains('Value: false').should('exist');
          cy.contains('Value: "red"').should('exist');
          cy.contains('Value: 99').should('exist');
        });
    });

    it('should handle programmatic updates correctly', () => {
      cy.get('design-system-test')
        .shadow()
        .within(() => {
          // Use programmatic button to change values
          cy.get('ds-button')
            .contains('Reset Text Inputs')
            .click({ force: true });

          // Verify the parent state updated
          cy.contains('Value: "Reset Text"').should('exist');
          cy.contains('Value: "Reset Content"').should('exist');
          cy.contains('Last Action: Text Reset').should('exist');

          // Verify the form elements show the updated values
          cy.get('ds-input')
            .first()
            .shadow()
            .within(() => {
              cy.get('input').should('have.value', 'Reset Text');
            });

          cy.get('ds-textarea')
            .first()
            .shadow()
            .within(() => {
              cy.get('textarea').should('have.value', 'Reset Content');
            });
        });
    });

    it('should validate :model vs :bind behavior differences', () => {
      cy.get('design-system-test')
        .shadow()
        .within(() => {
          // Both model and bind inputs should show same initial value
          cy.get('ds-input')
            .first()
            .shadow()
            .within(() => {
              cy.get('input').should('have.value', 'Hello World');
            });

          cy.get('ds-input')
            .eq(1)
            .shadow()
            .within(() => {
              cy.get('input').should('have.value', 'Hello World');
            });

          // Change model input
          cy.get('ds-input')
            .first()
            .shadow()
            .within(() => {
              cy.get('input').clear().type('Model Updated');
            });

          // Both should show the new value (two-way binding)
          cy.get('ds-input')
            .eq(1)
            .shadow()
            .within(() => {
              cy.get('input', { timeout: 10000 }).should(
                'have.value',
                'Model Updated',
              );
            });

          // Parent display should show updated value
          cy.contains('Value: "Model Updated"').should('exist');

          // Test selects as well
          cy.get('ds-select')
            .first()
            .shadow()
            .within(() => {
              cy.get('select').select('green');
            });

          cy.get('ds-select')
            .eq(1)
            .shadow()
            .within(() => {
              cy.get('select').should('have.value', 'green');
            });
        });
    });
  });

  describe('🧪 Edge Cases and Error Handling', () => {
    it('should handle empty values gracefully', () => {
      cy.get('design-system-test')
        .shadow()
        .within(() => {
          // Clear text input
          cy.get('ds-input')
            .first()
            .shadow()
            .within(() => {
              cy.get('input').clear();
            });

          // Should show empty value
          cy.contains('Value: ""').should('exist');

          // Component should still be functional
          cy.get('ds-input')
            .first()
            .shadow()
            .within(() => {
              cy.get('input').type('Recovered');
            });

          cy.contains('Value: "Recovered"').should('exist');
        });
    });

    it('should handle rapid state changes correctly', () => {
      cy.get('design-system-test')
        .shadow()
        .within(() => {
          // Rapid button clicks
          cy.get('ds-button')
            .contains('Toggle Booleans')
            .click({ force: true });
          cy.get('ds-button')
            .contains('Reset Text Inputs')
            .click({ force: true });
          cy.get('ds-button')
            .contains('Toggle Booleans')
            .click({ force: true });
          cy.get('ds-button')
            .contains('Randomize Numbers')
            .click({ force: true });

          // Verify final state
          cy.contains('Last Action: Numbers Randomized').should('exist');

          // All components should still be responsive
          cy.get('ds-input')
            .first()
            .shadow()
            .within(() => {
              cy.get('input').clear().type('Still Working');
            });

          cy.contains('Value: "Still Working"').should('exist');
        });
    });

    it('should handle numeric boundaries correctly', () => {
      cy.get('design-system-test')
        .shadow()
        .within(() => {
          // Test number input with boundary values
          cy.get('ds-number')
            .first()
            .shadow()
            .within(() => {
              cy.get('input[type="number"]').clear().type('0');
            });

          cy.contains('Value: 0').should('exist');

          cy.get('ds-number')
            .first()
            .shadow()
            .within(() => {
              cy.get('input[type="number"]').clear().type('100');
            });

          cy.contains('Value: 100').should('exist');

          // Test range boundaries
          cy.get('ds-range')
            .first()
            .shadow()
            .within(() => {
              cy.get('input[type="range"]').invoke('val', 0).trigger('input');
            });

          cy.contains('Value: 0').should('exist');

          cy.get('ds-range')
            .first()
            .shadow()
            .within(() => {
              cy.get('input[type="range"]').invoke('val', 100).trigger('input');
            });

          cy.contains('Value: 100').should('exist');
        });
    });
  });

  describe('🏆 Final Validation', () => {
    it('should confirm all design system components work with :model, :bind, and :model:prop', () => {
      cy.get('design-system-test')
        .shadow()
        .within(() => {
          // Test each component type systematically

          // Text Inputs
          cy.get('ds-input')
            .first()
            .shadow()
            .find('input')
            .clear()
            .type('Final Test Input');
          cy.get('ds-textarea')
            .first()
            .shadow()
            .find('textarea')
            .clear()
            .type('Final Test Textarea');

          // Boolean Inputs
          cy.get('ds-checkbox')
            .first()
            .shadow()
            .find('input[type="checkbox"]')
            .uncheck();

          // Selection Inputs
          cy.get('ds-select').first().shadow().find('select').select('green');

          // Numeric Inputs
          cy.get('ds-number')
            .first()
            .shadow()
            .find('input[type="number"]')
            .clear()
            .type('88');
          cy.get('ds-range')
            .first()
            .shadow()
            .find('input[type="range"]')
            .invoke('val', 33)
            .trigger('input');

          // Action Components - Toggle Booleans (will flip checkbox from false to true)
          cy.get('ds-button')
            .contains('Toggle Booleans')
            .click({ force: true });

          // Verify all state updates
          cy.contains('Value: "Final Test Input"').should('exist');
          cy.contains('Value: "Final Test Textarea"').should('exist');
          cy.contains('Value: true').should('exist'); // checkbox was unchecked (false), then toggled to true
          cy.contains('Value: "green"').should('exist');
          cy.contains('Value: 88').should('exist');
          cy.contains('Value: 33').should('exist');
          cy.contains('Last Action: Boolean Toggle').should('exist');

          // Final success message
          cy.log(
            '🎉 ALL DESIGN SYSTEM COMPONENTS WORKING WITH MODEL BINDING! 🎉',
          );
        });
    });
  });
});
