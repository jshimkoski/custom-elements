import { describe, it, expect, beforeEach } from 'vitest';
import { component } from '../src/lib/runtime/component';
import { html } from '../src/lib/runtime/template-compiler';
import { ref } from '../src/lib/runtime/reactive';

describe('Simple reactive test', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should work with reactive state created inside component', () => {
    component('test-simple-reactive', () => {
      const test = ref('hello from inside');

      console.log('Created reactive state inside component:', test);

      try {
        console.log('Accessing test.value:', test.value);

        return html`<div>
          <span data-testid="display">${test.value}</span>
        </div>`;
      } catch (e) {
        console.log('Error accessing test.value:', e);
        throw e;
      }
    });

    // Create and mount component
    const CustomElement = customElements.get('test-simple-reactive')!;
    const element = new CustomElement();
    document.body.appendChild(element);

    const display = element.shadowRoot?.querySelector(
      "[data-testid='display']",
    );

    console.log('Display text:', display?.textContent);

    expect(display?.textContent).toBe('hello from inside');
  });
});
