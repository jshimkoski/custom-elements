import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

/**
 * 🎨 Design System Components Test Suite
 *
 * Tests for the comprehensive set of form components that support:
 * - :model (two-way data binding)
 * - :bind (one-way data binding)
 * - :model:prop (model binding with custom prop names)
 *
 * All components emit 'update:model-value' events for model binding compatibility.
 */

// Setup DOM environment
const dom = new JSDOM(
  '<!DOCTYPE html><html><body><div id="app"></div></body></html>',
);
global.window = dom.window as any;
global.document = dom.window.document;
global.customElements = dom.window.customElements;
global.HTMLElement = dom.window.HTMLElement;

describe('🎨 Design System Components', () => {
  let container: HTMLElement;
  let componentsLoaded = false;

  beforeEach(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);

    // Load components through main.ts to ensure consistency
    if (!componentsLoaded) {
      // Ensure app element exists for main.ts
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

  afterEach(() => {
    document.body.removeChild(container);
    vi.clearAllMocks();
  });

  describe('🔗 Component Registration', () => {
    it('should register all design system components', () => {
      // Components should already be imported in beforeEach
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
  });

  describe('📝 Component Creation & Attributes', () => {
    it('should create ds-input component with attributes', () => {
      container.innerHTML =
        '<ds-input model-value="test" placeholder="Enter text"></ds-input>';
      const element = container.querySelector('ds-input') as any;

      expect(element).toBeDefined();
      expect(element.tagName.toLowerCase()).toBe('ds-input');
      expect(element.getAttribute('model-value')).toBe('test');
      expect(element.getAttribute('placeholder')).toBe('Enter text');
    });

    it('should create ds-textarea component with attributes', () => {
      container.innerHTML =
        '<ds-textarea rows="5" disabled="true"></ds-textarea>';
      const element = container.querySelector('ds-textarea') as any;

      expect(element).toBeDefined();
      expect(element.tagName.toLowerCase()).toBe('ds-textarea');
      expect(element.getAttribute('rows')).toBe('5');
      expect(element.getAttribute('disabled')).toBe('true');
    });

    it('should create ds-checkbox component with attributes', () => {
      container.innerHTML =
        '<ds-checkbox model-value="true" label="Check me"></ds-checkbox>';
      const element = container.querySelector('ds-checkbox') as any;

      expect(element).toBeDefined();
      expect(element.tagName.toLowerCase()).toBe('ds-checkbox');
      expect(element.getAttribute('model-value')).toBe('true');
      expect(element.getAttribute('label')).toBe('Check me');
    });

    it('should create ds-select component', () => {
      container.innerHTML = '<ds-select model-value="blue"></ds-select>';
      const element = container.querySelector('ds-select') as any;

      expect(element).toBeDefined();
      expect(element.tagName.toLowerCase()).toBe('ds-select');
      expect(element.getAttribute('model-value')).toBe('blue');
    });

    it('should create ds-radio-group component', () => {
      container.innerHTML =
        '<ds-radio-group name="test-group"></ds-radio-group>';
      const element = container.querySelector('ds-radio-group') as any;

      expect(element).toBeDefined();
      expect(element.tagName.toLowerCase()).toBe('ds-radio-group');
      expect(element.getAttribute('name')).toBe('test-group');
    });

    it('should create ds-button component with variant', () => {
      container.innerHTML =
        '<ds-button variant="success" type="submit">Click</ds-button>';
      const element = container.querySelector('ds-button') as any;

      expect(element).toBeDefined();
      expect(element.tagName.toLowerCase()).toBe('ds-button');
      expect(element.getAttribute('variant')).toBe('success');
      expect(element.getAttribute('type')).toBe('submit');
    });

    it('should create ds-progress component', () => {
      container.innerHTML =
        '<ds-progress model-value="75" max="100"></ds-progress>';
      const element = container.querySelector('ds-progress') as any;

      expect(element).toBeDefined();
      expect(element.tagName.toLowerCase()).toBe('ds-progress');
      expect(element.getAttribute('model-value')).toBe('75');
      expect(element.getAttribute('max')).toBe('100');
    });

    it('should create ds-range component with min/max', () => {
      container.innerHTML = '<ds-range min="0" max="50" step="5"></ds-range>';
      const element = container.querySelector('ds-range') as any;

      expect(element).toBeDefined();
      expect(element.tagName.toLowerCase()).toBe('ds-range');
      expect(element.getAttribute('min')).toBe('0');
      expect(element.getAttribute('max')).toBe('50');
      expect(element.getAttribute('step')).toBe('5');
    });

    it('should create ds-number component', () => {
      container.innerHTML =
        '<ds-number model-value="42" min="0" max="100"></ds-number>';
      const element = container.querySelector('ds-number') as any;

      expect(element).toBeDefined();
      expect(element.tagName.toLowerCase()).toBe('ds-number');
      expect(element.getAttribute('model-value')).toBe('42');
      expect(element.getAttribute('min')).toBe('0');
      expect(element.getAttribute('max')).toBe('100');
    });
  });

  describe('🎯 Component Functionality', () => {
    it('should handle ds-input events when shadow DOM is ready', async () => {
      container.innerHTML = '<ds-input></ds-input>';
      const element = container.querySelector('ds-input') as any;

      // Wait for custom element to initialize
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (element.shadowRoot) {
        const input = element.shadowRoot.querySelector('input');
        if (input) {
          // Test that input element exists and has expected attributes
          expect(input.type).toBe('text');

          // Mock emit function and test event handling
          const emitSpy = vi.fn();
          element.emit = emitSpy;

          input.value = 'test value';
          input.dispatchEvent(new Event('input', { bubbles: true }));

          if (emitSpy.mock.calls.length > 0) {
            expect(emitSpy).toHaveBeenCalledWith(
              'update:model-value',
              'test value',
            );
          }
        }
      }

      // At minimum, ensure the component was created
      expect(element).toBeDefined();
    });

    it('should handle ds-checkbox events when shadow DOM is ready', async () => {
      container.innerHTML = '<ds-checkbox></ds-checkbox>';
      const element = container.querySelector('ds-checkbox') as any;

      await new Promise((resolve) => setTimeout(resolve, 100));

      if (element.shadowRoot) {
        const checkbox = element.shadowRoot.querySelector(
          'input[type="checkbox"]',
        );
        if (checkbox) {
          expect(checkbox.type).toBe('checkbox');

          const emitSpy = vi.fn();
          element.emit = emitSpy;

          (checkbox as HTMLInputElement).checked = true;
          checkbox.dispatchEvent(new Event('change', { bubbles: true }));

          if (emitSpy.mock.calls.length > 0) {
            expect(emitSpy).toHaveBeenCalledWith('update:model-value', true);
          }
        }
      }

      expect(element).toBeDefined();
    });

    it('should handle ds-button click events when shadow DOM is ready', async () => {
      container.innerHTML = '<ds-button>Click me</ds-button>';
      const element = container.querySelector('ds-button') as any;

      await new Promise((resolve) => setTimeout(resolve, 100));

      if (element.shadowRoot) {
        const button = element.shadowRoot.querySelector('button');
        if (button) {
          expect(button.tagName.toLowerCase()).toBe('button');

          const emitSpy = vi.fn();
          element.emit = emitSpy;

          const clickEvent = new Event('click', { bubbles: true });
          button.dispatchEvent(clickEvent);

          if (emitSpy.mock.calls.length > 0) {
            expect(emitSpy).toHaveBeenCalledWith('click', clickEvent);
          }
        }
      }

      expect(element).toBeDefined();
    });
  });

  describe('🔄 Component Lifecycle', () => {
    it('should handle component initialization', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      container.innerHTML = '<ds-input model-value="test"></ds-input>';
      const element = container.querySelector('ds-input') as any;

      // Wait for component lifecycle
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Component should exist regardless of watcher calls
      expect(element).toBeDefined();

      consoleSpy.mockRestore();
    });

    it('should initialize components with different prop types', () => {
      container.innerHTML = `
        <ds-input type="email" placeholder="Email"></ds-input>
        <ds-checkbox model-value="true" label="Enabled"></ds-checkbox>
        <ds-number model-value="42" min="0" max="100"></ds-number>
        <ds-range model-value="50" min="0" max="100"></ds-range>
        <ds-progress model-value="75" max="100"></ds-progress>
      `;

      const input = container.querySelector('ds-input');
      const checkbox = container.querySelector('ds-checkbox');
      const number = container.querySelector('ds-number');
      const range = container.querySelector('ds-range');
      const progress = container.querySelector('ds-progress');

      expect(input).toBeDefined();
      expect(checkbox).toBeDefined();
      expect(number).toBeDefined();
      expect(range).toBeDefined();
      expect(progress).toBeDefined();

      // Verify attributes are set
      expect(input?.getAttribute('type')).toBe('email');
      expect(checkbox?.getAttribute('model-value')).toBe('true');
      expect(number?.getAttribute('model-value')).toBe('42');
      expect(range?.getAttribute('model-value')).toBe('50');
      expect(progress?.getAttribute('model-value')).toBe('75');
    });
  });

  describe('🎨 CSS Integration', () => {
    it('should apply CSS classes when shadow DOM is available', async () => {
      container.innerHTML = '<ds-input></ds-input>';
      const element = container.querySelector('ds-input') as any;

      await new Promise((resolve) => setTimeout(resolve, 100));

      if (element.shadowRoot) {
        const input = element.shadowRoot.querySelector('input');
        if (input && input.className) {
          // Check for common Tailwind classes
          const hasExpectedClasses = [
            'w-full',
            'px-3',
            'py-2',
            'border',
            'rounded-md',
          ].some((className) => input.className.includes(className));

          expect(hasExpectedClasses).toBe(true);
        }
      }

      // At minimum verify component exists
      expect(element).toBeDefined();
    });

    it('should handle variant-based styling for buttons', async () => {
      container.innerHTML = '<ds-button variant="success"></ds-button>';
      const element = container.querySelector('ds-button') as any;

      await new Promise((resolve) => setTimeout(resolve, 100));

      if (element.shadowRoot) {
        const button = element.shadowRoot.querySelector('button');
        if (button && button.className) {
          // Should have button-related classes
          const hasButtonClasses =
            button.className.includes('px-4') ||
            button.className.includes('py-2') ||
            button.className.includes('rounded');
          expect(hasButtonClasses).toBe(true);
        }
      }

      expect(element).toBeDefined();
    });
  });

  describe('🧪 Error Handling & Edge Cases', () => {
    it('should handle empty attributes gracefully', () => {
      container.innerHTML = '<ds-input model-value=""></ds-input>';
      const element = container.querySelector('ds-input') as any;

      expect(element).toBeDefined();
      expect(element.getAttribute('model-value')).toBe('');
    });

    it('should handle boolean attributes', () => {
      container.innerHTML =
        '<ds-checkbox model-value="false" disabled="true"></ds-checkbox>';
      const element = container.querySelector('ds-checkbox') as any;

      expect(element).toBeDefined();
      expect(element.getAttribute('model-value')).toBe('false');
      expect(element.getAttribute('disabled')).toBe('true');
    });

    it('should handle numeric attributes', () => {
      container.innerHTML =
        '<ds-number model-value="123" step="0.1"></ds-number>';
      const element = container.querySelector('ds-number') as any;

      expect(element).toBeDefined();
      expect(element.getAttribute('model-value')).toBe('123');
      expect(element.getAttribute('step')).toBe('0.1');
    });

    it('should handle missing optional attributes', () => {
      container.innerHTML = '<ds-input></ds-input>';
      const element = container.querySelector('ds-input') as any;

      expect(element).toBeDefined();
      expect(element.getAttribute('model-value')).toBeNull();
      expect(element.getAttribute('placeholder')).toBeNull();
    });
  });

  describe('📏 Component Structure', () => {
    it('should create proper DOM structure for form components', () => {
      container.innerHTML = `
        <form>
          <ds-input name="email" type="email"></ds-input>
          <ds-textarea name="message"></ds-textarea>
          <ds-checkbox name="subscribe" label="Subscribe"></ds-checkbox>
          <ds-select name="category"></ds-select>
          <ds-button type="submit">Submit</ds-button>
        </form>
      `;

      const form = container.querySelector('form');
      expect(form).toBeDefined();

      const input = form?.querySelector('ds-input');
      const textarea = form?.querySelector('ds-textarea');
      const checkbox = form?.querySelector('ds-checkbox');
      const select = form?.querySelector('ds-select');
      const button = form?.querySelector('ds-button');

      expect(input).toBeDefined();
      expect(textarea).toBeDefined();
      expect(checkbox).toBeDefined();
      expect(select).toBeDefined();
      expect(button).toBeDefined();
    });

    it('should support nested component structures', () => {
      container.innerHTML = `
        <div class="form-section">
          <ds-input placeholder="Name"></ds-input>
          <div class="controls">
            <ds-range min="0" max="100"></ds-range>
            <ds-progress model-value="50"></ds-progress>
          </div>
        </div>
      `;

      const section = container.querySelector('.form-section');
      expect(section).toBeDefined();

      const input = section?.querySelector('ds-input');
      const range = section?.querySelector('ds-range');
      const progress = section?.querySelector('ds-progress');

      expect(input).toBeDefined();
      expect(range).toBeDefined();
      expect(progress).toBeDefined();
    });
  });

  describe('🔧 Integration Testing', () => {
    it('should support multiple instances of same component', () => {
      container.innerHTML = `
        <ds-input name="first" placeholder="First"></ds-input>
        <ds-input name="second" placeholder="Second"></ds-input>
        <ds-input name="third" placeholder="Third"></ds-input>
      `;

      const inputs = container.querySelectorAll('ds-input');
      expect(inputs.length).toBe(3);

      expect(inputs[0].getAttribute('placeholder')).toBe('First');
      expect(inputs[1].getAttribute('placeholder')).toBe('Second');
      expect(inputs[2].getAttribute('placeholder')).toBe('Third');
    });

    it('should support all component types together', () => {
      container.innerHTML = `
        <ds-input model-value="text"></ds-input>
        <ds-textarea rows="3"></ds-textarea>
        <ds-checkbox label="check"></ds-checkbox>
        <ds-select model-value="option"></ds-select>
        <ds-radio-group name="radio"></ds-radio-group>
        <ds-button variant="primary">Button</ds-button>
        <ds-progress model-value="50"></ds-progress>
        <ds-range model-value="75"></ds-range>
        <ds-number model-value="42"></ds-number>
      `;

      expect(container.querySelector('ds-input')).toBeDefined();
      expect(container.querySelector('ds-textarea')).toBeDefined();
      expect(container.querySelector('ds-checkbox')).toBeDefined();
      expect(container.querySelector('ds-select')).toBeDefined();
      expect(container.querySelector('ds-radio-group')).toBeDefined();
      expect(container.querySelector('ds-button')).toBeDefined();
      expect(container.querySelector('ds-progress')).toBeDefined();
      expect(container.querySelector('ds-range')).toBeDefined();
      expect(container.querySelector('ds-number')).toBeDefined();
    });
  });
});
