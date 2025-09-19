import { test, expect } from 'vitest';
import { component, ref, html } from '../src/lib';

test('ref directive integration with functional components', async () => {
  // Clean up any existing component
  if (customElements.get('ref-integration-test')) {
    // Skip if already defined to avoid test pollution
    return;
  }
  
  // Register a component that uses :ref with reactive state
  component('ref-integration-test', () => {
    const inputRef = ref<HTMLInputElement | null>(null);
    
    return html`
      <div>
        <input :ref="${inputRef}" placeholder="Type here..." />
        <p>Input Ref: ${inputRef.value ? 'Connected' : 'Not Connected'}</p>
      </div>
    `;
  });

  // Create and mount the component
  const element = document.createElement('ref-integration-test') as any;
  document.body.appendChild(element);
  
  // Wait for initial render
  await new Promise(resolve => requestAnimationFrame(resolve));
  
  // Get the shadowRoot
  const shadowRoot = element.shadowRoot!;
  
  // Check if the input exists
  const input = shadowRoot.querySelector('input');
  expect(input).toBeTruthy();
  
  // Check the ref status
  const refStatus = shadowRoot.querySelector('p');
  expect(refStatus?.textContent).toContain('Connected');
  
  // Clean up
  document.body.removeChild(element);
});