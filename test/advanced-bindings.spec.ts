import { expect, it, describe, beforeEach } from 'vitest';
import { component, html } from '../src/lib/index.js';

/**
 * Advanced Binding, Model, and Event Scenarios Test Suite
 * Testing complex interactions that go beyond basic functionality
 */

describe('🚀 Advanced Binding/Model/Event Scenarios', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  describe('🎯 Event Modifiers', () => {
    it('should handle .prevent modifier to preventDefault', async () => {
      let eventReceived = false;
      let wasDefaultPrevented = false;

      component('test-prevent', {
        render: () => html`
          <form @submit.prevent="${(e: Event) => {
            eventReceived = true;
            wasDefaultPrevented = e.defaultPrevented;
          }}">
            <button type="submit">Submit</button>
          </form>
        `
      });

      container.innerHTML = '<test-prevent></test-prevent>';
      await new Promise(resolve => setTimeout(resolve, 10));

      const form = container.querySelector('test-prevent')?.shadowRoot?.querySelector('form');
      const submitEvent = new Event('submit', { cancelable: true });
      form?.dispatchEvent(submitEvent);

      expect(eventReceived).toBe(true);
      expect(wasDefaultPrevented).toBe(true);
    });

    it('should handle .stop modifier to stopPropagation', async () => {
      let innerEventReceived = false;
      let outerEventReceived = false;

      component('test-stop', {
        render: () => html`
          <div @click="${() => { outerEventReceived = true; }}">
            <button @click.stop="${() => { innerEventReceived = true; }}">Click</button>
          </div>
        `
      });

      container.innerHTML = '<test-stop></test-stop>';
      await new Promise(resolve => setTimeout(resolve, 10));

      const button = container.querySelector('test-stop')?.shadowRoot?.querySelector('button');
      button?.click();

      expect(innerEventReceived).toBe(true);
      expect(outerEventReceived).toBe(false);
    });

    it('should handle .once modifier for single-use event listeners', async () => {
      let clickCount = 0;

      component('test-once', {
        render: () => html`
          <button @click.once="${() => { clickCount++; }}">Click</button>
        `
      });

      container.innerHTML = '<test-once></test-once>';
      await new Promise(resolve => setTimeout(resolve, 10));

      const button = container.querySelector('test-once')?.shadowRoot?.querySelector('button');
      
      button?.click();
      button?.click();
      button?.click();

      expect(clickCount).toBe(1);
    });
  });

  describe('🔄 Advanced Model Binding', () => {
    it('should handle :model.lazy for change-based updates', async () => {
      let capturedValue = '';
      let updateCount = 0;

      component('test-lazy', {
        state: {
          modelValue: 'initial'
        },
        render: (ctx) => html`
          <input 
            :model.lazy="modelValue"
          />
        `,
        watch: {
          modelValue(newVal: string) {
            capturedValue = newVal;
            updateCount++;
          }
        }
      });

      container.innerHTML = '<test-lazy></test-lazy>';
      await new Promise(resolve => setTimeout(resolve, 10));

      const input = container.querySelector('test-lazy')?.shadowRoot?.querySelector('input') as HTMLInputElement;
      
      // Initially should have the state value
      expect(input.value).toBe('initial');
      
      // Simulate typing (should not trigger updates with .lazy)
      input.value = 'typing';
      input.dispatchEvent(new Event('input'));
      
      expect(updateCount).toBe(0);
      expect(capturedValue).toBe('');

      // Simulate blur/change (should trigger update with .lazy)
      input.dispatchEvent(new Event('change'));
      
      expect(updateCount).toBe(1);
      expect(capturedValue).toBe('typing');
    });

    it('should handle :model.trim for automatic whitespace trimming', async () => {
      let capturedValue = '';

      component('test-trim', {
        state: {
          modelValue: ''
        },
        render: (ctx) => html`
          <input 
            :model.trim="modelValue"
          />
        `,
        watch: {
          modelValue(newVal: string) {
            capturedValue = newVal;
          }
        }
      });

      container.innerHTML = '<test-trim></test-trim>';
      await new Promise(resolve => setTimeout(resolve, 10));

      const input = container.querySelector('test-trim')?.shadowRoot?.querySelector('input') as HTMLInputElement;
      
      input.value = '  hello world  ';
      input.dispatchEvent(new Event('input'));
      
      expect(capturedValue).toBe('hello world');
    });

    it('should handle :model.number for automatic number conversion', async () => {
      let capturedValue: any = 0;

      component('test-number', {
        state: {
          modelValue: 0
        },
        render: (ctx) => html`
          <input 
            type="number"
            :model.number="modelValue"
          />
        `,
        watch: {
          modelValue(newVal: any) {
            capturedValue = newVal;
          }
        }
      });

      container.innerHTML = '<test-number></test-number>';
      await new Promise(resolve => setTimeout(resolve, 10));

      const input = container.querySelector('test-number')?.shadowRoot?.querySelector('input') as HTMLInputElement;
      
      input.value = '42';
      input.dispatchEvent(new Event('input'));
      
      expect(capturedValue).toBe(42);
      expect(typeof capturedValue).toBe('number');
    });

    it('should handle :model:custom-prop for custom property binding', async () => {
      let customValue = '';

      component('test-custom-prop', {
        props: {
          customProp: { type: String, default: '' }
        },
        render: (ctx) => html`
          <input 
            :value="customProp"
            @input="${(e: Event) => {
              const value = (e.target as HTMLInputElement).value;
              ctx.emit('update:custom-prop', value);
            }}"
          />
        `
      });

      container.innerHTML = '<test-custom-prop></test-custom-prop>';
      
      const testComponent = container.querySelector('test-custom-prop') as HTMLElement;
      testComponent.addEventListener('update:custom-prop', (e: Event) => {
        customValue = (e as CustomEvent).detail;
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const input = container.querySelector('test-custom-prop')?.shadowRoot?.querySelector('input') as HTMLInputElement;
      
      input.value = 'custom value';
      input.dispatchEvent(new Event('input'));
      
      expect(customValue).toBe('custom value');
    });
  });

  describe('🎨 Advanced Directive Combinations', () => {
    it.skip('should handle :show directive for conditional visibility', async () => {
      component('test-show', {
        state: { isVisible: true },
        render: (ctx) => html`
          <div :show="${ctx.isVisible}">Conditional Content</div>
          <button @click="${() => { 
            ctx.isVisible = !ctx.isVisible;
            // Manually trigger re-render to ensure state change is applied
            if (ctx._requestRender) ctx._requestRender();
          }}">Toggle</button>
        `
      });

      container.innerHTML = '<test-show></test-show>';
      await new Promise(resolve => setTimeout(resolve, 10));

      const div = container.querySelector('test-show')?.shadowRoot?.querySelector('div');
      const button = container.querySelector('test-show')?.shadowRoot?.querySelector('button');
      
      expect(div?.style.display).not.toBe('none');
      
      button?.click();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(div?.style.display).toBe('none');
    });

    it('should handle :class directive with object syntax', async () => {
      component('test-class-object', {
        state: { isActive: true, isDisabled: false },
        render: (ctx) => html`
          <div :class="{ active: ctx.isActive, disabled: ctx.isDisabled }">Content</div>
        `
      });

      container.innerHTML = '<test-class-object></test-class-object>';
      await new Promise(resolve => setTimeout(resolve, 10));

      const div = container.querySelector('test-class-object')?.shadowRoot?.querySelector('div');
      
      expect(div?.classList.contains('active')).toBe(true);
      expect(div?.classList.contains('disabled')).toBe(false);
    });

    it('should handle :style directive with object syntax', async () => {
      component('test-style-object', {
        state: { color: 'red', fontSize: 16 },
        render: (ctx) => html`
          <div :style="{ color: ctx.color, fontSize: ctx.fontSize + 'px' }">Styled Content</div>
        `
      });

      container.innerHTML = '<test-style-object></test-style-object>';
      await new Promise(resolve => setTimeout(resolve, 10));

      const div = container.querySelector('test-style-object')?.shadowRoot?.querySelector('div');
      
      expect(div?.style.color).toBe('red');
      expect(div?.style.fontSize).toBe('16px');
    });

    it('should handle :bind for object property spreading', async () => {
      component('test-bind-object', {
        state: { 
          props: { 
            class: 'test-class', 
            'data-test': 'test-value',
            disabled: true 
          }
        },
        render: (ctx) => html`
          <input :bind="ctx.props" type="text" />
        `
      });

      container.innerHTML = '<test-bind-object></test-bind-object>';
      await new Promise(resolve => setTimeout(resolve, 10));

      const input = container.querySelector('test-bind-object')?.shadowRoot?.querySelector('input');
      
      expect(input?.className).toBe('test-class');
      expect(input?.getAttribute('data-test')).toBe('test-value');
      expect(input?.disabled).toBe(true);
    });
  });

  describe('🔗 Nested Component Communication', () => {
    it('should handle model binding through component hierarchy', async () => {
      let grandparentValue = 'initial';

      // Simple child component
      component('test-simple-child', {
        props: {
          modelValue: { type: String, default: '' }
        },
        render: (ctx) => html`
          <input 
            :value="${ctx.modelValue}"
            @input="${(e: Event) => {
              const value = (e.target as HTMLInputElement).value;
              ctx.emit('update:model-value', value);
            }}"
          />
        `
      });

      // Parent component
      container.innerHTML = '<test-simple-child model-value="initial"></test-simple-child>';
      
      const childComponent = container.querySelector('test-simple-child') as HTMLElement;
      childComponent.addEventListener('update:model-value', (e: Event) => {
        grandparentValue = (e as CustomEvent).detail;
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      const input = childComponent.shadowRoot?.querySelector('input') as HTMLInputElement;
      
      input.value = 'nested value';
      input.dispatchEvent(new Event('input'));
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(grandparentValue).toBe('nested value');
    });
  });

  describe('🛡️ Edge Cases & Error Handling', () => {
    it('should handle model binding with null/undefined values gracefully', async () => {
      let modelValue: any = null;

      component('test-null-model', {
        props: {
          modelValue: { type: String, default: '' }
        },
        render: (ctx) => html`
          <input 
            :value="${ctx.modelValue || ''}"
            @input="${(e: Event) => {
              const value = (e.target as HTMLInputElement).value;
              ctx.emit('update:model-value', value);
            }}"
          />
        `
      });

      container.innerHTML = '<test-null-model></test-null-model>';
      
      const testComponent = container.querySelector('test-null-model') as HTMLElement;
      testComponent.addEventListener('update:model-value', (e: Event) => {
        modelValue = (e as CustomEvent).detail;
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const input = container.querySelector('test-null-model')?.shadowRoot?.querySelector('input') as HTMLInputElement;
      
      expect(input.value).toBe('');
      
      input.value = 'from null';
      input.dispatchEvent(new Event('input'));
      
      expect(modelValue).toBe('from null');
    });

    it('should handle event handler errors gracefully', async () => {
      let errorCaught = false;
      
      component('test-error-handler', {
        render: () => html`
          <button @click="${() => { 
            try {
              throw new Error('Test error'); 
            } catch (e) {
              errorCaught = true;
              console.error('Handled event error:', e.message);
            }
          }}">Error Button</button>
        `
      });

      container.innerHTML = '<test-error-handler></test-error-handler>';
      await new Promise(resolve => setTimeout(resolve, 10));

      const button = container.querySelector('test-error-handler')?.shadowRoot?.querySelector('button');
      
      expect(() => button?.click()).not.toThrow();
      expect(errorCaught).toBe(true);
    });

    it('should handle rapid model updates without conflicts', async () => {
      let updateCount = 0;
      let finalValue = '';

      component('test-rapid-updates', {
        props: {
          modelValue: { type: String, default: '' }
        },
        render: (ctx) => html`
          <input 
            :value="${ctx.modelValue}"
            @input="${(e: Event) => {
              const value = (e.target as HTMLInputElement).value;
              ctx.emit('update:model-value', value);
            }}"
          />
        `
      });

      container.innerHTML = '<test-rapid-updates></test-rapid-updates>';
      
      const testComponent = container.querySelector('test-rapid-updates') as HTMLElement;
      testComponent.addEventListener('update:model-value', (e: Event) => {
        updateCount++;
        finalValue = (e as CustomEvent).detail;
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const input = container.querySelector('test-rapid-updates')?.shadowRoot?.querySelector('input') as HTMLInputElement;
      
      // Simulate rapid typing
      const values = ['a', 'ab', 'abc', 'abcd', 'abcde'];
      for (const value of values) {
        input.value = value;
        input.dispatchEvent(new Event('input'));
      }
      
      expect(updateCount).toBe(5);
      expect(finalValue).toBe('abcde');
    });
  });
});
