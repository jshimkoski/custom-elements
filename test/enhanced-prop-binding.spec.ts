import { it, expect, describe, beforeEach } from 'vitest';
import { component, html, ref } from '../src/lib/index';

describe('🔗 Enhanced :prop Binding', () => {
  beforeEach(() => {
    // Clear any existing components
    document.body.innerHTML = '';
  });

  it('should bind reactive state objects to native element properties with :prop', async () => {
    component('prop-test-component', () => {
      const inputValue = ref('test input');
      const isDisabled = ref(false);

      return html`
        <input 
          :value="${inputValue}" 
          :disabled="${isDisabled}"
          type="text"
          data-testid="input">
        <button 
          @click="${() => { inputValue.value = 'new value'; isDisabled.value = true; }}"
          data-testid="update-btn">
          Update
        </button>
        <div data-testid="display">${inputValue.value}</div>
      `;
    });

    const testEl = document.createElement('prop-test-component');
    document.body.appendChild(testEl);

    await new Promise(resolve => setTimeout(resolve, 50));

    const shadowRoot = testEl.shadowRoot;
    expect(shadowRoot).toBeTruthy();

    const input = shadowRoot!.querySelector('[data-testid="input"]') as HTMLInputElement;
    const button = shadowRoot!.querySelector('[data-testid="update-btn"]') as HTMLButtonElement;
    const display = shadowRoot!.querySelector('[data-testid="display"]') as HTMLElement;
    
    expect(input).toBeTruthy();
    expect(button).toBeTruthy();
    expect(display).toBeTruthy();
    
    // Check initial values
    expect(input.value).toBe('test input');
    expect(input.disabled).toBe(false);
    expect(display.textContent).toBe('test input');

    // Update via button click
    button.click();
    await new Promise(resolve => setTimeout(resolve, 50));

    // Properties should be updated
    expect(input.value).toBe('new value');
    expect(input.disabled).toBe(true);
    expect(display.textContent).toBe('new value');
  });

  it('should work with :model:prop bindings for reactive state objects', async () => {
    component('model-prop-test', () => {
      const formData = ref({ name: 'John', age: 25 });

      return html`
        <input :model:name="${formData}" type="text" placeholder="Name" data-testid="name-input">
        <input :model:age="${formData}" type="number" placeholder="Age" data-testid="age-input">
        <div data-testid="output">${formData.value.name} - ${formData.value.age}</div>
        <button 
          @click="${() => { formData.value = { name: 'Jane', age: 30 }; }}"
          data-testid="update-btn">
          Update
        </button>
      `;
    });

    const testEl = document.createElement('model-prop-test');
    document.body.appendChild(testEl);

    await new Promise(resolve => setTimeout(resolve, 50));

    const shadowRoot = testEl.shadowRoot;
    expect(shadowRoot).toBeTruthy();

    const nameInput = shadowRoot!.querySelector('[data-testid="name-input"]') as HTMLInputElement;
    const ageInput = shadowRoot!.querySelector('[data-testid="age-input"]') as HTMLInputElement;
    const output = shadowRoot!.querySelector('[data-testid="output"]') as HTMLElement;
    const button = shadowRoot!.querySelector('[data-testid="update-btn"]') as HTMLButtonElement;

    expect(nameInput).toBeTruthy();
    expect(ageInput).toBeTruthy();
    expect(output).toBeTruthy();
    
    // Check initial values
    expect(nameInput.value).toBe('John');
    expect(ageInput.value).toBe('25');
    expect(output.textContent?.trim()).toBe('John - 25');

    // Update via button click
    button.click();
    await new Promise(resolve => setTimeout(resolve, 50));

    // Inputs should be updated
    expect(nameInput.value).toBe('Jane');
    expect(ageInput.value).toBe('30');
    expect(output.textContent?.trim()).toBe('Jane - 30');

    // Simulate user input to test two-way binding
    nameInput.value = 'Bob';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));

    await new Promise(resolve => setTimeout(resolve, 50));

    // The reactive state should be updated
    expect(output.textContent?.trim()).toBe('Bob - 30');
  });

  it('should handle reactive state objects in data attributes', async () => {
    component('data-attr-test', () => {
      const dynamicProp = ref('dynamic');
      const staticValue = 'static';

      return html`
        <div 
          :data-dynamic="${dynamicProp}"
          data-static="${staticValue}"
          data-testid="test-div">
          Content
        </div>
        <button 
          @click="${() => { dynamicProp.value = 'updated'; }}"
          data-testid="update-btn">
          Update
        </button>
      `;
    });

    const testEl = document.createElement('data-attr-test');
    document.body.appendChild(testEl);

    await new Promise(resolve => setTimeout(resolve, 50));

    const shadowRoot = testEl.shadowRoot;
    expect(shadowRoot).toBeTruthy();

    const div = shadowRoot!.querySelector('[data-testid="test-div"]') as HTMLElement;
    const button = shadowRoot!.querySelector('[data-testid="update-btn"]') as HTMLButtonElement;
    
    expect(div).toBeTruthy();
    expect(button).toBeTruthy();
    
    // Check initial values
    expect(div.getAttribute('data-dynamic')).toBe('dynamic');
    expect(div.getAttribute('data-static')).toBe('static');

    // Update via button click
    button.click();
    await new Promise(resolve => setTimeout(resolve, 50));

    // Dynamic attribute should be updated
    expect(div.getAttribute('data-dynamic')).toBe('updated');
    expect(div.getAttribute('data-static')).toBe('static');
  });

  it('should handle complex reactive state objects with nested properties', async () => {
    component('complex-props-test', () => {
      const complexState = ref({
        user: { name: 'Alice', settings: { theme: 'dark' } },
        count: 0
      });

      return html`
        <div 
          :data-name="${complexState.value.user.name}"
          :data-theme="${complexState.value.user.settings.theme}"
          :data-count="${complexState.value.count}"
          data-testid="test-element">
          ${complexState.value.user.name} uses ${complexState.value.user.settings.theme} theme
        </div>
        <button 
          @click="${() => { 
            complexState.value = {
              user: { name: 'Bob', settings: { theme: 'light' } },
              count: 5
            };
          }}"
          data-testid="update-btn">
          Update
        </button>
      `;
    });

    const testEl = document.createElement('complex-props-test');
    document.body.appendChild(testEl);

    await new Promise(resolve => setTimeout(resolve, 50));

    const shadowRoot = testEl.shadowRoot;
    expect(shadowRoot).toBeTruthy();

    const div = shadowRoot!.querySelector('[data-testid="test-element"]') as HTMLElement;
    const button = shadowRoot!.querySelector('[data-testid="update-btn"]') as HTMLButtonElement;
    
    expect(div).toBeTruthy();
    expect(button).toBeTruthy();
    
    // Check initial values
    expect(div.getAttribute('data-name')).toBe('Alice');
    expect(div.getAttribute('data-theme')).toBe('dark');
    expect(div.getAttribute('data-count')).toBe('0');
    expect(div.textContent?.trim()).toBe('Alice uses dark theme');

    // Update via button click
    button.click();
    await new Promise(resolve => setTimeout(resolve, 50));

    // All properties should be updated
    expect(div.getAttribute('data-name')).toBe('Bob');
    expect(div.getAttribute('data-theme')).toBe('light');
    expect(div.getAttribute('data-count')).toBe('5');
    expect(div.textContent?.trim()).toBe('Bob uses light theme');
  });

  it('should work with boolean reactive state properties', async () => {
    component('boolean-props-test', () => {
      const isDisabled = ref(false);
      const isChecked = ref(true);

      return html`
        <input 
          type="text" 
          :disabled="${isDisabled}"
          data-testid="text-input">
        <input 
          type="checkbox" 
          :checked="${isChecked}"
          data-testid="checkbox-input">
        <button 
          @click="${() => { isDisabled.value = !isDisabled.value; isChecked.value = !isChecked.value; }}"
          data-testid="toggle-btn">
          Toggle
        </button>
      `;
    });

    const testEl = document.createElement('boolean-props-test');
    document.body.appendChild(testEl);

    await new Promise(resolve => setTimeout(resolve, 50));

    const shadowRoot = testEl.shadowRoot;
    expect(shadowRoot).toBeTruthy();

    const textInput = shadowRoot!.querySelector('[data-testid="text-input"]') as HTMLInputElement;
    const checkboxInput = shadowRoot!.querySelector('[data-testid="checkbox-input"]') as HTMLInputElement;
    const button = shadowRoot!.querySelector('[data-testid="toggle-btn"]') as HTMLButtonElement;
    
    expect(textInput).toBeTruthy();
    expect(checkboxInput).toBeTruthy();
    expect(button).toBeTruthy();
    
    // Check initial values
    expect(textInput.disabled).toBe(false);
    expect(checkboxInput.checked).toBe(true);

    // Toggle via button click
    button.click();
    await new Promise(resolve => setTimeout(resolve, 50));

    // Properties should be toggled
    expect(textInput.disabled).toBe(true);
    expect(checkboxInput.checked).toBe(false);
  });
});