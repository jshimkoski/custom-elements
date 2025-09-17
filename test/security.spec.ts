import { describe, it, expect } from 'vitest';
import { component, html } from '../src/lib';

describe('🔒 Security Features', () => {
  
  describe('Expression Evaluation Security', () => {
    
    it('should block dangerous constructor access', async () => {
      component('security-test-constructor', () => {
        // Using a function that would try to access constructor
        const testValue = true;
        return html`<div :class="{ active: constructor }">Test</div>`;
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
      component('security-test-prototype', () => {
        const value = 'test';
        return html`<div :class="{ dangerous: value.prototype }">Test</div>`;
      });

      const el = document.createElement('security-test-prototype');
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 10));

      const div = el.shadowRoot?.querySelector('div');
      expect(div?.classList.contains('dangerous')).toBe(false);
      
      document.body.removeChild(el);
    });

    it('should block dangerous __proto__ access', async () => {
      component('security-test-proto', () => {
        const obj = {};
        return html`<div :class="{ dangerous: obj.__proto__ }">Test</div>`;
      });

      const el = document.createElement('security-test-proto');
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 10));

      const div = el.shadowRoot?.querySelector('div');
      expect(div?.classList.contains('dangerous')).toBe(false);
      
      document.body.removeChild(el);
    });

    it('should block function keyword', async () => {
      component('security-test-function', () => {
        return html`<div :text="function() { return 'hacked'; }()">Test</div>`;
      });

      const el = document.createElement('security-test-function');
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 10));

      const div = el.shadowRoot?.querySelector('div');
      // Should not execute the function, should show original text or be empty
      expect(div?.textContent).not.toBe('hacked');
      
      document.body.removeChild(el);
    });

    it('should block eval keyword', async () => {
      component('security-test-eval', () => {
        return html`<div :text="eval('1 + 1')">Test</div>`;
      });

      const el = document.createElement('security-test-eval');
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 10));

      const div = el.shadowRoot?.querySelector('div');
      // Should not execute eval, should show original text or be empty
      expect(div?.textContent).not.toBe('2');
      
      document.body.removeChild(el);
    });

    it('should handle safe expressions correctly', async () => {
      component('security-test-safe', () => {
        const safeValue = 'safe content';
        const isActive = true;
        return html`
          <div :class="${{ active: isActive }}">
            ${safeValue}
          </div>
        `;
      });

      const el = document.createElement('security-test-safe');
      document.body.appendChild(el);
      await new Promise(r => setTimeout(r, 10));

      const div = el.shadowRoot?.querySelector('div');
      expect(div?.textContent?.trim()).toBe('safe content');
      expect(div?.classList.contains('active')).toBe(true);
      
      document.body.removeChild(el);
    });
  });
});