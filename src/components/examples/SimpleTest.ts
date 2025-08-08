import { component, html } from '../../lib/runtime.ts';

// Simple test component to verify registration
component({
  tag: 'simple-test-component',
  
  state: {
    message: 'Hello from Simple Test Component!'
  },
  
  template: (state) => {
    return html`
      <div style="border: 2px solid red; padding: 1rem; margin: 1rem; background: #ffe6e6;">
        <h3>🔴 Simple Test Component</h3>
        <p>${state.message}</p>
      </div>
    `;
  }
});

console.log('✅ Simple test component registered!');
