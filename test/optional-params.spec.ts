import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { component, html, useOnConnected, useEmit } from '../src/lib';

describe('Optional Parameters', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should support component with no parameters', async () => {
    component('simple-component', () => {
      return html`<div>Hello World</div>`;
    });

    const element = document.createElement('simple-component');
    document.body.appendChild(element);

    await new Promise(resolve => setTimeout(resolve, 50));

    const div = element.shadowRoot?.querySelector('div');
    expect(div?.textContent).toBe('Hello World');
  });

  it('should support component with destructured props only', async () => {
    component('props-only', ({ message = 'Default Message' }: { message?: string }) => {
      return html`<div>${message}</div>`;
    });

    const element = document.createElement('props-only');
    element.setAttribute('message', 'Custom Message');
    document.body.appendChild(element);

    await new Promise(resolve => setTimeout(resolve, 50));

    const div = element.shadowRoot?.querySelector('div');
    expect(div?.textContent).toBe('Custom Message');
  });

  it('should support component with props and hooks', async () => {
    let connected = false;
    
    component('full-component', ({ text = 'Default' }: { text?: string }) => {
      useOnConnected(() => {
        connected = true;
      });
      
      return html`<div>${text}</div>`;
    });

    const element = document.createElement('full-component');
    element.setAttribute('text', 'Full Component');
    document.body.appendChild(element);

    await new Promise(resolve => setTimeout(resolve, 50));

    const div = element.shadowRoot?.querySelector('div');
    expect(div?.textContent).toBe('Full Component');
    expect(connected).toBe(true);
  });

  it('should support component with empty destructuring when no props needed', async () => {
    let emitted = false;
    
    component('emit-only', () => {
      const emit = useEmit();
      
      useOnConnected(() => {
        emit('ready', { message: 'Ready' });
      });
      return html`<div>Emit Only</div>`;
    });

    const element = document.createElement('emit-only');
    element.addEventListener('ready', () => {
      emitted = true;
    });
    
    document.body.appendChild(element);

    await new Promise(resolve => setTimeout(resolve, 50));

    const div = element.shadowRoot?.querySelector('div');
    expect(div?.textContent).toBe('Emit Only');
    expect(emitted).toBe(true);
  });
});