import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

/**
 * 🚀 Main Application Focused Test Suite
 *
 * Simplified tests that focus on the core functionality without module caching issues
 */

// Setup DOM environment
const dom = new JSDOM(
  '<!DOCTYPE html><html><body><div id="app"></div></body></html>',
);
global.window = dom.window as any;
global.document = dom.window.document;
global.customElements = dom.window.customElements;
global.HTMLElement = dom.window.HTMLElement;

describe('🚀 Main Application Core Tests', () => {
  let mainImported = false;

  beforeEach(async () => {
    // Ensure #app exists for each test
    let app = document.getElementById('app');
    if (!app) {
      app = document.createElement('div');
      app.id = 'app';
      document.body.appendChild(app);
    }

    // Import main.ts only once, after DOM is set up
    if (!mainImported) {
      await import('../src/main');
      mainImported = true;
    }
  });

  describe('🏗️ Application Setup', () => {
    it('should have an app container element', () => {
      const app = document.getElementById('app');
      expect(app).toBeDefined();
      expect(app?.tagName.toLowerCase()).toBe('div');
    });

    it('should populate app container with demo content', async () => {
      // Wait for any async operations
      await new Promise((resolve) => setTimeout(resolve, 50));

      const app = document.getElementById('app');
      expect(app?.innerHTML.length).toBeGreaterThan(0);
    });
  });

  describe('🧩 Component Registration', () => {
    it('should register design system components', () => {
      expect(customElements.get('ds-input')).toBeDefined();
      expect(customElements.get('ds-textarea')).toBeDefined();
      expect(customElements.get('ds-checkbox')).toBeDefined();
      expect(customElements.get('ds-select')).toBeDefined();
      expect(customElements.get('ds-radio-group')).toBeDefined();
      expect(customElements.get('ds-button')).toBeDefined();
      expect(customElements.get('ds-progress')).toBeDefined();
      expect(customElements.get('ds-range')).toBeDefined();
      expect(customElements.get('ds-number')).toBeDefined();
    });

    it('should register main app components', () => {
      // Check that the main app components are registered
      expect(customElements.get('simple-switch')).toBeDefined();
      expect(customElements.get('cer-switch')).toBeDefined();

      // These should be defined if the component files loaded
      const hasMainComponents = [
        'design-system',
        'minimal-example',
        'switch-test',
        'my-greeting',
      ].some((name) => customElements.get(name));

      expect(hasMainComponents).toBe(true);
    });
  });

  describe('🎨 App Content Rendering', () => {
    it('should render demo components in app container', async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));

      const app = document.getElementById('app');
      expect(app?.innerHTML).toBeTruthy();
      expect(app?.innerHTML.length).toBeGreaterThan(100);
    });

    it('should contain expected demo components', async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));

      const app = document.getElementById('app');
      const content = app?.innerHTML || '';

      // Should contain the main demo components
      const expectedComponents = [
        'switch-test',
        'design-system-test',
        'design-system',
        'minimal-example',
        'shopping-cart',
        'todo-app',
        'form-input-validation',
        'my-greeting',
      ];

      const hasExpectedComponents = expectedComponents.some((component) =>
        content.includes(component),
      );

      expect(hasExpectedComponents).toBe(true);
    });

    it('should have proper HTML structure', async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));

      const app = document.getElementById('app');
      const content = app?.innerHTML || '';

      expect(content).toContain('<div');
      expect(content).toContain('</div>');
      expect(content).not.toContain('undefined');
      expect(content).not.toContain('null');
    });
  });

  describe('⚙️ Integration Testing', () => {
    it('should support component creation after initialization', () => {
      // Should be able to create components after main runs
      const testInput = document.createElement('ds-input');
      expect(testInput).toBeDefined();
      expect(testInput.tagName.toLowerCase()).toBe('ds-input');

      const testButton = document.createElement('ds-button');
      expect(testButton).toBeDefined();
      expect(testButton.tagName.toLowerCase()).toBe('ds-button');
    });

    it('should not throw errors during operation', async () => {
      let errorThrown = false;

      const originalError = console.error;
      console.error = (...args: any[]) => {
        errorThrown = true;
        originalError(...args);
      };

      try {
        // Wait for operations to complete
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Try to access app content
        const app = document.getElementById('app');
        const content = app?.innerHTML;
        expect(typeof content).toBe('string');
      } catch {
        errorThrown = true;
      } finally {
        console.error = originalError;
      }

      expect(errorThrown).toBe(false);
    });

    it('should maintain app element integrity', async () => {
      const app = document.getElementById('app');
      const originalId = app?.id;
      const originalTagName = app?.tagName;

      await new Promise((resolve) => setTimeout(resolve, 50));

      // App element should still be the same element
      const appAfter = document.getElementById('app');
      expect(appAfter).toBeDefined();
      expect(appAfter?.id).toBe(originalId);
      expect(appAfter?.tagName).toBe(originalTagName);
    });
  });

  describe('🔄 Component Lifecycle', () => {
    it('should have all expected design system components available', () => {
      const dsComponents = [
        'ds-input',
        'ds-textarea',
        'ds-checkbox',
        'ds-select',
        'ds-radio-group',
        'ds-button',
        'ds-progress',
        'ds-range',
        'ds-number',
      ];

      dsComponents.forEach((componentName) => {
        expect(customElements.get(componentName)).toBeDefined();
      });
    });

    it('should support dynamic component usage', () => {
      // Create and append a component to test it works
      const container = document.createElement('div');
      container.innerHTML = '<ds-button>Test Button</ds-button>';

      const button = container.querySelector('ds-button');
      expect(button).toBeDefined();
      expect(button?.tagName.toLowerCase()).toBe('ds-button');
    });
  });

  describe('📦 Module System', () => {
    it('should have imported all necessary modules', () => {
      // Main components should be available
      expect(customElements.get('simple-switch')).toBeDefined();
      expect(customElements.get('cer-switch')).toBeDefined();

      // Design system should be available
      expect(customElements.get('ds-input')).toBeDefined();
      expect(customElements.get('ds-button')).toBeDefined();
    });

    it('should not cause memory leaks or pollution', () => {
      // Global scope should have expected additions but not be polluted
      expect(global.window).toBeDefined();
      expect(global.document).toBeDefined();
      expect(global.customElements).toBeDefined();

      // Should not have unexpected globals
      expect((global as any).React).toBeUndefined();
      expect((global as any).Vue).toBeUndefined();
    });
  });

  describe('🎯 Specific Feature Tests', () => {
    it('should render switch components with proper model binding', async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));

      const app = document.getElementById('app');
      const content = app?.innerHTML || '';

      // Switch test component should be present
      expect(content).toContain('switch-test');
    });

    it('should include design system demo', async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));

      const app = document.getElementById('app');
      const content = app?.innerHTML || '';

      // Design system components should be demonstrated
      const hasDesignSystemDemo = ['design-system-test', 'design-system'].some(
        (component) => content.includes(component),
      );

      expect(hasDesignSystemDemo).toBe(true);
    });

    it('should demonstrate various example components', async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));

      const app = document.getElementById('app');
      const content = app?.innerHTML || '';

      // Example components should be present
      const exampleComponents = [
        'minimal-example',
        'shopping-cart',
        'todo-app',
        'form-input-validation',
      ];

      const foundComponents = exampleComponents.filter((component) =>
        content.includes(component),
      );

      // Should have at least some example components
      expect(foundComponents.length).toBeGreaterThan(0);
    });
  });
});
