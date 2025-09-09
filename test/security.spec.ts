import { describe, it, expect, vi } from 'vitest';
import { component, html } from '../src/lib';

describe('🔒 Security Features', () => {
  describe('Expression Evaluation Security', () => {
    it('should block dangerous constructor access', async () => {
      component('security-test-constructor', {
        state: { isActive: true },
        render: (ctx) => html`<div :class="{ active: constructor }">Test</div>`
      });

      const el = document.createElement('security-test-constructor');
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 10));

      // Should not have the 'active' class due to blocked expression
      const div = el.shadowRoot?.querySelector('div');
      expect(div?.classList.contains('active')).toBe(false);
      
      document.body.removeChild(el);
    });

    it('should block dangerous prototype access', async () => {
      component('security-test-prototype', {
        state: { value: 'test' },
        render: (ctx) => html`<div :class="{ dangerous: value.prototype }">Test</div>`
      });

      const el = document.createElement('security-test-prototype');
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 10));

      const div = el.shadowRoot?.querySelector('div');
      expect(div?.classList.contains('dangerous')).toBe(false);
      
      document.body.removeChild(el);
    });

    it('should block dangerous __proto__ access', async () => {
      component('security-test-proto', {
        state: { obj: {} },
        render: (ctx) => html`<div :class="{ dangerous: obj.__proto__ }">Test</div>`
      });

      const el = document.createElement('security-test-proto');
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 10));

      const div = el.shadowRoot?.querySelector('div');
      expect(div?.classList.contains('dangerous')).toBe(false);
      
      document.body.removeChild(el);
    });

    it('should block function keyword', async () => {
      component('security-test-function', {
        state: { isActive: true },
        render: (ctx) => html`<div :class="{ active: function() {} }">Test</div>`
      });

      const el = document.createElement('security-test-function');
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 10));

      const div = el.shadowRoot?.querySelector('div');
      expect(div?.classList.contains('active')).toBe(false);
      
      document.body.removeChild(el);
    });

    it('should block eval keyword', async () => {
      component('security-test-eval', {
        state: { code: 'alert(1)' },
        render: (ctx) => html`<div :class="{ dangerous: eval(code) }">Test</div>`
      });

      const el = document.createElement('security-test-eval');
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 10));

      const div = el.shadowRoot?.querySelector('div');
      expect(div?.classList.contains('dangerous')).toBe(false);
      
      document.body.removeChild(el);
    });

    it('should block window access', async () => {
      component('security-test-window', {
        state: { isActive: true },
        render: (ctx) => html`<div :class="{ active: window.location }">Test</div>`
      });

      const el = document.createElement('security-test-window');
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 10));

      const div = el.shadowRoot?.querySelector('div');
      expect(div?.classList.contains('active')).toBe(false);
      
      document.body.removeChild(el);
    });

    it('should block document access', async () => {
      component('security-test-document', {
        state: { isActive: true },
        render: (ctx) => html`<div :class="{ active: document.cookie }">Test</div>`
      });

      const el = document.createElement('security-test-document');
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 10));

      const div = el.shadowRoot?.querySelector('div');
      expect(div?.classList.contains('active')).toBe(false);
      
      document.body.removeChild(el);
    });

    it('should allow safe expressions', async () => {
      component('security-test-safe', {
        state: { isActive: true, status: 'enabled' },
        render: (ctx) => html`<div :class="{ active: isActive, enabled: status === 'enabled' }">Test</div>`
      });

      const el = document.createElement('security-test-safe');
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 10));

      const div = el.shadowRoot?.querySelector('div');
      expect(div?.classList.contains('active')).toBe(true);
      expect(div?.classList.contains('enabled')).toBe(true);
      
      document.body.removeChild(el);
    });

    it('should block expressions longer than 1000 characters', async () => {
      const longExpression = '{ active: ' + 'true && '.repeat(200) + 'true }';
      
      component('security-test-long', {
        state: { isActive: true },
        render: (ctx) => html`<div :class="${longExpression}">Test</div>`
      });

      const el = document.createElement('security-test-long');
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 10));

      const div = el.shadowRoot?.querySelector('div');
      // Should not have processed the long expression
      expect(div?.className).not.toContain('active');
      
      document.body.removeChild(el);
    });
  });

  describe('Development Logging', () => {
    it('should not log in production mode', async () => {
      const originalEnv = (globalThis as any).process?.env?.NODE_ENV;
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock production environment
      if (!(globalThis as any).process) {
        (globalThis as any).process = { env: {} };
      }
      (globalThis as any).process.env.NODE_ENV = 'production';

      component('logging-test', {
        state: {},
        onError: (error) => {
          // This should not log in production
        },
        render: () => {
          throw new Error('Test error');
        }
      });

      const el = document.createElement('logging-test');
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 10));

      // Should not have called console.error in production
      expect(consoleSpy).not.toHaveBeenCalled();

      // Cleanup
      consoleSpy.mockRestore();
      if (originalEnv !== undefined) {
        (globalThis as any).process.env.NODE_ENV = originalEnv;
      } else {
        delete (globalThis as any).process.env.NODE_ENV;
      }
      document.body.removeChild(el);
    });
  });

  describe('Memory Leak Prevention', () => {
    it('should clean up event listeners properly', async () => {
      let callCount = 0;
      const mockHandler = () => {
        callCount++;
      };

      component('memory-test', {
        state: { value: 'initial' },
        render: (ctx) => html`<input value="${ctx.value}" @input="${mockHandler}" />`
      });

      const el = document.createElement('memory-test');
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 10));

      const input = el.shadowRoot?.querySelector('input') as HTMLInputElement;
      expect(input).toBeTruthy();

      // Trigger first input event
      input.value = 'test1';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Update component state to trigger re-render
      (el as any).context.value = 'updated';
      await new Promise(r => setTimeout(r, 10));
      
      // Trigger second input event
      input.value = 'test2';  
      input.dispatchEvent(new Event('input', { bubbles: true }));

      // Handler should have been called twice (once for each event)
      // This test verifies that event listeners are still working after re-renders
      expect(callCount).toBe(2);
      
      document.body.removeChild(el);
    });
  });
});
