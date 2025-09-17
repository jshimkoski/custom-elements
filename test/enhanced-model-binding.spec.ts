import { describe, it, expect, beforeEach } from 'vitest';
import { component, html, ref } from '../src/lib/index';

describe('Enhanced :model binding with functional API', () => {
  beforeEach(() => {
    // Clear any existing components
    document.body.innerHTML = '';
  });

  it('should work with reactive state objects using interpolation syntax', async () => {
    // Test component using enhanced :model syntax
    component('test-enhanced-model', () => {
      const input = ref('initial value');
      
      return html`
        <input :model="${input}" data-testid="test-input">
        <span data-testid="display-value">${input.value}</span>
      `;
    });

    // Create and mount component
    const testEl = document.createElement('test-enhanced-model');
    document.body.appendChild(testEl);
    
    // Wait for component to render
    await new Promise(resolve => setTimeout(resolve, 10));

    const shadowRoot = testEl.shadowRoot;
    expect(shadowRoot).toBeTruthy();

    const input = shadowRoot?.querySelector('[data-testid="test-input"]') as HTMLInputElement;
    const display = shadowRoot?.querySelector('[data-testid="display-value"]');
    
    expect(input).toBeTruthy();
    expect(display).toBeTruthy();

    // Check initial value
    expect(input.value).toBe('initial value');
    expect(display?.textContent).toBe('initial value');

    // Simulate user input
    input.value = 'user typed this';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Wait for reactivity to update
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Check that the reactive state was updated
    expect(display?.textContent).toBe('user typed this');
  });

  it('should support reactive state with checkbox inputs', async () => {
    component('test-checkbox-model', () => {
      const checked = ref(false);
      
      return html`
        <input type="checkbox" :model="${checked}" data-testid="checkbox">
        <span data-testid="checkbox-display">${checked.value ? 'checked' : 'unchecked'}</span>
      `;
    });

    const testEl = document.createElement('test-checkbox-model');
    document.body.appendChild(testEl);
    
    await new Promise(resolve => setTimeout(resolve, 10));

    const shadowRoot = testEl.shadowRoot;
    const checkbox = shadowRoot?.querySelector('[data-testid="checkbox"]') as HTMLInputElement;
    const display = shadowRoot?.querySelector('[data-testid="checkbox-display"]');
    
    expect(checkbox.checked).toBe(false);
    expect(display?.textContent).toBe('unchecked');

    // Simulate checking the checkbox
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(display?.textContent).toBe('checked');
  });

  it('should work with both reactive state objects and direct values', async () => {
    // Test that we can mix reactive state with other approaches
    component('test-mixed-model', () => {
      const reactiveInput = ref('reactive');
      
      return html`
        <input :model="${reactiveInput}" data-testid="reactive-input">
        <input value="${reactiveInput.value}" @input="${(e: Event) => reactiveInput.value = (e.target as HTMLInputElement).value}" data-testid="manual-input">
        <span data-testid="both-display">${reactiveInput.value}</span>
      `;
    });

    const testEl = document.createElement('test-mixed-model');
    document.body.appendChild(testEl);
    
    await new Promise(resolve => setTimeout(resolve, 10));

    const shadowRoot = testEl.shadowRoot;
    const reactiveInput = shadowRoot?.querySelector('[data-testid="reactive-input"]') as HTMLInputElement;
    const manualInput = shadowRoot?.querySelector('[data-testid="manual-input"]') as HTMLInputElement;
    const display = shadowRoot?.querySelector('[data-testid="both-display"]');
    
    expect(reactiveInput.value).toBe('reactive');
    expect(manualInput.value).toBe('reactive');
    expect(display?.textContent).toBe('reactive');

    // Test that changing the :model input updates everything
    reactiveInput.value = 'changed via model';
    reactiveInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(manualInput.value).toBe('changed via model');
    expect(display?.textContent).toBe('changed via model');
  });
});