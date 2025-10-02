import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { component, html, useEmit, useProps } from '../src/lib';

describe("Streamlined Component API", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("should create a simple component with reactive props", async () => {
    // Test the new streamlined API
    component('test-switch', () => {
      const props = useProps({ modelValue: false, label: 'Toggle' });
      const emit = useEmit();
      
      return html`
        <label>
          ${props.label}
          <input 
            type="checkbox" 
            :checked="${props.modelValue}"
            @change="${(e: Event) => {
              const input = e.target as HTMLInputElement;
              emit('update:modelValue', input.checked);
            }}"
          />
        </label>
      `;
    });

    // Create and mount the component
    const element = document.createElement("test-switch") as any;
    element.setAttribute("model-value", "true");
    element.setAttribute("label", "Test Switch");
    document.body.appendChild(element);

    // Wait for component to initialize
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(element).toBeTruthy();
    expect(element.shadowRoot).toBeTruthy();
    
    const input = element.shadowRoot?.querySelector("input");
    expect(input).toBeTruthy();
    expect(input?.checked).toBe(true);
    
    const labelText = element.shadowRoot?.textContent;
    expect(labelText).toContain("Test Switch");
  });

  it("should emit events when interact with components", async () => {
    let emittedValue: any = null;
    
    component('emit-test', () => {
      const props = useProps({ value: '' });
      const emit = useEmit();
      
      return html`
        <button @click="${() => emit('test-event', { value: props.value })}">
          Click: ${props.value}
        </button>
      `;
    });

    const element = document.createElement("emit-test") as any;
    element.setAttribute("value", "hello");
    
    element.addEventListener('test-event', (e: CustomEvent) => {
      emittedValue = e.detail;
    });
    
    document.body.appendChild(element);

    // Wait for component to initialize
    await new Promise(resolve => setTimeout(resolve, 50));

    const button = element.shadowRoot?.querySelector("button");
    expect(button).toBeTruthy();
    
    button?.click();
    
    // Wait for event
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(emittedValue).toEqual({ value: 'hello' });
  });
});