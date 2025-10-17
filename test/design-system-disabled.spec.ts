import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

/**
 * 🐛 Design System Disabled Attribute Bug Reproduction
 * 
 * This test suite reproduces the Cypress failures where ds-* components
 * with default disabled: false are incorrectly rendering disabled="" on
 * their internal input elements.
 */

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>');
global.window = dom.window as any;
global.document = dom.window.document;
global.customElements = dom.window.customElements;
global.HTMLElement = dom.window.HTMLElement;

describe('🐛 Design System - Disabled Attribute Bug', () => {
  let container: HTMLElement;
  let componentsLoaded = false;

  beforeEach(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    
    if (!componentsLoaded) {
      let app = document.getElementById('app');
      if (!app) {
        app = document.createElement('div');
        app.id = 'app';
        document.body.appendChild(app);
      }
      
      await import('../src/main');
      componentsLoaded = true;
    }
  });

  describe('📝 ds-input without disabled prop', () => {
    it('should NOT have disabled attribute on internal input when disabled prop is not set', async () => {
      // Create ds-input without disabled prop (should use default disabled: false)
      container.innerHTML = '<ds-input model-value="test"></ds-input>';
      const dsInput = container.querySelector('ds-input') as any;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(dsInput).toBeDefined();
      expect(dsInput.shadowRoot).toBeDefined();
      
      const input = dsInput.shadowRoot?.querySelector('input');
      expect(input).toBeDefined();

      // The internal input should NOT have disabled attribute
      expect(input.hasAttribute('disabled')).toBe(false);
      
      // The disabled property should be false
      expect(input.disabled).toBe(false);
      
      // Should be able to interact with the input
      expect(input.getAttribute('disabled')).toBeNull();
    });

    it('should NOT have disabled attribute when explicitly set to false', async () => {
      container.innerHTML = '<ds-input model-value="test" disabled="false"></ds-input>';
      const dsInput = container.querySelector('ds-input') as any;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const input = dsInput.shadowRoot?.querySelector('input');
      expect(input.hasAttribute('disabled')).toBe(false);
      expect(input.disabled).toBe(false);
    });

    it('should have disabled attribute when set to true', async () => {
      container.innerHTML = '<ds-input model-value="test" disabled="true"></ds-input>';
      const dsInput = container.querySelector('ds-input') as any;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const input = dsInput.shadowRoot?.querySelector('input');
      expect(input.hasAttribute('disabled')).toBe(true);
      expect(input.disabled).toBe(true);
    });
  });

  describe('📝 ds-textarea without disabled prop', () => {
    it('should NOT have disabled attribute on internal textarea', async () => {
      container.innerHTML = '<ds-textarea model-value="test"></ds-textarea>';
      const dsTextarea = container.querySelector('ds-textarea') as any;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const textarea = dsTextarea.shadowRoot?.querySelector('textarea');
      expect(textarea).toBeDefined();
      expect(textarea.hasAttribute('disabled')).toBe(false);
      expect(textarea.disabled).toBe(false);
    });
  });

  describe('✅ ds-checkbox without disabled prop', () => {
    it('should NOT have disabled attribute on internal checkbox input', async () => {
      container.innerHTML = '<ds-checkbox model-value="false"></ds-checkbox>';
      const dsCheckbox = container.querySelector('ds-checkbox') as any;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const input = dsCheckbox.shadowRoot?.querySelector('input[type="checkbox"]');
      expect(input).toBeDefined();
      expect(input.hasAttribute('disabled')).toBe(false);
      expect(input.disabled).toBe(false);
    });
  });

  describe('🎯 ds-select without disabled prop', () => {
    it('should NOT have disabled attribute on internal select', async () => {
      container.innerHTML = '<ds-select model-value="blue"></ds-select>';
      const dsSelect = container.querySelector('ds-select') as any;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const select = dsSelect.shadowRoot?.querySelector('select');
      expect(select).toBeDefined();
      expect(select.hasAttribute('disabled')).toBe(false);
      expect(select.disabled).toBe(false);
    });
  });

  describe('🔢 ds-number without disabled prop', () => {
    it('should NOT have disabled attribute on internal number input', async () => {
      container.innerHTML = '<ds-number model-value="42"></ds-number>';
      const dsNumber = container.querySelector('ds-number') as any;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const input = dsNumber.shadowRoot?.querySelector('input[type="number"]');
      expect(input).toBeDefined();
      expect(input.hasAttribute('disabled')).toBe(false);
      expect(input.disabled).toBe(false);
    });
  });

  describe('🎚️ ds-range without disabled prop', () => {
    it('should NOT have disabled attribute on internal range input', async () => {
      container.innerHTML = '<ds-range model-value="50"></ds-range>';
      const dsRange = container.querySelector('ds-range') as any;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const input = dsRange.shadowRoot?.querySelector('input[type="range"]');
      expect(input).toBeDefined();
      expect(input.hasAttribute('disabled')).toBe(false);
      expect(input.disabled).toBe(false);
    });
  });

  describe('🔄 Component re-renders', () => {
    it('should maintain correct disabled state after re-render', async () => {
      container.innerHTML = '<ds-input model-value="test"></ds-input>';
      const dsInput = container.querySelector('ds-input') as any;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      let input = dsInput.shadowRoot?.querySelector('input');
      expect(input.hasAttribute('disabled')).toBe(false);
      
      // Change model-value to trigger re-render
      dsInput.setAttribute('model-value', 'updated');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      input = dsInput.shadowRoot?.querySelector('input');
      expect(input.hasAttribute('disabled')).toBe(false);
      expect(input.disabled).toBe(false);
    });

    it('should add disabled attribute when changed from false to true', async () => {
      container.innerHTML = '<ds-input model-value="test"></ds-input>';
      const dsInput = container.querySelector('ds-input') as any;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      let input = dsInput.shadowRoot?.querySelector('input');
      expect(input.hasAttribute('disabled')).toBe(false);
      
      // Set disabled to true
      dsInput.setAttribute('disabled', 'true');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      input = dsInput.shadowRoot?.querySelector('input');
      expect(input.hasAttribute('disabled')).toBe(true);
      expect(input.disabled).toBe(true);
    });

    it('should remove disabled attribute when changed from true to false', async () => {
      container.innerHTML = '<ds-input model-value="test" disabled="true"></ds-input>';
      const dsInput = container.querySelector('ds-input') as any;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      let input = dsInput.shadowRoot?.querySelector('input');
      expect(input.hasAttribute('disabled')).toBe(true);
      
      // Remove disabled
      dsInput.removeAttribute('disabled');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      input = dsInput.shadowRoot?.querySelector('input');
      expect(input.hasAttribute('disabled')).toBe(false);
      expect(input.disabled).toBe(false);
    });
  });

  describe('🧪 useProps with disabled default', () => {
    it('should return false for disabled prop when not set on host', async () => {
      container.innerHTML = '<ds-input></ds-input>';
      const dsInput = container.querySelector('ds-input') as any;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // The component's useProps should return disabled: false
      // This should result in NO disabled attribute on the internal input
      const input = dsInput.shadowRoot?.querySelector('input');
      expect(input.hasAttribute('disabled')).toBe(false);
    });

    it('should handle empty string as no disabled', async () => {
      container.innerHTML = '<ds-input disabled=""></ds-input>';
      const dsInput = container.querySelector('ds-input') as any;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Empty string should be treated as attribute presence = true
      const input = dsInput.shadowRoot?.querySelector('input');
      
      // Based on HTML attribute semantics, disabled="" means disabled
      // But our useProps should handle this correctly
      console.log('Input disabled attr:', input.getAttribute('disabled'));
      console.log('Input disabled prop:', input.disabled);
      console.log('Input hasAttribute:', input.hasAttribute('disabled'));
    });
  });

  describe('🔍 Template rendering with :disabled directive', () => {
    it('should handle :disabled="${false}" correctly', async () => {
      // This simulates what happens inside ds-input when props.disabled is false
      const { component, html } = await import('../src/lib');
      
      component('test-disabled-false', () => {
        return html`
          <input type="text" :disabled="${false}" />
        `;
      });
      
      container.innerHTML = '<test-disabled-false></test-disabled-false>';
      const testComp = container.querySelector('test-disabled-false') as any;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const input = testComp.shadowRoot?.querySelector('input');
      expect(input).toBeDefined();
      expect(input.hasAttribute('disabled')).toBe(false);
      expect(input.disabled).toBe(false);
    });

    it('should handle :disabled="${true}" correctly', async () => {
      const { component, html } = await import('../src/lib');
      
      component('test-disabled-true', () => {
        return html`
          <input type="text" :disabled="${true}" />
        `;
      });
      
      container.innerHTML = '<test-disabled-true></test-disabled-true>';
      const testComp = container.querySelector('test-disabled-true') as any;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const input = testComp.shadowRoot?.querySelector('input');
      expect(input).toBeDefined();
      expect(input.hasAttribute('disabled')).toBe(true);
      expect(input.disabled).toBe(true);
    });
  });
});
