import { component, html } from '../../lib/runtime';

// Simple test component to verify registration
component({
  tag: 'simple-test-component',
  
  state: (() => {
    const message = 'Hello from Simple Test Component!';
    return {
      message,
      get uppercasedMessage() {
        return message.toUpperCase();
      }
    };
  })(),

  template: (state) => html`
    <div style="border: 2px solid red; padding: 1rem; margin: 1rem; background: #ffe6e6;">
      <h3>🔴 Simple Test Component</h3>
      <p>${state.message}</p>
      <p data-ref="uppercasedMessage">${state.uppercasedMessage}</p>
    </div>
  `,

  refs: {
    uppercasedMessage: (element, state, api) => {
      element.addEventListener('click', () => {
        api.updateKey('message', 'Updated Message');
        console.log(state.uppercasedMessage);
      });
    }
  }
});

console.log('✅ Simple test component registered!');
